import {useEffect,useRef,useState} from 'react';
import type {GameEvent,PlayerView} from '@gst/rules';
import {skillFamily} from './skill-art.js';
import {CharacterCard} from './art.js';
export function CombatCinema({events,view,known,cast}:{events:GameEvent[];view:PlayerView;known:Map<string,{character:string|null}>;cast:GameEvent|null}) {
 const seen=useRef(events.at(-1)?.seq??0);const queue=useRef<GameEvent[]>([]);const [event,setEvent]=useState<GameEvent|null>(null);
 const seenCast=useRef<number|null>(null);
 useEffect(()=>{if(cast&&cast.seq!==seenCast.current){seenCast.current=cast.seq;queue.current.unshift(cast);}
 const fresh=events.filter(e=>e.seq>seen.current);seen.current=events.at(-1)?.seq??seen.current;
 if(fresh.length<30)queue.current.push(...fresh.filter(e=>/^(attack\.|death$|inspect\.result|gem\.use|skill\.|status\.)/.test(e.kind)).slice(-8));
 queue.current=queue.current.slice(-12);
 if(!event)setEvent(queue.current.shift()??null);
 },[events,event,cast]);
 useEffect(()=>{if(!event)return;const timer=setTimeout(()=>setEvent(null),2800);return()=>clearTimeout(timer);},[event]);
 if(!event)return null;
 const d=event.data??{};
 // Event fields can hold a public character or a player id. Never use roster assignment guesses.
 const resolve=(value:unknown)=>{if(typeof value!=='string')return null;const p=view.players.find(p=>p.id===value);if(p)return {character:p.id===view.me.id?view.me.character:p.revealed??known.get(p.id)?.character??null,nickname:p.nickname};const c=view.roster.find(c=>c.key===value);return c?{character:c.key,nickname:''}:null;};
 const source=resolve(d.attacker??d.actor??d.source);const target=resolve(d.target??d.player);
 const lethal=/kill|death/.test(event.kind);const failed=/fail|guard|block/.test(event.kind)||d.success===false;
 const family=typeof d.skill==='string'?skillFamily(d.skill):null;
 const effect=lethal?'shatter':failed?'shield':(/inspect|gem|scan/.test(event.kind)||['inspect','scan','gem','publish'].includes(family??''))?'reveal':(/incapacitated|jail|curse/.test(event.kind)||family==='curse')?'curse':['guard','heal','ally','holy','mana'].includes(family??'')?'shield':'strike';
 const card=(p:NonNullable<ReturnType<typeof resolve>>)=>{const c=view.roster.find(c=>c.key===p.character);return <CharacterCard character={p.character} name={c?.name} title={c?.title}/>;};
 return <div key={event.seq} className={`combat-cinema ${lethal?'lethal':''}`} aria-live="polite">{source&&card(source)}<div className={`combat-caption effect-${effect}`}><img className="combat-effect" src={`${import.meta.env.BASE_URL}ui/effect-${effect}.webp`} alt="" onError={e=>{e.currentTarget.style.display='none';}}/><p>{event.text}</p>{target?.nickname&&<small>{target.nickname}</small>}</div>{target&&card(target)}</div>;
}
