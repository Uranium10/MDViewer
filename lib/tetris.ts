export const BOARD_WIDTH=10;
export const BOARD_HEIGHT=20;
export const LOCK_RESET_LIMIT=24;

export type Tetromino="I"|"J"|"L"|"O"|"S"|"T"|"Z";
export type Rotation=0|1|2|3;
export type Cell=Tetromino|null;
export type Board=Cell[][];
export type Piece={type:Tetromino;rotation:Rotation;x:number;y:number};
export type GameStatus="playing"|"paused"|"gameover";
export type TetrisState={board:Board;active:Piece;queue:Tetromino[];hold:Tetromino|null;canHold:boolean;score:number;lines:number;level:number;status:GameStatus;seed:number;lockResets:number;entryBlocked:boolean;lastMoveWasRotation:boolean;combo:number;backToBack:boolean;judgement:string|null;judgementId:number};
export type TetrisAction=
  |{type:"MOVE";dx:-1|1}
  |{type:"ROTATE";direction:1|-1}
  |{type:"SOFT_DROP"}
  |{type:"HARD_DROP"}
  |{type:"TICK"}
  |{type:"LOCK"}
  |{type:"TOP_OUT"}
  |{type:"HOLD"}
  |{type:"TOGGLE_PAUSE"}
  |{type:"PAUSE"}
  |{type:"RESET";seed:number};

type Point=readonly[x:number,y:number];
type Shape=readonly[readonly Point[],readonly Point[],readonly Point[],readonly Point[]];

const SHAPES:Record<Tetromino,Shape>={
  I:[[[0,1],[1,1],[2,1],[3,1]],[[2,0],[2,1],[2,2],[2,3]],[[0,2],[1,2],[2,2],[3,2]],[[1,0],[1,1],[1,2],[1,3]]],
  J:[[[0,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[1,2]],[[0,1],[1,1],[2,1],[2,2]],[[1,0],[1,1],[0,2],[1,2]]],
  L:[[[2,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[1,2],[2,2]],[[0,1],[1,1],[2,1],[0,2]],[[0,0],[1,0],[1,1],[1,2]]],
  O:[[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]]],
  S:[[[1,0],[2,0],[0,1],[1,1]],[[1,0],[1,1],[2,1],[2,2]],[[1,1],[2,1],[0,2],[1,2]],[[0,0],[0,1],[1,1],[1,2]]],
  T:[[[1,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[2,1],[1,2]],[[1,0],[0,1],[1,1],[1,2]]],
  Z:[[[0,0],[1,0],[1,1],[2,1]],[[2,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[1,2],[2,2]],[[1,0],[0,1],[1,1],[0,2]]],
};

const JLSTZ_KICKS:Record<string,readonly Point[]>={
  "0>1":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],"1>0":[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "1>2":[[0,0],[1,0],[1,1],[0,-2],[1,-2]],"2>1":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "2>3":[[0,0],[1,0],[1,-1],[0,2],[1,2]],"3>2":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "3>0":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],"0>3":[[0,0],[1,0],[1,-1],[0,2],[1,2]],
};
const I_KICKS:Record<string,readonly Point[]>={
  "0>1":[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],"1>0":[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],
  "1>2":[[0,0],[-1,0],[2,0],[-1,-2],[2,1]],"2>1":[[0,0],[1,0],[-2,0],[1,2],[-2,-1]],
  "2>3":[[0,0],[2,0],[-1,0],[2,-1],[-1,2]],"3>2":[[0,0],[-2,0],[1,0],[-2,1],[1,-2]],
  "3>0":[[0,0],[1,0],[-2,0],[1,2],[-2,-1]],"0>3":[[0,0],[-1,0],[2,0],[-1,-2],[2,1]],
};

export const createBoard=():Board=>Array.from({length:BOARD_HEIGHT},()=>Array<Cell>(BOARD_WIDTH).fill(null));
export const pieceCells=(piece:Piece)=>SHAPES[piece.type][piece.rotation].map(([dx,dy])=>({x:piece.x+dx,y:piece.y+dy}));
export const miniCells=(type:Tetromino)=>SHAPES[type][0];

export function canPlace(board:Board,piece:Piece){
  return pieceCells(piece).every(({x,y})=>x>=0&&x<BOARD_WIDTH&&y<BOARD_HEIGHT&&(y<0||board[y][x]===null));
}
function placementConflicts(board:Board,piece:Piece){let conflicts=0;for(const{x,y}of pieceCells(piece)){if(x<0||x>=BOARD_WIDTH||y>=BOARD_HEIGHT)return Number.POSITIVE_INFINITY;if(y>=0&&board[y][x]!==null)conflicts++}return conflicts}

export function ghostY(board:Board,piece:Piece){let y=piece.y;while(canPlace(board,{...piece,y:y+1}))y++;return y}

function nextRandom(seed:number){let value=seed>>>0||0x9e3779b9;value^=value<<13;value^=value>>>17;value^=value<<5;return{seed:value>>>0,value:(value>>>0)/4294967296}}
function makeBag(seed:number){const bag:Tetromino[]=["I","J","L","O","S","T","Z"];let nextSeed=seed;for(let index=bag.length-1;index>0;index--){const random=nextRandom(nextSeed);nextSeed=random.seed;const swap=Math.floor(random.value*(index+1));[bag[index],bag[swap]]=[bag[swap],bag[index]]}return{bag,seed:nextSeed}}
function fillQueue(queue:Tetromino[],seed:number,min=8){const next=[...queue];let nextSeed=seed;while(next.length<min){const result=makeBag(nextSeed);next.push(...result.bag);nextSeed=result.seed}return{queue:next,seed:nextSeed}}
function spawn(type:Tetromino):Piece{return{type,rotation:0,x:3,y:-1}}
function takeNext(queue:Tetromino[],seed:number){const filled=fillQueue(queue,seed);const[type,...rest]=filled.queue;const replenished=fillQueue(rest,filled.seed);return{piece:spawn(type),queue:replenished.queue,seed:replenished.seed}}

export function createTetrisState(seed=Date.now()):TetrisState{
  const next=takeNext([],seed>>>0);
  return{board:createBoard(),active:next.piece,queue:next.queue,hold:null,canHold:true,score:0,lines:0,level:1,status:"playing",seed:next.seed,lockResets:0,entryBlocked:false,lastMoveWasRotation:false,combo:-1,backToBack:false,judgement:null,judgementId:0};
}

function rotate(board:Board,piece:Piece,direction:1|-1,rescue=false){
  if(piece.type==="O")return piece;
  const rotation=((piece.rotation+direction+4)%4) as Rotation,key=`${piece.rotation}>${rotation}`,tests=piece.type==="I"?I_KICKS[key]:JLSTZ_KICKS[key];
  let best=piece,bestConflicts=placementConflicts(board,piece);
  for(const[dx,dy]of tests||[[0,0] as Point]){const candidate={...piece,rotation,x:piece.x+dx,y:piece.y+dy};if(canPlace(board,candidate))return candidate;const conflicts=placementConflicts(board,candidate);if(rescue&&conflicts<=bestConflicts){best=candidate;bestConflicts=conflicts}}
  return best;
}

function merge(board:Board,piece:Piece){
  const next=board.map(row=>[...row]);let topOut=false;
  for(const{x,y}of pieceCells(piece)){if(y<0){topOut=true;continue}if(y<BOARD_HEIGHT&&x>=0&&x<BOARD_WIDTH)next[y][x]=piece.type}
  return{board:next,topOut};
}
function clearLines(board:Board){const kept=board.filter(row=>row.some(cell=>cell===null)),cleared=BOARD_HEIGHT-kept.length;return{board:[...Array.from({length:cleared},()=>Array<Cell>(BOARD_WIDTH).fill(null)),...kept],cleared}}
function isTSpin(board:Board,piece:Piece,lastMoveWasRotation:boolean){
  if(piece.type!=="T"||!lastMoveWasRotation)return false;
  const centerX=piece.x+1,centerY=piece.y+1;
  return [[-1,-1],[1,-1],[-1,1],[1,1]].filter(([dx,dy])=>{const x=centerX+dx,y=centerY+dy;return x<0||x>=BOARD_WIDTH||y<0||y>=BOARD_HEIGHT||board[y][x]!==null}).length>=3;
}
function lock(state:TetrisState,dropScore=0):TetrisState{
  const tSpin=isTSpin(state.board,state.active,state.lastMoveWasRotation),merged=merge(state.board,state.active),cleared=clearLines(merged.board),totalLines=state.lines+cleared.cleared,level=Math.floor(totalLines/10)+1;
  const difficult=cleared.cleared===4||(tSpin&&cleared.cleared>0),baseScore=tSpin?([400,800,1200,1600][cleared.cleared]||0):([0,100,300,500,800][cleared.cleared]||0),backToBackBonus=difficult&&state.backToBack?1.5:1,combo=cleared.cleared>0?state.combo+1:-1,comboScore=Math.max(0,combo)*50*state.level,lineScore=Math.floor(baseScore*state.level*backToBackBonus)+comboScore;
  const clearName=tSpin?(cleared.cleared?`T-SPIN ${["","SINGLE","DOUBLE","TRIPLE"][cleared.cleared]}`:"T-SPIN"):(cleared.cleared===4?"TETRIS":cleared.cleared?(["","SINGLE","DOUBLE","TRIPLE"][cleared.cleared]||null):null),judgement=[difficult&&state.backToBack?"BACK-TO-BACK":null,clearName,combo>0?`COMBO ${combo+1}`:null].filter(Boolean).join("|")||null;
  const next=takeNext(state.queue,state.seed),entryBlocked=!canPlace(cleared.board,next.piece),status=merged.topOut?"gameover":"playing",backToBack=difficult?true:cleared.cleared>0?false:state.backToBack;
  return{...state,board:cleared.board,active:next.piece,queue:next.queue,seed:next.seed,canHold:true,score:state.score+dropScore+lineScore,lines:totalLines,level,status,lockResets:0,entryBlocked:status==="playing"&&entryBlocked,lastMoveWasRotation:false,combo,backToBack,judgement,judgementId:judgement?state.judgementId+1:state.judgementId};
}

export function tetrisReducer(state:TetrisState,action:TetrisAction):TetrisState{
  if(action.type==="RESET")return createTetrisState(action.seed);
  if(action.type==="TOGGLE_PAUSE")return state.status==="gameover"?state:{...state,status:state.status==="paused"?"playing":"paused"};
  if(action.type==="PAUSE")return state.status==="playing"?{...state,status:"paused"}:state;
  if(action.type==="TOP_OUT")return state.entryBlocked?{...state,status:"gameover",entryBlocked:false}:state;
  if(state.status!=="playing")return state;
  if(action.type==="MOVE"){const active={...state.active,x:state.active.x+action.dx};if(state.entryBlocked){const conflicts=placementConflicts(state.board,active);if(conflicts>placementConflicts(state.board,state.active))return state;return{...state,active,entryBlocked:conflicts>0,lockResets:0,lastMoveWasRotation:false}}if(!canPlace(state.board,active))return state;const wasGrounded=!canPlace(state.board,{...state.active,y:state.active.y+1}),isGrounded=!canPlace(state.board,{...active,y:active.y+1});return{...state,active,lockResets:isGrounded&&wasGrounded?Math.min(LOCK_RESET_LIMIT,state.lockResets+1):0,lastMoveWasRotation:false}}
  if(action.type==="ROTATE"){const active=rotate(state.board,state.active,action.direction,state.entryBlocked);if(active===state.active)return state;if(state.entryBlocked){const conflicts=placementConflicts(state.board,active);return{...state,active,entryBlocked:conflicts>0,lockResets:0,lastMoveWasRotation:true}}const wasGrounded=!canPlace(state.board,{...state.active,y:state.active.y+1}),isGrounded=!canPlace(state.board,{...active,y:active.y+1});return{...state,active,lockResets:isGrounded&&wasGrounded?Math.min(LOCK_RESET_LIMIT,state.lockResets+1):0,lastMoveWasRotation:true}}
  if(action.type==="SOFT_DROP"){const active={...state.active,y:state.active.y+1};return canPlace(state.board,active)?{...state,active,score:state.score+1,lockResets:0,entryBlocked:false}:state}
  if(action.type==="TICK"){const active={...state.active,y:state.active.y+1};return canPlace(state.board,active)?{...state,active,lockResets:0,entryBlocked:false}:state}
  if(action.type==="LOCK")return state.entryBlocked||canPlace(state.board,{...state.active,y:state.active.y+1})?state:lock(state);
  if(action.type==="HARD_DROP"){if(state.entryBlocked)return state;const y=ghostY(state.board,state.active),distance=y-state.active.y;return lock({...state,active:{...state.active,y}},distance*2)}
  if(action.type==="HOLD"){
    if(!state.canHold)return state;
    if(state.hold){const active=spawn(state.hold),entryBlocked=!canPlace(state.board,active);return{...state,active,hold:state.active.type,canHold:false,status:"playing",lockResets:0,entryBlocked,lastMoveWasRotation:false}}
    const next=takeNext(state.queue,state.seed),entryBlocked=!canPlace(state.board,next.piece);return{...state,active:next.piece,queue:next.queue,seed:next.seed,hold:state.active.type,canHold:false,status:"playing",lockResets:0,entryBlocked,lastMoveWasRotation:false};
  }
  return state;
}

export function gravityDelay(level:number){return Math.max(55,Math.pow(.8-(level-1)*.007,level-1)*1000)}
