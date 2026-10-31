import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Check, ChevronDown, CircleHelp, Copy, Link2, Music2, Pause, Play,
  RotateCcw, Sparkles, Volume2, VolumeX, Users, X,
} from 'lucide-react';

const COLORS = ['#d94f49', '#278566', '#d29b2d', '#4b65bd'];
const COLOR_NAMES = ['Coral', 'Jade', 'Amber', 'Indigo'];
const STARTS = [0, 13, 26, 39];
const SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
const THEMES = {
  Garden: { bg: '#eff4ec', panel: '#fffefa', board: '#fcfbf5', accent: '#477254', line: '#dde5d8', tile: '#ffffff', ink: '#202a22', muted: '#707b70', gold: '#e5c878' },
  Royale: { bg: '#f3edf4', panel: '#fffaff', board: '#fffaff', accent: '#774878', line: '#e7dbe9', tile: '#ffffff', ink: '#302536', muted: '#837589', gold: '#e3c27b' },
  Coast: { bg: '#eaf3f5', panel: '#fbffff', board: '#fbffff', accent: '#316b7b', line: '#d8e6e9', tile: '#ffffff', ink: '#203239', muted: '#6d8188', gold: '#e8c76e' },
  Midnight: { bg: '#171e2b', panel: '#222b3b', board: '#202a39', accent: '#e3bd68', line: '#354154', tile: '#2a3546', ink: '#f2f0e8', muted: '#a6afba', gold: '#d9b859' },
};
const TRACK = [
  [1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],
  [8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],
  [13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],
  [6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6],
];
const HOME_LANES = [
  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
];
const BASES = [[0,0],[9,0],[9,9],[0,9]];
const YARDS = [[1,1],[10,1],[10,10],[1,10]];
const YARD_SPOTS = [[2,2],[4,2],[2,4],[4,4]];
const CENTER_SPOTS = [[6,7],[7,6],[8,7],[7,8]];
const initial = (count = 4) => ({ players: Array.from({length: count}, (_, i) => ({ name: `Player ${i + 1}`, color: i, connected: true })), tokens: Array.from({length: count}, () => [-1,-1,-1,-1]), turn: 0, dice: null, rolled: false, winner: null, log: 'Roll a six to bring a token out!' });
const absolute = (player, pos) => (STARTS[player] + pos) % 52;
function legalMoves(game) {
  if (!game.rolled || game.dice == null || game.winner != null) return [];
  return game.tokens[game.turn].map((pos, i) => pos === 58 ? -1 : pos === -1 ? (game.dice === 6 ? i : -1) : pos + game.dice <= 58 ? i : -1).filter(i => i >= 0);
}
function applyMove(game, tokenIndex) {
  const player = game.turn, roll = game.dice;
  const next = { ...game, tokens: game.tokens.map(tokens => tokens.slice()), rolled: false, dice: null };
  const current = next.tokens[player][tokenIndex];
  next.tokens[player][tokenIndex] = current === -1 ? 0 : current + roll;
  const pos = next.tokens[player][tokenIndex];
  let captured = false;
  if (pos >= 0 && pos < 52) {
    const square = absolute(player, pos);
    if (!SAFE.includes(square)) next.tokens.forEach((tokens, opponent) => {
      if (opponent === player) return;
      tokens.forEach((otherPos, otherToken) => {
        if (otherPos >= 0 && otherPos < 52 && absolute(opponent, otherPos) === square) {
          next.tokens[opponent][otherToken] = -1;
          captured = true;
        }
      });
    });
  }
  if (next.tokens[player].every(token => token === 58)) {
    next.winner = player;
    next.log = `${next.players[player].name} wins!`;
    return next;
  }
  const extraTurn = roll === 6 || captured || pos === 58;
  next.turn = extraTurn ? player : (player + 1) % next.players.length;
  next.log = captured ? 'A token was captured!' : pos === 58 ? 'Token home!' : extraTurn ? 'Roll again!' : `${next.players[next.turn].name}'s turn`;
  return next;
}
function cellCenter([col,row]) { return [col * 40 + 20, row * 40 + 20]; }
function Board({ game, onToken }) {
  const legal = legalMoves(game);
  const moves = game.tokens.flatMap((tokens, player) => tokens.map((pos, token) => {
    let cell;
    if (pos === -1) cell = [YARDS[player][0] + YARD_SPOTS[token][0], YARDS[player][1] + YARD_SPOTS[token][1]];
    else if (pos < 52) cell = TRACK[absolute(player, pos)];
    else if (pos < 58) cell = HOME_LANES[player][pos - 52];
    else cell = CENTER_SPOTS[player];
    const [cx,cy] = cellCenter(cell);
    const clickable = player === game.turn && legal.includes(token);
    return { player, token, cx, cy, clickable, name: game.players[player]?.name || COLOR_NAMES[player] };
  }));
  return <svg className="board" viewBox="0 0 600 600" role="img" aria-label="Classic Ludo board">
    <defs>
      <filter id="tokenShadow" x="-80%" y="-80%" width="260%" height="260%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#17221b" floodOpacity=".24"/></filter>
      <linearGradient id="centerShine" x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--board)"/><stop offset="1" stopColor="var(--line)"/></linearGradient>
    </defs>
    <rect x="4" y="4" width="592" height="592" rx="28" fill="var(--board)" stroke="var(--line)" strokeWidth="5"/>
    {BASES.map(([col,row],p)=><g key={`base-${p}`}>
      <rect x={col*40+2} y={row*40+2} width="236" height="236" rx="25" fill={COLORS[p]} opacity=".16"/>
      <rect x={YARDS[p][0]*40+5} y={YARDS[p][1]*40+5} width="150" height="150" rx="23" fill="var(--board)" stroke={COLORS[p]} strokeOpacity=".68" strokeWidth="3"/>
      {YARD_SPOTS.map(([dx,dy],i)=>{const [cx,cy]=cellCenter([YARDS[p][0]+dx,YARDS[p][1]+dy]);return <g key={i}><circle cx={cx} cy={cy} r="22" fill={COLORS[p]} opacity=".13"/><circle cx={cx} cy={cy} r="17" fill="var(--board)" stroke={COLORS[p]} strokeWidth="3"/></g>})}
    </g>)}
    {TRACK.map((cell,i)=>{const [x,y]=[cell[0]*40,cell[1]*40], start=STARTS.indexOf(i);return <g key={`track-${i}`}>
      <rect x={x+1.5} y={y+1.5} width="37" height="37" rx="5" fill={start>=0?COLORS[start]:SAFE.includes(i)?'var(--gold)':'var(--tile)'} stroke="var(--line)" strokeWidth="1.5"/>
      {SAFE.includes(i)&&start<0&&<text x={x+20} y={y+26} textAnchor="middle" fontSize="20" fill="var(--gold-mark)">★</text>}
      {start>=0&&<circle cx={x+20} cy={y+20} r="7" fill="white" opacity=".88"/>}
    </g>})}
    {HOME_LANES.map((lane,p)=>lane.map((cell,i)=>{const [x,y]=[cell[0]*40,cell[1]*40];return <rect key={`lane-${p}-${i}`} x={x+1.5} y={y+1.5} width="37" height="37" rx="5" fill={COLORS[p]} opacity=".83" stroke="var(--board)" strokeWidth="1.5"/>}))}
    <rect x="240" y="240" width="120" height="120" rx="5" fill="url(#centerShine)" stroke="var(--line)" strokeWidth="2"/>
    <path d="M240 240 L240 360 L300 300 Z" fill={COLORS[0]}/><path d="M240 240 L360 240 L300 300 Z" fill={COLORS[1]}/><path d="M360 240 L360 360 L300 300 Z" fill={COLORS[2]}/><path d="M240 360 L360 360 L300 300 Z" fill={COLORS[3]}/>
    {moves.map(({player,token,cx,cy,clickable,name})=><g key={`${player}-${token}`} className={clickable?'piece piece-ready':'piece'} role={clickable?'button':undefined} tabIndex={clickable?0:undefined} aria-label={clickable?`Move ${name} token ${token+1}`:undefined} onClick={clickable?()=>onToken(token):undefined} onKeyDown={clickable?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onToken(token)}}:undefined}>
      {clickable&&<circle className="piece-hit" cx={cx} cy={cy} r="34"/>}
      <circle cx={cx} cy={cy} r="13" fill={COLORS[player]} stroke="white" strokeWidth="3" filter="url(#tokenShadow)"/>
      <circle cx={cx} cy={cy} r="4" fill="white" opacity=".88"/>
    </g>)}
    <text x="300" y="307" className="home-label" textAnchor="middle">HOME</text>
  </svg>;
}
function DiceFace({value}) {
  const face=value||5;
  const pips={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[face]||[];
  return <span className="die-face" aria-hidden="true">{pips.map(i=><i key={i} className={`pip pip-${i}`}/>)}</span>;
}
function App() {
  const [theme,setTheme]=useState(()=>{try{return localStorage.getItem('ludo-theme')||'Garden'}catch{return 'Garden'}});
  const [game,setGame]=useState(()=>initial()),[playersCount,setPlayersCount]=useState(4);
  const [musicOn,setMusicOn]=useState(false),[sfxOn,setSfxOn]=useState(true),[online,setOnline]=useState(false),[playMode,setPlayMode]=useState('offline');
  const [room,setRoom]=useState(''),[name,setName]=useState(''),[roomInput,setRoomInput]=useState(''),[status,setStatus]=useState('Pass and play'),[copied,setCopied]=useState(false),[toolsOpen,setToolsOpen]=useState(false),[toast,setToast]=useState('');
  const socket=useRef(null),audio=useRef(null),toastTimer=useRef(null);
  const isLocal=typeof window!=='undefined'&&['localhost','127.0.0.1'].includes(window.location.hostname);
  const serverUrl=import.meta.env.VITE_SERVER_URL||(isLocal?'http://localhost:3001':'');
  const onlineAvailable=Boolean(serverUrl);
  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',THEMES[theme].bg);
    try{localStorage.setItem('ludo-theme',theme)}catch{}
  },[theme]);
  useEffect(()=>{
    if(!musicOn){audio.current?.stop();return undefined}
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return undefined;
    const ctx=new AudioContextClass();let alive=true,note=0;
    const notes=[261.6,329.6,392,329.6,293.7,349.2,440,349.2];
    const play=()=>{if(!alive)return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=notes[note++%notes.length];gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.016,ctx.currentTime+.06);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.5);osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.51)};
    play();const id=window.setInterval(play,760);audio.current={stop:()=>{alive=false;window.clearInterval(id);ctx.close()}};
    return ()=>audio.current?.stop();
  },[musicOn]);
  useEffect(()=>{const match=window.location.pathname.match(/room\/([A-Z0-9]+)/i);if(match)setRoomInput(match[1].toUpperCase());return()=>window.clearTimeout(toastTimer.current)},[]);
  const announce=message=>{setToast(message);window.clearTimeout(toastTimer.current);toastTimer.current=window.setTimeout(()=>setToast(''),3200)};
  const roll=()=>{
    if(online){socket.current?.emit('roll');return}
    if(game.rolled||game.winner!==null)return;
    const value=1+Math.floor(Math.random()*6),next={...game,dice:value,rolled:true,log:`${game.players[game.turn].name} rolled ${value}`};
    if(!legalMoves(next).length){next.turn=(next.turn+1)%next.players.length;next.rolled=false;next.dice=null;next.log='No moves available. Next turn.'}
    setGame(next);
    if(sfxOn){const Ctx=window.AudioContext||window.webkitAudioContext;if(Ctx){const ctx=new Ctx(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=520;gain.gain.value=.035;osc.connect(gain).connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.09);osc.onended=()=>ctx.close()}}
  };
  const move=token=>{if(online){socket.current?.emit('move',{token});return}setGame(current=>legalMoves(current).includes(token)?applyMove(current,token):current)};
  const connect=create=>{
    if(!onlineAvailable){setPlayMode('online');announce('Online play needs the multiplayer server URL. Offline pass-and-play is ready.');return}
    if(socket.current)socket.current.disconnect();
    setPlayMode('online');
    const s=io(serverUrl,{transports:['websocket','polling'],timeout:8000});socket.current=s;setStatus('Connecting…');
    s.on('connect',()=>create?s.emit('room:create',{name,players:playersCount}):s.emit('room:join',{room:roomInput.trim().toUpperCase(),name}));
    s.on('room:state',payload=>{setGame(payload.game);setRoom(payload.room);setOnline(true);setStatus(`Room ${payload.room}`);window.history.replaceState({},'',`/room/${payload.room}`)});
    s.on('room:error',message=>{setStatus(String(message));announce(String(message))});
    s.on('connect_error',()=>{setStatus('Server unavailable');announce('Could not reach the game server. Try again in a moment.')});
  };
  const disconnect=()=>{socket.current?.disconnect();socket.current=null;setOnline(false);setRoom('');setPlayMode('offline');setStatus('Pass and play');setGame(initial(playersCount));window.history.replaceState({},'','/')};
  const chooseMode=mode=>{if(mode==='offline'&&online)disconnect();else{setPlayMode(mode);if(mode==='offline'){setStatus('Pass and play');setGame(initial(playersCount))}}};
  const newGame=()=>{if(online){announce('Leave the room to start a local game.');return}setPlayMode('offline');setStatus('Pass and play');setGame(initial(playersCount));announce('A fresh board is ready!')};
  const copy=async()=>{try{await navigator.clipboard.writeText(`${window.location.origin}/room/${room}`);setCopied(true);announce('Invite link copied');window.setTimeout(()=>setCopied(false),1600)}catch{announce('Copy was unavailable. Share room code '+room)}};
  const canRoll=playMode==='online'?online&&game.turn===game.myTurn&&!game.rolled:!game.rolled;
  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Ludo Buddy home"><span className="brand-mark">L</span><span className="brand-copy">ludo<span>buddy</span><small>PLAY TOGETHER</small></span></a>
      <div className="top-actions">
        <label className="theme-control"><Sparkles size={16}/><span className="theme-label">Theme</span><select aria-label="Choose board theme" value={theme} onChange={e=>setTheme(e.target.value)}>{Object.keys(THEMES).map(option=><option key={option}>{option}</option>)}</select><ChevronDown className="theme-chevron" size={14}/></label>
        <button className={`icon-button ${musicOn?'is-on':''}`} onClick={()=>setMusicOn(value=>!value)} aria-label={`${musicOn?'Turn off':'Turn on'} background music`} aria-pressed={musicOn}><Music2 size={18}/></button>
        <button className={`icon-button ${sfxOn?'is-on':''}`} onClick={()=>setSfxOn(value=>!value)} aria-label={`${sfxOn?'Turn off':'Turn on'} sound effects`} aria-pressed={sfxOn}>{sfxOn?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>
      </div>
    </header>
    <section className="welcome-row"><div><span className="eyebrow">A LITTLE FRIENDLY COMPETITION</span><h1>Make a day of it.</h1><p>Your people, your pace, one very good game.</p></div><div className={`connection-pill ${online?'connected':''}`}><i/>{status}</div></section>
    <section className="play-layout">
      <aside className="side-card table-card">
        <div className="section-heading"><div><span className="section-kicker">AT THE TABLE</span><h2>Players</h2></div><Users size={18}/></div>
        <div className="player-list">{game.players.map((player,index)=><div className={`player-row ${game.turn===index?'current-player':''}`} key={`${player.name}-${index}`}><span className="player-avatar" style={{'--player':COLORS[index]}}>{player.name.trim().charAt(0).toUpperCase()}</span><span className="player-copy"><b>{player.name}</b><small>{game.winner===index?'Winner':game.turn===index?'Playing now':online?(player.connected?'In this room':'Reconnecting…'):'Ready'}</small></span>{game.turn===index&&game.winner===null&&<span className="active-indicator" aria-label="Current turn"/>}</div>)}</div>
        <div className="soft-rule"/>
        <div className="section-heading compact-heading"><div><span className="section-kicker">NEW GAME</span><h2>Set the table</h2></div></div>
        <label className="field-caption">Number of players</label>
        <div className="player-count" role="group" aria-label="Choose number of players">{[2,3,4].map(count=><button type="button" key={count} className={playersCount===count?'selected':''} aria-pressed={playersCount===count} onClick={()=>{setPlayersCount(count);if(!online)setGame(initial(count))}}>{count}</button>)}</div>
        <button type="button" className="button button-primary full-button" onClick={newGame}><RotateCcw size={16}/>Start a new game</button>
        <div className="soft-rule"/>
        <div className="section-heading compact-heading"><div><span className="section-kicker">PLAY TOGETHER</span><h2>Invite friends</h2></div><Link2 size={17}/></div>
        {!online?<>
          <label className="sr-only" htmlFor="player-name">Your name</label><input id="player-name" className="text-input" maxLength={18} placeholder="Your name" autoComplete="nickname" value={name} onChange={event=>setName(event.target.value)}/>
          <button type="button" className="button button-secondary full-button" disabled={!onlineAvailable} onClick={()=>connect(true)}>Create a private room</button>
          <div className="join-field"><label className="sr-only" htmlFor="room-code">Room code</label><input id="room-code" className="text-input" maxLength={8} placeholder="Enter room code" autoCapitalize="characters" value={roomInput} onChange={event=>setRoomInput(event.target.value.toUpperCase())}/><button type="button" className="button button-secondary join-button" disabled={!onlineAvailable||!roomInput.trim()} onClick={()=>connect(false)}>Join</button></div>
          {!onlineAvailable&&<p className="setup-note">Private rooms will be available when the game server is connected.</p>}
        </>:<><div className="room-code-box"><span>{room}</span><button type="button" onClick={copy} aria-label="Copy room invite link">{copied?<Check size={17}/>:<Copy size={17}/>}</button></div><button type="button" className="button button-secondary full-button" onClick={copy}>Copy invite link</button><button type="button" className="leave-button full-button" onClick={disconnect}><X size={14}/>Leave room</button></>}
      </aside>
      <section className="game-column" aria-label="Ludo game">
        <div className="game-card">
          <div className="game-heading"><div><span className="section-kicker">THE BOARD IS YOURS</span><h2>{game.winner!==null?'A lovely win.':`${game.players[game.turn]?.name||'Player'}’s turn`}</h2></div><span className={`mode-badge ${online?'online-badge':''}`}><i/>{online?'PRIVATE ROOM':playMode==='online'?'ONLINE SETUP':'OFFLINE'}</span></div>
          <div className="mode-switch" role="group" aria-label="Choose how to play"><button type="button" className={playMode==='offline'?'selected':''} aria-pressed={playMode==='offline'} onClick={()=>chooseMode('offline')}><Users size={15}/><span>Offline with friends</span><small>Pass and play</small></button><button type="button" className={playMode==='online'?'selected':''} aria-pressed={playMode==='online'} onClick={()=>chooseMode('online')}><Link2 size={15}/><span>Online with friends</span><small>Private room</small></button></div>
          <div className="mobile-player-strip" aria-label="Players">{game.players.map((player,index)=><span key={index} className={game.turn===index?'strip-player active':'strip-player'} style={{'--player':COLORS[index]}}><i/>{player.name}</span>)}</div>
          <div className="board-frame"><Board game={game} onToken={move}/><div className="board-ribbon"><span className="ribbon-dot" style={{'--player':COLORS[game.turn]}}/>{game.winner!==null?`${game.players[game.winner]?.name} won the game`:game.players[game.turn]?.name||'Player'}{game.winner===null?' is up':''}</div></div>
          <div className="roll-row"><div className="game-message" role="status" aria-live="polite">{game.winner!==null?'🎉 ':''}{game.log}</div><button type="button" className={`roll-button ${game.rolled?'has-rolled':''}`} onClick={roll} disabled={!canRoll||game.winner!==null} aria-label={game.rolled?`You rolled ${game.dice}. Choose a highlighted token`:'Roll the dice'}><DiceFace value={game.dice}/><span>{game.rolled?'CHOOSE TOKEN':'ROLL DICE'}</span></button></div>
        </div>
        <div className="game-footnote"><CircleHelp size={14}/><span>Roll a six to start. Stars are safe. Exact roll to reach home.</span></div>
        <details className="mobile-tools" open={toolsOpen} onToggle={event=>setToolsOpen(event.currentTarget.open)}><summary><span><Users size={17}/> Game & room options</span><ChevronDown size={17}/></summary><div className="mobile-tool-content"><span className="mobile-tool-title">Players</span><div className="player-count" role="group" aria-label="Choose number of players">{[2,3,4].map(count=><button type="button" key={count} className={playersCount===count?'selected':''} aria-pressed={playersCount===count} onClick={()=>{setPlayersCount(count);if(!online)setGame(initial(count))}}>{count}</button>)}</div><button type="button" className="button button-primary full-button" onClick={newGame}><RotateCcw size={16}/>Start a new game</button><div className="mobile-room-tools"><div className="mobile-tool-title">Play together</div>{!online?<><input className="text-input" aria-label="Your name" maxLength={18} placeholder="Your name" value={name} onChange={event=>setName(event.target.value)}/><button type="button" className="button button-secondary full-button" disabled={!onlineAvailable} onClick={()=>connect(true)}>Create a private room</button><div className="join-field"><input className="text-input" aria-label="Room code" maxLength={8} placeholder="Enter room code" value={roomInput} onChange={event=>setRoomInput(event.target.value.toUpperCase())}/><button type="button" className="button button-secondary join-button" disabled={!onlineAvailable||!roomInput.trim()} onClick={()=>connect(false)}>Join</button></div>{!onlineAvailable&&<p className="setup-note">Private rooms will be available when the game server is connected.</p>}</>:<><div className="room-code-box"><span>{room}</span><button type="button" onClick={copy} aria-label="Copy room invite link">{copied?<Check size={17}/>:<Copy size={17}/>}</button></div><button type="button" className="button button-secondary full-button" onClick={copy}>Copy invite link</button><button type="button" className="leave-button full-button" onClick={disconnect}><X size={14}/>Leave room</button></>}</div></div></details>
      </section>
      <aside className="side-card guide-card"><div className="section-heading"><div><span className="section-kicker">QUICK GUIDE</span><h2>How to play</h2></div><Sparkles size={18}/></div><ol className="guide-list"><li><span className="guide-number">01</span><div><b>Roll a six</b><p>Bring one of your four tokens out to the track.</p></div></li><li><span className="guide-number">02</span><div><b>Make your move</b><p>Tap a glowing token to race around the board.</p></div></li><li><span className="guide-number">03</span><div><b>Find your way home</b><p>Finish all four tokens first to win the game.</p></div></li></ol><div className="soft-rule"/><div className="guide-note"><span className="star-badge">★</span><p>Land on a star to stay safe. Capture a rival or reach home to roll again.</p></div><div className="audio-toggles"><button type="button" onClick={()=>setMusicOn(value=>!value)} aria-pressed={musicOn}>{musicOn?<Pause size={16}/>:<Play size={16}/>}<span>Music</span><b>{musicOn?'On':'Off'}</b></button><button type="button" onClick={()=>setSfxOn(value=>!value)} aria-pressed={sfxOn}>{sfxOn?<Volume2 size={16}/>:<VolumeX size={16}/>}<span>Sound</span><b>{sfxOn?'On':'Off'}</b></button></div></aside>
    </section>
    <footer className="page-footer"><span>Good games, good company.</span><span>Made for the moments in between.</span></footer>
    {toast&&<div className="toast" role="status">{toast}</div>}
  </main>;
}
export default App;
