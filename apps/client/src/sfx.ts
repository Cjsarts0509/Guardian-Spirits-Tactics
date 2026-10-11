const BASE=import.meta.env.BASE_URL;
export const SOUND_OPTIONS={
 ui_click:[['interface/click_001.ogg','클릭 1'],['interface/select_001.ogg','선택 1']],
 countdown_tick:[['interface/tick_001.ogg','틱 1'],['interface/tick_002.ogg','틱 2']],
 countdown_start:[['interface/confirmation_001.ogg','확정 1'],['impact/impactBell_heavy_000.ogg','무거운 종']],
 attack_hit:[['sword/sword.1.ogg','검격 1'],['impact/impactPunch_heavy_000.ogg','무거운 타격']],
 attack_fail:[['clash/sword_clash.1.ogg','검 충돌 1'],['impact/impactMetal_medium_000.ogg','금속 방어']],
 death:[['interface/scratch_001.ogg','긁힘·파열'],['impact/impactWood_heavy_000.ogg','무거운 파손']]
} as const;
export type SoundId=keyof typeof SOUND_OPTIONS;
export const SOUND_LABELS:Record<SoundId,string>={ui_click:'버튼',countdown_tick:'카운트다운',countdown_start:'시작',attack_hit:'공격 성공',attack_fail:'공격 실패',death:'사망·카드 파손'};
declare const __GST_SFX_FILES__:string[];
const supplied=Object.fromEntries(__GST_SFX_FILES__.map(file=>[`/public/sfx/${file}`,`${BASE}sfx/${file}`]));
class Effects {
 volume=.5; muted=false; choices:Partial<Record<SoundId,string>>={};
 constructor(){try{const data=JSON.parse(localStorage.getItem('gst.sfx')??'{}');this.volume=Math.max(0,Math.min(1,data.volume??.5));this.muted=!!data.muted;this.choices=data.choices??{};}catch{}}
 save(){localStorage.setItem('gst.sfx',JSON.stringify({volume:this.volume,muted:this.muted,choices:this.choices}));window.dispatchEvent(new Event('gst.sound.changed'));}
 preview(file:string){const a=new Audio(`${BASE}sfx/candidates/${file}`);a.volume=this.volume;void a.play().catch(()=>{});}
 play(id:SoundId|string){if(this.muted||!this.volume)return;const file=supplied[`/public/sfx/${id}.mp3`]??null;if(!file)return;const a=new Audio(file);a.volume=this.volume;void a.play().catch(()=>{});}
}
export const sfx=new Effects();
