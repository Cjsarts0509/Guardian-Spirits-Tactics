import {it,expect,vi,afterEach} from 'vitest';
vi.mock('../../client/src/auth.js',()=>({loadConfig:async()=>({auth:{supabaseUrl:'https://fixture.invalid',supabasePublishableKey:'public'}}),currentToken:async()=>({accessToken:'token',userId:'account'})}));
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.resetModules();});
it('로그인 계정의 소리 설정 복원과 인증된 저장, 설정값 범위 보정',async()=>{
 vi.stubGlobal('__GST_SFX_FILES__',[]);vi.stubGlobal('window',new EventTarget());vi.stubGlobal('localStorage',{getItem:()=>null,setItem:vi.fn()});
 const calls:{url:string;init?:RequestInit}[]=[];vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{calls.push({url,init});return new Response(JSON.stringify({user_metadata:{gst_sound:{bgm:{volume:.25,muted:true},sfx:{volume:2,muted:false}}}}));}));
 const dir='../../client/src/';const {loadAccountSound}=await import(dir+'sound-account.ts');const {bgm}=await import(dir+'bgm.ts');const {sfx}=await import(dir+'sfx.ts');
 await loadAccountSound();expect(bgm.volume).toBe(.25);expect(bgm.muted).toBe(true);expect(sfx.volume).toBe(1);expect(calls).toHaveLength(1);
 vi.useFakeTimers();sfx.volume=.4;sfx.save();await vi.advanceTimersByTimeAsync(600);expect(calls).toHaveLength(2);expect(calls[1]!.init?.method).toBe('PUT');expect(calls[1]!.init?.headers).toMatchObject({Authorization:'Bearer token',apikey:'public'});expect(JSON.parse(String(calls[1]!.init?.body))).toEqual({data:{gst_sound:{bgm:{volume:.25,muted:true},sfx:{volume:.4,muted:false}}}});
});
