import manifest from '../public/ui/portraits.json';
const BASE = import.meta.env.BASE_URL;
const aliases: Record<string,string> = { freia:'freya', sepi:'sephy', mertz:'mertzkiel', krate:'crate', hermilly:'humily', loneris:'roneris', zwinra:'zwinla', kanulla:'kanula' };
export const artOf = (character: string | null | undefined) => (manifest as Record<string,{portrait:string;faction:string}>)[aliases[character ?? ''] ?? character ?? ''] ?? manifest.unknownhooded;
export const portraitArt = (character: string | null | undefined) => `${BASE}ui/${artOf(character).portrait}`;
export function CharacterCard({character,name,title,dead=false}:{character:string|null;name?:string;title?:string;dead?:boolean}) {
 const art=artOf(character);const frame=`${BASE}ui/frame-${art.faction}-v3.webp`;
 return <div className={`character-art faction-${art.faction} ${dead?'fallen':''}`}><img className="character-portrait" src={portraitArt(character)} alt={character?(name??'캐릭터'):'정체 미공개'} />{frame&&<img className="character-frame" src={frame} alt=""/>}<div className="character-name">{name??(character?'':'정체 미공개')}</div><div className="character-title">{title??(character?'':'UNKNOWN')}</div></div>;
}
