import { useEffect, useRef } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

type Props={markdown:string;progress:number;onProgress:(n:number)=>void;restore:number};
export default function ScrollReader({markdown,progress,onProgress,restore}:Props){
  const scroller=useRef<HTMLElement>(null);
  const progressLine=useRef<HTMLDivElement>(null);
  const initialRestore=useRef(restore);
  const onProgressRef=useRef(onProgress);
  onProgressRef.current=onProgress;

  useEffect(()=>{
    const node=scroller.current;
    if(!node)return;
    let frame:number|null=null;
    let trailing:ReturnType<typeof setTimeout>|null=null;
    let lastEmit=0;
    const calculate=()=>{
      frame=null;
      const max=node.scrollHeight-node.clientHeight;
      const next=max>0?node.scrollTop/max:0;
      if(progressLine.current)progressLine.current.style.transform=`scaleX(${next})`;
      const now=performance.now();
      if(now-lastEmit>=100){lastEmit=now;onProgressRef.current(next)}
      if(trailing)clearTimeout(trailing);
      trailing=setTimeout(()=>onProgressRef.current(next),120);
    };
    const handle=()=>{if(frame===null)frame=requestAnimationFrame(calculate)};
    requestAnimationFrame(()=>{const max=node.scrollHeight-node.clientHeight;node.scrollTop=initialRestore.current*Math.max(0,max);calculate()});
    node.addEventListener("scroll",handle,{passive:true});
    return()=>{node.removeEventListener("scroll",handle);if(frame!==null)cancelAnimationFrame(frame);if(trailing)clearTimeout(trailing)};
  },[markdown]);

  return <><div ref={progressLine} className="progress-line" style={{transform:`scaleX(${progress})`}}/><article ref={scroller} className="scroll-reader"><MarkdownRenderer markdown={markdown}/></article></>;
}
