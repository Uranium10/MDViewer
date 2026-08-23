"use client";
import { memo, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH, LOCK_RESET_LIMIT, canPlace, createTetrisState, ghostY, gravityDelay, miniCells, pieceCells, tetrisReducer, type Board, type Tetromino } from "@/lib/tetris";

type Props={onBack:()=>void};
type RecordItem={score:number;lines:number;level:number;playedAt:string};
type TouchGesture={x:number;y:number;lastX:number;lastY:number;started:number;axis:"x"|"y"|null};
const RECORD_KEY="mdbooks:tetris-records";
const recordDate=new Intl.DateTimeFormat("ko-KR",{month:"2-digit",day:"2-digit"});
const HORIZONTAL_DAS=110,HORIZONTAL_REPEAT=34,SOFT_DROP_DAS=80,SOFT_DROP_REPEAT=28;
const ENTRY_RESCUE_MS=850;
const LOCK_DELAY_MS=650;
const LINE_CLEAR_MS=420;

export default function EInkTetris({onBack}:Props){
  const[game,dispatch]=useReducer(tetrisReducer,Date.now(),createTetrisState);
  const[records,setRecords]=useState<RecordItem[]>([]),[recordsOpen,setRecordsOpen]=useState(false);
  const[callout,setCallout]=useState("");
  const boardNode=useRef<HTMLDivElement>(null),touch=useRef<TouchGesture|null>(null),recorded=useRef(false);

  useEffect(()=>{try{const value=JSON.parse(localStorage.getItem(RECORD_KEY)||"[]");if(Array.isArray(value))setRecords(value.filter((item):item is RecordItem=>item&&typeof item.score==="number"&&typeof item.lines==="number"&&typeof item.level==="number"&&typeof item.playedAt==="string"&&!Number.isNaN(Date.parse(item.playedAt))).slice(0,10))}catch{}},[]);
  useEffect(()=>{if(game.status!=="gameover"||recorded.current)return;recorded.current=true;const item={score:game.score,lines:game.lines,level:game.level,playedAt:new Date().toISOString()};setRecords(current=>{const next=[item,...current].sort((a,b)=>b.score-a.score||b.lines-a.lines).slice(0,10);try{localStorage.setItem(RECORD_KEY,JSON.stringify(next))}catch{}return next})},[game.level,game.lines,game.score,game.status]);
  useEffect(()=>{if(game.status!=="playing"||game.lineClearPending)return;let frame=0,last=performance.now();const delay=gravityDelay(game.level);const loop=(now:number)=>{if(now-last>=delay){last=now;dispatch({type:"TICK"})}frame=requestAnimationFrame(loop)};frame=requestAnimationFrame(loop);return()=>cancelAnimationFrame(frame)},[game.level,game.lineClearPending,game.status]);
  useEffect(()=>{if(game.status!=="playing"||game.lineClearPending||game.entryBlocked||canPlace(game.board,{...game.active,y:game.active.y+1}))return;if(game.lockResets>=LOCK_RESET_LIMIT){dispatch({type:"LOCK"});return}const timer=setTimeout(()=>dispatch({type:"LOCK"}),LOCK_DELAY_MS);return()=>clearTimeout(timer)},[game.active,game.board,game.entryBlocked,game.lineClearPending,game.lockResets,game.status]);
  useEffect(()=>{if(!game.lineClearPending)return;const timer=setTimeout(()=>dispatch({type:"CLEAR_COMPLETE"}),LINE_CLEAR_MS);return()=>clearTimeout(timer)},[game.lineClearPending]);
  useEffect(()=>{if(game.status!=="playing"||game.lineClearPending||!game.entryBlocked)return;const timer=setTimeout(()=>dispatch({type:"TOP_OUT"}),ENTRY_RESCUE_MS);return()=>clearTimeout(timer)},[game.entryBlocked,game.lineClearPending,game.status]);
  useEffect(()=>{if(!game.lockId||typeof navigator.vibrate!=="function")return;navigator.vibrate(18);return()=>{navigator.vibrate(0)}},[game.lockId]);
  useEffect(()=>{if(!game.judgement)return;setCallout(game.judgement);const timer=setTimeout(()=>setCallout(""),1350);return()=>clearTimeout(timer)},[game.judgement,game.judgementId]);
  useEffect(()=>{const visibility=()=>{if(document.hidden)dispatch({type:"PAUSE"})};document.addEventListener("visibilitychange",visibility);return()=>document.removeEventListener("visibilitychange",visibility)},[]);
  useEffect(()=>{const held=new Set<string>();let activeHorizontal:string|null=null,horizontalDelay:ReturnType<typeof setTimeout>|null=null,horizontalRepeat:ReturnType<typeof setInterval>|null=null,downDelay:ReturnType<typeof setTimeout>|null=null,downRepeat:ReturnType<typeof setInterval>|null=null;const clearHorizontal=()=>{if(horizontalDelay)clearTimeout(horizontalDelay);if(horizontalRepeat)clearInterval(horizontalRepeat);horizontalDelay=null;horizontalRepeat=null;activeHorizontal=null};const startHorizontal=(code:string)=>{clearHorizontal();activeHorizontal=code;const move=()=>dispatch({type:"MOVE",dx:code==="ArrowLeft"?-1:1});move();horizontalDelay=setTimeout(()=>{horizontalRepeat=setInterval(move,HORIZONTAL_REPEAT)},HORIZONTAL_DAS)};const clearDown=()=>{if(downDelay)clearTimeout(downDelay);if(downRepeat)clearInterval(downRepeat);downDelay=null;downRepeat=null};const startDown=()=>{clearDown();dispatch({type:"SOFT_DROP"});downDelay=setTimeout(()=>{downRepeat=setInterval(()=>dispatch({type:"SOFT_DROP"}),SOFT_DROP_REPEAT)},SOFT_DROP_DAS)};const clearAll=()=>{held.clear();clearHorizontal();clearDown()};const keyDown=(event:KeyboardEvent)=>{if(recordsOpen){if(event.key==="Escape")setRecordsOpen(false);return}const code=event.code;if(["ArrowLeft","ArrowRight","ArrowDown","ArrowUp","Space","KeyZ","KeyX","KeyC","KeyP"].includes(code))event.preventDefault();if(code==="ArrowLeft"||code==="ArrowRight"){if(!held.has(code)){held.add(code);startHorizontal(code)}return}if(code==="ArrowDown"){if(!held.has(code)){held.add(code);startDown()}return}if(event.repeat)return;if(code==="ArrowUp"||code==="KeyX")dispatch({type:"ROTATE",direction:1});else if(code==="KeyZ")dispatch({type:"ROTATE",direction:-1});else if(code==="Space")dispatch({type:"HARD_DROP"});else if(code==="KeyC")dispatch({type:"HOLD"});else if(code==="KeyP")dispatch({type:"TOGGLE_PAUSE"})};const keyUp=(event:KeyboardEvent)=>{const code=event.code;held.delete(code);if(code==="ArrowDown")clearDown();if(code===activeHorizontal){const fallback=code==="ArrowLeft"?"ArrowRight":"ArrowLeft";clearHorizontal();if(held.has(fallback))startHorizontal(fallback)}};addEventListener("keydown",keyDown);addEventListener("keyup",keyUp);addEventListener("blur",clearAll);return()=>{removeEventListener("keydown",keyDown);removeEventListener("keyup",keyUp);removeEventListener("blur",clearAll);clearAll()}},[recordsOpen]);

  const restart=()=>{recorded.current=false;setRecordsOpen(false);dispatch({type:"RESET",seed:Date.now()})};
  const openRecords=()=>{dispatch({type:"PAUSE"});setRecordsOpen(true)};
  const leave=()=>{dispatch({type:"PAUSE"});onBack()};
  const pointerDown=(event:React.PointerEvent<HTMLDivElement>)=>{if(game.status!=="playing"||game.lineClearPending||!event.isPrimary)return;touch.current={x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,started:performance.now(),axis:null};event.currentTarget.setPointerCapture(event.pointerId)};
  const pointerMove=(event:React.PointerEvent<HTMLDivElement>)=>{const gesture=touch.current,node=boardNode.current;if(!gesture||!node)return;const totalX=event.clientX-gesture.x,totalY=event.clientY-gesture.y;if(!gesture.axis&&Math.max(Math.abs(totalX),Math.abs(totalY))>8)gesture.axis=Math.abs(totalX)>Math.abs(totalY)?"x":"y";const rect=node.getBoundingClientRect();if(gesture.axis==="x"){const step=Math.max(14,rect.width/BOARD_WIDTH*.72),delta=event.clientX-gesture.lastX,moves=Math.min(4,Math.floor(Math.abs(delta)/step));for(let index=0;index<moves;index++)dispatch({type:"MOVE",dx:delta<0?-1:1});if(moves)gesture.lastX+=Math.sign(delta)*moves*step}else if(gesture.axis==="y"){const step=Math.max(12,rect.height/BOARD_HEIGHT*.66),delta=event.clientY-gesture.lastY;if(delta>=step){const moves=Math.min(5,Math.floor(delta/step));for(let index=0;index<moves;index++)dispatch({type:"SOFT_DROP"});gesture.lastY+=moves*step}}};
  const pointerUp=(event:React.PointerEvent<HTMLDivElement>)=>{const gesture=touch.current;if(!gesture)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y,duration=Math.max(1,performance.now()-gesture.started),distance=Math.hypot(dx,dy);if(gesture.axis==="y"&&dy>28&&duration<230&&dy/duration>.48)dispatch({type:"HARD_DROP"});else if(distance<10&&duration<320)dispatch({type:"ROTATE",direction:1});touch.current=null};

  const activeCells=useMemo(()=>pieceCells(game.active).filter(cell=>cell.y>=0),[game.active]);
  const ghostCells=useMemo(()=>game.entryBlocked?[]:pieceCells({...game.active,y:ghostY(game.board,game.active)}).filter(cell=>cell.y>=0),[game.active,game.board,game.entryBlocked]);
  return <section className="tetris-screen" aria-label="MD북스 전자종이 테트리스">
    <header className="tetris-status-bar"><strong>BLOCKS</strong></header>
    <div className="tetris-stage">
      <div className="tetris-score-panel"><span><small>SCORE</small><b>{game.score.toLocaleString()}</b></span><span><small>LINES</small><b>{game.lines}</b></span><span><small>LV</small><b>{game.level}</b></span></div>
      <aside className="tetris-side-panel">
        <button className={`tetris-piece-panel hold-panel ${game.canHold?"":"is-locked"}`} onClick={()=>dispatch({type:"HOLD"})} disabled={game.status!=="playing"||!game.canHold} aria-label="현재 블록 홀드"><strong>HOLD</strong>{game.hold?<MiniPiece type={game.hold}/>:<span className="empty-piece">−</span>}</button>
        <div className="tetris-next"><strong>NEXT</strong>{game.queue.slice(0,3).map((type,index)=><MiniPiece key={`${type}-${index}`} type={type}/>)}</div>
      </aside>
      <div ref={boardNode} className="tetris-board" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>{touch.current=null}} onContextMenu={event=>event.preventDefault()}>
        <SettledBoard board={game.board}/>
        <div className="tetris-piece-layer is-ghost" aria-hidden="true">{ghostCells.map((cell,index)=><i key={index} style={{gridColumn:cell.x+1,gridRow:cell.y+1}}/>)}</div>
        <div className="tetris-piece-layer is-active" aria-hidden="true">{activeCells.map((cell,index)=><i key={index} style={{gridColumn:cell.x+1,gridRow:cell.y+1}}/>)}</div>
        {game.lineClearPending&&<div className="tetris-line-flash" aria-hidden="true">{game.clearedRows.map(row=><i key={row} style={{gridRow:row+1}}/>)}</div>}
        {callout&&<div key={game.judgementId} className="tetris-judgement" role="status">{callout.split("|").map(line=><span key={line}>{line}</span>)}</div>}
        {game.entryBlocked&&<div className="tetris-rescue-warning" role="status">MOVE · ROTATE!</div>}
        {game.status!=="playing"&&<div className="tetris-game-overlay"><strong>{game.status==="gameover"?"GAME OVER":"PAUSED"}</strong><small>{game.status==="gameover"?`${game.score.toLocaleString()}점`:"게임이 멈춰 있습니다"}</small><button onClick={game.status==="gameover"?restart:()=>dispatch({type:"TOGGLE_PAUSE"})}>{game.status==="gameover"?"다시 시작":"계속하기"}</button></div>}
      </div>
    </div>
    <nav className="feature-toolbar tetris-toolbar" aria-label="테트리스 메뉴"><GameTool icon="back" label="뒤로" onClick={leave}/><GameTool icon="pause" label={game.status==="paused"?"계속":"일시 정지"} onClick={()=>dispatch({type:"TOGGLE_PAUSE"})} disabled={game.status==="gameover"}/><GameTool icon="record" label="기록" onClick={openRecords}/></nav>
    {recordsOpen&&<div className="tetris-records-backdrop" onPointerDown={event=>{if(event.target===event.currentTarget)setRecordsOpen(false)}}><section className="tetris-records" role="dialog" aria-modal="true" aria-labelledby="tetris-record-title"><header><span>LOCAL DATA</span><strong id="tetris-record-title">게임 기록</strong><button onClick={()=>setRecordsOpen(false)} aria-label="기록 닫기">×</button></header>{records.length?<ol>{records.map((item,index)=><li key={`${item.playedAt}-${index}`}><b>{String(index+1).padStart(2,"0")}</b><span>{item.score.toLocaleString()}점<small>{item.lines}줄 · LV {item.level}</small></span><time>{recordDate.format(new Date(item.playedAt))}</time></li>)}</ol>:<p>아직 저장된 기록이 없습니다.</p>}<footer><small>이 기기의 브라우저에만 저장됩니다.</small><button onClick={restart}>새 게임</button></footer></section></div>}
  </section>;
}

const SettledBoard=memo(function SettledBoard({board}:{board:Board}){return <div className="tetris-settled" aria-hidden="true">{board.flatMap((row,y)=>row.map((cell,x)=><i key={`${x}-${y}`} className={cell?"is-filled":""}/>))}</div>});
function MiniPiece({type}:{type:Tetromino}){const occupied=new Set(miniCells(type).map(([x,y])=>`${x}:${y}`));return <span className="mini-piece" aria-hidden="true">{Array.from({length:16},(_,index)=><i key={index} className={occupied.has(`${index%4}:${Math.floor(index/4)}`)?"is-filled":""}/>)}</span>}
function GameTool({icon,label,onClick,disabled=false}:{icon:string;label:string;onClick:()=>void;disabled?:boolean}){return <button onClick={onClick} disabled={disabled}><i className={`pixel-icon icon-${icon}`} aria-hidden="true"/><span>{label}</span></button>}
