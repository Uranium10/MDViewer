"use client";
import { memo, type CSSProperties } from "react";
import styles from "./LegacyPageTurnEffect.module.css";

type Props={progress:number;fromLeft?:boolean};

/** Preserved pre-View-Transition corner fold. Import explicitly to opt in. */
function LegacyPageTurnEffect({progress,fromLeft=false}:Props){
  const turn=Math.max(0,Math.min(1,progress));
  return <div className={`${styles.effect} ${fromLeft?styles.fromLeft:""}`} style={{"--legacy-turn":turn,opacity:turn>.002?1:0} as CSSProperties} aria-hidden="true"><i/><b/></div>;
}

export default memo(LegacyPageTurnEffect);
