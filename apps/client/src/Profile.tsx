import {useEffect,useState} from 'react';
import type {ProfileData} from '@gst/protocol';
import {net} from './net.js';
const names:Record<string,string>={civil_war:'왕자들의 내전',primordial:'태초의 전쟁',lidellut:'리델루트 황야',troll:'트롤 부족의 반란'};
export function Profile({onClose}:{onClose:()=>void}) {
 const [profile,setProfile]=useState<ProfileData|null>(null);const [error,setError]=useState('');
 useEffect(()=>{const off=net.on(m=>{if(m.type==='profile')setProfile(m.profile);if(m.type==='error')setError(m.message);});net.send({type:'profile.get'});return off;},[]);
 return <div className="modal-backdrop"><section role="dialog" aria-modal="true" aria-label="내 정보" className="hall-panel profile-panel"><div className="row spread"><h2>{profile?.nickname??'내 정보'} · 모드별 전적</h2><button className="ghost" onClick={onClose}>닫기</button></div>{error?<p role="alert">{error}</p>:!profile?<p>전적을 불러오는 중…</p>:profile.guest?<p>게스트는 계정 전적이 저장되지 않습니다. 메인화면에서 로그인해 주세요.</p>:<table><thead><tr><th>모드</th><th>경기</th><th>승리</th><th>패배</th><th>승률</th></tr></thead><tbody>{Object.entries(names).map(([mode,name])=>{const r=profile.modes.find(x=>x.mode===mode);return <tr key={mode}><th>{name}</th><td>{r?.played??0}</td><td>{r?.won??0}</td><td>{r?.lost??0}</td><td>{r?.played?`${(100*r.won/r.played).toFixed(1)}%`:'—'}</td></tr>;})}</tbody></table>}</section></div>;
}
