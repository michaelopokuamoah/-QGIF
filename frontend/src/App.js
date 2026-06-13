import { useState, useEffect, useCallback } from "react";

const BG="#050E1C",PANEL="#08162A",P2="#0B1E35";
const CYAN="#00C8F0",GREEN="#00E87A",AMBER="#F07020",RED="#E83A3A",PURPLE="#8B5CF6";
const TEXT="#D8E8FF",TEXT2="rgba(216,232,255,0.55)",MUTED="#4A6880";
const BORDER="rgba(0,200,240,0.1)",BORDER2="rgba(0,200,240,0.05)";
const FH="Georgia,'Times New Roman',serif";
const FB="'Segoe UI',Arial,sans-serif";
const FM="'Courier New',monospace";
const SEV_C={CRITICAL:RED,HIGH:AMBER,MEDIUM:"#F5C842",LOW:GREEN};
const SEV_BG={CRITICAL:"rgba(232,58,58,.12)",HIGH:"rgba(240,112,32,.12)",MEDIUM:"rgba(245,200,66,.1)",LOW:"rgba(0,232,122,.08)"};
const IMP_C={TRANSFORMATIONAL:CYAN,CRITICAL:RED,"MAJOR IMPROVEMENT":GREEN,POSITIVE:PURPLE,HIGH:AMBER,MEDIUM:"#F5C842"};

const ROLES=[
  {key:"government",label:"Government Official",icon:"🏛",color:CYAN,desc:"Policy briefings, budget decisions",prompts:["Which regions face the highest risk?","What is the cost of illegal mining?","Which issues need emergency action?","What reporting obligations is Ghana failing?"]},
  {key:"epa",label:"EPA Officer",icon:"👮",color:AMBER,desc:"Enforcement, violations, evidence",prompts:["All active violations with GPS","Which miners risk permit revocation?","What evidence exists for prosecution?","Which water bodies exceed legal limits?"]},
  {key:"miner",label:"Licensed Miner",icon:"⛏",color:"#F5C842",desc:"Compliance, ESG, licence protection",prompts:["What is our compliance score?","How do we compare to peer operators?","Which ESG data do we need?","What actions protect our licence?"]},
  {key:"ngo",label:"NGO / Dev Bank",icon:"🌍",color:PURPLE,desc:"Impact, vulnerability, carbon MRV",prompts:["Which communities are most vulnerable?","What is the carbon credit potential?","How many SDGs are impacted?","Which intervention prevents most disease per dollar?"]},
  {key:"doctor",label:"Doctor / Health",icon:"👩‍⚕️",color:GREEN,desc:"Disease prediction, clinical protocols",prompts:["Which communities will present mercury cases?","What tests should I order?","How many waterborne cases to expect?","What are the neurological risks for children?"]},
  {key:"farmer",label:"Farmer",icon:"👨‍🌾",color:"#F5C842",desc:"Irrigation safety, crop advice, yield",prompts:["Is my irrigation water safe?","Which crops are safe to grow?","What should I plant this season?","How will rainfall change?"]},
];

const LAYERS=[
  {key:"all",icon:"⚛",label:"All Threats"},{key:"mining",icon:"⛏️",label:"Illegal Mining"},
  {key:"health",icon:"🏥",label:"Public Health"},{key:"water",icon:"💧",label:"Water Security"},
  {key:"food",icon:"🌾",label:"Food & Agriculture"},{key:"climate",icon:"🌡️",label:"Climate Risk"},
  {key:"conflict",icon:"⚠️",label:"Conflict"},{key:"carbon",icon:"🌲",label:"Carbon & Forest"},
  {key:"disease",icon:"🦠",label:"Disease"},{key:"economy",icon:"📊",label:"Economic Risk"},
];

const REGIONS=[
  {name:"Western Region",risk:"CRITICAL"},{name:"Eastern Region",risk:"HIGH"},
  {name:"Central Region",risk:"HIGH"},{name:"Ashanti Region",risk:"MEDIUM"},
  {name:"Brong-Ahafo",risk:"MEDIUM"},{name:"Greater Accra",risk:"MEDIUM"},
  {name:"Volta Region",risk:"LOW"},{name:"Northern Region",risk:"LOW"},
  {name:"Upper East Region",risk:"LOW"},{name:"Upper West Region",risk:"LOW"},
  {name:"Oti Region",risk:"MEDIUM"},{name:"Bono East",risk:"MEDIUM"},
];

const SCENARIOS=[
  {key:"mining_doubles",label:"Mining Doubles",icon:"⛏️",desc:"What if illegal mining doubles?"},
  {key:"river_cleaned",label:"River Cleanup",icon:"💧",desc:"What if we clean the river?"},
  {key:"mining_banned",label:"Enforcement",icon:"👮",desc:"What if EPA eliminates illegal mining?"},
  {key:"reforestation",label:"Reforestation",icon:"🌳",desc:"What if we restore 50,000 hectares?"},
];

const MAP_REGIONS=[
  {name:"Upper West Region",risk:"LOW",d:"M130,58 L285,58 L295,100 L275,162 L245,202 L205,222 L165,212 L135,192 L115,152 L115,100 Z"},
  {name:"Upper East Region",risk:"LOW",d:"M285,58 L445,58 L455,82 L465,132 L445,182 L405,202 L365,212 L325,202 L295,182 L275,162 L295,100 Z"},
  {name:"Northern Region",risk:"LOW",d:"M115,152 L135,192 L165,212 L205,222 L245,202 L275,162 L295,182 L325,202 L365,212 L405,202 L445,182 L465,202 L475,262 L455,322 L425,362 L385,382 L345,372 L305,362 L265,352 L225,342 L185,322 L155,292 L133,252 L118,212 Z"},
  {name:"Brong-Ahafo",risk:"MEDIUM",d:"M133,252 L155,292 L185,322 L225,342 L265,352 L305,362 L345,372 L385,382 L425,362 L455,372 L475,412 L465,452 L435,472 L395,462 L355,452 L315,442 L275,432 L235,422 L195,402 L165,382 L143,352 L128,312 Z"},
  {name:"Ashanti Region",risk:"MEDIUM",d:"M195,402 L235,422 L275,432 L315,442 L355,452 L395,462 L435,472 L455,512 L445,552 L415,572 L375,562 L335,552 L295,542 L255,532 L215,512 L188,482 L183,452 Z"},
  {name:"Eastern Region",risk:"HIGH",d:"M335,552 L375,562 L415,572 L455,562 L475,592 L485,632 L465,662 L435,672 L405,662 L375,642 L345,622 L323,594 L318,568 Z"},
  {name:"Oti Region",risk:"MEDIUM",d:"M455,322 L475,262 L505,222 L545,192 L575,212 L585,272 L575,342 L555,412 L535,472 L515,512 L495,552 L485,582 L485,632 L465,662 L435,672 L415,572 L455,512 L455,462 L475,412 L465,362 Z"},
  {name:"Western Region",risk:"CRITICAL",d:"M143,472 L188,482 L215,512 L255,532 L295,542 L318,568 L323,594 L313,624 L293,652 L263,672 L233,682 L203,672 L173,642 L153,612 L138,572 L128,532 L133,492 Z"},
  {name:"Central Region",risk:"HIGH",d:"M313,624 L343,622 L375,642 L405,662 L415,692 L395,722 L365,732 L335,722 L308,702 L298,672 L293,652 Z"},
  {name:"Greater Accra",risk:"MEDIUM",d:"M415,692 L435,672 L465,662 L495,672 L505,702 L495,727 L468,742 L442,737 L418,722 Z"},
  {name:"Volta Region",risk:"LOW",d:"M455,362 L475,412 L455,462 L455,512 L415,572 L395,462 L435,472 L455,452 L465,372 Z"},
  {name:"Bono East",risk:"MEDIUM",d:"M425,362 L455,372 L465,452 L435,472 L395,462 L355,452 L345,372 Z"},
];

function Tag({label,color=CYAN,bg}){
  return <span style={{fontFamily:FM,fontSize:10,padding:"3px 9px",borderRadius:4,fontWeight:600,background:bg||`${color}18`,color,border:`1px solid ${color}33`,whiteSpace:"nowrap"}}>{label}</span>;
}
function Spinner({label}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"50px 20px",gap:16}}>
      <div style={{width:52,height:52,position:"relative"}}>
        {[[52,CYAN,".9s"],[38,PURPLE,"1.3s"],[26,GREEN,"1.7s"]].map(([sz,col,dur],i)=>(
          <div key={i} style={{position:"absolute",width:sz,height:sz,top:"50%",left:"50%",borderRadius:"50%",border:"2px solid transparent",[i===0?"borderTopColor":i===1?"borderRightColor":"borderBottomColor"]:col,animation:`qspin ${dur} linear infinite`,transform:"translate(-50%,-50%)"}}/>
        ))}
      </div>
      <div style={{fontFamily:FB,fontSize:13,color:MUTED,textAlign:"center",lineHeight:1.7}}>{label}</div>
    </div>
  );
}
function Card({children,color=BORDER,style={}}){
  return <div style={{background:PANEL,border:`1px solid ${color}`,borderRadius:12,padding:18,marginBottom:14,...style}}>{children}</div>;
}
function Label({text,color=MUTED}){
  return <div style={{fontFamily:FM,fontSize:9,color,letterSpacing:".07em",marginBottom:6}}>{text}</div>;
}
function MetricGrid({items}){
  return(
    <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(items.length,3)},1fr)`,gap:8,marginBottom:12}}>
      {items.map(([l,v,col,sub],i)=>(
        <div key={i} style={{background:P2,borderRadius:8,padding:"10px 12px"}}>
          <Label text={l}/>
          <div style={{fontFamily:FB,fontSize:15,fontWeight:700,color:col||CYAN,lineHeight:1.2}}>{v}</div>
          {sub&&<div style={{fontFamily:FB,fontSize:10,color:MUTED,marginTop:3}}>{sub}</div>}
        </div>
      ))}
    </div>
  );
}
function InfoBox({label,value,color=CYAN}){
  return(
    <div style={{background:P2,borderRadius:7,padding:"10px 12px",marginBottom:8}}>
      <Label text={label} color={color}/>
      <div style={{fontFamily:FB,fontSize:13,color:TEXT,lineHeight:1.65}}>{value}</div>
    </div>
  );
}
function BulletList({items,color=CYAN,icon="•"}){
  return(
    <div>
      {(items||[]).map((item,i)=>(
        <div key={i} style={{display:"flex",gap:8,padding:"6px 10px",background:P2,borderRadius:6,marginBottom:5}}>
          <span style={{color,flexShrink:0,fontSize:12}}>{icon}</span>
          <span style={{fontFamily:FB,fontSize:12,color:TEXT,lineHeight:1.6}}>{typeof item==="object"?item.signal||item.event||item.action||item.indicator||JSON.stringify(item):item}</span>
        </div>
      ))}
    </div>
  );
}

function MapTab({layer,activeRegion,hovered,setHovered,onRegionClick}){
  const SF={CRITICAL:"rgba(232,58,58,0.1)",HIGH:"rgba(240,112,32,0.08)",MEDIUM:"rgba(245,200,66,0.06)",LOW:"rgba(0,232,122,0.04)"};
  const SS={CRITICAL:"rgba(232,58,58,0.38)",HIGH:"rgba(240,112,32,0.32)",MEDIUM:"rgba(245,200,66,0.26)",LOW:"rgba(0,232,122,0.2)"};
  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:"#030A14",overflow:"hidden"}}>
      <div style={{position:"absolute",left:0,right:0,height:2,zIndex:15,pointerEvents:"none",background:`linear-gradient(90deg,transparent,rgba(0,200,240,.4),${CYAN},rgba(0,200,240,.4),transparent)`,animation:"scan 5s linear infinite"}}/>
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:20,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",background:"rgba(3,10,20,.9)",borderBottom:`1px solid ${BORDER}`}}>
        <div style={{fontFamily:FB,fontSize:12,fontWeight:600,color:TEXT}}>{layer.icon} {layer.label} — Click any region</div>
        <div style={{fontFamily:FM,fontSize:10,color:CYAN}}>{activeRegion||"No region selected"}</div>
      </div>
      <svg viewBox="0 0 700 820" style={{width:"100%",height:"calc(100% - 76px)",marginTop:40,cursor:"pointer"}} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="rg1" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#E83A3A" stopOpacity=".2"/><stop offset="100%" stopColor="#E83A3A" stopOpacity="0"/></radialGradient>
          <radialGradient id="rg2" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#F07020" stopOpacity=".15"/><stop offset="100%" stopColor="#F07020" stopOpacity="0"/></radialGradient>
          <filter id="blur"><feGaussianBlur stdDeviation="22"/></filter>
        </defs>
        {[100,200,300,400,500,600,700].map(y=><line key={y} x1="0" y1={y} x2="700" y2={y} stroke="rgba(0,200,240,.04)" strokeWidth=".5"/>)}
        {[100,200,300,400,500,600].map(x=><line key={x} x1={x} y1="0" x2={x} y2="820" stroke="rgba(0,200,240,.04)" strokeWidth=".5"/>)}
        <ellipse cx="230" cy="560" rx="110" ry="90" fill="url(#rg1)" filter="url(#blur)"/>
        <ellipse cx="390" cy="440" rx="90" ry="75" fill="url(#rg2)" filter="url(#blur)"/>
        {MAP_REGIONS.map(r=>(
          <path key={r.name} d={r.d}
            fill={activeRegion===r.name?"rgba(0,200,240,.2)":hovered===r.name?"rgba(0,200,240,.08)":SF[r.risk]}
            stroke={activeRegion===r.name?CYAN:SS[r.risk]}
            strokeWidth={activeRegion===r.name?1.4:.6}
            style={{transition:"all .18s",cursor:"pointer"}}
            onClick={()=>onRegionClick(r.name)}
            onMouseEnter={()=>setHovered(r.name)}
            onMouseLeave={()=>setHovered(null)}
          />
        ))}
        {[[175,152,"UPPER WEST"],[365,148,"UPPER EAST"],[295,280,"NORTHERN"],[308,418,"BRONG-AHAFO"],[318,498,"ASHANTI"],[415,612,"EASTERN"],[215,576,"WESTERN"],[350,678,"CENTRAL"],[458,706,"GR. ACCRA"],[522,432,"VOLTA"],[405,420,"BONO EAST"]].map(([x,y,t])=>(
          <text key={t} x={x} y={y} fill="rgba(0,200,240,.4)" fontSize="9" fontFamily="sans-serif" textAnchor="middle" pointerEvents="none">{t}</text>
        ))}
        {[[354,718,"Accra",5],[308,494,"Kumasi",4],[270,370,"Sunyani",3],[332,200,"Tamale",3]].map(([cx,cy,lbl,r])=>(
          <g key={lbl}><circle cx={cx} cy={cy} r={r} fill={CYAN} opacity=".85"/><text x={cx+10} y={cy+4} fill={CYAN} fontSize={r*2.5} fontFamily="monospace" opacity=".75">{lbl}</text></g>
        ))}
        {[[202,562,RED,0],[424,522,AMBER,.5],[342,272,GREEN,.9]].map(([cx,cy,col,delay])=>(
          <g key={`hs${cx}`}>
            <circle r="5" cx={cx} cy={cy} fill="none" stroke={col} strokeWidth="2" style={{animation:`hspulse 2s ease-out infinite ${delay}s`}}/>
            <circle r="4" cx={cx} cy={cy} fill={col} opacity=".9"/>
          </g>
        ))}
      </svg>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:36,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:"rgba(3,10,20,.92)",borderTop:`1px solid ${BORDER}`,zIndex:20}}>
        <div style={{display:"flex",gap:16}}>
          {[["Satellite","Sentinel-2",CYAN],["Sensors","847 online",GREEN],["Quantum","Active",PURPLE]].map(([k,v,col])=>(
            <div key={k} style={{fontFamily:FM,fontSize:9,color:MUTED}}>{k} <span style={{color:col}}>{v}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuantumTab({activeRegion,setActiveRegion,qData,qLoading,qType,setQType,runQuantum}){
  return(
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:"#030A14"}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>⚛ Quantum Optimizer Engine</div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {[{key:"land",label:"QAOA Land Use"},{key:"route",label:"Quantum Walk Route"}].map(q=>(
          <button key={q.key} onClick={()=>{setQType(q.key);if(activeRegion)runQuantum(activeRegion,q.key);}}
            style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${qType===q.key?CYAN:BORDER}`,background:qType===q.key?`${CYAN}14`:"transparent",color:qType===q.key?CYAN:MUTED,cursor:"pointer",fontSize:13,fontFamily:FB}}>{q.label}</button>
        ))}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {REGIONS.slice(0,6).map(r=>(
          <button key={r.name} onClick={()=>{setActiveRegion(r.name);runQuantum(r.name,qType);}} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${activeRegion===r.name?CYAN:BORDER2}`,background:activeRegion===r.name?`${CYAN}10`:"transparent",color:activeRegion===r.name?CYAN:MUTED,cursor:"pointer",fontSize:12,fontFamily:FB}}>{r.name}</button>
        ))}
      </div>
      {!activeRegion&&!qData&&<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:52,opacity:.12}}>⚛</div><div style={{fontFamily:FH,fontSize:16,color:"rgba(216,232,255,.22)",fontWeight:"normal",marginTop:12}}>Select a region above</div></div>}
      {qLoading&&<Spinner label="Running quantum algorithm..."/>}
      {!qLoading&&qData&&!qData._error&&(
        <div>
          <Card>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              <Tag label={qData.algorithm} color={CYAN}/>
              {qData.qubits&&<Tag label={`${qData.qubits} qubits`} color={PURPLE}/>}
              {qData.iterations&&<Tag label={`${qData.iterations} iterations`} color={GREEN}/>}
            </div>
            <InfoBox label="ALGORITHM" value={qData.explanation}/>
          </Card>
          {qType==="land"&&qData.optimalAllocation&&(
            <Card>
              {qData.optimalAllocation.map((item,i)=>{
                const cols=[CYAN,GREEN,RED,AMBER,PURPLE];
                return(
                  <div key={i} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontFamily:FB,fontSize:13,color:TEXT}}>{item.type}</span>
                      <span style={{fontFamily:FB,fontSize:18,fontWeight:700,color:cols[i]}}>{item.percentage}%</span>
                    </div>
                    <div style={{height:8,background:"rgba(255,255,255,.05)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${item.percentage}%`,background:cols[i],borderRadius:4}}/>
                    </div>
                  </div>
                );
              })}
              <InfoBox label="QUANTUM SPEEDUP" value={qData.quantumSpeedup} color={GREEN}/>
            </Card>
          )}
          {qType==="route"&&qData.optimizedRoute&&(
            <Card>
              <MetricGrid items={[["Distance",`${qData.totalDistance} km`,CYAN],["Saved",`${qData.distanceSaved} km`,GREEN],["Time",qData.estimatedTime,AMBER]]}/>
              {qData.optimizedRoute.map((stop,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"10px 12px",background:P2,borderRadius:8,marginBottom:8}}>
                  <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,background:`${stop.severity>=9?RED:AMBER}18`,border:`1px solid ${stop.severity>=9?RED:AMBER}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FB,fontSize:12,fontWeight:700,color:stop.severity>=9?RED:AMBER}}>{stop.order}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontFamily:FB,fontSize:13,color:TEXT}}>{stop.siteName}</span>
                      <Tag label={stop.action} color={stop.action==="ARREST & SEIZE"?RED:AMBER}/>
                    </div>
                    <div style={{fontFamily:FM,fontSize:10,color:MUTED}}>{stop.coordinates} · Severity {stop.severity}/10</div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ScenarioTab({scRegion,setScRegion,scScenario,setScScenario,scIntensity,setScIntensity,scData,scLoading,runScenario}){
  return(
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:"#030A14"}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>Scenario Simulator</div>
      <Card>
        <Label text="SELECT REGION"/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {REGIONS.map(r=>(<button key={r.name} onClick={()=>setScRegion(r.name)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${scRegion===r.name?CYAN:BORDER2}`,background:scRegion===r.name?`${CYAN}10`:"transparent",color:scRegion===r.name?CYAN:MUTED,cursor:"pointer",fontSize:12,fontFamily:FB}}>{r.name}</button>))}
        </div>
        <Label text="SELECT SCENARIO"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {SCENARIOS.map(s=>(<button key={s.key} onClick={()=>setScScenario(s.key)} style={{padding:"12px 14px",borderRadius:8,border:`1px solid ${scScenario===s.key?CYAN:BORDER}`,background:scScenario===s.key?`${CYAN}10`:P2,cursor:"pointer",textAlign:"left"}}><div style={{fontSize:20,marginBottom:6}}>{s.icon}</div><div style={{fontFamily:FB,fontSize:13,fontWeight:600,color:TEXT,marginBottom:3}}>{s.label}</div><div style={{fontFamily:FB,fontSize:11,color:MUTED,lineHeight:1.5}}>{s.desc}</div></button>))}
        </div>
        <Label text={`INTENSITY — ${scIntensity}%`}/>
        <input type="range" min={10} max={100} value={scIntensity} onChange={e=>setScIntensity(Number(e.target.value))} style={{width:"100%",marginBottom:16,accentColor:CYAN}}/>
        <button onClick={runScenario} disabled={scLoading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${CYAN},#0099BB)`,color:BG,fontSize:14,fontFamily:FB,fontWeight:600,cursor:"pointer",opacity:scLoading?.7:1}}>{scLoading?"Simulating...":"Run Scenario Simulation"}</button>
      </Card>
      {scLoading&&<Spinner label="Running scenario..."/>}
      {!scLoading&&scData&&!scData._error&&(
        <div>
          <Card>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:26}}>{scData.icon}</span>
              <div><div style={{fontFamily:FH,fontSize:17,color:TEXT,fontWeight:"normal"}}>{scData.scenario}</div><div style={{fontFamily:FB,fontSize:12,color:MUTED}}>{scData.description}</div></div>
            </div>
            <InfoBox label="SUMMARY" value={scData.summary}/>
          </Card>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[["TOTAL IMPACT",scData.totalEconomicImpact,CYAN],["PEOPLE",scData.peoplAtRisk,GREEN]].map(([l,v,col])=>(
              <div key={l} style={{background:PANEL,border:`1px solid ${BORDER}`,borderRadius:10,padding:"14px 16px"}}><Label text={l}/><div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:col}}>{v}</div></div>
            ))}
          </div>
          <Label text="OUTCOME ACROSS ALL DIMENSIONS"/>
          {(scData.outcomes||[]).map((o,i)=>{
            const ic=IMP_C[o.impact]||CYAN;
            return(
              <div key={i} style={{background:PANEL,border:`1px solid ${BORDER}`,borderRadius:10,padding:"14px 16px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div><div style={{fontFamily:FB,fontSize:14,fontWeight:600,color:TEXT}}>{o.dimension}</div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:4}}>
                      <span style={{fontFamily:FM,fontSize:10,color:MUTED}}>{o.current}</span>
                      <span style={{fontFamily:FM,fontSize:10,color:MUTED}}>→</span>
                      <span style={{fontFamily:FM,fontSize:10,color:ic,fontWeight:600}}>{o.projected}</span>
                    </div>
                  </div>
                  <Tag label={o.impact} color={ic}/>
                </div>
                <div style={{fontFamily:FB,fontSize:13,color:TEXT,lineHeight:1.7,padding:"9px 12px",background:P2,borderRadius:7,borderLeft:`3px solid ${ic}35`}}>{o.detail}</div>
              </div>
            );
          })}
          <div style={{background:`${PURPLE}0a`,border:`1px solid ${PURPLE}22`,borderRadius:10,padding:"14px 16px",marginBottom:20}}>
            <Label text="RECOMMENDATION" color={PURPLE}/>
            <div style={{fontFamily:FB,fontSize:13,color:TEXT,lineHeight:1.8}}>{scData.recommendation}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskTab({activeRegion,setActiveRegion,riskData,riskLoading,runRisk}){
  return(
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:"#030A14"}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>⚛ Quantum Risk Matrix</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {REGIONS.map(r=>(<button key={r.name} onClick={()=>{setActiveRegion(r.name);runRisk(r.name);}} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${activeRegion===r.name?CYAN:BORDER2}`,background:activeRegion===r.name?`${CYAN}10`:"transparent",color:activeRegion===r.name?CYAN:MUTED,cursor:"pointer",fontSize:12,fontFamily:FB}}>{r.name}</button>))}
      </div>
      {!riskData&&!riskLoading&&<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:52,opacity:.12}}>🎯</div><div style={{fontFamily:FH,fontSize:16,color:"rgba(216,232,255,.22)",fontWeight:"normal",marginTop:12}}>Select a region</div></div>}
      {riskLoading&&<Spinner label="Running quantum risk scorer..."/>}
      {!riskLoading&&riskData&&!riskData._error&&(
        <div>
          <Card color={(SEV_C[riskData.riskLevel]||BORDER)+"44"}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div>
                <Label text={`QUANTUM RISK — ${(riskData.region||"").toUpperCase()}`}/>
                <div style={{fontFamily:FH,fontSize:52,color:SEV_C[riskData.riskLevel]||AMBER,lineHeight:1,fontWeight:"normal"}}>{riskData.overallScore}</div>
                <div style={{fontFamily:FB,fontSize:12,color:MUTED,marginTop:4}}>{riskData.quantumCorrection}</div>
              </div>
              <Tag label={riskData.riskLevel} color={SEV_C[riskData.riskLevel]} bg={SEV_BG[riskData.riskLevel]}/>
            </div>
          </Card>
          <Card>
            <Label text="RISK INDICATORS — CALCULATED FROM REAL MODELS"/>
            {riskData.indicators?.map((ind,i)=>{
              const bc=ind.score>75?RED:ind.score>50?AMBER:ind.score>25?"#F5C842":GREEN;
              return(
                <div key={i} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontFamily:FB,fontSize:13,color:TEXT}}>{ind.name}</span>
                    <span style={{fontFamily:FB,fontSize:17,fontWeight:700,color:bc}}>{ind.score}</span>
                  </div>
                  <div style={{height:6,background:"rgba(255,255,255,.04)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${ind.score}%`,background:bc,borderRadius:3}}/>
                  </div>
                </div>
              );
            })}
          </Card>
          <Card color={PURPLE+"33"}>
            <Label text="EXPLANATION" color={PURPLE}/>
            <div style={{fontFamily:FB,fontSize:13,color:TEXT,lineHeight:1.75}}>{riskData.explanation}</div>
          </Card>
        </div>
      )}
    </div>
  );
}

function DiseaseTab({activeRegion,setActiveRegion,diseaseData,diseaseLoading,runDisease}){
  return(
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:"#030A14"}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>🧬 Disease Intelligence Engine</div>
      <p style={{fontFamily:FB,fontSize:13,color:MUTED,lineHeight:1.7,marginBottom:16}}>Six real mathematical models running simultaneously. Every number calculated from environmental measurements.</p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {REGIONS.map(r=>(<button key={r.name} onClick={()=>{setActiveRegion(r.name);runDisease(r.name);}} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${activeRegion===r.name?CYAN:BORDER2}`,background:activeRegion===r.name?`${CYAN}10`:"transparent",color:activeRegion===r.name?CYAN:MUTED,cursor:"pointer",fontSize:12,fontFamily:FB}}>{r.name}</button>))}
      </div>
      {!activeRegion&&!diseaseData&&<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:52,opacity:.12}}>🧬</div><div style={{fontFamily:FH,fontSize:16,color:"rgba(216,232,255,.22)",fontWeight:"normal",marginTop:12}}>Select a region to run all 6 models</div></div>}
      {diseaseLoading&&<Spinner label="Running 6 prediction models simultaneously..."/>}
      {!diseaseLoading&&diseaseData&&!diseaseData._error&&(
        <div>
          <Card color={(SEV_C[diseaseData.threat_level]||BORDER)+"44"}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <Label text={`OVERALL THREAT — ${(diseaseData.region||"").toUpperCase()}`}/>
                <div style={{fontFamily:FH,fontSize:52,color:SEV_C[diseaseData.threat_level]||AMBER,lineHeight:1,fontWeight:"normal"}}>{diseaseData.overall_threat_score}</div>
              </div>
              <Tag label={diseaseData.threat_level} color={SEV_C[diseaseData.threat_level]} bg={SEV_BG[diseaseData.threat_level]}/>
            </div>
          </Card>
          {diseaseData.predictions?.waterborne_disease&&(
            <Card color={RED+"33"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:22}}>💧</span><div><div style={{fontFamily:FH,fontSize:15,color:TEXT}}>Waterborne Disease — Poisson Model</div></div></div>
              <MetricGrid items={[["OUTBREAK PROBABILITY",`${diseaseData.predictions.waterborne_disease.probability_pct}%`,RED,diseaseData.predictions.waterborne_disease.disease],["CASES/WEEK",diseaseData.predictions.waterborne_disease.expected_cases_week1?.toLocaleString(),AMBER],["DAYS TO OUTBREAK",diseaseData.predictions.waterborne_disease.days_to_outbreak,RED]]}/>
            </Card>
          )}
          {diseaseData.predictions?.mercury_neurological&&(
            <Card color={PURPLE+"33"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:22}}>🧠</span><div><div style={{fontFamily:FH,fontSize:15,color:TEXT}}>Mercury Neurological — WHO Bioaccumulation</div></div></div>
              <MetricGrid items={[["FISH MERCURY",`${diseaseData.predictions.mercury_neurological.fish_mercury_mgkg} mg/kg`,RED],["CHILDREN AT RISK",diseaseData.predictions.mercury_neurological.children_at_risk?.toLocaleString(),RED],["CHILD EXPOSURE",`${diseaseData.predictions.mercury_neurological.child_exposure_ratio}x`,RED]]}/>
              <InfoBox label="SEVERITY" value={diseaseData.predictions.mercury_neurological.severity} color={RED}/>
            </Card>
          )}
          {diseaseData.predictions?.pandemic_emergence&&(
            <Card color={AMBER+"33"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:22}}>🦠</span><div><div style={{fontFamily:FH,fontSize:15,color:TEXT}}>Pandemic Emergence — EcoHealth Model</div></div></div>
              <MetricGrid items={[["SPILLOVER PROBABILITY",`${diseaseData.predictions.pandemic_emergence.spillover_probability_12m}%`,AMBER],["EPIDEMIC RISK",`${diseaseData.predictions.pandemic_emergence.epidemic_amplification_prob}%`,RED],["PATHOGEN TYPE",diseaseData.predictions.pandemic_emergence.pathogen_type?.split(" ")[0],AMBER]]}/>
              <InfoBox label="LEAD TIME" value={diseaseData.predictions.pandemic_emergence.lead_time_advantage} color={GREEN}/>
            </Card>
          )}
          {diseaseData.predictions?.food_security&&(
            <Card color={GREEN+"33"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:22}}>🌾</span><div><div style={{fontFamily:FH,fontSize:15,color:TEXT}}>Food Security — IPC/FEWS Model</div></div></div>
              <MetricGrid items={[["CROP STRESS",diseaseData.predictions.food_security.crop_stress_index,AMBER],["YIELD LOSS",`${diseaseData.predictions.food_security.yield_reduction_pct}%`,RED],["PEOPLE AT RISK",diseaseData.predictions.food_security.people_at_risk?.toLocaleString(),AMBER]]}/>
            </Card>
          )}
          {diseaseData.predictions?.ecosystem_tipping_point&&(
            <Card color={GREEN+"33"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:22}}>🌿</span><div><div style={{fontFamily:FH,fontSize:15,color:TEXT}}>Ecosystem Tipping Point — Scheffer Theory</div></div></div>
              <MetricGrid items={[["RESILIENCE",diseaseData.predictions.ecosystem_tipping_point.resilience_index,GREEN],["YEARS LEFT",diseaseData.predictions.ecosystem_tipping_point.years_to_tipping_point,RED],["SERVICES VALUE",diseaseData.predictions.ecosystem_tipping_point.ecosystem_services_value,CYAN]]}/>
              <InfoBox label="INTERVENTION WINDOW" value={diseaseData.predictions.ecosystem_tipping_point.intervention_window} color={RED}/>
            </Card>
          )}
          {diseaseData.predictions?.conflict&&(
            <Card color={AMBER+"33"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><span style={{fontSize:22}}>⚠️</span><div><div style={{fontFamily:FH,fontSize:15,color:TEXT}}>Conflict Prediction — PRIO Model</div></div></div>
              <MetricGrid items={[["CONFLICT PROBABILITY",`${diseaseData.predictions.conflict.conflict_probability_pct}%`,AMBER],["FLASHPOINTS",diseaseData.predictions.conflict.flashpoint_communities,RED],["MONTHS TO ESCALATION",diseaseData.predictions.conflict.months_to_escalation,AMBER]]}/>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function LawyerTab({lawyerData,lawyerLoading,runLawyer}){
  const [form,setForm]=useState({region:"Western Region",communityName:"",reporterName:"",incidentType:"water_contamination",incidentDescription:""});
  const update=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:"#030A14"}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>⚖️ Digital Lawyer — Community Evidence Generator</div>
      <p style={{fontFamily:FB,fontSize:13,color:MUTED,lineHeight:1.7,marginBottom:16}}>Affected communities get automatic court-ready evidence packages from satellite data. Free. Instant. No lawyer needed.</p>
      <Card>
        <Label text="COMMUNITY REPORT"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <div>
            <Label text="REGION"/>
            <select value={form.region} onChange={e=>update("region",e.target.value)} style={{width:"100%",background:P2,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 11px",color:TEXT,fontSize:13,fontFamily:FB}}>
              {REGIONS.map(r=><option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <Label text="INCIDENT TYPE"/>
            <select value={form.incidentType} onChange={e=>update("incidentType",e.target.value)} style={{width:"100%",background:P2,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 11px",color:TEXT,fontSize:13,fontFamily:FB}}>
              <option value="water_contamination">Water Contamination</option>
              <option value="air_pollution">Air Pollution</option>
              <option value="land_destruction">Land Destruction</option>
              <option value="health_impact">Health Impact</option>
            </select>
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <Label text="COMMUNITY NAME"/>
          <input value={form.communityName} onChange={e=>update("communityName",e.target.value)} placeholder="e.g. Newtown community near Tarkwa" style={{width:"100%",background:P2,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 11px",color:TEXT,fontSize:13,outline:"none",fontFamily:FB}}/>
        </div>
        <div style={{marginBottom:10}}>
          <Label text="REPORTER NAME (optional)"/>
          <input value={form.reporterName} onChange={e=>update("reporterName",e.target.value)} placeholder="Your name" style={{width:"100%",background:P2,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 11px",color:TEXT,fontSize:13,outline:"none",fontFamily:FB}}/>
        </div>
        <div style={{marginBottom:14}}>
          <Label text="DESCRIBE WHAT HAPPENED"/>
          <textarea value={form.incidentDescription} onChange={e=>update("incidentDescription",e.target.value)} rows={3} placeholder="Describe the contamination..." style={{width:"100%",background:P2,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 11px",color:TEXT,fontSize:13,outline:"none",fontFamily:FB,resize:"vertical"}}/>
        </div>
        <button onClick={()=>runLawyer(form)} disabled={lawyerLoading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${RED},#BB2222)`,color:"white",fontSize:14,fontFamily:FB,fontWeight:600,cursor:"pointer",opacity:lawyerLoading?.7:1}}>
          {lawyerLoading?"Generating Evidence...":"⚖️ Generate Court-Ready Evidence Package"}
        </button>
      </Card>
      {lawyerLoading&&<Spinner label="Compiling satellite evidence and human rights classifications..."/>}
      {!lawyerLoading&&lawyerData&&!lawyerData._error&&(
        <div>
          <Card color={RED+"44"}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <Label text="EVIDENCE PACKAGE"/>
                <div style={{fontFamily:FH,fontSize:17,color:TEXT,fontWeight:"normal",marginBottom:4}}>{lawyerData.classification}</div>
                <div style={{fontFamily:FM,fontSize:10,color:CYAN}}>Report ID: {lawyerData.report_id}</div>
              </div>
              <Tag label="COURT ADMISSIBLE" color={GREEN}/>
            </div>
            <InfoBox label="EXECUTIVE SUMMARY" value={lawyerData.executive_summary}/>
          </Card>
          <Card>
            <Label text="CONTAMINATION EVIDENCE"/>
            <MetricGrid items={[["MERCURY",`${lawyerData.contamination_evidence?.mercury_times_over_who_limit}x WHO`,RED],["ARSENIC",`${lawyerData.contamination_evidence?.arsenic_times_over_who_limit}x WHO`,AMBER],["TURBIDITY",`${lawyerData.contamination_evidence?.turbidity_times_over_safe}x safe`,AMBER]]}/>
            <InfoBox label="PRIMARY SOURCE" value={lawyerData.contamination_evidence?.primary_source}/>
          </Card>
          <Card>
            <Label text="HEALTH IMPACT"/>
            <MetricGrid items={[["DISEASE OUTBREAK",lawyerData.health_impact?.disease_outbreak_probability_30days,RED],["CHILDREN AT RISK",lawyerData.health_impact?.children_at_neurological_risk?.toLocaleString(),RED],["CASES/MONTH",lawyerData.health_impact?.expected_cases_monthly?.toLocaleString(),AMBER]]}/>
          </Card>
          <Card>
            <Label text="ECONOMIC DAMAGES"/>
            <MetricGrid items={[["PROPERTY",`GHS ${lawyerData.economic_damages?.property_and_livelihood_damage_ghs?.toLocaleString()}`,RED],["AGRICULTURE",`GHS ${lawyerData.economic_damages?.agricultural_productivity_loss_ghs?.toLocaleString()}`,AMBER],["TOTAL",`GHS ${lawyerData.economic_damages?.total_quantified_damages_ghs?.toLocaleString()}`,RED]]}/>
          </Card>
          <Card color={PURPLE+"33"}>
            <Label text="UN HUMAN RIGHTS VIOLATIONS" color={PURPLE}/>
            <BulletList items={lawyerData.un_human_rights_violations} color={RED} icon="⚖"/>
          </Card>
          <Card>
            <Label text="SATELLITE EVIDENCE TIMELINE"/>
            {(lawyerData.satellite_evidence_timeline||[]).map((e,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"9px 12px",background:P2,borderRadius:7,marginBottom:6}}>
                <div style={{fontFamily:FM,fontSize:9,color:CYAN,flexShrink:0,marginTop:2}}>{e.date}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:FB,fontSize:12,color:TEXT,marginBottom:2}}>{e.event}</div>
                  <div style={{fontFamily:FM,fontSize:9,color:MUTED}}>{e.source} · {e.confidence}</div>
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <Label text="RESPONSIBLE PARTIES"/>
            {(lawyerData.responsible_parties||[]).map((p,i)=>(
              <div key={i} style={{background:P2,borderRadius:8,padding:"12px 14px",marginBottom:10}}>
                <div style={{fontFamily:FB,fontSize:13,fontWeight:600,color:RED,marginBottom:4}}>{p.party}</div>
                <div style={{fontFamily:FB,fontSize:12,color:TEXT,marginBottom:4}}>{p.evidence}</div>
                <div style={{fontFamily:FM,fontSize:10,color:AMBER}}>Legal: {p.legal_basis}</div>
              </div>
            ))}
          </Card>
          <Card color={GREEN+"33"}>
            <Label text="LEGAL REMEDIES REQUESTED" color={GREEN}/>
            <BulletList items={lawyerData.legal_remedies_requested} color={GREEN} icon="✓"/>
          </Card>
        </div>
      )}
    </div>
  );
}

function DamTab({damData,damLoading,runDam}){
  const [form,setForm]=useState({region:"Western Region",damName:"",damAge:15,heightMeters:45,tailingsVolumeMCubic:12,lastInspectionDays:180,rainfallLast30Days:150});
  const update=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:"#030A14"}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>🏔️ Tailings Dam Collapse Predictor</div>
      <p style={{fontFamily:FB,fontSize:13,color:MUTED,lineHeight:1.7,marginBottom:16}}>ICOLD statistical failure model. Predicts collapse 90 days before failure.</p>
      <Card>
        <div style={{marginBottom:10}}>
          <Label text="REGION"/>
          <select value={form.region} onChange={e=>update("region",e.target.value)} style={{width:"100%",background:P2,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 11px",color:TEXT,fontSize:13,fontFamily:FB}}>
            {REGIONS.map(r=><option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <div style={{marginBottom:10}}>
          <Label text="DAM NAME"/>
          <input value={form.damName} onChange={e=>update("damName",e.target.value)} placeholder="e.g. Bogoso Tailings Dam" style={{width:"100%",background:P2,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 11px",color:TEXT,fontSize:13,outline:"none",fontFamily:FB}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          {[["Dam Age (years)","damAge"],["Height (metres)","heightMeters"],["Tailings Volume (Mm³)","tailingsVolumeMCubic"],["Inspection Gap (days)","lastInspectionDays"],["Rainfall (mm/30d)","rainfallLast30Days"]].map(([label,key])=>(
            <div key={key}>
              <Label text={label.toUpperCase()}/>
              <input type="number" value={form[key]} onChange={e=>update(key,Number(e.target.value))} style={{width:"100%",background:P2,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 11px",color:TEXT,fontSize:13,outline:"none",fontFamily:FB}}/>
            </div>
          ))}
        </div>
        <button onClick={()=>runDam(form)} disabled={damLoading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${AMBER},#CC6600)`,color:"white",fontSize:14,fontFamily:FB,fontWeight:600,cursor:"pointer",opacity:damLoading?.7:1}}>
          {damLoading?"Analysing...":"🏔️ Run Collapse Risk Analysis"}
        </button>
      </Card>
      {damLoading&&<Spinner label="Running ICOLD structural failure model..."/>}
      {!damLoading&&damData&&!damData._error&&(
        <div>
          <Card color={(SEV_C[damData.risk_level]||BORDER)+"44"}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <Label text={`FAILURE RISK — ${(damData.dam_name||"").toUpperCase()}`}/>
                <div style={{fontFamily:FH,fontSize:52,color:SEV_C[damData.risk_level]||AMBER,lineHeight:1,fontWeight:"normal"}}>{damData.failure_probability_pct}%</div>
              </div>
              <div style={{textAlign:"right"}}>
                <Tag label={damData.risk_level} color={SEV_C[damData.risk_level]} bg={SEV_BG[damData.risk_level]}/>
                <div style={{fontFamily:FM,fontSize:11,color:RED,marginTop:10,fontWeight:600}}>{damData.days_to_critical_condition} days to critical</div>
              </div>
            </div>
          </Card>
          <Card>
            <Label text="STRUCTURAL FACTORS"/>
            {damData.structural_factors&&Object.entries(damData.structural_factors).map(([k,v])=>(
              <div key={k} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontFamily:FB,fontSize:12,color:TEXT}}>{k.replace(/_/g," ")}</span>
                  <span style={{fontFamily:FB,fontSize:14,fontWeight:700,color:v>70?RED:v>40?AMBER:GREEN}}>{v}</span>
                </div>
                <div style={{height:5,background:"rgba(255,255,255,.04)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${v}%`,background:v>70?RED:v>40?AMBER:GREEN}}/>
                </div>
              </div>
            ))}
          </Card>
          <Card color={RED+"33"}>
            <Label text="DOWNSTREAM IMPACT" color={RED}/>
            <MetricGrid items={[["POPULATION AT RISK",damData.downstream_impact?.population_at_risk?.toLocaleString(),RED],["FLOOD SPEED",`${damData.downstream_impact?.flood_wave_speed_kmh} km/h`,AMBER],["WARNING TIME",`${damData.downstream_impact?.warning_time_minutes} min`,RED]]}/>
            <InfoBox label="COMPARABLE DISASTER" value={damData.downstream_impact?.comparable_disaster} color={RED}/>
          </Card>
          <Card>
            <Label text="WARNING SIGNALS"/>
            {(damData.warning_signals||[]).map((w,i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"8px 12px",background:P2,borderRadius:7,marginBottom:6}}>
                <Tag label={w.severity} color={SEV_C[w.severity]||AMBER}/>
                <span style={{fontFamily:FB,fontSize:12,color:TEXT,lineHeight:1.6}}>{w.signal}</span>
              </div>
            ))}
          </Card>
          <Card>
            <Label text="SATELLITE MONITORING"/>
            {(damData.satellite_indicators||[]).map((s,i)=>(
              <div key={i} style={{background:P2,borderRadius:7,padding:"10px 12px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontFamily:FB,fontSize:13,color:TEXT}}>{s.indicator}</span>
                  <Tag label={s.status} color={s.status.includes("DETECTED")||s.status.includes("CONTAMINATED")?RED:s.status==="ELEVATED"?AMBER:GREEN}/>
                </div>
                <div style={{fontFamily:FM,fontSize:10,color:MUTED,marginBottom:2}}>{s.method}</div>
                <div style={{fontFamily:FB,fontSize:11,color:CYAN}}>{s.value}</div>
              </div>
            ))}
          </Card>
          <Card color={damData.risk_level==="CRITICAL"?RED+"33":GREEN+"22"}>
            <Label text="IMMEDIATE ACTIONS" color={damData.risk_level==="CRITICAL"?RED:GREEN}/>
            <BulletList items={damData.immediate_actions} color={damData.risk_level==="CRITICAL"?RED:GREEN} icon={damData.risk_level==="CRITICAL"?"🚨":"✓"}/>
          </Card>
        </div>
      )}
    </div>
  );
}

function InsuranceTab({insuranceData,insuranceLoading,runInsurance}){
  const [form,setForm]=useState({region:"Western Region",cropType:"cocoa",farmSizeHectares:2});
  const update=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:"#030A14"}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>🌱 Parametric Crop Insurance Engine</div>
      <p style={{fontFamily:FB,fontSize:13,color:MUTED,lineHeight:1.7,marginBottom:16}}>Satellite-triggered insurance for Ghanaian farmers. No paperwork. Payout via mobile money within 48 hours.</p>
      <Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
          <div>
            <Label text="REGION"/>
            <select value={form.region} onChange={e=>update("region",e.target.value)} style={{width:"100%",background:P2,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 11px",color:TEXT,fontSize:13,fontFamily:FB}}>
              {REGIONS.map(r=><option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <Label text="CROP TYPE"/>
            <select value={form.cropType} onChange={e=>update("cropType",e.target.value)} style={{width:"100%",background:P2,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 11px",color:TEXT,fontSize:13,fontFamily:FB}}>
              {["cocoa","maize","cassava","yam","rice"].map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <Label text="FARM SIZE (HA)"/>
            <input type="number" min={0.5} step={0.5} value={form.farmSizeHectares} onChange={e=>update("farmSizeHectares",Number(e.target.value))} style={{width:"100%",background:P2,border:`1px solid ${BORDER}`,borderRadius:7,padding:"8px 11px",color:TEXT,fontSize:13,outline:"none",fontFamily:FB}}/>
          </div>
        </div>
        <button onClick={()=>runInsurance(form)} disabled={insuranceLoading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${GREEN},#009944)`,color:"white",fontSize:14,fontFamily:FB,fontWeight:600,cursor:"pointer",opacity:insuranceLoading?.7:1}}>
          {insuranceLoading?"Calculating...":"🌱 Calculate Insurance & Yield"}
        </button>
      </Card>
      {insuranceLoading&&<Spinner label="Running satellite yield model..."/>}
      {!insuranceLoading&&insuranceData&&!insuranceData._error&&(
        <div>
          <Card color={GREEN+"33"}>
            <Label text={`POLICY — ${insuranceData.crop_type?.toUpperCase()} — ${insuranceData.farm_size_ha} HA`}/>
            <div style={{fontFamily:FM,fontSize:10,color:CYAN,marginBottom:12}}>Policy ID: {insuranceData.policy_id}</div>
            <MetricGrid items={[["YIELD LOSS",`${insuranceData.yield_assessment?.yield_loss_pct}%`,RED],["EXPECTED YIELD",`${insuranceData.yield_assessment?.expected_yield_this_season_kg?.toLocaleString()} kg`,GREEN],["NORMAL YIELD",`${insuranceData.yield_assessment?.normal_yield_kg_ha} kg/ha`,CYAN]]}/>
          </Card>
          <Card>
            <Label text="FINANCIAL ASSESSMENT"/>
            <MetricGrid items={[["NORMAL REVENUE",`GHS ${insuranceData.financial_assessment?.normal_revenue_ghs?.toLocaleString()}`,CYAN],["REVENUE LOSS",`GHS ${insuranceData.financial_assessment?.revenue_loss_ghs?.toLocaleString()}`,RED],["INSURANCE PAYOUT",`GHS ${insuranceData.financial_assessment?.insurance_payout_ghs?.toLocaleString()}`,GREEN]]}/>
            <div style={{background:`${insuranceData.payout_conditions?.payout_will_occur?GREEN:AMBER}0a`,border:`1px solid ${insuranceData.payout_conditions?.payout_will_occur?GREEN:AMBER}22`,borderRadius:8,padding:"11px 13px"}}>
              <Label text="PAYOUT STATUS" color={insuranceData.payout_conditions?.payout_will_occur?GREEN:AMBER}/>
              <div style={{fontFamily:FB,fontSize:13,color:TEXT}}>{insuranceData.payout_conditions?.payout_will_occur?"✓ PAYOUT WILL OCCUR — "+insuranceData.payout_conditions?.payout_timeline:"No payout — yield loss below threshold"}</div>
            </div>
          </Card>
          <Card>
            <Label text="SATELLITE TRIGGERS"/>
            {(insuranceData.satellite_triggers||[]).map((t,i)=>(
              <div key={i} style={{background:P2,borderRadius:8,padding:"11px 13px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontFamily:FB,fontSize:13,fontWeight:600,color:TEXT}}>{t.trigger}</span>
                  <Tag label={t.current_status} color={t.current_status==="TRIGGERED"?RED:t.current_status==="NOT TRIGGERED"?GREEN:AMBER}/>
                </div>
                <div style={{fontFamily:FM,fontSize:10,color:MUTED,marginBottom:3}}>{t.satellite}</div>
                <div style={{fontFamily:FB,fontSize:12,color:CYAN}}>{t.current_value}</div>
              </div>
            ))}
          </Card>
          <Card color={GREEN+"22"}>
            <Label text="AGRONOMIC ADVICE" color={GREEN}/>
            <InfoBox label="SOIL SAFETY" value={insuranceData.agronomic_advice?.soil_safety}/>
            <InfoBox label="IRRIGATION" value={insuranceData.agronomic_advice?.irrigation_safety}/>
            <InfoBox label="PLANTING CALENDAR" value={insuranceData.agronomic_advice?.planting_calendar}/>
          </Card>
        </div>
      )}
    </div>
  );
}

function AirTab({airData,airLoading,runAir}){
  const [region,setRegion]=useState("Western Region");
  const aqiColor=aqi=>aqi>150?RED:aqi>100?AMBER:aqi>50?"#F5C842":GREEN;
  return(
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:"#030A14"}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>💨 Real-Time Air Quality Alert System</div>
      <p style={{fontFamily:FB,fontSize:13,color:MUTED,lineHeight:1.7,marginBottom:16}}>Mercury vapour, PM2.5, SO2 calculated from environmental data. SMS alerts in English and Twi.</p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {REGIONS.map(r=>(<button key={r.name} onClick={()=>setRegion(r.name)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${region===r.name?CYAN:BORDER2}`,background:region===r.name?`${CYAN}10`:"transparent",color:region===r.name?CYAN:MUTED,cursor:"pointer",fontSize:12,fontFamily:FB}}>{r.name}</button>))}
      </div>
      <button onClick={()=>runAir(region)} disabled={airLoading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${CYAN},#0099BB)`,color:BG,fontSize:14,fontFamily:FB,fontWeight:600,cursor:"pointer",marginBottom:20,opacity:airLoading?.7:1}}>
        {airLoading?"Calculating...":"💨 Run Air Quality Analysis"}
      </button>
      {airLoading&&<Spinner label="Calculating pollutants and generating alerts..."/>}
      {!airLoading&&airData&&!airData._error&&(
        <div>
          <Card color={aqiColor(airData.aqi)+"44"}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <Label text={`AQI — ${(airData.region||"").toUpperCase()}`}/>
                <div style={{fontFamily:FH,fontSize:52,color:aqiColor(airData.aqi),lineHeight:1,fontWeight:"normal"}}>{airData.aqi}</div>
                <div style={{fontFamily:FB,fontSize:14,color:aqiColor(airData.aqi),marginTop:4,fontWeight:600}}>{airData.aqi_category}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <Tag label={airData.alert_level?.split("—")[0].trim()} color={aqiColor(airData.aqi)}/>
                <div style={{fontFamily:FM,fontSize:10,color:MUTED,marginTop:8}}>Affected: {airData.affected_population?.toLocaleString()}</div>
              </div>
            </div>
            <MetricGrid items={[["MERCURY VAPOUR",`${airData.pollutants?.mercury_vapour_ng_m3} ng/m³`,RED,`${airData.pollutants?.mercury_times_over_who_limit}x WHO`],["PM2.5",`${airData.pollutants?.pm25_ugm3} μg/m³`,AMBER,`${airData.pollutants?.pm25_times_over_who_limit}x WHO`],["SO2",`${airData.pollutants?.so2_ugm3} μg/m³`,AMBER,"Industrial"]]}/>
          </Card>
          {(airData.health_impacts||[]).map((h,i)=>(
            <Card key={i} color={RED+"33"}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div style={{fontFamily:FH,fontSize:15,color:TEXT}}>{h.pollutant}</div>
                <Tag label={`${h.times_over}x WHO`} color={RED}/>
              </div>
              <InfoBox label="HEALTH EFFECT" value={h.health_effect} color={RED}/>
              <InfoBox label="MOST VULNERABLE" value={h.most_vulnerable} color={AMBER}/>
              <InfoBox label="ACTION" value={h.recommendation} color={GREEN}/>
            </Card>
          ))}
          <Card color={CYAN+"22"}>
            <Label text="SMS ALERT — ENGLISH"/>
            <div style={{fontFamily:FM,fontSize:11,color:TEXT,background:P2,borderRadius:7,padding:"12px 14px",lineHeight:1.8,whiteSpace:"pre-line"}}>{airData.sms_alerts?.english}</div>
          </Card>
          <Card color={CYAN+"22"}>
            <Label text="SMS ALERT — TWI"/>
            <div style={{fontFamily:FM,fontSize:11,color:TEXT,background:P2,borderRadius:7,padding:"12px 14px",lineHeight:1.8,whiteSpace:"pre-line"}}>{airData.sms_alerts?.twi}</div>
          </Card>
          <Card>
            <Label text="24-HOUR FORECAST"/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {(airData.forecast_24h||[]).map((f,i)=>(
                <div key={i} style={{background:P2,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontFamily:FM,fontSize:9,color:MUTED,marginBottom:4}}>{f.time}</div>
                  <div style={{fontFamily:FB,fontSize:18,fontWeight:700,color:aqiColor(f.predicted_aqi)}}>{f.predicted_aqi}</div>
                  <div style={{fontFamily:FM,fontSize:9,color:aqiColor(f.predicted_aqi),marginTop:2}}>{f.category}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function CriminalTab({criminalData,criminalLoading,runCriminal}){
  const [region,setRegion]=useState("Western Region");
  return(
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:"#030A14"}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>🔍 Criminal Network Intelligence</div>
      <p style={{fontFamily:FB,fontSize:13,color:MUTED,lineHeight:1.7,marginBottom:16}}>Quantum graph analysis maps illegal mining criminal networks. From site operators to financiers to international gold traders.</p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {REGIONS.map(r=>(<button key={r.name} onClick={()=>setRegion(r.name)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${region===r.name?CYAN:BORDER2}`,background:region===r.name?`${CYAN}10`:"transparent",color:region===r.name?CYAN:MUTED,cursor:"pointer",fontSize:12,fontFamily:FB}}>{r.name}</button>))}
      </div>
      <button onClick={()=>runCriminal(region)} disabled={criminalLoading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${PURPLE},#6600BB)`,color:"white",fontSize:14,fontFamily:FB,fontWeight:600,cursor:"pointer",marginBottom:20,opacity:criminalLoading?.7:1}}>
        {criminalLoading?"Mapping network...":"🔍 Run Criminal Network Analysis"}
      </button>
      {criminalLoading&&<Spinner label="Running quantum graph analysis..."/>}
      {!criminalLoading&&criminalData&&!criminalData._error&&(
        <div>
          <Card color={PURPLE+"44"}>
            <Label text={`CRIMINAL NETWORK — ${(criminalData.region||"").toUpperCase()}`}/>
            <MetricGrid items={[["OPERATORS",criminalData.network_summary?.total_operators_estimated,RED],["GOLD/MONTH",`${criminalData.network_summary?.gold_extracted_kg_per_month} kg`,AMBER],["REVENUE",`GHS ${criminalData.network_summary?.criminal_revenue_ghs_per_month?.toLocaleString()}/mo`,RED]]}/>
            <InfoBox label="QUANTUM ADVANTAGE" value={criminalData.quantum_advantage} color={CYAN}/>
          </Card>
          <Card>
            <Label text="NETWORK HIERARCHY"/>
            {(criminalData.network_layers||[]).map((layer,i)=>(
              <div key={i} style={{background:P2,borderRadius:8,padding:"12px 14px",marginBottom:10,borderLeft:`3px solid ${[RED,AMBER,CYAN,PURPLE][i]||CYAN}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontFamily:FB,fontSize:13,fontWeight:600,color:[RED,AMBER,CYAN,PURPLE][i]||CYAN}}>Level {layer.level} — {layer.role}</div>
                  <Tag label={`${layer.estimated_count} identified`} color={[RED,AMBER,CYAN,PURPLE][i]||CYAN}/>
                </div>
                <div style={{fontFamily:FB,fontSize:12,color:MUTED,marginBottom:4}}>{layer.location}</div>
                <div style={{fontFamily:FM,fontSize:10,color:AMBER}}>Legal: {layer.legal_exposure}</div>
              </div>
            ))}
          </Card>
          <Card>
            <Label text="GOLD SUPPLY CHAIN"/>
            {(criminalData.supply_chain||[]).map((step,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"9px 12px",background:P2,borderRadius:7,marginBottom:6}}>
                <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,background:`${CYAN}20`,border:`1px solid ${CYAN}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FM,fontSize:11,color:CYAN,fontWeight:700}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontFamily:FB,fontSize:13,color:TEXT,fontWeight:600}}>{step.stage}</span>
                    <Tag label={step.confidence} color={parseFloat(step.confidence)>80?GREEN:parseFloat(step.confidence)>60?AMBER:MUTED}/>
                  </div>
                  <div style={{fontFamily:FB,fontSize:12,color:MUTED}}>{step.location}</div>
                </div>
              </div>
            ))}
          </Card>
          <Card color={RED+"33"}>
            <Label text="INTERPOL TRIGGERS" color={RED}/>
            <BulletList items={criminalData.interpol_triggers} color={RED} icon="🚨"/>
          </Card>
          <Card>
            <Label text="ENFORCEMENT PRIORITIES"/>
            {(criminalData.enforcement_priorities||[]).map((p,i)=>(
              <div key={i} style={{background:P2,borderRadius:8,padding:"11px 13px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontFamily:FB,fontSize:13,color:TEXT}}>#{p.priority} — {p.action}</span>
                  <Tag label={p.evidence_strength} color={p.evidence_strength==="VERY STRONG"?GREEN:p.evidence_strength==="STRONG"?CYAN:AMBER}/>
                </div>
                <div style={{fontFamily:FM,fontSize:10,color:MUTED}}>{p.recommended_agency}</div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

export default function App(){
  const [role,setRole]=useState(ROLES[0]);
  const [layer,setLayer]=useState(LAYERS[0]);
  const [region,setRegion]=useState(null);
  const [prediction,setPrediction]=useState(null);
  const [loading,setLoading]=useState(false);
  const [customQ,setCustomQ]=useState("");
  const [showRoleModal,setShowRoleModal]=useState(false);
  const [time,setTime]=useState("");
  const [hovered,setHovered]=useState(null);
  const [activeRegion,setActiveRegion]=useState(null);
  const [activeTab,setActiveTab]=useState("Map");
  const [qData,setQData]=useState(null);
  const [qLoading,setQLoading]=useState(false);
  const [qType,setQType]=useState("land");
  const [riskData,setRiskData]=useState(null);
  const [riskLoading,setRiskLoading]=useState(false);
  const [scData,setScData]=useState(null);
  const [scLoading,setScLoading]=useState(false);
  const [scScenario,setScScenario]=useState("mining_doubles");
  const [scIntensity,setScIntensity]=useState(75);
  const [scRegion,setScRegion]=useState("Western Region");
  const [diseaseData,setDiseaseData]=useState(null);
  const [diseaseLoading,setDiseaseLoading]=useState(false);
  const [lawyerData,setLawyerData]=useState(null);
  const [lawyerLoading,setLawyerLoading]=useState(false);
  const [damData,setDamData]=useState(null);
  const [damLoading,setDamLoading]=useState(false);
  const [insuranceData,setInsuranceData]=useState(null);
  const [insuranceLoading,setInsuranceLoading]=useState(false);
  const [airData,setAirData]=useState(null);
  const [airLoading,setAirLoading]=useState(false);
  const [criminalData,setCriminalData]=useState(null);
  const [criminalLoading,setCriminalLoading]=useState(false);
  const [satData,setSatData]=useState(null);
  const [satLoading,setSatLoading]=useState(false);

  const TABS=["Map","Quantum Optimizer","Scenario Simulator","Risk Matrix","Disease Intelligence","Digital Lawyer","Dam Risk","Crop Insurance","Air Quality","Criminal Network"];

  useEffect(()=>{const t=setInterval(()=>setTime(new Date().toLocaleTimeString("en-GB")+" GMT"),1000);return()=>clearInterval(t);},[]);

  const post=useCallback(async(url,body)=>{
    const r=await fetch("https://qgif-backend.onrender.com"+url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    return r.json();
  },[]);

  const runPrediction=useCallback(async(reg,lay,rol,q=null)=>{
    setLoading(true);setPrediction(null);
    try{const d=await post("/predict",{region:reg,layer:lay.key,role:rol.key,question:q});setPrediction(d);}
    catch(e){setPrediction({_error:e.message});}
    finally{setLoading(false);}
  },[post]);

  const runQuantum=useCallback(async(reg,type)=>{setQLoading(true);setQData(null);try{const d=await post(type==="land"?"/quantum/land-optimizer":"/quantum/route-optimizer",{region:reg||"Western Region"});setQData(d);}catch(e){setQData({_error:e.message});}finally{setQLoading(false);}},[post]);
  const runRisk=useCallback(async(reg)=>{setRiskLoading(true);setRiskData(null);try{const d=await post("/quantum/risk-scorer",{region:reg||"Western Region"});setRiskData(d);}catch(e){setRiskData({_error:e.message});}finally{setRiskLoading(false);}},[post]);
  const runScenario=useCallback(async()=>{setScLoading(true);setScData(null);try{const d=await post("/scenario",{region:scRegion,scenario:scScenario,intensity:scIntensity});setScData(d);}catch(e){setScData({_error:e.message});}finally{setScLoading(false);}},[post,scRegion,scScenario,scIntensity]);
  const runDisease=useCallback(async(reg)=>{setDiseaseLoading(true);setDiseaseData(null);try{const d=await post("/disease-intelligence",{region:reg||"Western Region"});setDiseaseData(d);}catch(e){setDiseaseData({_error:e.message});}finally{setDiseaseLoading(false);}},[post]);
  const runLawyer=useCallback(async(form)=>{setLawyerLoading(true);setLawyerData(null);try{const d=await post("/digital-lawyer",form);setLawyerData(d);}catch(e){setLawyerData({_error:e.message});}finally{setLawyerLoading(false);}},[post]);
  const runDam=useCallback(async(form)=>{setDamLoading(true);setDamData(null);try{const d=await post("/dam-risk",form);setDamData(d);}catch(e){setDamData({_error:e.message});}finally{setDamLoading(false);}},[post]);
  const runInsurance=useCallback(async(form)=>{setInsuranceLoading(true);setInsuranceData(null);try{const d=await post("/crop-insurance",form);setInsuranceData(d);}catch(e){setInsuranceData({_error:e.message});}finally{setInsuranceLoading(false);}},[post]);
  const runAir=useCallback(async(reg)=>{setAirLoading(true);setAirData(null);try{const d=await post("/air-quality",{region:reg});setAirData(d);}catch(e){setAirData({_error:e.message});}finally{setAirLoading(false);}},[post]);
  const runCriminal=useCallback(async(reg)=>{setCriminalLoading(true);setCriminalData(null);try{const d=await post("/criminal-network",{region:reg});setCriminalData(d);}catch(e){setCriminalData({_error:e.message});}finally{setCriminalLoading(false);}},[post]);
  const runSatelliteCheck=useCallback(async(reg)=>{setSatLoading(true);setSatData(null);try{const d=await post("/satellite-check",{region:reg});setSatData(d);}catch(e){setSatData({_error:e.message});}finally{setSatLoading(false);}},[post]);

  const handleRegionClick=useCallback((name)=>{setRegion(name);setActiveRegion(name);runPrediction(name,layer,role);runSatelliteCheck(name);},[layer,role,runPrediction,runSatelliteCheck]);
  const handleRoleSelect=useCallback((r)=>{setRole(r);setShowRoleModal(false);if(region)runPrediction(region,layer,r);},[region,layer,runPrediction]);

  return(
    <div style={{display:"grid",gridTemplateRows:"52px 1fr",height:"100vh",background:BG,color:TEXT,fontFamily:FB,fontSize:13,overflow:"hidden"}}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes scan{0%{top:0;opacity:0}5%{opacity:1}95%{opacity:1}100%{top:100%;opacity:0}}
        @keyframes qspin{to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes hspulse{0%{r:5;opacity:.9}100%{r:22;opacity:0}}
        *{box-sizing:border-box} button{transition:background .15s,border-color .15s,color .15s}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:${BG}} ::-webkit-scrollbar-thumb{background:rgba(0,200,240,.2);border-radius:2px}
        select,input,textarea{transition:border-color .15s} select:focus,input:focus,textarea:focus{border-color:${CYAN}!important}
      `}</style>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",background:PANEL,borderBottom:`1px solid ${BORDER}`,gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{width:28,height:28,background:"linear-gradient(135deg,#00C8F0,#8B5CF6)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:BG}}>⚛</div>
          <span style={{fontFamily:FH,fontSize:14,color:CYAN,whiteSpace:"nowrap"}}>QGIF</span>
        </div>
        <div style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center",flex:1}}>
          {TABS.map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:"4px 9px",borderRadius:5,fontFamily:FB,fontSize:10,cursor:"pointer",border:`1px solid ${activeTab===tab?CYAN:BORDER2}`,background:activeTab===tab?`${CYAN}10`:"transparent",color:activeTab===tab?CYAN:MUTED,whiteSpace:"nowrap"}}>{tab}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <button onClick={()=>setShowRoleModal(true)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${BORDER}`,background:`${CYAN}08`,color:CYAN,fontSize:11,fontFamily:FB,cursor:"pointer",whiteSpace:"nowrap"}}>{role.icon} {role.label}</button>
          <span style={{fontFamily:FM,fontSize:9,color:GREEN,whiteSpace:"nowrap"}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:GREEN,display:"inline-block",marginRight:4,animation:"blink 1.8s ease-in-out infinite"}}/>{time}
          </span>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"180px 1fr 300px",height:"calc(100vh - 52px)",overflow:"hidden"}}>
        <div style={{background:PANEL,borderRight:`1px solid ${BORDER}`,overflowY:"auto"}}>
          <div style={{padding:"10px 8px",borderBottom:`1px solid ${BORDER2}`}}>
            <Label text="INTELLIGENCE LAYERS"/>
            {LAYERS.map(l=>(
              <button key={l.key} onClick={()=>{setLayer(l);if(region)runPrediction(region,l,role);}} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 8px",borderRadius:5,width:"100%",textAlign:"left",border:`1px solid ${layer.key===l.key?CYAN:BORDER2}`,marginBottom:2,cursor:"pointer",fontSize:11,fontFamily:FB,background:layer.key===l.key?`${CYAN}10`:"transparent",color:layer.key===l.key?CYAN:TEXT2}}>
                <span>{l.icon}</span><span>{l.label}</span>
              </button>
            ))}
          </div>
          <div style={{padding:"10px 8px"}}>
            <Label text="RISK BY REGION"/>
            {REGIONS.map(r=>(
              <div key={r.name} onClick={()=>handleRegionClick(r.name)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${BORDER2}`,cursor:"pointer"}}>
                <span style={{fontFamily:FB,fontSize:11,color:activeRegion===r.name?CYAN:TEXT}}>{r.name}</span>
                <Tag label={r.risk} color={SEV_C[r.risk]||MUTED}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{overflow:"hidden",position:"relative"}}>
          <div style={{display:activeTab==="Map"?"block":"none",width:"100%",height:"100%"}}><MapTab layer={layer} activeRegion={activeRegion} hovered={hovered} setHovered={setHovered} onRegionClick={handleRegionClick}/></div>
          <div style={{display:activeTab==="Quantum Optimizer"?"flex":"none",width:"100%",height:"100%"}}><QuantumTab activeRegion={activeRegion} setActiveRegion={setActiveRegion} qData={qData} qLoading={qLoading} qType={qType} setQType={setQType} runQuantum={runQuantum}/></div>
          <div style={{display:activeTab==="Scenario Simulator"?"flex":"none",width:"100%",height:"100%"}}><ScenarioTab scRegion={scRegion} setScRegion={setScRegion} scScenario={scScenario} setScScenario={setScScenario} scIntensity={scIntensity} setScIntensity={setScIntensity} scData={scData} scLoading={scLoading} runScenario={runScenario}/></div>
          <div style={{display:activeTab==="Risk Matrix"?"flex":"none",width:"100%",height:"100%"}}><RiskTab activeRegion={activeRegion} setActiveRegion={setActiveRegion} riskData={riskData} riskLoading={riskLoading} runRisk={runRisk}/></div>
          <div style={{display:activeTab==="Disease Intelligence"?"flex":"none",width:"100%",height:"100%"}}><DiseaseTab activeRegion={activeRegion} setActiveRegion={setActiveRegion} diseaseData={diseaseData} diseaseLoading={diseaseLoading} runDisease={runDisease}/></div>
          <div style={{display:activeTab==="Digital Lawyer"?"flex":"none",width:"100%",height:"100%"}}><LawyerTab lawyerData={lawyerData} lawyerLoading={lawyerLoading} runLawyer={runLawyer}/></div>
          <div style={{display:activeTab==="Dam Risk"?"flex":"none",width:"100%",height:"100%"}}><DamTab damData={damData} damLoading={damLoading} runDam={runDam}/></div>
          <div style={{display:activeTab==="Crop Insurance"?"flex":"none",width:"100%",height:"100%"}}><InsuranceTab insuranceData={insuranceData} insuranceLoading={insuranceLoading} runInsurance={runInsurance}/></div>
          <div style={{display:activeTab==="Air Quality"?"flex":"none",width:"100%",height:"100%"}}><AirTab airData={airData} airLoading={airLoading} runAir={runAir}/></div>
          <div style={{display:activeTab==="Criminal Network"?"flex":"none",width:"100%",height:"100%"}}><CriminalTab criminalData={criminalData} criminalLoading={criminalLoading} runCriminal={runCriminal}/></div>
        </div>

        <div style={{background:PANEL,borderLeft:`1px solid ${BORDER}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"10px 12px",borderBottom:`1px solid ${BORDER}`,flexShrink:0}}>
            <div style={{fontFamily:FH,fontSize:13,color:TEXT,fontWeight:"normal"}}>Intelligence Output</div>
            <div style={{fontFamily:FB,fontSize:11,color:MUTED}}>{region?`${region} · ${layer.label}`:"Click any region on the map"}</div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:14}}>
            {/* LIVE SATELLITE PANEL */}
            {region&&(
              <div style={{background:satData&&!satData._error&&satData.earth_engine_status==="CONNECTED — REAL SATELLITE DATA"?`${GREEN}08`:`${MUTED}08`,border:`1px solid ${satData&&!satData._error&&satData.earth_engine_status==="CONNECTED — REAL SATELLITE DATA"?GREEN+"33":BORDER}`,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:satLoading||satData?6:0}}>
                  <div style={{fontFamily:FM,fontSize:9,color:GREEN,letterSpacing:".08em",display:"flex",alignItems:"center",gap:5}}>
                    <span style={{width:5,height:5,borderRadius:"50%",background:satLoading?AMBER:(satData&&satData.earth_engine_status==="CONNECTED — REAL SATELLITE DATA")?GREEN:MUTED,display:"inline-block",animation:satLoading?"blink 1s infinite":"none"}}/>
                    LIVE SATELLITE — SENTINEL-2
                  </div>
                  {satData&&satData.satellite_date&&<span style={{fontFamily:FM,fontSize:9,color:CYAN}}>{satData.satellite_date}</span>}
                </div>
                {satLoading&&<div style={{fontFamily:FB,fontSize:11,color:MUTED}}>Querying Earth Engine for latest imagery...</div>}
                {!satLoading&&satData&&satData._error&&<div style={{fontFamily:FB,fontSize:11,color:AMBER}}>Satellite check failed: {satData.message}</div>}
                {!satLoading&&satData&&satData.earth_engine_status==="NOT CONNECTED"&&<div style={{fontFamily:FB,fontSize:11,color:MUTED}}>Earth Engine not connected — showing baseline data only</div>}
                {!satLoading&&satData&&satData.earth_engine_status==="CONNECTED — REAL SATELLITE DATA"&&(
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:6}}>
                      <div style={{background:P2,borderRadius:6,padding:"6px 8px"}}>
                        <div style={{fontFamily:FM,fontSize:8,color:MUTED}}>NDVI (vegetation)</div>
                        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:satData.ndvi_mean>0.5?GREEN:satData.ndvi_mean>0.3?"#F5C842":RED}}>{satData.ndvi_mean}</div>
                      </div>
                      <div style={{background:P2,borderRadius:6,padding:"6px 8px"}}>
                        <div style={{fontFamily:FM,fontSize:8,color:MUTED}}>Degradation gap</div>
                        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:satData.degradation_gap>0.25?RED:GREEN}}>{satData.degradation_gap}</div>
                      </div>
                      <div style={{background:P2,borderRadius:6,padding:"6px 8px"}}>
                        <div style={{fontFamily:FM,fontSize:8,color:MUTED}}>Water area</div>
                        <div style={{fontFamily:FB,fontSize:13,fontWeight:700,color:CYAN}}>{satData.water_fraction_pct}%</div>
                      </div>
                    </div>
                    <div style={{fontFamily:FB,fontSize:11,color:satData.degradation_signal?.startsWith("YES")?AMBER:TEXT2,lineHeight:1.6}}>
                      {satData.degradation_signal?.startsWith("YES")?"⚠ ":""}{satData.degradation_signal}
                    </div>
                  </div>
                )}
              </div>
            )}
            {loading&&<Spinner label={"Analysing "+(region||"region")+"..."}/>}
            {!loading&&!prediction&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:250,gap:12,textAlign:"center",padding:16}}>
                <div style={{fontSize:40,opacity:.15}}>🗺️</div>
                <div style={{fontFamily:FH,fontSize:16,color:"rgba(216,232,255,.3)",fontWeight:"normal"}}>Select a region</div>
              </div>
            )}
            {!loading&&prediction&&!prediction._error&&(
              <div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                  <Tag label={prediction.severity} color={SEV_C[prediction.severity]} bg={SEV_BG[prediction.severity]}/>
                  <Tag label={prediction.confidence} color={CYAN}/>
                </div>
                <div style={{fontFamily:FH,fontSize:16,lineHeight:1.35,marginBottom:5,color:TEXT,fontWeight:"normal"}}>{prediction.title}</div>
                <div style={{fontFamily:FB,fontSize:12,color:TEXT2,marginBottom:12,lineHeight:1.65}}>{prediction.subtitle}</div>
                <div style={{fontFamily:FB,fontSize:12,color:TEXT,lineHeight:1.8,marginBottom:12,padding:"10px 12px",background:P2,borderRadius:7,borderLeft:`3px solid ${CYAN}`}}>{prediction.analysis}</div>
                <Label text="KEY FINDINGS"/>
                {(prediction.findings||[]).map((f,i)=>(
                  <div key={i} style={{display:"flex",gap:8,padding:"7px 10px",background:P2,borderRadius:6,marginBottom:5}}>
                    <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,marginTop:4,background:{critical:RED,high:AMBER,medium:"#F5C842",low:GREEN}[f.severity]||CYAN}}/>
                    <div style={{fontFamily:FB,fontSize:12,color:TEXT,lineHeight:1.6}}>{f.text}</div>
                  </div>
                ))}
                {prediction.roleSpecificInsight&&(
                  <div style={{background:`${role.color}0a`,border:`1px solid ${role.color}22`,borderRadius:7,padding:"9px 11px",marginTop:10}}>
                    <Label text={`FOR ${role.label.toUpperCase()}`} color={role.color}/>
                    <div style={{fontFamily:FB,fontSize:12,color:TEXT,lineHeight:1.7}}>{prediction.roleSpecificInsight}</div>
                  </div>
                )}
                <Label text="RECOMMENDED ACTIONS"/>
                {(prediction.immediateActions||[]).map((a,i)=>(
                  <div key={i} style={{padding:"7px 10px",borderRadius:6,border:`1px solid ${BORDER}`,background:P2,color:TEXT,fontSize:12,fontFamily:FB,marginBottom:5,display:"flex",alignItems:"flex-start",gap:8}}>
                    <span>{["🔴","🟡","🟢"][i]}</span>{a}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{borderTop:`1px solid ${BORDER}`,padding:"8px 10px",flexShrink:0}}>
            <Label text="CUSTOM QUERY"/>
            <div style={{display:"flex",gap:6}}>
              <input value={customQ} onChange={e=>setCustomQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&customQ.trim()){runPrediction(region||"Ghana",layer,role,customQ);setCustomQ("");}}} placeholder="Ask anything..." style={{flex:1,background:P2,border:`1px solid ${BORDER}`,borderRadius:6,padding:"7px 9px",color:TEXT,fontSize:12,outline:"none",fontFamily:FB}}/>
              <button onClick={()=>{if(customQ.trim()){runPrediction(region||"Ghana",layer,role,customQ);setCustomQ("");}}} style={{background:`linear-gradient(135deg,${CYAN},#0099BB)`,border:"none",borderRadius:6,padding:"7px 12px",color:BG,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:FB}}>Ask</button>
            </div>
          </div>
        </div>
      </div>

      {showRoleModal&&(
        <div onClick={()=>setShowRoleModal(false)} style={{position:"fixed",inset:0,background:"rgba(3,10,20,.9)",backdropFilter:"blur(12px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:PANEL,border:`1px solid ${BORDER}`,borderRadius:14,padding:24,width:580,maxWidth:"95vw",position:"relative"}}>
            <button onClick={()=>setShowRoleModal(false)} style={{position:"absolute",top:12,right:12,background:"transparent",border:"none",color:MUTED,fontSize:18,cursor:"pointer"}}>✕</button>
            <div style={{fontFamily:FH,fontSize:18,marginBottom:5,color:TEXT,fontWeight:"normal"}}>Select Your Role</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:18}}>
              {ROLES.map(r=>(
                <div key={r.key} onClick={()=>handleRoleSelect(r)} style={{background:role.key===r.key?`${CYAN}0e`:P2,border:`1px solid ${role.key===r.key?CYAN:BORDER}`,borderRadius:10,padding:14,cursor:"pointer"}}>
                  <div style={{fontSize:22,marginBottom:7}}>{r.icon}</div>
                  <div style={{fontFamily:FH,fontSize:13,marginBottom:4,color:TEXT,fontWeight:"normal"}}>{r.label}</div>
                  <div style={{fontFamily:FB,fontSize:10,color:MUTED,lineHeight:1.5}}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}