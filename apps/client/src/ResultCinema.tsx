import {useEffect} from 'react';
import {sfx} from './sfx.js';
import type {PlayerView,SpectatorView} from '@gst/rules';
import {artOf} from './art.js';
export function ResultCinema({view}:{view:PlayerView|SpectatorView}) {
 const player=!('spectator' in view),won=player&&view.me.side===view.winner,faction=player?artOf(view.me.character).faction:'P1';
 useEffect(()=>{sfx.play(`result_${faction}_${won?'win':'loss'}`);},[faction,won]);
 return <div className={`result-cinematic ${won?'win':'loss'}`} role="status"><img src={`${import.meta.env.BASE_URL}ui/result-${faction}-${won?'win':'loss'}.webp`} alt={won?'승리':'패배'}/><h1>{player?(won?'승리':'패배'):'전투 종료'}</h1></div>;
}
