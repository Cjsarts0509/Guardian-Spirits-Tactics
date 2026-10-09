import { useEffect, useState } from 'react';
import manifest from '../public/ui/portraits.json';
const BASE = import.meta.env.BASE_URL;
const aliases: Record<string,string> = { freia:'freya', sepi:'sephy', mertz:'mertzkiel', krate:'crate', hermilly:'humily', loneris:'roneris', zwinra:'zwinla', kanulla:'kanula' };
export const artOf = (character: string | null | undefined) => (manifest as Record<string,{portrait:string;faction:string}>)[aliases[character ?? ''] ?? character ?? ''] ?? manifest.unknownhooded;
export const portraitArt = (character: string | null | undefined) => `${BASE}ui/${artOf(character).portrait}`;
const frames = new Map<string, Promise<string>>();
/** Keep FINAL source pixels intact; remove its production chroma key only at render time. */
function keyedFrame(faction: string): Promise<string> {
 const cached = frames.get(faction); if(cached)return cached;
 const promise = new Promise<string>((resolve,reject)=>{const img = new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4){const r=pixels.data[i]!,g=pixels.data[i+1]!,b=pixels.data[i+2]!;if(r>150&&b>150&&g<100&&Math.min(r,b)>g*1.8)pixels.data[i+3]=0;}ctx.putImageData(pixels,0,0);resolve(canvas.toDataURL('image/png'));};img.onerror=reject;img.src=`${BASE}ui/frame-${faction}.webp`;});frames.set(faction,promise);return promise;
}
export function CharacterCard({character,name,title,dead=false}:{character:string|null;name?:string;title?:string;dead?:boolean}) {
 const art=artOf(character);const [frame,setFrame]=useState('');
 useEffect(()=>{let active=true;setFrame('');keyedFrame(art.faction).then(src=>{if(active)setFrame(src);}).catch(()=>{});return()=>{active=false;};},[art.faction]);
 return <div className={`character-art faction-${art.faction} ${dead?'fallen':''}`}><img className="character-portrait" src={portraitArt(character)} alt={character?(name??'캐릭터'):'정체 미공개'} />{frame&&<img className="character-frame" src={frame} alt=""/>}<div className="character-name">{name??(character?'':'정체 미공개')}</div><div className="character-title">{title??(character?'':'UNKNOWN')}</div></div>;
}
