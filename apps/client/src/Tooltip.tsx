import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
/** Render above containers and clamp after measuring, including small viewports. */
export function Tooltip({children,content}:{children:ReactNode;content:ReactNode}) {
 const [anchor,setAnchor]=useState<{x:number;y:number}|null>(null),[pos,setPos]=useState({left:8,top:8});const box=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(!anchor||!box.current)return;const b=box.current.getBoundingClientRect();setPos({left:Math.max(8,Math.min(anchor.x,innerWidth-b.width-8)),top:Math.max(8,Math.min(anchor.y+12,innerHeight-b.height-8))});},[anchor]);
 return <span className="tooltip-anchor" onMouseEnter={e=>{const r=e.currentTarget.getBoundingClientRect();setAnchor({x:r.right,y:r.top});}} onMouseLeave={()=>setAnchor(null)} onFocus={e=>{const r=e.currentTarget.getBoundingClientRect();setAnchor({x:r.right,y:r.top});}} onBlur={()=>setAnchor(null)}>{children}{anchor&&createPortal(<div role="tooltip" className="skill-tooltip" ref={box} style={pos}>{content}</div>,document.body)}</span>;
}
