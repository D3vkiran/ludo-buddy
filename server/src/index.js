import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import {randomBytes} from 'node:crypto';

const app=express();app.use(cors({origin:process.env.CLIENT_ORIGIN?.split(',')||true}));app.get('/health',(_,res)=>res.json({ok:true,service:'ludo-buddy'}));
const http=createServer(app);const io=new Server(http,{cors:{origin:process.env.CLIENT_ORIGIN?.split(',')||'*',methods:['GET','POST']},pingInterval:20000,pingTimeout:30000});
const rooms=new Map();const SAFE=[0,8,13,21,26,34,39,47];
function initial(count){return {players:Array.from({length:count},(_,i)=>({name:`Player ${i+1}`,color:i,connected:false})),tokens:Array.from({length:count},()=>[-1,-1,-1,-1]),turn:0,dice:null,rolled:false,winner:null,log:'Waiting for players…'}}
function legal(g){if(!g.rolled||g.dice==null||g.winner!==null)return [];return g.tokens[g.turn].map((v,i)=>v===58?-1:v===-1?(g.dice===6?i:-1):(v+g.dice<=58?i:-1)).filter(i=>i>=0)}
function roomFor(sid){for(const [code,r] of rooms)if(r.seats.has(sid))return [code,r];return []}
function apply(g,token){const p=g.turn,d=g.dice,n={...g,tokens:g.tokens.map(x=>x.slice()),rolled:false,dice:null};const v=n.tokens[p][token];n.tokens[p][token]=v===-1?0:v+d;const nv=n.tokens[p][token];let capture=false;if(nv>=0&&nv<52){const sq=(p*13+nv)%52;if(!SAFE.includes(sq))n.tokens.forEach((ts,op)=>{if(op!==p)ts.forEach((ov,oi)=>{if(ov>=0&&ov<52&&(op*13+ov)%52===sq){n.tokens[op][oi]=-1;capture=true}})})}if(n.tokens[p].every(x=>x===58)){n.winner=p;n.log=`${n.players[p].name} wins!`;return n}const extra=d===6||capture||nv===58;n.turn=extra?p:(p+1)%n.players.length;n.log=capture?'Token captured!':nv===58?'Token reached home!':extra?'Roll again!':`${n.players[n.turn].name}'s turn`;return n}
function send(room){const r=rooms.get(room);if(!r)return;for(const [sid,seat] of r.seats){io.to(sid).emit('room:state',{room,game:{...r.game,myTurn:seat}})}}
function err(s,msg){s.emit('room:error',msg)}
function join(s,code,name){const r=rooms.get(code);if(!r)return err(s,'Room not found. Check the code and try again.');if(r.seats.has(s.id))return send(code);const seat=r.game.players.findIndex((p,i)=>!p.connected&&!Array.from(r.seats.values()).includes(i));if(seat<0)return err(s,'This room is full.');r.seats.set(s.id,seat);r.game.players[seat]={...r.game.players[seat],name:String(name||`Player ${seat+1}`).trim().slice(0,18)||`Player ${seat+1}`,connected:true};r.game.log=r.seats.size<2?'Waiting for another player…':`${r.game.players[r.game.turn].name}'s turn`;s.join(code);send(code)}
io.on('connection',s=>{
 s.on('room:create',({name,players}={})=>{const count=Math.max(2,Math.min(4,Number(players)||4));let code;do{code=randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));const r={game:initial(count),seats:new Map(),created:Date.now()};rooms.set(code,r);join(s,code,name)});
 s.on('room:join',({room,name}={})=>{const code=String(room||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);join(s,code,name)});
 s.on('roll',()=>{const [code,r]=roomFor(s.id);if(!r)return;const seat=r.seats.get(s.id);if(seat!==r.game.turn||r.game.rolled||r.game.winner!==null)return err(s,'Wait for your turn.');const value=1+Math.floor(Math.random()*6);r.game={...r.game,dice:value,rolled:true,log:`${r.game.players[seat].name} rolled ${value}`};if(!legal(r.game).length){r.game={...r.game,rolled:false,dice:null,turn:(seat+1)%r.game.players.length,log:'No moves available. Next turn.'}}send(code)});
 s.on('move',({token}={})=>{const [code,r]=roomFor(s.id);if(!r)return;const seat=r.seats.get(s.id);if(seat!==r.game.turn)return err(s,'Wait for your turn.');if(!Number.isInteger(token)||!legal(r.game).includes(token))return err(s,'That token cannot move.');r.game=apply(r.game,token);send(code)});
 s.on('disconnect',()=>{const [code,r]=roomFor(s.id);if(!r)return;const seat=r.seats.get(s.id);r.seats.delete(s.id);if(seat!==undefined)r.game.players[seat].connected=false;if(!r.seats.size){setTimeout(()=>{if(rooms.get(code)===r&&!r.seats.size)rooms.delete(code)},15*60*1000)}else send(code)});
});
const port=Number(process.env.PORT)||3001;http.listen(port,'0.0.0.0',()=>console.log(`Ludo Buddy server listening on ${port}`));
