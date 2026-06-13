import { useState, useEffect, useRef, useCallback } from "react";

const ROLES = [
  { key:"government", label:"Government Official", icon:"🏛", color:"#00C8F0",
    desc:"Policy briefings, budget decisions, inter-agency coordination",
    prompts:["Which regions face the highest risk requiring cabinet intervention?","What is the full economic cost of illegal mining to Ghana this year?","Which environmental issues need emergency government action now?","What international reporting obligations is Ghana currently failing?"]},
  { key:"epa", label:"EPA Officer", icon:"👮", color:"#F07020",
    desc:"Enforcement intelligence, violations, evidence, patrol routing",
    prompts:["All active violations with GPS coordinates for enforcement today","Which licensed miners are at risk of permit revocation this month?","What evidence exists for criminal prosecution of illegal operators?","Which water bodies exceeded legal contamination limits this week?"]},
  { key:"miner", label:"Licensed Miner", icon:"⛏", color:"#F5C842",
    desc:"Compliance score, ESG reporting, licence protection",
    prompts:["What is our compliance score and the top risks to our licence?","How do our environmental metrics compare to peer operators?","Which ESG data do we need for our annual report?","What remediation actions would most protect our operating licence?"]},
  { key:"ngo", label:"NGO / Dev Bank", icon:"🌍", color:"#8B5CF6",
    desc:"Impact measurement, community vulnerability, carbon MRV",
    prompts:["Which communities are most vulnerable and underserved right now?","What is the carbon credit potential for forest conservation here?","How many SDG indicators are negatively impacted in this region?","Which intervention prevents the most disease burden per dollar spent?"]},
  { key:"doctor", label:"Doctor / Health", icon:"👩‍⚕️", color:"#00E87A",
    desc:"Disease outbreak prediction, clinical protocols, exposure mapping",
    prompts:["Which communities will present mercury poisoning cases in 90 days?","What clinical tests should I order for patients from contaminated zones?","How many waterborne disease cases should I expect this month?","What are the neurological risks for children in this district?"]},
  { key:"farmer", label:"Farmer", icon:"👨‍🌾", color:"#F5C842",
    desc:"Irrigation safety, crop advice, yield forecasting, market prices",
    prompts:["Is my irrigation water safe to use this week?","Which crops are safe to grow in my soil right now?","What should I plant this season for the best yield and income?","How will rainfall change in my area over the next five years?"]},
];

const LAYERS = [
  {key:"all",icon:"⚛",label:"All Threats"},
  {key:"mining",icon:"⛏️",label:"Illegal Mining"},
  {key:"health",icon:"🏥",label:"Public Health"},
  {key:"water",icon:"💧",label:"Water Security"},
  {key:"food",icon:"🌾",label:"Food & Agriculture"},
  {key:"climate",icon:"🌡️",label:"Climate Risk"},
  {key:"conflict",icon:"⚠️",label:"Conflict Prediction"},
  {key:"carbon",icon:"🌲",label:"Carbon & Forest"},
  {key:"disease",icon:"🦠",label:"Disease Forecasting"},
  {key:"economy",icon:"📊",label:"Economic Risk"},
];

const REGIONS = [
  {name:"Western Region",risk:"CRITICAL",color:"#E83A3A"},
  {name:"Eastern Region",risk:"HIGH",color:"#F07020"},
  {name:"Central Region",risk:"HIGH",color:"#F07020"},
  {name:"Ashanti Region",risk:"MEDIUM",color:"#F5C842"},
  {name:"Brong-Ahafo",risk:"MEDIUM",color:"#F5C842"},
  {name:"Greater Accra",risk:"MEDIUM",color:"#F5C842"},
  {name:"Volta Region",risk:"LOW",color:"#00E87A"},
  {name:"Northern Region",risk:"LOW",color:"#00E87A"},
  {name:"Upper East Region",risk:"LOW",color:"#00E87A"},
  {name:"Upper West Region",risk:"LOW",color:"#00E87A"},
  {name:"Oti Region",risk:"MEDIUM",color:"#F5C842"},
  {name:"Bono East",risk:"MEDIUM",color:"#F5C842"},
];

const SCENARIOS = [
  {key:"mining_doubles",label:"Mining Doubles",icon:"⛏️",desc:"What if illegal mining doubles in 2 years?"},
  {key:"river_cleaned",label:"River Cleanup",icon:"💧",desc:"What if we invest in cleaning the river?"},
  {key:"mining_banned",label:"Enforcement Crackdown",icon:"👮",desc:"What if EPA eliminates all illegal mining?"},
  {key:"reforestation",label:"Reforestation",icon:"🌳",desc:"What if we restore 50,000 hectares of forest?"},
];

const SEV = {CRITICAL:"#E83A3A",HIGH:"#F07020",MEDIUM:"#F5C842",LOW:"#00E87A"};
const SEVBG = {CRITICAL:"rgba(232,58,58,.12)",HIGH:"rgba(240,112,32,.12)",MEDIUM:"rgba(245,200,66,.1)",LOW:"rgba(0,232,122,.08)"};
const IMPACT_COLOR = {TRANSFORMATIONAL:"#00C8F0",CRITICAL:"#E83A3A","MAJOR IMPROVEMENT":"#00E87A",POSITIVE:"#8B5CF6",HIGH:"#F07020",MEDIUM:"#F5C842"};
const TABS = ["Map","Quantum Optimizer","Scenario Simulator","Risk Matrix"];

const MAP_REGIONS = [
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

const SEV_FILL={CRITICAL:"rgba(232,58,58,0.1)",HIGH:"rgba(240,112,32,0.08)",MEDIUM:"rgba(245,200,66,0.06)",LOW:"rgba(0,232,122,0.04)"};
const SEV_STROKE={CRITICAL:"rgba(232,58,58,0.38)",HIGH:"rgba(240,112,32,0.32)",MEDIUM:"rgba(245,200,66,0.26)",LOW:"rgba(0,232,122,0.2)"};

const C = {
  bg:"#050E1C", panel:"#08162A", panel2:"#0B1E35", panel3:"#0E2440",
  cyan:"#00C8F0", green:"#00E87A", amber:"#F07020", red:"#E83A3A", purple:"#8B5CF6",
  text:"#D8E8FF", text2:"rgba(216,232,255,0.55)", muted:"#4A6880",
  border:"rgba(0,200,240,0.1)", border2:"rgba(0,200,240,0.05)",
};

const F = {
  heading:"Georgia, 'Times New Roman', serif",
  body:"'Segoe UI', Arial, sans-serif",
  mono:"'Courier New', monospace",
};

function Tag({label, color="#00C8F0", bg}) {
  return (
    <span style={{fontFamily:F.mono, fontSize:10, padding:"3px 9px", borderRadius:4, fontWeight:600,
      background:bg||`${color}18`, color, border:`1px solid ${color}33`, whiteSpace:"nowrap"}}>
      {label}
    </span>
  );
}

function Spinner({label}) {
  return (
    <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", gap:16}}>
      <div style={{width:52,height:52,position:"relative"}}>
        {[[52,"#00C8F0",".9s",0],[38,"#8B5CF6","1.3s",1],[26,"#00E87A","1.7s",2]].map(([sz,col,dur],i)=>(
          <div key={i} style={{position:"absolute",width:sz,height:sz,top:"50%",left:"50%",borderRadius:"50%",border:"2px solid transparent",
            [i===0?"borderTopColor":i===1?"borderRightColor":"borderBottomColor"]:col,
            animation:`qspin ${dur} linear infinite`,transform:"translate(-50%,-50%)"}}/>
        ))}
      </div>
      <div style={{fontFamily:F.body, fontSize:13, color:C.muted, textAlign:"center", lineHeight:1.7}}>{label}</div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(ROLES[0]);
  const [layer, setLayer] = useState(LAYERS[0]);
  const [region, setRegion] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customQ, setCustomQ] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [time, setTime] = useState("");
  const [hovered, setHovered] = useState(null);
  const [activeRegion, setActiveRegion] = useState(null);
  const [activeTab, setActiveTab] = useState("Map");
  const [quantumData, setQuantumData] = useState(null);
  const [quantumLoading, setQuantumLoading] = useState(false);
  const [quantumType, setQuantumType] = useState("land");
  const [riskData, setRiskData] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [scenarioData, setScenarioData] = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState("mining_doubles");
  const [scenarioIntensity, setScenarioIntensity] = useState(75);
  const [scenarioRegion, setScenarioRegion] = useState("Western Region");

  const predictionRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("en-GB")+" GMT"), 1000);
    return () => clearInterval(t);
  }, []);

  const post = useCallback(async (url, body) => {
    const r = await fetch("http://localhost:5000"+url, {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
    });
    return r.json();
  }, []);

  const runPrediction = useCallback(async (reg, lay, rol, q=null) => {
    setLoading(true);
    setPrediction(null);
    try {
      const d = await post("/predict", {region:reg, layer:lay.key, role:rol.key, question:q});
      setPrediction(d);
    } catch(e) {
      setPrediction({_error:e.message});
    } finally {
      setLoading(false);
    }
  }, [post]);

  const runQuantum = useCallback(async (reg, type) => {
    setQuantumLoading(true);
    setQuantumData(null);
    try {
      const d = await post(type==="land"?"/quantum/land-optimizer":"/quantum/route-optimizer", {region:reg||"Western Region"});
      setQuantumData(d);
    } catch(e) {
      setQuantumData({_error:e.message});
    } finally {
      setQuantumLoading(false);
    }
  }, [post]);

  const runRisk = useCallback(async (reg) => {
    setRiskLoading(true);
    setRiskData(null);
    try {
      const d = await post("/quantum/risk-scorer", {region:reg||"Western Region"});
      setRiskData(d);
    } catch(e) {
      setRiskData({_error:e.message});
    } finally {
      setRiskLoading(false);
    }
  }, [post]);

  const runScenario = useCallback(async () => {
    setScenarioLoading(true);
    setScenarioData(null);
    try {
      const d = await post("/scenario", {region:scenarioRegion, scenario:activeScenario, intensity:scenarioIntensity});
      setScenarioData(d);
    } catch(e) {
      setScenarioData({_error:e.message});
    } finally {
      setScenarioLoading(false);
    }
  }, [post, scenarioRegion, activeScenario, scenarioIntensity]);

  const handleRegionClick = useCallback((name) => {
    setRegion(name);
    setActiveRegion(name);
    runPrediction(name, layer, role);
    if(activeTab==="Quantum Optimizer") runQuantum(name, quantumType);
    if(activeTab==="Risk Matrix") runRisk(name);
  }, [layer, role, activeTab, quantumType, runPrediction, runQuantum, runRisk]);

  const handleRoleSelect = useCallback((r) => {
    setRole(r);
    setShowRoleModal(false);
    if(region) runPrediction(region, layer, r);
  }, [region, layer, runPrediction]);

  const riskColor = r => SEV[r]||"#4A6880";

  // ── Intelligence Output (stable, no blink) ──
  const IntelPanel = () => (
    <div style={{flex:1, overflowY:"auto", padding:16}} ref={predictionRef}>
      {loading && <Spinner label={"Analysing " + (region||"selected region") + "..."}/>}

      {!loading && !prediction && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:280,gap:14,textAlign:"center",padding:20}}>
          <div style={{fontSize:44,opacity:.18}}>🗺️</div>
          <div style={{fontFamily:F.heading, fontSize:18, color:"rgba(216,232,255,.3)", fontWeight:"normal"}}>Select a region on the map</div>
          <p style={{fontFamily:F.body, fontSize:13, color:C.muted, lineHeight:1.7, maxWidth:240}}>
            Click any region to get intelligence tailored to your role as {role.label}.
          </p>
          <div style={{width:"100%",marginTop:8}}>
            {[{name:"Western Region",tag:"Critical risk"},{name:"Eastern Region",tag:"High risk"},{name:"Ashanti Region",tag:"Medium risk"}].map(r=>(
              <button key={r.name} onClick={()=>handleRegionClick(r.name)}
                style={{background:C.panel2,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",
                  fontSize:13,color:C.text2,cursor:"pointer",width:"100%",textAlign:"left",marginBottom:6,fontFamily:F.body}}>
                {r.name} — {r.tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && prediction && prediction._error && (
        <div style={{textAlign:"center",padding:24}}>
          <div style={{fontSize:32,opacity:.4,marginBottom:12}}>⚡</div>
          <div style={{fontFamily:F.heading,fontSize:16,color:C.amber,marginBottom:8}}>Server connection error</div>
          <p style={{fontFamily:F.body,fontSize:13,color:C.muted,marginBottom:16}}>Check that your server is running with node server.js in Terminal 1.</p>
          <button onClick={()=>runPrediction(region,layer,role)}
            style={{padding:"8px 18px",background:`${C.cyan}18`,border:`1px solid ${C.cyan}44`,borderRadius:7,color:C.cyan,fontSize:13,cursor:"pointer",fontFamily:F.body}}>
            Retry
          </button>
        </div>
      )}

      {!loading && prediction && !prediction._error && (
        <div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            <Tag label={prediction.severity} color={SEV[prediction.severity]} bg={SEVBG[prediction.severity]}/>
            <Tag label={prediction.confidence} color={C.cyan}/>
            <Tag label={layer.label} color={C.muted} bg="rgba(255,255,255,.04)"/>
          </div>

          <div style={{fontFamily:F.heading,fontSize:17,lineHeight:1.35,marginBottom:6,color:C.text,fontWeight:"normal"}}>
            {prediction.title}
          </div>
          <div style={{fontFamily:F.body,fontSize:13,color:C.text2,marginBottom:16,lineHeight:1.65}}>
            {prediction.subtitle}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            <div style={{background:C.panel2,border:`1px solid ${C.border2}`,borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginBottom:4,letterSpacing:".06em"}}>TIME HORIZON</div>
              <div style={{fontFamily:F.body,fontSize:13,fontWeight:600,color:C.cyan}}>{prediction.timeHorizon}</div>
            </div>
            <div style={{background:C.panel2,border:`1px solid ${C.border2}`,borderRadius:8,padding:"10px 12px"}}>
              <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginBottom:4,letterSpacing:".06em"}}>CONFIDENCE</div>
              <div style={{fontFamily:F.body,fontSize:13,fontWeight:600,color:C.green}}>{prediction.confidence}</div>
            </div>
            <div style={{background:C.panel2,border:`1px solid ${C.border2}`,borderRadius:8,padding:"10px 12px",gridColumn:"1/-1"}}>
              <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginBottom:4,letterSpacing:".06em"}}>PEOPLE AFFECTED</div>
              <div style={{fontFamily:F.body,fontSize:13,fontWeight:600,color:C.amber}}>{prediction.affectedPeople}</div>
            </div>
            <div style={{background:C.panel2,border:`1px solid ${C.border2}`,borderRadius:8,padding:"10px 12px",gridColumn:"1/-1"}}>
              <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginBottom:4,letterSpacing:".06em"}}>ECONOMIC RISK</div>
              <div style={{fontFamily:F.body,fontSize:14,fontWeight:600,color:C.red}}>{prediction.economicRisk}</div>
            </div>
          </div>

          <div style={{fontFamily:F.body,fontSize:13,color:C.text,lineHeight:1.8,marginBottom:14,
            padding:"12px 14px",background:C.panel2,borderRadius:8,borderLeft:`3px solid ${C.cyan}`}}>
            {prediction.analysis}
          </div>

          <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:".08em",marginBottom:10}}>KEY FINDINGS</div>
          {(prediction.findings||[]).map((f,i)=>(
            <div key={i} style={{display:"flex",gap:9,padding:"9px 12px",background:C.panel2,
              border:`1px solid ${C.border2}`,borderRadius:7,marginBottom:6}}>
              <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,marginTop:4,
                background:{critical:C.red,high:C.amber,medium:"#F5C842",low:C.green}[f.severity]||C.cyan}}/>
              <div style={{fontFamily:F.body,fontSize:13,color:C.text,lineHeight:1.65}}>{f.text}</div>
            </div>
          ))}

          {prediction.roleSpecificInsight && (
            <div style={{background:`${role.color}0a`,border:`1px solid ${role.color}22`,borderRadius:8,
              padding:"11px 13px",marginTop:12,marginBottom:10}}>
              <div style={{fontFamily:F.mono,fontSize:9,color:role.color,marginBottom:6,letterSpacing:".06em"}}>
                FOR {role.label.toUpperCase()}
              </div>
              <div style={{fontFamily:F.body,fontSize:13,color:C.text,lineHeight:1.7}}>{prediction.roleSpecificInsight}</div>
            </div>
          )}

          {prediction.quantumAdvantage && (
            <div style={{background:`${C.cyan}06`,border:`1px solid ${C.cyan}18`,borderRadius:8,
              padding:"11px 13px",marginBottom:12}}>
              <div style={{fontFamily:F.mono,fontSize:9,color:C.cyan,marginBottom:6,letterSpacing:".06em"}}>
                ⚛ QUANTUM ADVANTAGE
              </div>
              <div style={{fontFamily:F.body,fontSize:13,color:C.text,lineHeight:1.7}}>{prediction.quantumAdvantage}</div>
            </div>
          )}

          <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:".08em",marginBottom:10}}>
            RECOMMENDED ACTIONS
          </div>
          {(prediction.immediateActions||[]).map((a,i)=>(
            <div key={i} style={{padding:"9px 12px",borderRadius:7,border:`1px solid ${C.border}`,
              background:C.panel2,color:C.text,fontSize:13,fontFamily:F.body,marginBottom:6,
              display:"flex",alignItems:"flex-start",gap:9,lineHeight:1.65}}>
              <span style={{flexShrink:0}}>{["🔴","🟡","🟢"][i]}</span>{a}
            </div>
          ))}

          <button onClick={()=>runPrediction(region,layer,role)}
            style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"none",
              background:`linear-gradient(135deg,${C.cyan},#0099BB)`,color:C.bg,
              fontSize:13,fontFamily:F.body,fontWeight:600,cursor:"pointer",marginTop:8}}>
            Regenerate Intelligence
          </button>
        </div>
      )}
    </div>
  );

  // ── Quantum Optimizer ──
  const QuantumPanel = () => (
    <div style={{flex:1, overflowY:"auto", padding:20}}>
      <div style={{fontFamily:F.heading,fontSize:20,marginBottom:6,color:C.text,fontWeight:"normal"}}>
        ⚛ Quantum Optimizer Engine
      </div>
      <p style={{fontFamily:F.body,fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:20}}>
        Real quantum-inspired algorithms running on your computer. These implement actual QAOA and quantum walk logic.
      </p>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {[{key:"land",label:"QAOA Land Use"},{key:"route",label:"Quantum Walk Route"}].map(q=>(
          <button key={q.key} onClick={()=>{setQuantumType(q.key);if(activeRegion)runQuantum(activeRegion,q.key);}}
            style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${quantumType===q.key?C.cyan:C.border}`,
              background:quantumType===q.key?`${C.cyan}14`:"transparent",
              color:quantumType===q.key?C.cyan:C.muted,cursor:"pointer",fontSize:13,fontFamily:F.body}}>
            {q.label}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {REGIONS.slice(0,6).map(r=>(
          <button key={r.name} onClick={()=>{setActiveRegion(r.name);runQuantum(r.name,quantumType);}}
            style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${activeRegion===r.name?C.cyan:C.border2}`,
              background:activeRegion===r.name?`${C.cyan}10`:"transparent",
              color:activeRegion===r.name?C.cyan:C.muted,cursor:"pointer",fontSize:12,fontFamily:F.body}}>
            {r.name}
          </button>
        ))}
      </div>

      {!activeRegion && !quantumData && (
        <div style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:52,opacity:.12,marginBottom:12}}>⚛</div>
          <div style={{fontFamily:F.heading,fontSize:16,color:"rgba(216,232,255,.25)",fontWeight:"normal"}}>
            Select a region above to run the optimizer
          </div>
        </div>
      )}
      {quantumLoading && <Spinner label="Running quantum algorithm..."/>}
      {!quantumLoading && quantumData && !quantumData._error && (
        <div>
          <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:16}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              <Tag label={quantumData.algorithm} color={C.cyan}/>
              {quantumData.qubits && <Tag label={`${quantumData.qubits} qubits`} color={C.purple}/>}
              {quantumData.iterations && <Tag label={`${quantumData.iterations} iterations`} color={C.green}/>}
              {quantumData.trialsRun && <Tag label={`${quantumData.trialsRun} trials`} color={C.green}/>}
            </div>
            <div style={{fontFamily:F.heading,fontSize:17,marginBottom:10,color:C.text,fontWeight:"normal"}}>
              {quantumType==="land"?"Optimal Land Use Allocation":"Optimized Enforcement Route"}
            </div>
            <div style={{fontFamily:F.body,fontSize:13,color:C.text,lineHeight:1.75,
              padding:"11px 13px",background:C.panel2,borderRadius:8,borderLeft:`3px solid ${C.cyan}40`}}>
              {quantumData.explanation}
            </div>
          </div>

          {quantumType==="land" && quantumData.optimalAllocation && (
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:16}}>
              <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:".08em",marginBottom:16}}>
                OPTIMAL LAND ALLOCATION — {(quantumData.region||"").toUpperCase()}
              </div>
              {quantumData.optimalAllocation.map((item,i)=>{
                const cols=["#00C8F0","#00E87A","#E83A3A","#F07020","#8B5CF6"];
                return (
                  <div key={i} style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontFamily:F.body,fontSize:13,color:C.text}}>{item.type}</span>
                        <span style={{fontFamily:F.mono,fontSize:9,padding:"2px 7px",borderRadius:4,
                          background:item.recommendation==="Expand"?`${C.green}18`:item.recommendation==="Reduce"?`${C.red}18`:`${C.amber}14`,
                          color:item.recommendation==="Expand"?C.green:item.recommendation==="Reduce"?C.red:C.amber}}>
                          {item.recommendation}
                        </span>
                      </div>
                      <span style={{fontFamily:F.body,fontSize:18,fontWeight:700,color:cols[i]}}>{item.percentage}%</span>
                    </div>
                    <div style={{height:8,background:"rgba(255,255,255,.05)",borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${item.percentage}%`,background:cols[i],borderRadius:4}}/>
                    </div>
                    <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginTop:3}}>Quantum score: {item.score}/100</div>
                  </div>
                );
              })}
              <div style={{marginTop:14,padding:"10px 14px",background:`${C.cyan}08`,borderRadius:8,border:`1px solid ${C.cyan}18`}}>
                <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginBottom:4,letterSpacing:".06em"}}>QUANTUM SPEEDUP</div>
                <div style={{fontFamily:F.body,fontSize:13,color:C.cyan,fontWeight:600}}>{quantumData.quantumSpeedup}</div>
              </div>
            </div>
          )}

          {quantumType==="route" && quantumData.optimizedRoute && (
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:18}}>
              <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:".08em",marginBottom:14}}>
                OPTIMIZED ENFORCEMENT ROUTE — {(quantumData.region||"").toUpperCase()}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                {[["Distance",`${quantumData.totalDistance} km`,C.cyan],["Saved",`${quantumData.distanceSaved} km`,C.green],["Est. Time",quantumData.estimatedTime,C.amber]].map(([l,v,col])=>(
                  <div key={l} style={{background:C.panel2,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginBottom:3}}>{l}</div>
                    <div style={{fontFamily:F.body,fontSize:14,fontWeight:700,color:col}}>{v}</div>
                  </div>
                ))}
              </div>
              {quantumData.optimizedRoute.map((stop,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"10px 12px",background:C.panel2,borderRadius:8,marginBottom:8}}>
                  <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
                    background:`${stop.severity>=9?C.red:C.amber}18`,
                    border:`1px solid ${stop.severity>=9?C.red:C.amber}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontFamily:F.body,fontSize:12,fontWeight:700,
                    color:stop.severity>=9?C.red:C.amber}}>
                    {stop.order}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <span style={{fontFamily:F.body,fontSize:13,color:C.text}}>{stop.siteName}</span>
                      <Tag label={stop.action} color={stop.action==="ARREST & SEIZE"?C.red:C.amber}/>
                    </div>
                    <div style={{fontFamily:F.mono,fontSize:10,color:C.muted}}>
                      {stop.coordinates} · Severity {stop.severity}/10
                      {stop.distanceFromPrev>0?` · +${stop.distanceFromPrev}km`:""}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{marginTop:12,padding:"10px 14px",background:`${C.green}08`,borderRadius:8,border:`1px solid ${C.green}18`}}>
                <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginBottom:4,letterSpacing:".06em"}}>EFFICIENCY GAIN</div>
                <div style={{fontFamily:F.body,fontSize:13,color:C.green,fontWeight:600}}>{quantumData.efficiencyGain}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Scenario Simulator ──
  const ScenarioPanel = () => (
    <div style={{flex:1, overflowY:"auto", padding:20}}>
      <div style={{fontFamily:F.heading,fontSize:20,marginBottom:6,color:C.text,fontWeight:"normal"}}>
        Scenario Simulator
      </div>
      <p style={{fontFamily:F.body,fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:20}}>
        Ask "what if?" questions and see exactly how outcomes change across health, economy, food, water, and social stability.
        This is the tool ministers and investors need before making major decisions.
      </p>

      <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:20}}>
        <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:".08em",marginBottom:10}}>SELECT REGION</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:18}}>
          {REGIONS.map(r=>(
            <button key={r.name} onClick={()=>setScenarioRegion(r.name)}
              style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${scenarioRegion===r.name?C.cyan:C.border2}`,
                background:scenarioRegion===r.name?`${C.cyan}10`:"transparent",
                color:scenarioRegion===r.name?C.cyan:C.muted,cursor:"pointer",fontSize:12,fontFamily:F.body}}>
              {r.name}
            </button>
          ))}
        </div>

        <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:".08em",marginBottom:12}}>SELECT SCENARIO</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {SCENARIOS.map(s=>(
            <button key={s.key} onClick={()=>setActiveScenario(s.key)}
              style={{padding:"12px 14px",borderRadius:8,border:`1px solid ${activeScenario===s.key?C.cyan:C.border}`,
                background:activeScenario===s.key?`${C.cyan}10`:C.panel2,cursor:"pointer",textAlign:"left"}}>
              <div style={{fontSize:20,marginBottom:6}}>{s.icon}</div>
              <div style={{fontFamily:F.body,fontSize:13,fontWeight:600,color:C.text,marginBottom:3}}>{s.label}</div>
              <div style={{fontFamily:F.body,fontSize:11,color:C.muted,lineHeight:1.5}}>{s.desc}</div>
            </button>
          ))}
        </div>

        <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:".08em",marginBottom:8}}>
          INTENSITY — {scenarioIntensity}%
        </div>
        <input type="range" min={10} max={100} value={scenarioIntensity}
          onChange={e=>setScenarioIntensity(Number(e.target.value))}
          style={{width:"100%",marginBottom:18,accentColor:C.cyan}}/>

        <button onClick={runScenario} disabled={scenarioLoading}
          style={{width:"100%",padding:"12px",borderRadius:8,border:"none",
            background:`linear-gradient(135deg,${C.cyan},#0099BB)`,color:C.bg,
            fontSize:14,fontFamily:F.body,fontWeight:600,cursor:"pointer",opacity:scenarioLoading?.7:1}}>
          {scenarioLoading ? "Simulating..." : "Run Scenario Simulation"}
        </button>
      </div>

      {scenarioLoading && <Spinner label="Running scenario simulation..."/>}

      {!scenarioLoading && scenarioData && !scenarioData._error && (
        <div>
          <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:16}}>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:26}}>{scenarioData.icon}</span>
              <div>
                <div style={{fontFamily:F.heading,fontSize:17,color:C.text,fontWeight:"normal"}}>{scenarioData.scenario}</div>
                <div style={{fontFamily:F.body,fontSize:12,color:C.muted,marginTop:2}}>{scenarioData.description}</div>
              </div>
            </div>
            <div style={{fontFamily:F.body,fontSize:13,color:C.text,lineHeight:1.8,
              padding:"12px 14px",background:C.panel2,borderRadius:8,borderLeft:`3px solid ${C.cyan}40`}}>
              {scenarioData.summary}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {[["Total Impact",scenarioData.totalEconomicImpact,C.cyan],["People",scenarioData.peoplAtRisk,C.green]].map(([l,v,col])=>(
              <div key={l} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px"}}>
                <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginBottom:5,letterSpacing:".06em"}}>{l.toUpperCase()}</div>
                <div style={{fontFamily:F.body,fontSize:13,fontWeight:700,color:col,lineHeight:1.4}}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:".08em",marginBottom:12}}>
            OUTCOME ACROSS ALL DIMENSIONS
          </div>
          {(scenarioData.outcomes||[]).map((o,i)=>{
            const ic = IMPACT_COLOR[o.impact]||C.cyan;
            return (
              <div key={i} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontFamily:F.body,fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>{o.dimension}</div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <span style={{fontFamily:F.mono,fontSize:10,color:C.muted}}>{o.current}</span>
                      <span style={{fontFamily:F.mono,fontSize:10,color:C.muted}}>→</span>
                      <span style={{fontFamily:F.mono,fontSize:10,color:ic,fontWeight:600}}>{o.projected}</span>
                    </div>
                  </div>
                  <Tag label={o.impact} color={ic}/>
                </div>
                <div style={{fontFamily:F.body,fontSize:13,color:C.text,lineHeight:1.7,
                  padding:"9px 12px",background:C.panel2,borderRadius:7,borderLeft:`3px solid ${ic}35`}}>
                  {o.detail}
                </div>
                <div style={{marginTop:8,fontFamily:F.body,fontSize:12,color:ic,fontWeight:600}}>{o.change}</div>
              </div>
            );
          })}

          <div style={{background:`${C.purple}0a`,border:`1px solid ${C.purple}22`,borderRadius:10,padding:"14px 16px",marginTop:4,marginBottom:20}}>
            <div style={{fontFamily:F.mono,fontSize:10,color:C.purple,marginBottom:8,letterSpacing:".08em"}}>RECOMMENDATION</div>
            <div style={{fontFamily:F.body,fontSize:13,color:C.text,lineHeight:1.8}}>{scenarioData.recommendation}</div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Risk Matrix ──
  const RiskPanel = () => (
    <div style={{flex:1, overflowY:"auto", padding:20}}>
      <div style={{fontFamily:F.heading,fontSize:20,marginBottom:6,color:C.text,fontWeight:"normal"}}>
        ⚛ Quantum Risk Matrix
      </div>
      <p style={{fontFamily:F.body,fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:18}}>
        Maps risk indicators into a high-dimensional quantum feature space to detect correlations that classical weighted averages miss.
      </p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {REGIONS.map(r=>(
          <button key={r.name} onClick={()=>{setActiveRegion(r.name);runRisk(r.name);}}
            style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${activeRegion===r.name?C.cyan:C.border2}`,
              background:activeRegion===r.name?`${C.cyan}10`:"transparent",
              color:activeRegion===r.name?C.cyan:C.muted,cursor:"pointer",fontSize:12,fontFamily:F.body}}>
            {r.name}
          </button>
        ))}
      </div>

      {!riskData && !riskLoading && (
        <div style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:52,opacity:.12,marginBottom:12}}>🎯</div>
          <div style={{fontFamily:F.heading,fontSize:16,color:"rgba(216,232,255,.25)",fontWeight:"normal"}}>Select a region to run risk scoring</div>
        </div>
      )}
      {riskLoading && <Spinner label="Running quantum risk scorer..."/>}
      {!riskLoading && riskData && !riskData._error && (
        <div>
          <div style={{background:C.panel,border:`1px solid ${SEV[riskData.riskLevel]||C.border}44`,borderRadius:12,padding:18,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginBottom:6,letterSpacing:".06em"}}>
                  QUANTUM RISK SCORE — {(riskData.region||"").toUpperCase()}
                </div>
                <div style={{fontFamily:F.heading,fontSize:52,color:SEV[riskData.riskLevel]||C.amber,lineHeight:1,fontWeight:"normal"}}>
                  {riskData.overallScore}
                </div>
                <div style={{fontFamily:F.body,fontSize:12,color:C.muted,marginTop:4}}>{riskData.quantumCorrection}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <Tag label={riskData.riskLevel} color={SEV[riskData.riskLevel]} bg={SEVBG[riskData.riskLevel]}/>
                <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginTop:8}}>{riskData.featureSpaceDimension}</div>
                <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginTop:3}}>Classical score: {riskData.classicalScore}</div>
              </div>
            </div>
          </div>

          <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:16}}>
            <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:".08em",marginBottom:16}}>RISK INDICATORS</div>
            {riskData.indicators?.map((ind,i)=>{
              const bc = ind.score>75?C.red:ind.score>50?C.amber:ind.score>25?"#F5C842":C.green;
              return (
                <div key={i} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontFamily:F.body,fontSize:13,color:C.text}}>{ind.name}</span>
                      <Tag label={ind.status} color={SEV[ind.status]||C.amber}/>
                    </div>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <span style={{fontFamily:F.mono,fontSize:10,color:C.muted}}>weight {ind.weight}%</span>
                      <span style={{fontFamily:F.body,fontSize:17,fontWeight:700,color:bc}}>{ind.score}</span>
                    </div>
                  </div>
                  <div style={{height:6,background:"rgba(255,255,255,.04)",borderRadius:3,overflow:"hidden",marginBottom:3}}>
                    <div style={{height:"100%",width:`${ind.score}%`,background:bc,borderRadius:3}}/>
                  </div>
                  <div style={{fontFamily:F.mono,fontSize:9,color:`${C.cyan}55`}}>
                    quantum feature: {ind.quantumFeature} · contribution: {ind.contribution}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{background:`${C.purple}08`,border:`1px solid ${C.purple}22`,borderRadius:12,padding:18,marginBottom:20}}>
            <div style={{fontFamily:F.mono,fontSize:10,color:C.purple,letterSpacing:".08em",marginBottom:8}}>ALGORITHM EXPLANATION</div>
            <div style={{fontFamily:F.body,fontSize:13,color:C.text,lineHeight:1.75}}>{riskData.explanation}</div>
          </div>
        </div>
      )}
    </div>
  );

  // ── MAIN RENDER ──
  return (
    <div style={{display:"grid", gridTemplateRows:"52px 1fr", height:"100vh", background:C.bg,
      color:C.text, fontFamily:F.body, fontSize:13, overflow:"hidden"}}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes scan{0%{top:0;opacity:0}5%{opacity:1}95%{opacity:1}100%{top:100%;opacity:0}}
        @keyframes qspin{to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes hspulse{0%{r:5;opacity:.9}100%{r:22;opacity:0}}
        *{box-sizing:border-box}
        button{transition:background .15s, border-color .15s, color .15s}
        input[type=range]{cursor:pointer}
      `}</style>

      {/* TOPBAR */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 18px",background:C.panel,borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,background:"linear-gradient(135deg,#00C8F0,#8B5CF6)",
            borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:14,fontWeight:700,color:C.bg}}>⚛</div>
          <div>
            <span style={{fontFamily:F.heading,fontSize:15,color:C.cyan}}>QGIF</span>
            <span style={{fontFamily:F.body,fontSize:11,color:C.muted,marginLeft:6}}>
              Quantum Geospatial Intelligence Framework · UENR Ghana
            </span>
          </div>
        </div>
        <div style={{display:"flex",gap:3}}>
          {TABS.map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              style={{padding:"5px 14px",borderRadius:6,fontFamily:F.body,fontSize:12,cursor:"pointer",
                border:`1px solid ${activeTab===tab?C.cyan:C.border2}`,
                background:activeTab===tab?`${C.cyan}10`:"transparent",
                color:activeTab===tab?C.cyan:C.muted}}>
              {tab}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setShowRoleModal(true)}
            style={{padding:"5px 14px",borderRadius:6,border:`1px solid ${C.border}`,
              background:`${C.cyan}08`,color:C.cyan,fontSize:12,fontFamily:F.body,cursor:"pointer"}}>
            {role.icon} {role.label}
          </button>
          <span style={{fontFamily:F.mono,fontSize:10,color:C.green}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block",
              marginRight:5,animation:"blink 1.8s ease-in-out infinite"}}/>
            Live · 847 sensors
          </span>
          <span style={{fontFamily:F.mono,fontSize:10,color:C.muted}}>{time}</span>
        </div>
      </div>

      {/* BODY */}
      <div style={{display:"grid",gridTemplateColumns:"200px 1fr 320px",overflow:"hidden",height:"calc(100vh - 52px)"}}>

        {/* SIDEBAR */}
        <div style={{background:C.panel,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflowY:"auto"}}>
          <div style={{padding:"12px 10px",borderBottom:`1px solid ${C.border2}`}}>
            <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>
              Intelligence Layers
            </div>
            {LAYERS.map(l=>(
              <button key={l.key}
                onClick={()=>{setLayer(l);if(region)runPrediction(region,l,role);}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:6,
                  width:"100%",textAlign:"left",border:`1px solid ${layer.key===l.key?C.cyan:C.border2}`,
                  marginBottom:2,cursor:"pointer",fontSize:12,fontFamily:F.body,
                  background:layer.key===l.key?`${C.cyan}10`:"transparent",
                  color:layer.key===l.key?C.cyan:C.text2}}>
                <span>{l.icon}</span><span>{l.label}</span>
              </button>
            ))}
          </div>
          <div style={{padding:"12px 10px",borderBottom:`1px solid ${C.border2}`}}>
            <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>
              Today
            </div>
            {[["Violations",23,C.red,"↑ 4 from yesterday"],["Health Alerts",7,C.amber,"2 critical"],["Farm Advisories","4,821",C.green,"sent today"]].map(([l,v,col,t])=>(
              <div key={l} style={{marginBottom:12}}>
                <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginBottom:2}}>{l}</div>
                <div style={{fontFamily:F.heading,fontSize:22,color:col,lineHeight:1,fontWeight:"normal"}}>{v}</div>
                <div style={{fontFamily:F.body,fontSize:10,color:col,marginTop:2}}>{t}</div>
              </div>
            ))}
          </div>
          <div style={{padding:"12px 10px"}}>
            <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>
              Risk by Region
            </div>
            {REGIONS.map(r=>(
              <div key={r.name} onClick={()=>handleRegionClick(r.name)}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"6px 0",borderBottom:`1px solid ${C.border2}`,cursor:"pointer"}}>
                <span style={{fontFamily:F.body,fontSize:12,color:activeRegion===r.name?C.cyan:C.text}}>{r.name}</span>
                <Tag label={r.risk} color={riskColor(r.risk)}/>
              </div>
            ))}
          </div>
        </div>

        {/* MAP */}
        {activeTab==="Map" && (
          <div style={{position:"relative",background:"#030A14",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,right:0,height:2,zIndex:15,pointerEvents:"none",
              background:"linear-gradient(90deg,transparent,rgba(0,200,240,.4),#00C8F0,rgba(0,200,240,.4),transparent)",
              animation:"scan 5s linear infinite"}}/>
            <div style={{position:"absolute",top:0,left:0,right:0,zIndex:20,display:"flex",
              alignItems:"center",justifyContent:"space-between",padding:"8px 16px",
              background:"rgba(3,10,20,.9)",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontFamily:F.body,fontSize:12,fontWeight:600,color:C.text}}>
                {layer.icon} {layer.label} — Click any region for AI predictions
              </div>
              <div style={{fontFamily:F.mono,fontSize:10,color:C.cyan}}>{activeRegion||"No region selected"}</div>
            </div>
            <svg viewBox="0 0 700 820" style={{width:"100%",height:"calc(100% - 76px)",marginTop:40,cursor:"pointer"}} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="rg1" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#E83A3A" stopOpacity=".2"/><stop offset="100%" stopColor="#E83A3A" stopOpacity="0"/></radialGradient>
                <radialGradient id="rg2" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#F07020" stopOpacity=".16"/><stop offset="100%" stopColor="#F07020" stopOpacity="0"/></radialGradient>
                <radialGradient id="rg3" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#00E87A" stopOpacity=".11"/><stop offset="100%" stopColor="#00E87A" stopOpacity="0"/></radialGradient>
                <filter id="blur"><feGaussianBlur stdDeviation="22"/></filter>
              </defs>
              {[100,200,300,400,500,600,700].map(y=><line key={y} x1="0" y1={y} x2="700" y2={y} stroke="rgba(0,200,240,.04)" strokeWidth=".5"/>)}
              {[100,200,300,400,500,600].map(x=><line key={x} x1={x} y1="0" x2={x} y2="820" stroke="rgba(0,200,240,.04)" strokeWidth=".5"/>)}
              <ellipse cx="230" cy="560" rx="110" ry="90" fill="url(#rg1)" filter="url(#blur)"/>
              <ellipse cx="390" cy="440" rx="90" ry="75" fill="url(#rg2)" filter="url(#blur)"/>
              <ellipse cx="340" cy="260" rx="100" ry="80" fill="url(#rg2)" filter="url(#blur)"/>
              <ellipse cx="350" cy="680" rx="70" ry="55" fill="url(#rg3)" filter="url(#blur)"/>
              {MAP_REGIONS.map(r=>(
                <path key={r.name} d={r.d}
                  fill={activeRegion===r.name?"rgba(0,200,240,.2)":hovered===r.name?"rgba(0,200,240,.08)":SEV_FILL[r.risk]}
                  stroke={activeRegion===r.name?"#00C8F0":SEV_STROKE[r.risk]}
                  strokeWidth={activeRegion===r.name?1.4:.6}
                  style={{transition:"all .18s",cursor:"pointer"}}
                  onClick={()=>handleRegionClick(r.name)}
                  onMouseEnter={()=>setHovered(r.name)}
                  onMouseLeave={()=>setHovered(null)}
                />
              ))}
              {[[175,152,"UPPER WEST"],[365,148,"UPPER EAST"],[295,280,"NORTHERN"],
                [308,418,"BRONG-AHAFO"],[318,498,"ASHANTI"],[415,612,"EASTERN"],
                [215,576,"WESTERN"],[350,678,"CENTRAL"],[458,706,"GR. ACCRA"],
                [522,432,"VOLTA"],[405,420,"BONO EAST"]].map(([x,y,t])=>(
                <text key={t} x={x} y={y} fill="rgba(0,200,240,.4)" fontSize="9" fontFamily="sans-serif" textAnchor="middle" pointerEvents="none">{t}</text>
              ))}
              {[["#00C8F0",354,718,"Accra",10],["#00C8F0",308,494,"Kumasi",9],["#00C8F0",270,370,"Sunyani",8],["#00C8F0",332,200,"Tamale",8]].map(([col,cx,cy,label,fs])=>(
                <g key={label}>
                  <circle cx={cx} cy={cy} r={label==="Accra"?5:label==="Kumasi"?4:3} fill={col} opacity=".85"/>
                  <text x={cx+12} y={cy+4} fill={col} fontSize={fs} fontFamily="monospace" opacity=".75">{label}</text>
                </g>
              ))}
              {[[202,562,"#E83A3A",0],[424,522,"#F07020",.5],[342,272,"#00E87A",.9],[374,484,"#8B5CF6",1.4]].map(([cx,cy,col,delay])=>(
                <g key={`hs${cx}`}>
                  <circle r="5" cx={cx} cy={cy} fill="none" stroke={col} strokeWidth="2" style={{animation:`hspulse 2s ease-out infinite ${delay}s`}}/>
                  <circle r="4" cx={cx} cy={cy} fill={col} opacity=".9"/>
                </g>
              ))}
            </svg>
            <div style={{position:"absolute",bottom:0,left:0,right:0,height:36,display:"flex",alignItems:"center",
              justifyContent:"space-between",padding:"0 16px",background:"rgba(3,10,20,.92)",
              borderTop:`1px solid ${C.border}`,zIndex:20}}>
              <div style={{display:"flex",gap:16}}>
                {[["Satellite","Sentinel-2",C.cyan],["Sensors","847 online",C.green],["Quantum","Active",C.purple],["Violations","23 today",C.amber]].map(([k,v,col])=>(
                  <div key={k} style={{fontFamily:F.mono,fontSize:9,color:C.muted}}>
                    {k} <span style={{color:col}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{fontFamily:F.mono,fontSize:9,color:C.muted}}>Click any region for predictions</div>
            </div>
            <div style={{position:"absolute",bottom:42,right:12,zIndex:20,background:"rgba(8,22,42,.92)",
              border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px"}}>
              <div style={{fontFamily:F.mono,fontSize:8,color:C.muted,marginBottom:7,letterSpacing:".08em"}}>RISK INDEX</div>
              {[["#E83A3A","Critical"],["#F07020","High"],["#F5C842","Medium"],["#00E87A","Low"]].map(([col,l])=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontFamily:F.body,color:C.text2,marginBottom:5}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:col}}/>{l}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other tabs fill the middle column with their own scroll */}
        {activeTab==="Quantum Optimizer" && (
          <div style={{display:"flex",flexDirection:"column",overflow:"hidden",background:"#030A14"}}>
            <QuantumPanel/>
          </div>
        )}
        {activeTab==="Scenario Simulator" && (
          <div style={{display:"flex",flexDirection:"column",overflow:"hidden",background:"#030A14"}}>
            <ScenarioPanel/>
          </div>
        )}
        {activeTab==="Risk Matrix" && (
          <div style={{display:"flex",flexDirection:"column",overflow:"hidden",background:"#030A14"}}>
            <RiskPanel/>
          </div>
        )}

        {/* RIGHT PANEL — Intelligence Output */}
        <div style={{background:C.panel,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <div style={{fontFamily:F.heading,fontSize:14,color:C.text,fontWeight:"normal"}}>Intelligence Output</div>
              <div style={{fontFamily:F.mono,fontSize:9,color:C.green,display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:C.green,display:"inline-block",animation:"blink 1.8s infinite"}}/>
                Quantum active
              </div>
            </div>
            <div style={{fontFamily:F.body,fontSize:12,color:C.muted}}>
              {region ? `${region} · ${layer.label}` : "No region selected — click the map"}
            </div>
          </div>

          <IntelPanel/>

          <div style={{padding:"8px 12px 0",display:"flex",gap:5,flexWrap:"wrap",borderTop:`1px solid ${C.border2}`}}>
            {role.prompts.map(p=>(
              <button key={p} onClick={()=>setCustomQ(p)}
                style={{background:C.panel2,border:`1px solid ${C.border2}`,borderRadius:100,
                  padding:"4px 10px",fontFamily:F.mono,fontSize:9,color:C.muted,cursor:"pointer"}}>
                {p.slice(0,34)}{p.length>34?"...":""}
              </button>
            ))}
          </div>

          <div style={{borderTop:`1px solid ${C.border}`,padding:"10px 12px",flexShrink:0}}>
            <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,marginBottom:6,letterSpacing:".08em"}}>CUSTOM QUERY</div>
            <div style={{display:"flex",gap:7}}>
              <input value={customQ} onChange={e=>setCustomQ(e.target.value)}
                onKeyDown={e=>{
                  if(e.key==="Enter" && customQ.trim()) {
                    runPrediction(region||"Ghana", layer, role, customQ);
                    setCustomQ("");
                  }
                }}
                placeholder={`Ask anything about ${region||"any region"}...`}
                style={{flex:1,background:C.panel2,border:`1px solid ${C.border}`,borderRadius:7,
                  padding:"8px 11px",color:C.text,fontSize:13,outline:"none",fontFamily:F.body}}/>
              <button
                onClick={()=>{if(customQ.trim()){runPrediction(region||"Ghana",layer,role,customQ);setCustomQ("");}}}
                disabled={loading}
                style={{background:`linear-gradient(135deg,${C.cyan},#0099BB)`,border:"none",borderRadius:7,
                  padding:"8px 14px",color:C.bg,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:F.body}}>
                Ask
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ROLE MODAL */}
      {showRoleModal && (
        <div onClick={()=>setShowRoleModal(false)}
          style={{position:"fixed",inset:0,background:"rgba(3,10,20,.9)",backdropFilter:"blur(12px)",
            zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:16,padding:28,
              width:640,maxWidth:"95vw",position:"relative",maxHeight:"90vh",overflowY:"auto"}}>
            <button onClick={()=>setShowRoleModal(false)}
              style={{position:"absolute",top:14,right:14,background:"transparent",border:"none",
                color:C.muted,fontSize:18,cursor:"pointer"}}>✕</button>
            <div style={{fontFamily:F.heading,fontSize:20,marginBottom:6,color:C.text,fontWeight:"normal"}}>
              Select Your Role
            </div>
            <p style={{fontFamily:F.body,fontSize:13,color:C.muted,marginBottom:22,lineHeight:1.6}}>
              QGIF adapts its intelligence to who you are. The same environmental data becomes a completely different tool depending on your role.
            </p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {ROLES.map(r=>(
                <div key={r.key} onClick={()=>handleRoleSelect(r)}
                  style={{background:role.key===r.key?`${C.cyan}0e`:C.panel2,
                    border:`1px solid ${role.key===r.key?C.cyan:C.border}`,
                    borderRadius:11,padding:16,cursor:"pointer"}}>
                  <div style={{fontSize:24,marginBottom:8}}>{r.icon}</div>
                  <div style={{fontFamily:F.heading,fontSize:14,marginBottom:5,color:C.text,fontWeight:"normal"}}>{r.label}</div>
                  <div style={{fontFamily:F.body,fontSize:11,color:C.muted,lineHeight:1.55}}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}