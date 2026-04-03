"use client";
import { useState, useMemo } from "react";

function poissonPMF(k: number, l: number): number {
  if (l <= 0) return k === 0 ? 1 : 0;
  let f = 1; for (let i = 2; i <= k; i++) f *= i;
  return (Math.pow(l, k) * Math.exp(-l)) / f;
}
function buildScoreProbs(homeXg: number, awayXg: number, max = 4) {
  const scores: { h: number; a: number; label: string; prob: number }[] = [];
  for (let h = 0; h <= max; h++) for (let a = 0; a <= max; a++) scores.push({ h, a, label: `${h}-${a}`, prob: poissonPMF(h, homeXg) * poissonPMF(a, awayXg) });
  return scores.sort((a, b) => b.prob - a.prob);
}
function adjustXg(baseXg: number, gs: string): number {
  const m = gs === "chasing" ? 1.25 : gs === "protecting" ? 0.7 : 1.05;
  return Math.round(baseXg * m * 100) / 100;
}
interface Fix { id: number; home: string; away: string; league: string; flag: string; homePreXg: number; awayPreXg: number; }

const hd = "'Oswald', sans-serif", bd = "'DM Sans', sans-serif", mn = "'IBM Plex Mono', monospace";
const c = { bg:"#0D1117", sf:"#161B22", cd:"#1C2333", ch:"#222D3F", bd2:"#2A3545", g:"#F0C040", gd:"rgba(240,192,64,0.08)", gm:"rgba(240,192,64,0.2)", r:"#FF4060", rd:"rgba(255,64,96,0.08)", cy:"#58B0D4", cyd:"rgba(88,176,212,0.08)", gr:"#40C870", w:"#EEF0F4", t:"#9EAABB", d:"#5A6A7E", dm:"#2E3A4A" };
const css = `@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes glow{0%,100%{box-shadow:0 0 20px rgba(240,192,64,.15)}50%{box-shadow:0 0 40px rgba(240,192,64,.3)}}*{box-sizing:border-box;margin:0;padding:0}html,body{background:${c.bg}}`;

const SC={S:0,I:1,L:2,R:3};

export default function App(){
  const [sc,setSc]=useState(SC.S),[mt,setMt]=useState<Fix|null>(null);
  const [iH,siH]=useState(""),[iA,siA]=useState(""),[iL,siL]=useState(""),[iHx,siHx]=useState(""),[iAx,siAx]=useState("");
  const [hH,sHH]=useState(0),[hA,sHA]=useState(0);
  const [lH,slH]=useState(""),[lA,slA]=useState("");
  const [sH,ssH]=useState(""),[sA,ssA]=useState(""),[soH,ssoH]=useState(""),[soA,ssoA]=useState("");
  const [pH,spH]=useState(""),[pA,spA]=useState(""),[cH,scH]=useState(""),[cA,scA]=useState("");
  const [rc,sRc]=useState("none"),[rv,sRv]=useState(0),[lm,sLm]=useState("");

  const reset=()=>{sHH(0);sHA(0);slH("");slA("");ssH("");ssA("");ssoH("");ssoA("");spH("");spA("");scH("");scA("");sRc("none");};
  const mk=()=>{if(!iH||!iA)return;setMt({id:1,home:iH,away:iA,league:iL||"Match",flag:"",homePreXg:parseFloat(iHx)||1.5,awayPreXg:parseFloat(iAx)||1.0});reset();setSc(SC.I);};
  const cM=iH.trim()!==""&&iA.trim()!=="", cG=lH!==""&&lA!=="";

  const gen=()=>{sRv(0);setSc(SC.L);const ms=["Pulling match data...","Building Poisson model...","Mapping xG distributions...","Scanning CS prices...","Detecting value gaps...","Assembling your edge..."];let i=0;sLm(ms[0]);const iv=setInterval(()=>{i++;if(i<ms.length)sLm(ms[i]);else{clearInterval(iv);setSc(SC.R);let s=0;const r=setInterval(()=>{s++;sRv(s);if(s>=18)clearInterval(r);},140);}},550);};
  const go=(s:number)=>{sRv(0);setSc(s);};

  const an=useMemo(()=>{
    if(!mt||sc!==SC.R)return null;
    const hXg=parseFloat(lH)||0,aXg=parseFloat(lA)||0;
    const hs=hH>hA?"protecting":hH<hA?"chasing":"level",as=hA>hH?"protecting":hA<hH?"chasing":"level";
    let h2=mt.homePreXg*.55*Math.min(1.5,Math.max(.5,hXg>0?hXg/(mt.homePreXg*.45):.8));
    let a2=mt.awayPreXg*.55*Math.min(1.5,Math.max(.5,aXg>0?aXg/(mt.awayPreXg*.45):.8));
    h2=adjustXg(h2,hs);a2=adjustXg(a2,as);
    if(rc==="home"){h2*=.65;a2*=1.2;}if(rc==="away"){a2*=.65;h2*=1.2;}
    h2=Math.round(h2*100)/100;a2=Math.round(a2*100)/100;
    const sh=buildScoreProbs(h2,a2,3);
    const ft=sh.map(s=>({...s,fH:hH+s.h,fA:hA+s.a,fL:`${hH+s.h}-${hA+s.a}`}));
    const fm:Record<string,typeof ft[0]&{prob:number}>={};
    ft.forEach(s=>{if(!fm[s.fL])fm[s.fL]={...s,prob:0};fm[s.fL].prob+=s.prob;});
    const fs=Object.values(fm).sort((a,b)=>b.prob-a.prob);
    const pA=fs.slice(0,3),pAl=new Set(pA.map(s=>s.fL));
    const pBc=fs.filter(s=>!pAl.has(s.fL));
    const pBf=pBc.filter(s=>s.fH===s.fA||(hs==="protecting"?s.fA>s.fH:s.fH<s.fA)).slice(0,2);
    const pB=pBf.length>0?pBf:pBc.slice(0,2);
    const tg:Record<number,number>={};fs.forEach(s=>{const t=s.fH+s.fA;if(!tg[t])tg[t]=0;tg[t]+=s.prob;});
    const ou=[0.5,1.5,2.5,3.5,4.5].map(l=>{let o=0;Object.entries(tg).forEach(([g,p])=>{if(parseFloat(g)>l)o+=p;});return{line:l,op:Math.round(o*1000)/10,up:Math.round((1-o)*1000)/10,oo:o>.01?Math.round(1/o*100)/100:99,uo:(1-o)>.01?Math.round(1/(1-o)*100)/100:99};});
    return{hXg,aXg,h2,a2,hs,as,fs,pA,pB,ou};
  },[sc,mt,lH,lA,hH,hA,rc]);

  const rl=(n:number)=>({opacity:rv>=n?1:0,transform:rv>=n?"translateY(0)":"translateY(6px)",transition:"all 0.35s ease"});

  const SB=({v,fn,cl}:{v:number;fn:(v:number)=>void;cl:string})=>(
    <div style={{display:"flex",alignItems:"center"}}>
      <button onClick={()=>fn(Math.max(0,v-1))} style={{width:36,height:44,background:c.cd,border:`1px solid ${c.bd2}`,borderRadius:"8px 0 0 8px",color:c.d,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
      <div style={{width:52,height:44,background:c.sf,borderTop:`1px solid ${c.bd2}`,borderBottom:`1px solid ${c.bd2}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:hd,fontSize:28,color:cl}}>{v}</div>
      <button onClick={()=>fn(Math.min(9,v+1))} style={{width:36,height:44,background:c.cd,border:`1px solid ${c.bd2}`,borderRadius:"0 8px 8px 0",color:c.d,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
    </div>
  );
  const SI=({lb,v,fn,ph,u}:{lb:string;v:string;fn:(v:string)=>void;ph:string;u?:string})=>(
    <div style={{flex:1}}>
      <div style={{fontSize:9,color:c.d,letterSpacing:1.5,marginBottom:4}}>{lb}</div>
      <div style={{position:"relative"}}>
        <input type="text" inputMode="decimal" value={v} onChange={e=>{const x=e.target.value;if(x===""||/^[0-9]*\.?[0-9]*$/.test(x))fn(x);}} placeholder={ph} style={{width:"100%",padding:"10px 12px",background:c.sf,border:`1px solid ${c.bd2}`,borderRadius:6,color:c.w,fontSize:15,fontFamily:mn,fontWeight:600,outline:"none"}} onFocus={e=>{e.target.style.borderColor=c.g;}} onBlur={e=>{e.target.style.borderColor=c.bd2;}}/>
        {u&&<span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:10,color:c.d}}>{u}</span>}
      </div>
    </div>
  );
  const TI=({lb,v,fn,ph}:{lb:string;v:string;fn:(v:string)=>void;ph:string})=>(
    <div style={{marginBottom:10}}>
      <div style={{fontSize:9,color:c.d,letterSpacing:1.5,marginBottom:4}}>{lb}</div>
      <input type="text" value={v} onChange={e=>fn(e.target.value)} placeholder={ph} style={{width:"100%",padding:"12px 14px",background:c.sf,border:`1px solid ${c.bd2}`,borderRadius:6,color:c.w,fontSize:16,fontFamily:bd,fontWeight:600,outline:"none"}} onFocus={e=>{e.target.style.borderColor=c.g;}} onBlur={e=>{e.target.style.borderColor=c.bd2;}}/>
    </div>
  );

  return(
    <div style={{fontFamily:bd,background:c.bg,color:c.t,minHeight:"100vh"}}>
      <style>{css}</style>
      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:50,background:`${c.bg}ee`,backdropFilter:"blur(16px)",borderBottom:`1px solid ${c.bd2}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
        {sc!==SC.S&&<button onClick={()=>go(sc===SC.R?SC.I:SC.S)} style={{background:"none",border:"none",color:c.d,fontSize:18,cursor:"pointer"}}>←</button>}
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
          <div style={{width:28,height:28,borderRadius:6,background:c.g,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:c.bg}}>⚡</div>
          <div>
            <div style={{fontFamily:hd,fontSize:15,color:c.g,letterSpacing:2,lineHeight:1}}>EXPECTED EDGE</div>
            <div style={{fontSize:7,color:c.d,letterSpacing:2}}>HALF-TIME CS ENGINE</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,background:c.rd,border:`1px solid ${c.r}22`,borderRadius:4,padding:"4px 8px"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:c.r,animation:"pulse 1.5s ease infinite"}}/>
          <span style={{fontSize:9,fontWeight:700,color:c.r,letterSpacing:1,fontFamily:mn}}>HT</span>
        </div>
      </div>

      {/* SELECT */}
      {sc===SC.S&&(
        <div style={{padding:"0 16px 80px",animation:"fadeIn 0.3s ease"}}>
          <div style={{padding:"28px 0 20px",textAlign:"center",borderBottom:`1px solid ${c.bd2}`,marginBottom:20}}>
            <div style={{width:56,height:56,borderRadius:"50%",margin:"0 auto 14px",background:c.g,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,color:c.bg,animation:"glow 3s ease infinite"}}>⏸</div>
            <h1 style={{fontFamily:hd,fontSize:28,color:c.w,letterSpacing:3,marginBottom:6}}>HALF-TIME EDGE</h1>
            <p style={{fontSize:12,color:c.d,lineHeight:1.5,maxWidth:320,margin:"0 auto",letterSpacing:.5}}>TRADE THE PRESSURE. NOT THE SCORELINE.</p>
          </div>
          <div style={{background:c.cd,border:`1px solid ${c.bd2}`,borderRadius:10,padding:16,marginBottom:12}}>
            <div style={{fontSize:10,color:c.g,letterSpacing:2,marginBottom:12,fontWeight:600}}>⚽ MATCH DETAILS</div>
            <TI lb="HOME TEAM" v={iH} fn={siH} ph="e.g. Arsenal"/>
            <TI lb="AWAY TEAM" v={iA} fn={siA} ph="e.g. Chelsea"/>
            <TI lb="LEAGUE (OPTIONAL)" v={iL} fn={siL} ph="e.g. Premier League"/>
          </div>
          <div style={{background:c.cd,border:`1px solid ${c.bd2}`,borderRadius:10,padding:16,marginBottom:24}}>
            <div style={{fontSize:10,color:c.d,letterSpacing:2,marginBottom:4,fontWeight:600}}>📊 PRE-MATCH xG (OPTIONAL)</div>
            <div style={{fontSize:10,color:c.dm,marginBottom:10}}>Improves 2nd half projection. Defaults to 1.5 / 1.0 if blank.</div>
            <div style={{display:"flex",gap:10}}>
              <SI lb="HOME PRE-xG" v={iHx} fn={siHx} ph="1.5"/>
              <SI lb="AWAY PRE-xG" v={iAx} fn={siAx} ph="1.0"/>
            </div>
          </div>
          <button onClick={mk} disabled={!cM} style={{width:"100%",padding:"16px",borderRadius:10,background:cM?c.g:c.dm,border:"none",cursor:cM?"pointer":"not-allowed",fontFamily:hd,fontSize:18,letterSpacing:3,color:cM?c.bg:c.d,fontWeight:700}}>{cM?"⚽ ENTER HALF-TIME DATA":"ENTER BOTH TEAM NAMES"}</button>
        </div>
      )}

      {/* INPUT */}
      {sc===SC.I&&mt&&(
        <div style={{padding:"0 16px 80px",animation:"fadeIn 0.3s ease"}}>
          <div style={{padding:"20px 0",textAlign:"center",borderBottom:`1px solid ${c.bd2}`,marginBottom:20}}>
            <div style={{fontSize:10,color:c.d,letterSpacing:2}}>{mt.league}</div>
            <div style={{fontFamily:hd,fontSize:24,color:c.w,letterSpacing:2,marginTop:4}}>{mt.home} vs {mt.away}</div>
            <div style={{fontSize:11,color:c.r,fontFamily:mn,marginTop:6,fontWeight:600}}>⏸ HALF-TIME — Enter live data below</div>
          </div>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:10,color:c.d,letterSpacing:2,marginBottom:12,textAlign:"center"}}>HALF-TIME SCORE</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16}}>
              <div style={{textAlign:"center"}}><div style={{fontSize:12,color:c.g,fontWeight:600,marginBottom:6}}>{mt.home}</div><SB v={hH} fn={sHH} cl={c.g}/></div>
              <div style={{fontFamily:hd,fontSize:24,color:c.dm,marginTop:18}}>—</div>
              <div style={{textAlign:"center"}}><div style={{fontSize:12,color:c.cy,fontWeight:600,marginBottom:6}}>{mt.away}</div><SB v={hA} fn={sHA} cl={c.cy}/></div>
            </div>
          </div>
          <div style={{background:c.gd,border:`1px solid ${c.g}22`,borderRadius:10,padding:16,marginBottom:16}}>
            <div style={{fontSize:10,color:c.g,letterSpacing:2,marginBottom:10,fontWeight:600}}>⚡ LIVE xG (REQUIRED)</div>
            <div style={{display:"flex",gap:10}}>
              <SI lb={mt.home.toUpperCase()} v={lH} fn={slH} ph="e.g. 1.24" u="xG"/>
              <SI lb={mt.away.toUpperCase()} v={lA} fn={slA} ph="e.g. 0.35" u="xG"/>
            </div>
          </div>
          <div style={{background:c.cd,border:`1px solid ${c.bd2}`,borderRadius:10,padding:16,marginBottom:12}}>
            <div style={{fontSize:10,color:c.d,letterSpacing:2,marginBottom:10}}>📊 SHOTS</div>
            <div style={{display:"flex",gap:10,marginBottom:10}}><SI lb={`${mt.home} TOTAL`} v={sH} fn={ssH} ph="—"/><SI lb={`${mt.away} TOTAL`} v={sA} fn={ssA} ph="—"/></div>
            <div style={{display:"flex",gap:10}}><SI lb={`${mt.home} ON TARGET`} v={soH} fn={ssoH} ph="—"/><SI lb={`${mt.away} ON TARGET`} v={soA} fn={ssoA} ph="—"/></div>
          </div>
          <div style={{background:c.cd,border:`1px solid ${c.bd2}`,borderRadius:10,padding:16,marginBottom:12}}>
            <div style={{fontSize:10,color:c.d,letterSpacing:2,marginBottom:10}}>📈 POSSESSION & CORNERS</div>
            <div style={{display:"flex",gap:10,marginBottom:10}}><SI lb={`${mt.home} POSS`} v={pH} fn={spH} ph="—" u="%"/><SI lb={`${mt.away} POSS`} v={pA} fn={spA} ph="—" u="%"/></div>
            <div style={{display:"flex",gap:10}}><SI lb={`${mt.home} CRN`} v={cH} fn={scH} ph="—"/><SI lb={`${mt.away} CRN`} v={cA} fn={scA} ph="—"/></div>
          </div>
          <div style={{background:c.cd,border:`1px solid ${c.bd2}`,borderRadius:10,padding:16,marginBottom:24}}>
            <div style={{fontSize:10,color:c.d,letterSpacing:2,marginBottom:10}}>🟥 RED CARDS</div>
            <div style={{display:"flex",gap:6}}>
              {[{id:"none",lb:"None"},{id:"home",lb:mt.home},{id:"away",lb:mt.away}].map(o=>(
                <button key={o.id} onClick={()=>sRc(o.id)} style={{flex:1,padding:"10px 8px",borderRadius:6,border:`1px solid ${rc===o.id?(o.id==="none"?c.g:c.r):c.bd2}`,background:rc===o.id?(o.id==="none"?c.gd:c.rd):"transparent",color:rc===o.id?(o.id==="none"?c.g:c.r):c.d,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:bd}}>{o.lb}</button>
              ))}
            </div>
          </div>
          <button onClick={gen} disabled={!cG} style={{width:"100%",padding:"16px",borderRadius:10,background:cG?c.g:c.dm,border:"none",cursor:cG?"pointer":"not-allowed",fontFamily:hd,fontSize:18,letterSpacing:3,color:cG?c.bg:c.d,fontWeight:700}}>{cG?"🎯 GENERATE 2ND HALF CS STRATEGY":"ENTER LIVE xG TO CONTINUE"}</button>
        </div>
      )}

      {/* LOADING */}
      {sc===SC.L&&(
        <div style={{padding:"100px 24px",textAlign:"center",animation:"fadeIn 0.2s ease"}}>
          <div style={{width:56,height:56,borderRadius:"50%",border:`2px solid ${c.bd2}`,borderTopColor:c.g,margin:"0 auto 24px",animation:"spin 0.8s linear infinite"}}/>
          <div style={{fontFamily:mn,fontSize:12,color:c.g,animation:"pulse 1s ease infinite"}}>{lm}</div>
        </div>
      )}

      {/* RESULT */}
      {sc===SC.R&&an&&mt&&(
        <div style={{padding:"0 16px 80px"}}>
          <div style={{padding:"16px 0",borderBottom:`1px solid ${c.bd2}`,marginBottom:16,textAlign:"center",...rl(1)}}>
            <div style={{fontSize:10,color:c.d,letterSpacing:2,marginBottom:6}}>{mt.league} • HALF-TIME</div>
            <div style={{fontFamily:hd,fontSize:44,color:c.w,letterSpacing:6}}>
              <span style={{color:hH>hA?c.g:hH<hA?c.t:c.w}}>{hH}</span><span style={{color:c.dm,margin:"0 8px"}}>-</span><span style={{color:hA>hH?c.cy:hA<hH?c.t:c.w}}>{hA}</span>
            </div>
            <div style={{fontFamily:hd,fontSize:16,color:c.d,letterSpacing:2,marginTop:4}}>{mt.home} vs {mt.away}</div>
            <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:8,fontSize:11,fontFamily:mn}}>
              <span style={{color:c.g}}>xG {an.hXg}</span><span style={{color:c.d}}>|</span><span style={{color:c.cy}}>xG {an.aXg}</span>
            </div>
          </div>

          {(Math.abs(an.hXg-hH)>.8||Math.abs(an.aXg-hA)>.8)&&(
            <div style={{background:c.gd,border:`1px solid ${c.g}33`,borderRadius:8,padding:"12px 14px",marginBottom:16,...rl(2)}}>
              <span style={{color:c.g,fontWeight:600,fontSize:12}}>📡 xG DIVERGENCE — </span>
              <span style={{fontSize:12,color:c.t}}>{an.hXg>hH+.8?`${mt.home} have ${an.hXg} xG but only ${hH} goals. Value building.`:`${mt.away} have ${an.aXg} xG but only ${hA} goals. Value on away side.`}</span>
            </div>
          )}

          <div style={{display:"flex",gap:12,marginBottom:20,...rl(3)}}>
            <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,background:c.g,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:c.bg,marginTop:2}}>⚡</div>
            <div style={{fontSize:14,color:c.t,lineHeight:1.75}}>
              <span style={{color:c.w,fontWeight:600}}>2nd Half CS Strategy.</span>{" "}It&apos;s <strong style={{color:c.w}}>{hH}-{hA}</strong> at the break. {mt.home}&apos;s live xG of <strong style={{color:c.g}}>{an.hXg}</strong>{an.hXg>hH?" suggests more created than the scoreline shows":" tracks close to goals"}. 2nd half model: <strong style={{color:c.g}}>{an.h2} xG</strong> {mt.home}, <strong style={{color:c.cy}}>{an.a2} xG</strong> {mt.away}{an.hs==="chasing"?` — expect ${mt.home} to push`:""}{an.as==="chasing"?` — expect ${mt.away} to push`:""}.
              {rc!=="none"&&<span style={{color:c.r}}> Red card to {rc==="home"?mt.home:mt.away} compresses output.</span>}
            </div>
          </div>

          <div style={{paddingLeft:44,marginBottom:24,...rl(4)}}>
            <div style={{fontSize:10,color:c.d,letterSpacing:2,marginBottom:8}}>📈 2ND HALF PROJECTED xG</div>
            <div style={{display:"flex",gap:8}}>
              {[{tm:mt.home,xg:an.h2,cl:c.g},{tm:mt.away,xg:an.a2,cl:c.cy}].map((t,i)=>(
                <div key={i} style={{flex:1,background:c.cd,borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:t.cl,marginBottom:4}}>{t.tm}</div>
                  <div style={{height:6,background:c.sf,borderRadius:3,overflow:"hidden"}}><div style={{width:`${Math.min(100,t.xg/2.5*100)}%`,height:"100%",background:t.cl,borderRadius:3}}/></div>
                  <div style={{fontFamily:mn,fontSize:16,fontWeight:700,color:t.cl,marginTop:6}}>{t.xg}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{paddingLeft:44,marginBottom:12,...rl(5)}}><div style={{fontSize:13,color:c.d}}>My <span style={{color:c.g,fontWeight:600}}>Target Score Formula</span> for full-time:</div></div>

          <div style={{paddingLeft:44,marginBottom:14,...rl(6)}}>
            <div style={{fontSize:10,color:c.g,letterSpacing:2,marginBottom:8,fontWeight:600}}>PLAN A — MOST PROBABLE</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {an.pA.map((s,i)=>(<div key={i} style={{background:c.gd,border:`1px solid ${c.g}33`,borderRadius:8,padding:"10px 20px",textAlign:"center"}}><div style={{fontFamily:hd,fontSize:30,color:c.g,letterSpacing:3,lineHeight:1}}>{s.fL}</div><div style={{fontSize:10,color:c.d,fontFamily:mn,marginTop:4}}>{(s.prob*100).toFixed(1)}%</div></div>))}
            </div>
          </div>

          <div style={{paddingLeft:44,marginBottom:24,...rl(7)}}>
            <div style={{fontSize:10,color:c.cy,letterSpacing:2,marginBottom:8,fontWeight:600}}>PLAN B — PROTECTION</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {an.pB.map((s,i)=>(<div key={i} style={{background:c.cyd,border:`1px solid ${c.cy}33`,borderRadius:8,padding:"10px 20px",textAlign:"center"}}><div style={{fontFamily:hd,fontSize:30,color:c.cy,letterSpacing:3,lineHeight:1}}>{s.fL}</div><div style={{fontSize:10,color:c.d,fontFamily:mn,marginTop:4}}>{(s.prob*100).toFixed(1)}%</div></div>))}
            </div>
          </div>

          <div style={{paddingLeft:44,marginBottom:24,...rl(8)}}>
            <div style={{fontSize:10,color:c.g,letterSpacing:2,marginBottom:10,fontWeight:600}}>📊 OVER / UNDER</div>
            <div style={{background:c.cd,border:`1px solid ${c.bd2}`,borderRadius:10,overflow:"hidden"}}>
              <div style={{display:"flex",padding:"8px 12px",background:c.sf,borderBottom:`1px solid ${c.bd2}`}}>
                <div style={{flex:1,fontSize:9,color:c.d,letterSpacing:1,fontWeight:600}}>LINE</div>
                <div style={{flex:1,fontSize:9,color:c.gr,letterSpacing:1,fontWeight:600,textAlign:"center"}}>OVER</div>
                <div style={{flex:1,fontSize:9,color:c.r,letterSpacing:1,fontWeight:600,textAlign:"center"}}>UNDER</div>
                <div style={{flex:1,fontSize:9,color:c.d,letterSpacing:1,fontWeight:600,textAlign:"right"}}>ODDS</div>
              </div>
              {an.ou.map((o,i)=>{const hit=(hH+hA)>o.line;return(
                <div key={i} style={{display:"flex",alignItems:"center",padding:"10px 12px",borderBottom:i<an.ou.length-1?`1px solid ${c.bd2}`:"none",background:hit?c.gd:"transparent"}}>
                  <div style={{flex:1,fontFamily:mn,fontSize:14,fontWeight:700,color:c.w}}>O/U {o.line}{hit&&<span style={{fontSize:9,color:c.g,marginLeft:6}}>✓</span>}</div>
                  <div style={{flex:1,textAlign:"center",fontFamily:mn,fontSize:12,fontWeight:700,color:hit?c.g:o.op>60?c.gr:o.op>40?c.g:c.t}}>{hit?"100":o.op}%</div>
                  <div style={{flex:1,textAlign:"center",fontFamily:mn,fontSize:12,fontWeight:700,color:hit?c.dm:o.up>60?c.r:c.t}}>{hit?"0":o.up}%</div>
                  <div style={{flex:1,textAlign:"right",fontFamily:mn,fontSize:11,color:c.d}}>{hit?"—":<><span style={{color:c.gr}}>{o.oo}</span><span style={{color:c.dm}}>/</span><span style={{color:c.r}}>{o.uo}</span></>}</div>
                </div>
              );})}
            </div>
          </div>

          <div style={{paddingLeft:44,marginBottom:24,fontSize:14,color:c.t,lineHeight:1.75,...rl(9)}}>
            Plan A = most probable FT results from 2nd half Poisson.{an.hs==="chasing"?` ${mt.home} chasing — xG +25%.`:""}
            {an.as==="chasing"?` ${mt.away} chasing — xG boosted.`:""}{an.hs==="protecting"?` ${mt.home} protecting — deeper block expected.`:""} Plan B = draw/underdog insurance.
          </div>

          <div style={{paddingLeft:44,marginBottom:24,...rl(10)}}>
            <div style={{background:c.cd,borderRadius:8,padding:"12px 14px",borderLeft:`3px solid ${c.g}`}}>
              <span style={{color:c.g,fontWeight:600,fontSize:12}}>Game State: </span>
              <span style={{fontSize:12,color:c.t}}>{hH===hA?"Level — both push for the opener. CS prices move fast.":hH>hA?`${mt.home} lead. May sit deep. ${mt.away} will push.`:`${mt.away} lead. ${mt.home} take risks. Open 2nd half.`}</span>
            </div>
          </div>

          <div style={{display:"flex",gap:8,paddingLeft:44,...rl(11)}}>
            <button onClick={()=>setSc(SC.I)} style={{flex:1,padding:"14px",borderRadius:10,background:c.cd,border:`1px solid ${c.bd2}`,color:c.t,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:bd}}>← Edit</button>
            <button onClick={()=>{setMt(null);siH("");siA("");siL("");siHx("");siAx("");go(SC.S);}} style={{flex:1,padding:"14px",borderRadius:10,background:c.g,border:"none",color:c.bg,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:bd}}>New Match</button>
          </div>

          <div style={{paddingLeft:44,marginTop:16,fontSize:8,color:c.dm,lineHeight:1.5,letterSpacing:.5,...rl(12)}}>
            EXPECTED EDGE · TRADE THE PRESSURE. NOT THE SCORELINE. · FOR EDUCATIONAL AND ANALYSIS PURPOSES ONLY.
          </div>
        </div>
      )}
    </div>
  );
}
