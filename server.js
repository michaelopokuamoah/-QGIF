/* eslint-disable */
import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// ── DESIGN TOKENS ──────────────────────────────────────────
// Palette: deep navy instrument panel — authoritative, scientific
const BG="#040D1A",PANEL="#071526",P2="#0A1E33";
const CYAN="#0EA5E9",GREEN="#10B981",AMBER="#F59E0B",RED="#EF4444",PURPLE="#8B5CF6";
const TEXT="#E2EEF9",TEXT2="rgba(226,238,249,0.5)",MUTED="#3D5A73";
const BORDER="rgba(14,165,233,0.12)",BORDER2="rgba(14,165,233,0.06)";

// ── TYPOGRAPHY ─────────────────────────────────────────────
// Inter: professional dashboard body — clear hierarchy, neutral authority
// DM Mono: data labels and codes — precise without feeling retro
const FH="Inter,'Segoe UI',system-ui,sans-serif";  // headings
const FB="Inter,'Segoe UI',system-ui,sans-serif";  // body
const FM="'DM Mono','Fira Mono','Courier New',monospace"; // data/labels

const SEV_C={CRITICAL:RED,HIGH:AMBER,MEDIUM:"#EAB308",LOW:GREEN};
const SEV_BG={CRITICAL:"rgba(239,68,68,.1)",HIGH:"rgba(245,158,11,.1)",MEDIUM:"rgba(234,179,8,.08)",LOW:"rgba(16,185,129,.08)"};
const IMP_C={TRANSFORMATIONAL:CYAN,CRITICAL:RED,"MAJOR IMPROVEMENT":GREEN,POSITIVE:PURPLE,HIGH:AMBER,MEDIUM:"#EAB308"};

const ROLES=[
  {key:"government",label:"Government Official",icon:"GOV",color:CYAN,desc:"Policy briefings, budget decisions",prompts:["Which regions face the highest risk?","What is the cost of illegal mining?","Which issues need emergency action?","What reporting obligations is Ghana failing?"]},
  {key:"epa",label:"EPA Officer",icon:"EPA",color:AMBER,desc:"Enforcement, violations, evidence",prompts:["All active violations with GPS","Which miners risk permit revocation?","What evidence exists for prosecution?","Which water bodies exceed legal limits?"]},
  {key:"miner",label:"Licensed Miner",icon:"MIN",color:"#F5C842",desc:"Compliance, ESG, licence protection",prompts:["What is our compliance score?","How do we compare to peer operators?","Which ESG data do we need?","What actions protect our licence?"]},
  {key:"ngo",label:"NGO / Dev Bank",icon:"NGO",color:PURPLE,desc:"Impact, vulnerability, carbon MRV",prompts:["Which communities are most vulnerable?","What is the carbon credit potential?","How many SDGs are impacted?","Which intervention prevents most disease per dollar?"]},
  {key:"doctor",label:"Doctor / Health",icon:"MED",color:GREEN,desc:"Disease prediction, clinical protocols",prompts:["Which communities will present mercury cases?","What tests should I order?","How many waterborne cases to expect?","What are the neurological risks for children?"]},
  {key:"farmer",label:"Farmer",icon:"AGR",color:"#F5C842",desc:"Irrigation safety, crop advice, yield",prompts:["Is my irrigation water safe?","Which crops are safe to grow?","What should I plant this season?","How will rainfall change?"]},
];

const LAYERS=[
  {key:"all",icon:"Q",label:"All Threats"},{key:"mining",icon:"M",label:"Illegal Mining"},
  {key:"health",icon:"H",label:"Public Health"},{key:"water",icon:"W",label:"Water Security"},
  {key:"food",icon:"F",label:"Food & Agriculture"},{key:"climate",icon:"C",label:"Climate Risk"},
  {key:"conflict",icon:"X",label:"Conflict"},{key:"carbon",icon:"T",label:"Carbon & Forest"},
  {key:"disease",icon:"D",label:"Disease"},{key:"economy",icon:"E",label:"Economic Risk"},
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
  {key:"mining_doubles",label:"Mining Doubles",icon:"Mining",desc:"What if illegal mining doubles?"},
  {key:"river_cleaned",label:"River Cleanup",icon:"Water",desc:"What if we clean the river?"},
  {key:"mining_banned",label:"Enforcement",icon:"EPA",desc:"What if EPA eliminates illegal mining?"},
  {key:"reforestation",label:"Reforestation",icon:"Forest",desc:"What if we restore 50,000 hectares?"},
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

// ── Global constants for Leaflet map ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ═══════════════════════════════════════════════
// PROFESSIONAL MAP SYSTEM — Full Ghana Coverage
// ═══════════════════════════════════════════════

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// All 12 Ghana regions with full data
const REGION_COORDS={
  'Western Region':    {lat:5.31,  lng:-1.99, risk:'CRITICAL',sites:38,mercury:0.082,pop:800000,  capital:'Sekondi-Takoradi',river:'Pra and Ankobra'},
  'Eastern Region':    {lat:6.16,  lng:-0.55, risk:'HIGH',    sites:14,mercury:0.034,pop:1200000, capital:'Koforidua',         river:'Birim and Densu'},
  'Central Region':    {lat:5.55,  lng:-1.02, risk:'HIGH',    sites:11,mercury:0.028,pop:1200000, capital:'Cape Coast',         river:'Offin River'},
  'Ashanti Region':    {lat:6.69,  lng:-1.62, risk:'MEDIUM',  sites:7, mercury:0.018,pop:3800000, capital:'Kumasi',             river:'Oda and Offin'},
  'Brong-Ahafo':       {lat:7.47,  lng:-2.33, risk:'MEDIUM',  sites:4, mercury:0.012,pop:900000,  capital:'Sunyani',            river:'Tano and Black Volta'},
  'Greater Accra':     {lat:5.55,  lng:-0.20, risk:'MEDIUM',  sites:3, mercury:0.009,pop:5400000, capital:'Accra',              river:'Densu and Weija Lake'},
  'Volta Region':      {lat:6.59,  lng:0.45,  risk:'LOW',     sites:2, mercury:0.004,pop:1600000, capital:'Ho',                 river:'Volta Lake and Oti'},
  'Northern Region':   {lat:9.40,  lng:-0.85, risk:'LOW',     sites:1, mercury:0.003,pop:2400000, capital:'Tamale',             river:'White and Black Volta'},
  'Upper East Region': {lat:10.78, lng:-0.87, risk:'LOW',     sites:1, mercury:0.002,pop:1100000, capital:'Bolgatanga',         river:'Red Volta'},
  'Upper West Region': {lat:10.25, lng:-2.32, risk:'LOW',     sites:1, mercury:0.002,pop:700000,  capital:'Wa',                 river:'Black Volta upper'},
  'Oti Region':        {lat:8.45,  lng:0.30,  risk:'MEDIUM',  sites:3, mercury:0.008,pop:600000,  capital:'Dambai',             river:'Oti River'},
  'Bono East':         {lat:7.75,  lng:-1.20, risk:'MEDIUM',  sites:3, mercury:0.010,pop:1100000, capital:'Kintampo',           river:'Tano River'},
};

// Major towns and cities with population and type
const GHANA_TOWNS=[
  {name:'Accra',        lat:5.6037, lng:-0.1870, type:'capital',   pop:2500000, region:'Greater Accra'},
  {name:'Kumasi',       lat:6.6885, lng:-1.6244, type:'city',      pop:3500000, region:'Ashanti Region'},
  {name:'Tamale',       lat:9.4008, lng:-0.8393, type:'city',      pop:370000,  region:'Northern Region'},
  {name:'Takoradi',     lat:4.9016, lng:-1.7749, type:'city',      pop:445000,  region:'Western Region'},
  {name:'Cape Coast',   lat:5.1053, lng:-1.2466, type:'city',      pop:170000,  region:'Central Region'},
  {name:'Sunyani',      lat:7.3349, lng:-2.3123, type:'city',      pop:89000,   region:'Brong-Ahafo'},
  {name:'Koforidua',    lat:6.0940, lng:-0.2574, type:'city',      pop:87000,   region:'Eastern Region'},
  {name:'Ho',           lat:6.6011, lng:0.4714,  type:'city',      pop:78000,   region:'Volta Region'},
  {name:'Bolgatanga',   lat:10.785, lng:-0.8514, type:'city',      pop:65000,   region:'Upper East Region'},
  {name:'Wa',           lat:10.060, lng:-2.5000, type:'city',      pop:107000,  region:'Upper West Region'},
  {name:'Tarkwa',       lat:5.3059, lng:-1.9889, type:'mining',    pop:50000,   region:'Western Region'},
  {name:'Obuasi',       lat:6.2013, lng:-1.6803, type:'mining',    pop:60000,   region:'Ashanti Region'},
  {name:'Prestea',      lat:5.4333, lng:-2.1500, type:'mining',    pop:25000,   region:'Western Region'},
  {name:'Bogoso',       lat:5.5333, lng:-2.0167, type:'mining',    pop:20000,   region:'Western Region'},
  {name:'Dunkwa',       lat:5.9667, lng:-1.7833, type:'mining',    pop:30000,   region:'Central Region'},
  {name:'Konongo',      lat:6.6167, lng:-1.2167, type:'mining',    pop:35000,   region:'Ashanti Region'},
  {name:'Bibiani',      lat:6.4667, lng:-2.3333, type:'mining',    pop:28000,   region:'Western Region'},
  {name:'Techiman',     lat:7.5833, lng:-1.9333, type:'town',      pop:85000,   region:'Brong-Ahafo'},
  {name:'Berekum',      lat:7.4500, lng:-2.5833, type:'town',      pop:50000,   region:'Brong-Ahafo'},
  {name:'Kintampo',     lat:8.0500, lng:-1.7167, type:'town',      pop:35000,   region:'Bono East'},
  {name:'Salaga',       lat:8.5500, lng:-0.5167, type:'town',      pop:20000,   region:'Northern Region'},
  {name:'Yendi',        lat:9.4430, lng:-0.0103, type:'town',      pop:35000,   region:'Northern Region'},
  {name:'Navrongo',     lat:10.894, lng:-1.0921, type:'town',      pop:25000,   region:'Upper East Region'},
  {name:'Bawku',        lat:11.059, lng:-0.2424, type:'town',      pop:46000,   region:'Upper East Region'},
  {name:'Lawra',        lat:10.638, lng:-2.8965, type:'town',      pop:15000,   region:'Upper West Region'},
  {name:'Hohoe',        lat:7.1511, lng:0.4739,  type:'town',      pop:44000,   region:'Volta Region'},
  {name:'Keta',         lat:5.9167, lng:1.0000,  type:'town',      pop:20000,   region:'Volta Region'},
  {name:'Nkawkaw',      lat:6.5500, lng:-0.7667, type:'town',      pop:35000,   region:'Eastern Region'},
  {name:'Suhum',        lat:6.0416, lng:-0.4529, type:'town',      pop:25000,   region:'Eastern Region'},
  {name:'Kasoa',        lat:5.5333, lng:-0.4167, type:'town',      pop:134000,  region:'Greater Accra'},
  {name:'Tema',         lat:5.6698, lng:-0.0166, type:'city',      pop:160000,  region:'Greater Accra'},
  {name:'Winneba',      lat:5.3483, lng:-0.6228, type:'town',      pop:50000,   region:'Central Region'},
  {name:'Elmina',       lat:5.0844, lng:-1.3469, type:'town',      pop:33000,   region:'Central Region'},
  {name:'Assin Fosu',   lat:5.6965, lng:-1.2930, type:'town',      pop:25000,   region:'Central Region'},
  {name:'Dambai',       lat:7.9676, lng:0.1732,  type:'town',      pop:15000,   region:'Oti Region'},
  {name:'Nkwanta',      lat:8.2500, lng:0.1500,  type:'town',      pop:20000,   region:'Oti Region'},
];

// Major rivers with contamination data
// Known illegal mining hotspots
const MINING_HOTSPOTS=[
  {lat:5.31, lng:-1.99, severity:10, name:'Tarkwa Mining Zone',     sites:38, desc:'Largest illegal mining concentration in Ghana'},
  {lat:5.43, lng:-2.14, severity:9,  name:'Prestea-Bogoso Corridor',sites:12, desc:'High mercury contamination in Ankobra tributary'},
  {lat:6.20, lng:-1.68, severity:8,  name:'Obuasi Periphery',       sites:8,  desc:'Illegal operations around licensed AngloGold boundary'},
  {lat:5.97, lng:-1.78, severity:8,  name:'Dunkwa Mining Belt',     sites:7,  desc:'Active galamsey along Offin River'},
  {lat:6.46, lng:-2.33, severity:7,  name:'Bibiani Area',           sites:5,  desc:'Small-scale mining expanding into forest reserve'},
  {lat:6.62, lng:-1.22, severity:6,  name:'Konongo Corridor',       sites:4,  desc:'Mercury detected in Oda River tributaries'},
  {lat:7.75, lng:-1.20, severity:5,  name:'Bono East Expansion',    sites:3,  desc:'New illegal sites identified via satellite 2024'},
  {lat:8.45, lng:0.30,  severity:4,  name:'Oti River Zone',         sites:3,  desc:'Cross-border mining activity detected'},
];

function getRiskColor(risk){
  return{CRITICAL:'#E83A3A',HIGH:'#F07020',MEDIUM:'#F5C842',LOW:'#00E87A'}[risk]||'#4A6880';
}

function makeRegionIcon(risk,sites,isActive){
  const color=isActive?'#00C8F0':getRiskColor(risk);
  const size=isActive?38:risk==='CRITICAL'?32:risk==='HIGH'?26:22;
  const glow=isActive?`0 0 20px #00C8F0, 0 0 40px #00C8F088`:`0 0 ${risk==='CRITICAL'?14:8}px ${color}88`;
  return L.divIcon({
    className:'',
    html:`<div style="width:${size}px;height:${size}px;background:${color};border:2.5px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:${size>26?11:9}px;font-weight:bold;box-shadow:${glow};cursor:pointer;transition:all 0.3s;">${sites}</div>`,
    iconSize:[size,size],iconAnchor:[size/2,size/2],
  });
}

function makeTownIcon(type,name){
  const colors={capital:'#00C8F0',city:'#8B5CF6',mining:'#F07020',town:'rgba(216,232,255,0.7)'};
  const col=colors[type]||colors.town;
  const dot=type==='capital'?8:type==='city'?6:type==='mining'?7:4;
  return L.divIcon({
    className:'',
    html:`<div style="display:flex;align-items:center;gap:3px;pointer-events:none;">
      <div style="width:${dot}px;height:${dot}px;border-radius:50%;background:${col};box-shadow:0 0 6px ${col};flex-shrink:0;"></div>
      <span style="color:${col};font-size:${type==='capital'?11:type==='city'?10:9}px;font-family:monospace;white-space:nowrap;text-shadow:0 1px 3px #000,0 0 8px #000;font-weight:${type==='capital'||type==='city'?'bold':'normal'};">${name}</span>
    </div>`,
    iconSize:[120,16],iconAnchor:[0,8],
  });
}

function makeHotspotIcon(severity){
  const size=8+severity*1.5;
  const opacity=0.4+severity*0.05;
  return L.divIcon({
    className:'',
    html:`<div style="width:${size}px;height:${size}px;background:rgba(232,58,58,${opacity});border:1px solid #E83A3A;border-radius:50%;box-shadow:0 0 ${severity*2}px rgba(232,58,58,0.6);animation:pulse 2s infinite;"></div>`,
    iconSize:[size,size],iconAnchor:[size/2,size/2],
  });
}

// Click-anywhere handler component
function ClickHandler({onMapClick}){
  useMapEvents({click:(e)=>{onMapClick(e.latlng.lat,e.latlng.lng);}});
  return null;
}

function FlyToHandler({center}){
  const map=useMapEvents({});
  useEffect(()=>{
    if(center&&center.length>=2){
      map.flyTo([center[0],center[1]],center[2]||13,{duration:1.2});
    }
  },[center,map]);
  return null;
}

function MapTab({layer,activeRegion,onRegionClick,onCoordClick,searchQuery,setSearchQuery,mapCenter,setMapCenter,showHotspots,setShowHotspots,showTowns,setShowTowns,clickedCoord,satLoading,satData}){
  const [hovered,setHovered]=useState(null); // eslint-disable-line

  // Desktop Leaflet map only
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

  const SF={CRITICAL:"rgba(232,58,58,0.12)",HIGH:"rgba(240,112,32,0.10)",MEDIUM:"rgba(245,200,66,0.08)",LOW:"rgba(0,232,122,0.05)"};
  const SS={CRITICAL:"rgba(232,58,58,0.5)",HIGH:"rgba(240,112,32,0.4)",MEDIUM:"rgba(245,200,66,0.3)",LOW:"rgba(0,232,122,0.25)"};

  // On mobile use SVG map, on desktop use Leaflet
  // Desktop — full Leaflet satellite map
  const mapRef=useRef(null);
  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:BG}}>
      <style>{`
        .qgif-tooltip{background:#08162A!important;border:1px solid rgba(0,200,240,0.4)!important;color:#D8E8FF!important;font-family:monospace!important;font-size:11px!important;padding:6px 10px!important;border-radius:6px!important;}
        .leaflet-container{background:#030A14!important;}
        .leaflet-control-attribution{background:rgba(8,22,42,0.85)!important;color:#4A6880!important;font-size:9px!important;}
        .leaflet-control-attribution a{color:#00C8F0!important;}
        .leaflet-control-zoom a{background:#08162A!important;color:#00C8F0!important;border-color:rgba(0,200,240,0.2)!important;}
      `}</style>

      {/* TOP TOOLBAR */}
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:1000,background:"rgba(3,10,20,.95)",borderBottom:"1px solid rgba(0,200,240,0.1)",padding:"6px 10px",display:"flex",gap:6,alignItems:"center"}}>
        <div style={{display:"flex",gap:0,flex:1,minWidth:0}}>
          <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){const q=searchQuery.toLowerCase();const town=GHANA_TOWNS.find(t=>t.name.toLowerCase().includes(q));const reg=Object.entries(REGION_COORDS).find(([k])=>k.toLowerCase().includes(q));if(town){setMapCenter([town.lat,town.lng,13]);onCoordClick(town.lat,town.lng,town.name);}else if(reg){setMapCenter([reg[1].lat,reg[1].lng,9]);onRegionClick(reg[0]);}}}}
            placeholder="Search any town or region..."
            style={{flex:1,background:P2,border:"1px solid rgba(0,200,240,0.2)",borderRight:"none",borderRadius:"6px 0 0 6px",padding:"6px 10px",color:TEXT,fontSize:12,outline:"none",fontFamily:FB}}/>
          <button onClick={()=>{const q=searchQuery.toLowerCase();const town=GHANA_TOWNS.find(t=>t.name.toLowerCase().includes(q));const reg=Object.entries(REGION_COORDS).find(([k])=>k.toLowerCase().includes(q));if(town){setMapCenter([town.lat,town.lng,13]);onCoordClick(town.lat,town.lng,town.name);}else if(reg){setMapCenter([reg[1].lat,reg[1].lng,9]);onRegionClick(reg[0]);}}}
            style={{background:CYAN,border:"none",borderRadius:"0 6px 6px 0",padding:"6px 12px",color:BG,fontSize:12,fontWeight:700,cursor:"pointer"}}>Go</button>
        </div>
        <button onClick={()=>setShowHotspots(!showHotspots)} style={{padding:"5px 10px",borderRadius:5,border:`1px solid ${showHotspots?RED:BORDER2}`,background:showHotspots?`${RED}15`:"transparent",color:showHotspots?RED:MUTED,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>Hotspots</button>
        <button onClick={()=>setShowTowns(!showTowns)} style={{padding:"5px 10px",borderRadius:5,border:`1px solid ${showTowns?PURPLE:BORDER2}`,background:showTowns?`${PURPLE}15`:"transparent",color:showTowns?PURPLE:MUTED,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>Towns</button>
        <div style={{fontFamily:FM,fontSize:10,color:CYAN,whiteSpace:"nowrap"}}>{activeRegion||clickedCoord||"Click map"}</div>
      </div>

      {/* LIVE SATELLITE STATUS */}
      {(satLoading||satData)&&(
        <div style={{position:"absolute",top:48,left:12,zIndex:1000,background:"rgba(8,22,42,0.96)",border:`1px solid ${satData?.earth_engine_status?.includes("CONNECTED")?GREEN:BORDER}`,borderRadius:8,padding:"8px 12px",maxWidth:260}}>
          {satLoading&&<div style={{fontFamily:FM,fontSize:9,color:AMBER,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:AMBER,display:"inline-block",animation:"blink 1s infinite"}}/>Querying Earth Engine...</div>}
          {!satLoading&&satData&&satData.earth_engine_status?.includes("CONNECTED")&&(
            <div>
              <div style={{fontFamily:FM,fontSize:9,color:GREEN,marginBottom:5,display:"flex",alignItems:"center",gap:5}}><span style={{width:5,height:5,borderRadius:"50%",background:GREEN,display:"inline-block"}}/>LIVE SENTINEL-2 · {satData.satellite_date}</div>
              <div style={{display:"flex",gap:10}}>
                <div><div style={{fontFamily:FM,fontSize:8,color:MUTED}}>NDVI</div><div style={{fontFamily:"-apple-system,sans-serif",fontSize:12,fontWeight:700,color:satData.ndvi_mean>0.5?GREEN:AMBER}}>{satData.ndvi_mean}</div></div>
                <div><div style={{fontFamily:FM,fontSize:8,color:MUTED}}>DEGRADATION</div><div style={{fontFamily:"-apple-system,sans-serif",fontSize:12,fontWeight:700,color:satData.degradation_gap>0.25?RED:GREEN}}>{satData.degradation_gap}</div></div>
                <div><div style={{fontFamily:FM,fontSize:8,color:MUTED}}>WATER</div><div style={{fontFamily:"-apple-system,sans-serif",fontSize:12,fontWeight:700,color:CYAN}}>{satData.water_fraction_pct}%</div></div>
              </div>
              {satData.degradation_signal?.startsWith("YES")&&<div style={{fontFamily:FM,fontSize:9,color:RED,marginTop:4}}>LAND DEGRADATION DETECTED</div>}
            </div>
          )}
        </div>
      )}

      {/* MAP */}
      <div style={{position:"absolute",top:42,left:0,right:0,bottom:36}}>
        <MapContainer center={[7.9465,-1.0232]} zoom={7} minZoom={6} maxZoom={19} style={{width:"100%",height:"100%"}} zoomControl={true} ref={mapRef}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="© Esri, Maxar" maxZoom={19}/>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="" maxZoom={19} opacity={0.8}/>
          <ClickHandler onMapClick={(lat,lng)=>onCoordClick(lat,lng,null)}/>
          <FlyToHandler center={mapCenter}/>
          {Object.entries(REGION_COORDS).map(([name,data])=>(
            <Marker key={name} position={[data.lat,data.lng]} icon={makeRegionIcon(data.risk,data.sites,activeRegion===name)} eventHandlers={{click:()=>onRegionClick(name)}}>
              <Tooltip direction="top" className="qgif-tooltip"><b style={{color:getRiskColor(data.risk)}}>{name}</b><br/>Risk: <b>{data.risk}</b> · Sites: <b>{data.sites}</b><br/>Mercury: <b>{data.mercury} mg/L</b><br/><span style={{color:CYAN,fontSize:10}}>Click for full intelligence</span></Tooltip>
            </Marker>
          ))}
          {showTowns&&GHANA_TOWNS.map(t=>(<Marker key={t.name} position={[t.lat,t.lng]} icon={makeTownIcon(t.type,t.name)} eventHandlers={{click:()=>onCoordClick(t.lat,t.lng,t.name)}}><Tooltip direction="top" className="qgif-tooltip"><b>{t.name}</b><br/>Pop: {t.pop.toLocaleString()}<br/>{t.region}</Tooltip></Marker>))}
          {showHotspots&&MINING_HOTSPOTS.map((h,i)=>(<Marker key={i} position={[h.lat,h.lng]} icon={makeHotspotIcon(h.severity)} eventHandlers={{click:()=>onCoordClick(h.lat,h.lng,h.name)}}><Tooltip direction="top" className="qgif-hotspot"><b style={{color:RED}}>{h.name}</b><br/>Severity: {h.severity}/10<br/>{h.desc}</Tooltip></Marker>))}
        </MapContainer>
      </div>

      {/* LEGEND */}
      <div style={{position:"absolute",bottom:42,right:12,zIndex:1000,background:"rgba(8,22,42,.96)",border:"1px solid rgba(0,200,240,0.1)",borderRadius:8,padding:"10px 14px"}}>
        <div style={{fontFamily:FM,fontSize:8,color:MUTED,marginBottom:8,letterSpacing:".08em"}}>RISK INDEX</div>
        {[[RED,"Critical"],[AMBER,"High"],["#F5C842","Medium"],[GREEN,"Low"]].map(([col,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:7,fontSize:10,fontFamily:"-apple-system,sans-serif",color:TEXT2,marginBottom:5}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:col,boxShadow:`0 0 5px ${col}`}}/>{l}
          </div>
        ))}
        <div style={{fontFamily:FM,fontSize:8,color:MUTED,marginTop:7}}>Numbers = illegal sites</div>
      </div>

      {/* STATUS BAR */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:36,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:"rgba(3,10,20,.95)",borderTop:"1px solid rgba(0,200,240,0.1)",zIndex:1000}}>
        <div style={{display:"flex",gap:16}}>
          {[["Satellite","Sentinel-2",CYAN],["Towns",`${GHANA_TOWNS.length} mapped`,PURPLE],["Hotspots",`${MINING_HOTSPOTS.length} active`,RED]].map(([k,v,col])=>(
            <div key={k} style={{fontFamily:FM,fontSize:9,color:MUTED}}>{k} <span style={{color:col}}>{v}</span></div>
          ))}
        </div>
        <div style={{fontFamily:FM,fontSize:9,color:MUTED}}>Click anywhere for live satellite analysis</div>
      </div>
    </div>
  );
}

function QuantumTab({activeRegion,setActiveRegion,qData,qLoading,qType,setQType,runQuantum}){
  return(
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:BG}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>Quantum Optimizer Engine</div>
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
      {!activeRegion&&!qData&&<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:52,opacity:.12}}>Q</div><div style={{fontFamily:FH,fontSize:16,color:"rgba(216,232,255,.22)",fontWeight:"normal",marginTop:12}}>Select a region above</div></div>}
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
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:BG}}>
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
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:BG}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>Quantum Risk Matrix</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {REGIONS.map(r=>(<button key={r.name} onClick={()=>{setActiveRegion(r.name);runRisk(r.name);}} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${activeRegion===r.name?CYAN:BORDER2}`,background:activeRegion===r.name?`${CYAN}10`:"transparent",color:activeRegion===r.name?CYAN:MUTED,cursor:"pointer",fontSize:12,fontFamily:FB}}>{r.name}</button>))}
      </div>
      {!riskData&&!riskLoading&&<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:52,opacity:.12}}></div><div style={{fontFamily:FH,fontSize:16,color:"rgba(216,232,255,.22)",fontWeight:"normal",marginTop:12}}>Select a region</div></div>}
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
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:BG}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>Disease Intelligence Engine</div>
      <p style={{fontFamily:FB,fontSize:13,color:MUTED,lineHeight:1.7,marginBottom:16}}>Six real mathematical models running simultaneously. Every number calculated from environmental measurements.</p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {REGIONS.map(r=>(<button key={r.name} onClick={()=>{setActiveRegion(r.name);runDisease(r.name);}} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${activeRegion===r.name?CYAN:BORDER2}`,background:activeRegion===r.name?`${CYAN}10`:"transparent",color:activeRegion===r.name?CYAN:MUTED,cursor:"pointer",fontSize:12,fontFamily:FB}}>{r.name}</button>))}
      </div>
      {!activeRegion&&!diseaseData&&<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:52,opacity:.12}}></div><div style={{fontFamily:FH,fontSize:16,color:"rgba(216,232,255,.22)",fontWeight:"normal",marginTop:12}}>Select a region to run all 6 models</div></div>}
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
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:3,height:36,background:"#0EA5E9",borderRadius:2,flexShrink:0}}></div><div><div style={{fontFamily:"Inter,'Segoe UI',system-ui,sans-serif",fontSize:14,fontWeight:600,color:TEXT,letterSpacing:"-.01em"}}>Waterborne Disease</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:MUTED,letterSpacing:".08em",textTransform:"uppercase",marginTop:2}}>Poisson Transmission Model</div></div></div>
              <MetricGrid items={[["OUTBREAK PROBABILITY",`${diseaseData.predictions.waterborne_disease.probability_pct}%`,RED,diseaseData.predictions.waterborne_disease.disease],["CASES/WEEK",diseaseData.predictions.waterborne_disease.expected_cases_week1?.toLocaleString(),AMBER],["DAYS TO OUTBREAK",diseaseData.predictions.waterborne_disease.days_to_outbreak,RED]]}/>
            </Card>
          )}
          {diseaseData.predictions?.mercury_neurological&&(
            <Card color={PURPLE+"33"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:3,height:36,background:"#8B5CF6",borderRadius:2,flexShrink:0}}></div><div><div style={{fontFamily:"Inter,'Segoe UI',system-ui,sans-serif",fontSize:14,fontWeight:600,color:TEXT,letterSpacing:"-.01em"}}>Mercury Neurological Risk</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:MUTED,letterSpacing:".08em",textTransform:"uppercase",marginTop:2}}>WHO Bioaccumulation Model</div></div></div>
              <MetricGrid items={[["FISH MERCURY",`${diseaseData.predictions.mercury_neurological.fish_mercury_mgkg} mg/kg`,RED],["CHILDREN AT RISK",diseaseData.predictions.mercury_neurological.children_at_risk?.toLocaleString(),RED],["CHILD EXPOSURE",`${diseaseData.predictions.mercury_neurological.child_exposure_ratio}x`,RED]]}/>
              <InfoBox label="SEVERITY" value={diseaseData.predictions.mercury_neurological.severity} color={RED}/>
            </Card>
          )}
          {diseaseData.predictions?.pandemic_emergence&&(
            <Card color={AMBER+"33"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:3,height:36,background:"#EF4444",borderRadius:2,flexShrink:0}}></div><div><div style={{fontFamily:"Inter,'Segoe UI',system-ui,sans-serif",fontSize:14,fontWeight:600,color:TEXT,letterSpacing:"-.01em"}}>Pandemic Emergence</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:MUTED,letterSpacing:".08em",textTransform:"uppercase",marginTop:2}}>EcoHealth Spillover Model</div></div></div>
              <MetricGrid items={[["SPILLOVER PROBABILITY",`${diseaseData.predictions.pandemic_emergence.spillover_probability_12m}%`,AMBER],["EPIDEMIC RISK",`${diseaseData.predictions.pandemic_emergence.epidemic_amplification_prob}%`,RED],["PATHOGEN TYPE",diseaseData.predictions.pandemic_emergence.pathogen_type?.split(" ")[0],AMBER]]}/>
              <InfoBox label="LEAD TIME" value={diseaseData.predictions.pandemic_emergence.lead_time_advantage} color={GREEN}/>
            </Card>
          )}
          {diseaseData.predictions?.food_security&&(
            <Card color={GREEN+"33"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:3,height:36,background:"#F59E0B",borderRadius:2,flexShrink:0}}></div><div><div style={{fontFamily:"Inter,'Segoe UI',system-ui,sans-serif",fontSize:14,fontWeight:600,color:TEXT,letterSpacing:"-.01em"}}>Food Security</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:MUTED,letterSpacing:".08em",textTransform:"uppercase",marginTop:2}}>IPC / FEWS NET Framework</div></div></div>
              <MetricGrid items={[["CROP STRESS",diseaseData.predictions.food_security.crop_stress_index,AMBER],["YIELD LOSS",`${diseaseData.predictions.food_security.yield_reduction_pct}%`,RED],["PEOPLE AT RISK",diseaseData.predictions.food_security.people_at_risk?.toLocaleString(),AMBER]]}/>
            </Card>
          )}
          {diseaseData.predictions?.ecosystem_tipping_point&&(
            <Card color={GREEN+"33"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:3,height:36,background:"#10B981",borderRadius:2,flexShrink:0}}></div><div><div style={{fontFamily:"Inter,'Segoe UI',system-ui,sans-serif",fontSize:14,fontWeight:600,color:TEXT,letterSpacing:"-.01em"}}>Ecosystem Tipping Point</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:MUTED,letterSpacing:".08em",textTransform:"uppercase",marginTop:2}}>Scheffer Critical Transition Theory</div></div></div>
              <MetricGrid items={[["RESILIENCE",diseaseData.predictions.ecosystem_tipping_point.resilience_index,GREEN],["YEARS LEFT",diseaseData.predictions.ecosystem_tipping_point.years_to_tipping_point,RED],["SERVICES VALUE",diseaseData.predictions.ecosystem_tipping_point.ecosystem_services_value,CYAN]]}/>
              <InfoBox label="INTERVENTION WINDOW" value={diseaseData.predictions.ecosystem_tipping_point.intervention_window} color={RED}/>
            </Card>
          )}
          {diseaseData.predictions?.conflict&&(
            <Card color={AMBER+"33"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:3,height:36,background:"#EAB308",borderRadius:2,flexShrink:0}}></div><div><div style={{fontFamily:"Inter,'Segoe UI',system-ui,sans-serif",fontSize:14,fontWeight:600,color:TEXT,letterSpacing:"-.01em"}}>Conflict Prediction</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:MUTED,letterSpacing:".08em",textTransform:"uppercase",marginTop:2}}>PRIO Water-Conflict Model</div></div></div>
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
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:BG}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>Digital Lawyer — Community Evidence Generator</div>
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
          {lawyerLoading?"Generating Evidence...":"Generate Court-Ready Evidence Package"}
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
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:BG}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>Dam Collapse Risk Predictor</div>
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
          {damLoading?"Analysing...":"Run Collapse Risk Analysis"}
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
            <BulletList items={damData.immediate_actions} color={damData.risk_level==="CRITICAL"?RED:GREEN} icon={damData.risk_level==="CRITICAL"?"!":"✓"}/>
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
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:BG}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>Parametric Crop Insurance Engine</div>
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
          {insuranceLoading?"Calculating...":"Calculate Insurance & Yield"}
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
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:BG}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>Real-Time Air Quality Alert System</div>
      <p style={{fontFamily:FB,fontSize:13,color:MUTED,lineHeight:1.7,marginBottom:16}}>Mercury vapour, PM2.5, SO2 calculated from environmental data. SMS alerts in English and Twi.</p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {REGIONS.map(r=>(<button key={r.name} onClick={()=>setRegion(r.name)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${region===r.name?CYAN:BORDER2}`,background:region===r.name?`${CYAN}10`:"transparent",color:region===r.name?CYAN:MUTED,cursor:"pointer",fontSize:12,fontFamily:FB}}>{r.name}</button>))}
      </div>
      <button onClick={()=>runAir(region)} disabled={airLoading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${CYAN},#0099BB)`,color:BG,fontSize:14,fontFamily:FB,fontWeight:600,cursor:"pointer",marginBottom:20,opacity:airLoading?.7:1}}>
        {airLoading?"Calculating...":"Run Air Quality Analysis"}
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
    <div style={{width:"100%",height:"100%",overflowY:"scroll",padding:20,background:BG}}>
      <div style={{fontFamily:FH,fontSize:20,marginBottom:6,color:TEXT,fontWeight:"normal"}}>Criminal Network Intelligence</div>
      <p style={{fontFamily:FB,fontSize:13,color:MUTED,lineHeight:1.7,marginBottom:16}}>Quantum graph analysis maps illegal mining criminal networks. From site operators to financiers to international gold traders.</p>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {REGIONS.map(r=>(<button key={r.name} onClick={()=>setRegion(r.name)} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${region===r.name?CYAN:BORDER2}`,background:region===r.name?`${CYAN}10`:"transparent",color:region===r.name?CYAN:MUTED,cursor:"pointer",fontSize:12,fontFamily:FB}}>{r.name}</button>))}
      </div>
      <button onClick={()=>runCriminal(region)} disabled={criminalLoading} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${PURPLE},#6600BB)`,color:"white",fontSize:14,fontFamily:FB,fontWeight:600,cursor:"pointer",marginBottom:20,opacity:criminalLoading?.7:1}}>
        {criminalLoading?"Mapping network...":"Run Criminal Network Analysis"}
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
            <BulletList items={criminalData.interpol_triggers} color={RED} icon="!"/>
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

// ── TIMELINE TAB ──
function TimelineTab({timelineData,timelineLoading,runTimeline,activeRegion}){
  const API="https://qgif-backend.onrender.com";
  const [selectedRegion,setSelectedRegion]=useState(activeRegion||"Western Region");
  const ss={fontFamily:"Inter,'Segoe UI',system-ui,sans-serif"};
  const sm={fontFamily:"'DM Mono','Fira Mono',monospace"};

  const handleRun=()=>{
    const rd=REGION_COORDS[selectedRegion];
    if(rd) runTimeline(rd.lat,rd.lng,selectedRegion);
  };

  const maxMining=timelineData?.results?.filter(r=>r.status==="OK").reduce((m,r)=>Math.max(m,r.mining_score),1)||100;
  const maxGap=timelineData?.results?.filter(r=>r.status==="OK").reduce((m,r)=>Math.max(m,r.degradation_gap),.1)||1;

  return(
    <div className="tab-content" style={{background:BG}}>
      <div className="tab-inner" style={{margin:"0 auto"}}>

        <div style={{marginBottom:20}}>
          <div style={{...ss,fontSize:18,fontWeight:600,color:TEXT,marginBottom:4,letterSpacing:"-.02em"}}>Historical Satellite Timeline</div>
          <div style={{...sm,fontSize:9,color:MUTED,letterSpacing:".1em",textTransform:"uppercase"}}>Year-by-year environmental change · 2020 to present · Sentinel-2</div>
        </div>

        {/* Controls */}
        <div className="card" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:20}}>
          <select value={selectedRegion} onChange={e=>setSelectedRegion(e.target.value)} className="select" style={{flex:1,minWidth:180}}>
            {Object.keys(REGION_COORDS).map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn-primary btn" onClick={handleRun} disabled={timelineLoading} style={{flexShrink:0}}>
            {timelineLoading?"Analysing years...":"Run Historical Analysis"}
          </button>
          {timelineData&&<div style={{...sm,fontSize:10,color:MUTED,flexShrink:0}}>Last: {timelineData.location}</div>}
        </div>

        {timelineLoading&&(
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <Spinner label="Querying satellite archive for 6 years of data — this takes 2-3 minutes"/>
          </div>
        )}

        {!timelineLoading&&timelineData&&!timelineData._error&&(
          <div style={{animation:"fadein .3s ease"}}>

            {/* Trend summary */}
            {timelineData.trend&&(
              <div className={"card "+(timelineData.trend.direction==="DEGRADING"?"card-critical":"card-low")} style={{marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:12}}>
                  <div>
                    <div style={{...sm,fontSize:9,color:MUTED,marginBottom:4}}>TREND SUMMARY · {timelineData.trend.years_covered}</div>
                    <div style={{...ss,fontSize:16,fontWeight:600,color:timelineData.trend.direction==="DEGRADING"?RED:GREEN}}>
                      {timelineData.trend.direction}
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,auto)",gap:"8px 20px",textAlign:"center"}}>
                    {[
                      ["NDVI Change",timelineData.trend.ndvi_change,timelineData.trend.ndvi_change<0?RED:GREEN],
                      ["Forest Change",`${timelineData.trend.forest_cover_change}%`,timelineData.trend.forest_cover_change<0?RED:GREEN],
                      ["Mining Shift",`+${timelineData.trend.mining_score_change}`,timelineData.trend.mining_score_change>10?RED:GREEN],
                      ["Degradation",`+${timelineData.trend.degradation_change}`,timelineData.trend.degradation_change>0.1?RED:GREEN],
                    ].map(([l,v,c])=>(
                      <div key={l}>
                        <div style={{...sm,fontSize:8,color:MUTED}}>{l}</div>
                        <div style={{...sm,fontSize:14,fontWeight:500,color:c}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{...ss,fontSize:13,color:TEXT2,lineHeight:1.6}}>{timelineData.trend.assessment}</div>
              </div>
            )}

            {/* Year-by-year chart */}
            <div className="card" style={{marginBottom:16}}>
              <div className="section-label">Mining Activity Score by Year</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:8,height:120,padding:"8px 0"}}>
                {timelineData.results.map(r=>{
                  const h=r.status==="OK"?Math.max(4,Math.round((r.mining_score/maxMining)*100)):4;
                  const col=r.mining_score>70?RED:r.mining_score>40?AMBER:GREEN;
                  return(
                    <div key={r.year} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <div style={{...sm,fontSize:9,color:col}}>{r.status==="OK"?r.mining_score:"—"}</div>
                      <div style={{width:"100%",height:`${h}px`,background:r.status==="OK"?col:"rgba(255,255,255,.05)",borderRadius:"3px 3px 0 0",minHeight:4,transition:"height .5s ease"}}/>
                      <div style={{...sm,fontSize:9,color:MUTED}}>{r.year}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NDVI chart */}
            <div className="card" style={{marginBottom:16}}>
              <div className="section-label">Vegetation Health (NDVI) by Year</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:8,height:100,padding:"8px 0"}}>
                {timelineData.results.map(r=>{
                  const h=r.status==="OK"?Math.max(4,Math.round((r.ndvi_mean/0.8)*100)):4;
                  const col=r.ndvi_mean>0.5?GREEN:r.ndvi_mean>0.3?AMBER:RED;
                  return(
                    <div key={r.year} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <div style={{...sm,fontSize:9,color:col}}>{r.status==="OK"?r.ndvi_mean:"—"}</div>
                      <div style={{width:"100%",height:`${h}px`,background:r.status==="OK"?col:"rgba(255,255,255,.05)",borderRadius:"3px 3px 0 0",minHeight:4}}/>
                      <div style={{...sm,fontSize:9,color:MUTED}}>{r.year}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detail table */}
            <div className="card">
              <div className="section-label">Year-by-Year Data</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{borderBottom:`1px solid ${BORDER}`}}>
                    {["Year","Sat. Date","NDVI","Degradation Gap","Forest Cover","Mining Score","Signal"].map(h=>(
                      <th key={h} style={{...sm,fontSize:9,color:MUTED,padding:"6px 8px",textAlign:"left",letterSpacing:".06em",textTransform:"uppercase"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timelineData.results.map(r=>(
                    <tr key={r.year} style={{borderBottom:`1px solid ${BORDER2}`}}>
                      <td style={{...sm,fontSize:12,color:TEXT,padding:"8px",fontWeight:500}}>{r.year}</td>
                      <td style={{...sm,fontSize:11,color:MUTED,padding:"8px"}}>{r.satellite_date||"—"}</td>
                      <td style={{...sm,fontSize:12,color:r.status==="OK"?(r.ndvi_mean>0.5?GREEN:r.ndvi_mean>0.3?AMBER:RED):MUTED,padding:"8px"}}>{r.status==="OK"?r.ndvi_mean:"N/A"}</td>
                      <td style={{...sm,fontSize:12,color:r.status==="OK"?(r.degradation_gap>0.3?RED:r.degradation_gap>0.15?AMBER:GREEN):MUTED,padding:"8px"}}>{r.status==="OK"?r.degradation_gap:"N/A"}</td>
                      <td style={{...ss,fontSize:12,color:TEXT2,padding:"8px"}}>{r.status==="OK"?`${r.forest_cover_pct}%`:"N/A"}</td>
                      <td style={{...sm,fontSize:12,color:r.status==="OK"?(r.mining_score>70?RED:r.mining_score>40?AMBER:GREEN):MUTED,padding:"8px",fontWeight:500}}>{r.status==="OK"?`${r.mining_score}/100`:"N/A"}</td>
                      <td style={{padding:"8px"}}>{r.status==="OK"?<Tag label={r.degradation_gap>0.25?"ALERT":"CLEAR"} color={r.degradation_gap>0.25?RED:GREEN}/>:<span style={{...sm,fontSize:9,color:MUTED}}>NO DATA</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{...sm,fontSize:9,color:MUTED,marginTop:12,lineHeight:1.7,paddingTop:10,borderTop:`1px solid ${BORDER}`}}>
                Data source: ESA Sentinel-2 MSI (Surface Reflectance) via Google Earth Engine · 5km radius · Water bodies excluded · Best cloud-free image per year
              </div>
            </div>

          </div>
        )}

        {!timelineLoading&&!timelineData&&(
          <div style={{textAlign:"center",padding:"80px 20px"}}>
            <div style={{width:48,height:48,borderRadius:8,background:`${CYAN}12`,border:`1px solid ${CYAN}22`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:20}}></div>
            <div style={{...ss,fontSize:15,fontWeight:600,color:TEXT,marginBottom:6}}>Historical Analysis</div>
            <div style={{...ss,fontSize:13,color:MUTED,lineHeight:1.6,maxWidth:400,margin:"0 auto"}}>
              Select a region and run the analysis to see how vegetation, forest cover, and mining activity have changed year by year from 2020 to present.
            </div>
          </div>
        )}

        <div style={{height:40}}/>
      </div>
    </div>
  );
}


function MonitoringTab({monitorData,monitorLoading,runMonitor,dashData,dashLoading,loadDash}){
  const [email,setEmail]=useState("");
  const [orgName,setOrgName]=useState("");
  const [regStatus,setRegStatus]=useState(null);
  const [regLoading,setRegLoading]=useState(false);
  const [testEmailStatus,setTestEmailStatus]=useState(null);
  const [testEmailLoading,setTestEmailLoading]=useState(false);
  const API="https://qgif-backend.onrender.com";

  const sendTestEmail=async()=>{
    if(!email){alert("Enter your email first");return;}
    setTestEmailLoading(true);setTestEmailStatus(null);
    try{const r=await fetch(API+"/monitoring/test-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,secret:"qgif-monitor-2026"})});const d=await r.json();setTestEmailStatus(d);}
    catch(e){setTestEmailStatus({status:"ERROR",message:e.message});}
    finally{setTestEmailLoading(false);}
  };
  const registerAlert=async()=>{
    if(!email)return;
    setRegLoading(true);setRegStatus(null);
    try{const r=await fetch(API+"/monitoring/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,organisation:orgName,regions:["all"],severity_threshold:"WARNING",name:orgName})});const d=await r.json();setRegStatus(d);}
    catch(e){setRegStatus({error:e.message});}
    finally{setRegLoading(false);}
  };
  const SEV_COL={CRITICAL:RED,WARNING:AMBER,WATCH:"#F5C842",IMPROVEMENT:GREEN,INFO:CYAN};
  const SC={CRITICAL:"alert-critical",WARNING:"alert-warning",WATCH:"alert-watch",IMPROVEMENT:"alert-improvement"};
  const ss={fontFamily:FB};
  const sm={fontFamily:FM};

  return(
    <div className="tab-content" style={{background:BG}}>
      <div className="tab-inner" style={{margin:"0 auto"}}>

        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{...ss,fontSize:20,color:TEXT,fontWeight:600,marginBottom:4}}>Environmental Monitoring System</div>
            <div style={{...sm,fontSize:10,color:MUTED,letterSpacing:".06em",textTransform:"uppercase"}}>Automated 30-day satellite surveillance for all 12 Ghana regions</div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="qgif-btn-secondary" onClick={loadDash}>Refresh</button>
            <button className="qgif-btn-primary" onClick={runMonitor} disabled={monitorLoading}>{monitorLoading?"Running...":"Run Check Now"}</button>
          </div>
        </div>

        <div className="qgif-card" style={{marginBottom:16}}>
          <div className="section-label">How It Works</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
            {[["Every 30 Days","Queries Earth Engine for all 12 regions automatically"],["Compares Readings","Flags regions where degradation gap increases by more than 0.05"],["Generates Alerts","Critical (0.10+), Warning (0.05+), Watch (0.02+), Improvement"],["Sends Email","Registered users receive formatted satellite alert reports"]].map(([t,d])=>(
              <div key={t} style={{background:BG,borderRadius:7,padding:"10px 12px"}}>
                <div style={{...ss,fontSize:12,fontWeight:600,color:CYAN,marginBottom:4}}>{t}</div>
                <div style={{...ss,fontSize:11,color:MUTED,lineHeight:1.5}}>{d}</div>
              </div>
            ))}
          </div>
        </div>

        {dashLoading&&<Spinner label="Loading dashboard..."/>}
        {!dashLoading&&dashData&&(
          <div>
            <div className="section-label">System Status</div>
            <div className="stat-grid" style={{marginBottom:16}}>
              {[["Status",dashData.system_status?.includes("ACTIVE")?"Active":"Offline",dashData.system_status?.includes("ACTIVE")?GREEN:RED],["Last Check",dashData.last_full_check||"Never",CYAN],["Total Runs",dashData.total_monitoring_runs||0,PURPLE],["Alerts",dashData.total_alerts_ever||0,AMBER],["Critical",dashData.active_critical_alerts||0,RED],["Warnings",dashData.active_warning_alerts||0,AMBER]].map(([l,v,c])=>(
                <div key={l} className="stat-box">
                  <div className="stat-label">{l}</div>
                  <div className="stat-value" style={{color:c,fontSize:typeof v==="string"&&v.length>6?12:18}}>{v}</div>
                </div>
              ))}
            </div>

            <div className="section-label">Region Status</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:6,marginBottom:16}}>
              {(dashData.regions||[]).map(r=>(
                <div key={r.region} className="qgif-card" style={{padding:"10px 12px",borderColor:r.latest_threat_level==="CRITICAL"?"rgba(204,34,34,.4)":r.latest_threat_level==="HIGH"?"rgba(204,102,0,.3)":undefined}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{...ss,fontSize:11,fontWeight:600,color:TEXT}}>{(r.region||"").replace(" Region","")}</div>
                    {r.latest_threat_level&&<Tag label={r.latest_threat_level} color={SEV_C[r.latest_threat_level]||MUTED}/>}
                  </div>
                  {r.latest_gap!=null?(<div style={{display:"flex",gap:12}}>
                    <div><div style={{...sm,fontSize:8,color:MUTED}}>GAP</div><div style={{...ss,fontSize:14,fontWeight:700,color:r.latest_gap>0.3?RED:r.latest_gap>0.15?AMBER:GREEN}}>{r.latest_gap}</div></div>
                    <div><div style={{...sm,fontSize:8,color:MUTED}}>MINING</div><div style={{...ss,fontSize:14,fontWeight:700,color:r.latest_mining_score>60?RED:r.latest_mining_score>30?AMBER:GREEN}}>{r.latest_mining_score}</div></div>
                    <div><div style={{...sm,fontSize:8,color:MUTED}}>DATE</div><div style={{...ss,fontSize:10,color:MUTED}}>{r.last_checked||"—"}</div></div>
                  </div>):<div style={{...ss,fontSize:11,color:MUTED}}>No data yet</div>}
                </div>
              ))}
            </div>

            {((dashData.recent_critical_alerts||[]).length+(dashData.recent_warnings||[]).length)>0&&(
              <div style={{marginBottom:16}}>
                <div className="section-label">Recent Alerts</div>
                {[...(dashData.recent_critical_alerts||[]),...(dashData.recent_warnings||[])].map((alert,i)=>(
                  <div key={i} className={"qgif-card "+(SC[alert.severity]||"")} style={{padding:"10px 14px",marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <Tag label={alert.severity} color={SEV_COL[alert.severity]||CYAN}/>
                      <span style={{...sm,fontSize:9,color:MUTED}}>{alert.date}</span>
                    </div>
                    <div style={{...ss,fontSize:12,color:TEXT,lineHeight:1.6,marginBottom:4}}>{alert.message}</div>
                    <div style={{...ss,fontSize:11,color:CYAN,fontWeight:600}}>Action: {alert.recommended_action}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {monitorLoading&&<Spinner label="Running satellite checks for all 12 regions — please wait 3 to 5 minutes"/>}
        {!monitorLoading&&monitorData&&!monitorData._error&&(
          <div className="qgif-card" style={{marginBottom:16,borderColor:"rgba(0,135,90,.3)"}}>
            <div className="section-label" style={{color:GREEN}}>Check Complete — {monitorData.checked_at?.split('T')[0]}</div>
            <div className="stat-grid">
              {[["Checked",monitorData.regions_checked,CYAN],["OK",monitorData.regions_ok,GREEN],["Alerts",monitorData.new_alerts,monitorData.new_alerts>0?AMBER:GREEN],["Critical",monitorData.critical_alerts,monitorData.critical_alerts>0?RED:GREEN]].map(([l,v,c])=>(
                <div key={l} className="stat-box"><div className="stat-label">{l}</div><div className="stat-value" style={{color:c}}>{v}</div></div>
              ))}
            </div>
            {monitorData.alerts?.length>0?(<div style={{marginTop:12}}>
              <div className="section-label">New Alerts</div>
              {monitorData.alerts.map((alert,i)=>(
                <div key={i} className={"qgif-card "+(SC[alert.severity]||"")} style={{padding:"10px 12px",marginBottom:6}}>
                  <Tag label={alert.severity} color={SEV_COL[alert.severity]||CYAN}/>
                  <div style={{...ss,fontSize:12,color:TEXT,marginTop:6,lineHeight:1.6}}>{alert.message}</div>
                  <div style={{...ss,fontSize:11,color:CYAN,marginTop:4,fontWeight:600}}>Action: {alert.recommended_action}</div>
                </div>
              ))}
            </div>):<div style={{...ss,fontSize:12,color:GREEN,marginTop:8}}>No significant changes detected since the last check.</div>}
          </div>
        )}

        <div className="qgif-card" style={{borderColor:"rgba(91,33,182,.3)"}}>
          <div className="section-label">Register for Monitoring Alerts</div>
          <div style={{...ss,fontSize:12,color:TEXT2,marginBottom:12,lineHeight:1.7}}>Receive automatic email alerts when QGIF detects new environmental disturbances. Alerts are sent within hours of each monthly satellite check.</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
            <input className="qgif-input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address"/>
            <input className="qgif-input" value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Organisation name (optional)"/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="qgif-btn-primary" onClick={registerAlert} disabled={regLoading||!email} style={{flex:1}}>{regLoading?"Registering...":"Register for Alerts"}</button>
              <button className="qgif-btn-secondary" onClick={sendTestEmail} disabled={testEmailLoading||!email} style={{flex:1}}>{testEmailLoading?"Sending...":"Send Test Email"}</button>
            </div>
          </div>
          {regStatus&&!regStatus.error&&<div style={{...ss,fontSize:12,color:GREEN,marginBottom:4}}>Registration confirmed — {regStatus.message}</div>}
          {regStatus?.error&&<div style={{...ss,fontSize:12,color:AMBER,marginBottom:4}}>Error: {regStatus.error}</div>}
          {testEmailStatus&&<div style={{...ss,fontSize:12,color:testEmailStatus.status==="SENT"?GREEN:AMBER,marginBottom:4}}>{testEmailStatus.status==="SENT"?"Test email sent successfully — check your inbox.":"Error: "+testEmailStatus.message}</div>}
          <div style={{...sm,fontSize:9,color:MUTED,marginTop:8,lineHeight:1.7}}>Alert levels: Watch (minor increase) · Warning (significant increase, field visit recommended) · Critical (major disturbance, immediate action required)</div>
        </div>

        <div style={{height:80}}/>
      </div>
    </div>
  );
}

// ── INTELLIGENCE HUB TAB ──
// Combines: Disease Intelligence, Risk Matrix, Scenario Simulator, Air Quality, Crop Insurance, Dam Risk
function IntelligenceTab({
  activeRegion,setActiveRegion,
  diseaseData,diseaseLoading,runDisease,
  riskData,riskLoading,runRisk,
  scData,scLoading,scScenario,setScScenario,scIntensity,setScIntensity,scRegion,setScRegion,runScenario,
  airData,airLoading,runAir,
  insuranceData,insuranceLoading,runInsurance,
  damData,damLoading,runDam,
}){
  const [activeSection,setActiveSection]=useState("disease");
  const ss={fontFamily:"Inter,'Segoe UI',system-ui,sans-serif"};
  const sm={fontFamily:"'DM Mono','Fira Mono',monospace"};

  const SECTIONS=[
    {key:"disease",label:"Disease Intelligence",desc:"6 predictive health models"},
    {key:"risk",label:"Risk Matrix",desc:"Quantum kernel risk scoring"},
    {key:"scenario",label:"Scenario Simulator",desc:"What-if policy analysis"},
    {key:"air",label:"Air Quality",desc:"Mercury vapour & PM2.5"},
    {key:"crop",label:"Crop Insurance",desc:"Parametric satellite insurance"},
    {key:"dam",label:"Dam Risk",desc:"Tailings dam collapse predictor"},
  ];

  return(
    <div className="tab-content" style={{background:BG}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${BORDER}`,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{...ss,fontSize:16,fontWeight:600,color:TEXT,marginRight:8}}>Intelligence Hub</div>
        {SECTIONS.map(s=>(
          <button key={s.key} onClick={()=>setActiveSection(s.key)}
            style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontWeight:activeSection===s.key?600:400,border:`1px solid ${activeSection===s.key?CYAN:BORDER2}`,background:activeSection===s.key?`${CYAN}14`:"transparent",color:activeSection===s.key?CYAN:MUTED,cursor:"pointer",whiteSpace:"nowrap"}}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Region selector */}
      <div style={{padding:"10px 20px",borderBottom:`1px solid ${BORDER}`,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{...sm,fontSize:9,color:MUTED,letterSpacing:".08em",textTransform:"uppercase",marginRight:4}}>Region</span>
        {REGIONS.map(r=>(
          <button key={r.name} onClick={()=>{setActiveRegion(r.name);setScRegion&&setScRegion(r.name);}}
            style={{padding:"4px 9px",borderRadius:5,fontSize:11,fontWeight:activeRegion===r.name?600:400,border:`1px solid ${activeRegion===r.name?CYAN:BORDER2}`,background:activeRegion===r.name?`${CYAN}10`:"transparent",color:activeRegion===r.name?CYAN:MUTED,cursor:"pointer"}}>
            {r.name.replace(" Region","")}
          </button>
        ))}
        {activeRegion&&(
          <button onClick={()=>{
            if(activeSection==="disease") runDisease(activeRegion);
            else if(activeSection==="risk") runRisk(activeRegion);
            else if(activeSection==="air") runAir(activeRegion);
            else if(activeSection==="crop") runInsurance(activeRegion);
            else if(activeSection==="dam") runDam(activeRegion);
            else if(activeSection==="scenario") runScenario(scRegion||activeRegion,scScenario,scIntensity);
          }} className="btn-primary btn" style={{marginLeft:8}}>
            Run {SECTIONS.find(s=>s.key===activeSection)?.label}
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:20}}>
        {activeSection==="disease"&&<DiseaseTab activeRegion={activeRegion} setActiveRegion={setActiveRegion} diseaseData={diseaseData} diseaseLoading={diseaseLoading} runDisease={runDisease} embedded={true}/>}
        {activeSection==="risk"&&<RiskTab activeRegion={activeRegion} setActiveRegion={setActiveRegion} riskData={riskData} riskLoading={riskLoading} runRisk={runRisk} embedded={true}/>}
        {activeSection==="scenario"&&<ScenarioTab scRegion={scRegion} setScRegion={setScRegion} scScenario={scScenario} setScScenario={setScScenario} scIntensity={scIntensity} setScIntensity={setScIntensity} scData={scData} scLoading={scLoading} runScenario={runScenario} embedded={true}/>}
        {activeSection==="air"&&<AirTab airData={airData} airLoading={airLoading} runAir={runAir} embedded={true}/>}
        {activeSection==="crop"&&<InsuranceTab insuranceData={insuranceData} insuranceLoading={insuranceLoading} runInsurance={runInsurance} embedded={true}/>}
        {activeSection==="dam"&&<DamTab damData={damData} damLoading={damLoading} runDam={runDam} embedded={true}/>}
      </div>
    </div>
  );
}

// ── QUANTUM HUB TAB ──
// Combines: Quantum Optimizer + Criminal Network
function QuantumHubTab({
  activeRegion,setActiveRegion,
  qData,qLoading,qType,setQType,runQuantum,
  criminalData,criminalLoading,runCriminal,
}){
  const [activeSection,setActiveSection]=useState("optimizer");
  const ss={fontFamily:"Inter,'Segoe UI',system-ui,sans-serif"};
  const sm={fontFamily:"'DM Mono','Fira Mono',monospace"};

  const SECTIONS=[
    {key:"optimizer",label:"Quantum Optimizer",desc:"QAOA land use + route planning"},
    {key:"criminal",label:"Criminal Network",desc:"Supply chain and network analysis"},
  ];

  return(
    <div className="tab-content" style={{background:BG}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${BORDER}`,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{...ss,fontSize:16,fontWeight:600,color:TEXT,marginRight:8}}>Quantum Analysis</div>
        {SECTIONS.map(s=>(
          <button key={s.key} onClick={()=>setActiveSection(s.key)}
            style={{padding:"5px 12px",borderRadius:6,fontSize:12,fontWeight:activeSection===s.key?600:400,border:`1px solid ${activeSection===s.key?PURPLE:BORDER2}`,background:activeSection===s.key?`${PURPLE}14`:"transparent",color:activeSection===s.key?PURPLE:MUTED,cursor:"pointer"}}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Region selector */}
      <div style={{padding:"10px 20px",borderBottom:`1px solid ${BORDER}`,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{...sm,fontSize:9,color:MUTED,letterSpacing:".08em",textTransform:"uppercase",marginRight:4}}>Region</span>
        {REGIONS.map(r=>(
          <button key={r.name} onClick={()=>{setActiveRegion(r.name);if(activeSection==="optimizer") runQuantum(r.name,qType); else runCriminal(r.name);}}
            style={{padding:"4px 9px",borderRadius:5,fontSize:11,fontWeight:activeRegion===r.name?600:400,border:`1px solid ${activeRegion===r.name?PURPLE:BORDER2}`,background:activeRegion===r.name?`${PURPLE}10`:"transparent",color:activeRegion===r.name?PURPLE:MUTED,cursor:"pointer"}}>
            {r.name.replace(" Region","")}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:20}}>
        {activeSection==="optimizer"&&<QuantumTab activeRegion={activeRegion} setActiveRegion={setActiveRegion} qData={qData} qLoading={qLoading} qType={qType} setQType={setQType} runQuantum={runQuantum} embedded={true}/>}
        {activeSection==="criminal"&&<CriminalTab criminalData={criminalData} criminalLoading={criminalLoading} runCriminal={runCriminal} embedded={true}/>}
      </div>
    </div>
  );
}

// ── ANNOTATION TAB ──
// ML training data collection tool
// Labels satellite tiles for CNN/Random Forest training
function AnnotateTab(){
  const ss={fontFamily:"Inter,'Segoe UI',system-ui,sans-serif"};
  const sm={fontFamily:"'DM Mono','Fira Mono',monospace"};
  const API="https://qgif-backend.onrender.com";

  const LABELS=[
    {key:"mining",label:"Mining",color:"#EF4444",desc:"Illegal mining pit, excavation, or tailings"},
    {key:"forest",label:"Forest",color:"#10B981",desc:"Dense healthy vegetation or forest cover"},
    {key:"water",label:"Water",color:"#0EA5E9",desc:"River, lake, or water body"},
    {key:"farmland",label:"Farmland",color:"#F59E0B",desc:"Agricultural land, crops, or farm clearing"},
    {key:"settlement",label:"Settlement",color:"#8B5CF6",desc:"Town, village, buildings, or urban area"},
  ];

  const KNOWN_MINING=[
    {name:"Tarkwa (Western Region)",lat:5.31,lng:-1.99,type:"mining"},
    {name:"Obuasi (Ashanti Region)",lat:6.20,lng:-1.68,type:"mining"},
    {name:"Prestea (Western Region)",lat:5.43,lng:-2.14,type:"mining"},
    {name:"Bogoso (Western Region)",lat:5.54,lng:-2.07,type:"mining"},
    {name:"Dunkwa (Central Region)",lat:5.97,lng:-1.78,type:"mining"},
    {name:"Konongo (Ashanti Region)",lat:6.62,lng:-1.22,type:"mining"},
    {name:"Bibiani (Western Region)",lat:6.46,lng:-2.32,type:"mining"},
    {name:"Amenfi (Western Region)",lat:5.75,lng:-2.35,type:"mining"},
  ];

  const KNOWN_CLEAN=[
    {name:"Lawra (Upper West Region)",lat:10.63,lng:-2.91,type:"forest"},
    {name:"Wa (Upper West Region)",lat:10.06,lng:-2.50,type:"forest"},
    {name:"Damongo (Northern Region)",lat:9.08,lng:-1.82,type:"farmland"},
    {name:"Bolgatanga (Upper East Region)",lat:10.78,lng:-0.85,type:"farmland"},
    {name:"Keta (Volta Region)",lat:5.91,lng:0.99,type:"water"},
    {name:"Winneba (Central Region)",lat:5.35,lng:-0.63,type:"settlement"},
    {name:"Cape Coast (Central Region)",lat:5.10,lng:-1.24,type:"settlement"},
    {name:"Hohoe (Volta Region)",lat:7.15,lng:0.47,type:"forest"},
  ];

  const ALL_LOCATIONS=[...KNOWN_MINING,...KNOWN_CLEAN];

  const [annotations,setAnnotations]=useState(()=>{
    try{const s=localStorage.getItem("qgif_annotations");return s?JSON.parse(s):[];}
    catch(e){return [];}
  });
  const [currentIdx,setCurrentIdx]=useState(0);
  const [loading,setLoading]=useState(false);
  const [currentData,setCurrentData]=useState(null);
  const [error,setError]=useState(null);
  const [annotatorName,setAnnotatorName]=useState("Maxwell");
  const [showExport,setShowExport]=useState(false);

  const saveAnnotations=(ann)=>{
    setAnnotations(ann);
    try{localStorage.setItem("qgif_annotations",JSON.stringify(ann));}catch(e){}
  };

  const loadLocation=async(idx)=>{
    const loc=ALL_LOCATIONS[idx];
    if(!loc)return;
    setLoading(true);setCurrentData(null);setError(null);
    try{
      const r=await fetch(API+"/detect-live",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({lat:loc.lat,lng:loc.lng,name:loc.name})
      });
      const d=await r.json();
      setCurrentData({...d,location:loc});
    }catch(e){
      setError("Could not load satellite data: "+e.message);
    }finally{setLoading(false);}
  };

  useEffect(()=>{loadLocation(currentIdx);},[currentIdx]);

  const handleLabel=(labelKey)=>{
    if(!currentData)return;
    const loc=ALL_LOCATIONS[currentIdx];
    const ann={
      id:Date.now(),
      annotator:annotatorName,
      annotated_at:new Date().toISOString(),
      location_name:loc.name,
      lat:loc.lat,
      lng:loc.lng,
      label:labelKey,
      suggested_label:loc.type,
      satellite_date:currentData.current_date||"",
      ndvi_mean:currentData.ndvi_mean||0,
      ndvi_p10:currentData.ndvi_p10||0,
      bsi_mean:currentData.bsi_mean||0,
      bsi_change:currentData.bsi_change_mean||0,
      mndwi_mean:currentData.mndwi_mean||0,
      ior_mean:currentData.ior_mean||0,
      cmr_mean:currentData.cmr_mean||0,
      ndvi_change:currentData.ndvi_change_mean||0,
      degradation_gap:Math.round(((currentData.ndvi_mean||0)-(currentData.ndvi_p10||0))*1000)/1000,
      water_fraction:currentData.water_fraction_pct||0,
    };
    const updated=[...annotations,ann];
    saveAnnotations(updated);
    // Move to next location
    if(currentIdx<ALL_LOCATIONS.length-1){
      setCurrentIdx(currentIdx+1);
    }else{
      setCurrentIdx(0); // Loop back
    }
  };

  const skipLocation=()=>{
    if(currentIdx<ALL_LOCATIONS.length-1) setCurrentIdx(currentIdx+1);
    else setCurrentIdx(0);
  };

  const exportCSV=()=>{
    if(annotations.length===0)return;
    const headers=["id","annotator","annotated_at","location_name","lat","lng","label","suggested_label","satellite_date","ndvi_mean","ndvi_p10","bsi_mean","bsi_change","mndwi_mean","ior_mean","cmr_mean","ndvi_change","degradation_gap","water_fraction"];
    const rows=annotations.map(a=>headers.map(h=>a[h]??'').join(','));
    const csv=[headers.join(','),...rows].join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='qgif_training_dataset.csv';
    document.body.appendChild(a);a.click();
    document.body.removeChild(a);URL.revokeObjectURL(url);
  };

  const clearAnnotations=()=>{
    if(window.confirm('Clear all annotations? This cannot be undone.')){
      saveAnnotations([]);
    }
  };

  const counts=LABELS.reduce((acc,l)=>{
    acc[l.key]=annotations.filter(a=>a.label===l.key).length;
    return acc;
  },{});
  const total=annotations.length;
  const target=500;
  const progress=Math.min(100,Math.round((total/target)*100));
  const loc=ALL_LOCATIONS[currentIdx];

  return(
    <div className="tab-content" style={{background:BG}}>
      <div className="tab-inner" style={{margin:"0 auto"}}>

        {/* Header */}
        <div style={{marginBottom:20}}>
          <div style={{...ss,fontSize:18,fontWeight:600,color:TEXT,marginBottom:4,letterSpacing:"-.02em"}}>ML Training Data — Annotation Tool</div>
          <div style={{...sm,fontSize:9,color:MUTED,letterSpacing:".1em",textTransform:"uppercase"}}>Label satellite locations to train the mining detection model</div>
        </div>

        {/* Progress */}
        <div className="card" style={{marginBottom:16}}>
          <div className="section-label">Dataset Progress</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{...sm,fontSize:13,color:CYAN,fontWeight:500}}>{total} labeled</div>
            <div style={{...sm,fontSize:12,color:MUTED}}>{target - total} remaining to reach target of {target}</div>
          </div>
          <div style={{height:8,background:"rgba(14,165,233,.1)",borderRadius:4,marginBottom:12,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${progress}%`,background:`linear-gradient(90deg,${CYAN},${GREEN})`,borderRadius:4,transition:"width .5s ease"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
            {LABELS.map(l=>(
              <div key={l.key} style={{background:BG,borderRadius:6,padding:"8px 6px",textAlign:"center",border:`1px solid ${l.color}22`}}>
                <div style={{...sm,fontSize:18,fontWeight:600,color:l.color}}>{counts[l.key]||0}</div>
                <div style={{...sm,fontSize:9,color:MUTED,marginTop:2}}>{l.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Annotator name */}
        <div className="card" style={{marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{...sm,fontSize:10,color:MUTED,whiteSpace:"nowrap"}}>ANNOTATOR</div>
          <input className="input" value={annotatorName} onChange={e=>setAnnotatorName(e.target.value)} style={{maxWidth:200}}/>
          <div style={{...sm,fontSize:10,color:MUTED,flex:1}}>Location {currentIdx+1} of {ALL_LOCATIONS.length}</div>
          <button className="btn-outline btn btn-sm" onClick={skipLocation}>Skip</button>
        </div>

        {/* Current location */}
        <div className="card" style={{marginBottom:16,borderColor:`rgba(14,165,233,.25)`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{...sm,fontSize:9,color:MUTED,marginBottom:4}}>CURRENT LOCATION TO LABEL</div>
              <div style={{...ss,fontSize:15,fontWeight:600,color:TEXT}}>{loc?.name}</div>
              <div style={{...sm,fontSize:10,color:MUTED,marginTop:2}}>{loc?.lat}°N, {loc?.lng}°E</div>
            </div>
            <div style={{background:`${loc?.type==="mining"?RED:GREEN}14`,border:`1px solid ${loc?.type==="mining"?RED:GREEN}44`,borderRadius:6,padding:"4px 10px"}}>
              <div style={{...sm,fontSize:9,color:MUTED}}>SUGGESTED</div>
              <div style={{...sm,fontSize:11,fontWeight:600,color:loc?.type==="mining"?RED:GREEN}}>{loc?.type?.toUpperCase()}</div>
            </div>
          </div>

          {/* Satellite data */}
          {loading&&<div style={{...ss,fontSize:12,color:AMBER,display:"flex",alignItems:"center",gap:6,marginBottom:12}}><span style={{width:6,height:6,borderRadius:"50%",background:AMBER,display:"inline-block",animation:"blink 1s infinite"}}/>Querying Earth Engine for satellite data...</div>}
          {error&&<div style={{...ss,fontSize:12,color:RED,marginBottom:12}}>{error}</div>}

          {currentData&&!loading&&(
            <div>
              <div style={{...sm,fontSize:9,color:GREEN,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:GREEN,display:"inline-block"}}/>
                LIVE SENTINEL-2 · {currentData.current_date||""}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(80px,1fr))",gap:6,marginBottom:12}}>
                {[
                  ["NDVI",currentData.ndvi_mean,v=>v>0.5?GREEN:v>0.3?AMBER:RED],
                  ["BSI",currentData.bsi_mean,v=>v>0.2?RED:v>0?AMBER:GREEN],
                  ["BSI Chg",currentData.bsi_change_mean,v=>v>0.05?RED:v>0?AMBER:GREEN],
                  ["MNDWI",currentData.mndwi_mean,v=>v>0.1?CYAN:GREEN],
                  ["Iron Ox",currentData.ior_mean,v=>v>1.5?RED:v>1.2?AMBER:GREEN],
                  ["Deg Gap",Math.round(((currentData.ndvi_mean||0)-(currentData.ndvi_p10||0))*1000)/1000,v=>v>0.3?RED:v>0.15?AMBER:GREEN],
                ].map(([label,val,colorFn])=>(
                  <div key={label} className="stat-box">
                    <div className="stat-label">{label}</div>
                    <div style={{...sm,fontSize:14,fontWeight:600,color:colorFn(val||0)}}>{Math.round((val||0)*1000)/1000}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Label buttons */}
          <div style={{...sm,fontSize:9,color:MUTED,marginBottom:8,letterSpacing:".08em"}}>SELECT THE CORRECT LABEL FOR THIS LOCATION:</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {LABELS.map(l=>(
              <button key={l.key} onClick={()=>handleLabel(l.key)}
                disabled={loading||!currentData}
                style={{flex:1,minWidth:100,padding:"12px 8px",borderRadius:7,border:`2px solid ${l.color}`,background:`${l.color}12`,color:l.color,fontSize:13,fontWeight:700,cursor:loading||!currentData?"not-allowed":"pointer",fontFamily:"Inter,'Segoe UI',sans-serif",transition:"all .15s",opacity:loading||!currentData?0.5:1}}>
                {l.label}
                <div style={{fontSize:10,fontWeight:400,opacity:.8,marginTop:2}}>{l.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Location list */}
        <div className="card" style={{marginBottom:16}}>
          <div className="section-label">All Locations ({ALL_LOCATIONS.length} total)</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:6}}>
            {ALL_LOCATIONS.map((l,i)=>{
              const alreadyLabeled=annotations.filter(a=>a.location_name===l.name).length;
              return(
                <div key={i} onClick={()=>setCurrentIdx(i)}
                  style={{padding:"8px 10px",borderRadius:6,cursor:"pointer",border:`1px solid ${i===currentIdx?CYAN:BORDER}`,background:i===currentIdx?`${CYAN}0A`:BG,transition:"all .15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{...ss,fontSize:11,fontWeight:i===currentIdx?600:400,color:i===currentIdx?CYAN:TEXT}}>{l.name}</div>
                    {alreadyLabeled>0&&<div style={{...sm,fontSize:9,color:GREEN}}>✓ {alreadyLabeled}</div>}
                  </div>
                  <div style={{...sm,fontSize:9,color:l.type==="mining"?RED:GREEN,marginTop:2}}>{l.type}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Export section */}
        <div className="card" style={{borderColor:`rgba(16,185,129,.3)`}}>
          <div className="section-label">Export Dataset for Google Colab Training</div>
          <div style={{...ss,fontSize:12,color:TEXT2,marginBottom:12,lineHeight:1.6}}>
            When you have labeled enough locations, export the dataset as a CSV file. Upload it to Google Colab to train the machine learning model.
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:total>0?12:0}}>
            <button className="btn-primary btn" onClick={exportCSV} disabled={total===0}>
              Export {total} Annotations as CSV
            </button>
            {total>0&&<button className="btn-danger btn" onClick={clearAnnotations}>Clear All</button>}
          </div>
          {total>0&&(
            <div style={{...sm,fontSize:10,color:MUTED,lineHeight:1.7}}>
              Dataset contains {total} labeled locations · {counts.mining||0} mining · {counts.forest||0} forest · {counts.water||0} water · {counts.farmland||0} farmland · {counts.settlement||0} settlement
            </div>
          )}
          {total===0&&<div style={{...sm,fontSize:11,color:MUTED}}>Start labeling locations above to build your training dataset.</div>}
        </div>

        {/* Instructions */}
        <div className="card" style={{marginTop:16}}>
          <div className="section-label">How To Use This Tool</div>
          {[
            ["1","Load","Each location automatically loads its live Sentinel-2 satellite data from Google Earth Engine. Wait for the spectral values to appear."],
            ["2","Read the data","Look at the NDVI, BSI, and Degradation Gap values. High BSI + low NDVI + high degradation gap = likely mining."],
            ["3","Label","Click the correct label button. The suggested label is shown but you make the final decision based on the satellite data and your knowledge of the location."],
            ["4","Repeat","Work through all locations. You can revisit any location by clicking it in the list below. Aim for at least 100 mining examples and 100 non-mining examples."],
            ["5","Export","When you have 200-500 labels, export the CSV and upload it to Google Colab to train the model."],
          ].map(([n,title,desc])=>(
            <div key={n} style={{display:"flex",gap:12,marginBottom:10,alignItems:"flex-start"}}>
              <div style={{width:24,height:24,borderRadius:6,background:`${CYAN}14`,border:`1px solid ${CYAN}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{...sm,fontSize:11,fontWeight:600,color:CYAN}}>{n}</span>
              </div>
              <div>
                <div style={{...ss,fontSize:12,fontWeight:600,color:TEXT,marginBottom:2}}>{title}</div>
                <div style={{...ss,fontSize:11,color:MUTED,lineHeight:1.5}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{height:40}}/>
      </div>
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
  const [activeRegion,setActiveRegion]=useState(null);
  const [activeTab,setActiveTab]=useState("Map");
  // New map state
  const [searchQuery,setSearchQuery]=useState("");
  const [mapCenter,setMapCenter]=useState(null);
  const [showHotspots,setShowHotspots]=useState(true);
  const [showTowns,setShowTowns]=useState(true);
  const [showRivers,setShowRivers]=useState(false); // eslint-disable-line no-unused-vars
  const [clickedCoord,setClickedCoord]=useState(null);
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
  const [monitorData,setMonitorData]=useState(null);
  const [monitorLoading,setMonitorLoading]=useState(false);
  const [dashData,setDashData]=useState(null);
  const [dashLoading,setDashLoading]=useState(false);
  const [timelineData,setTimelineData]=useState(null);
  const [timelineLoading,setTimelineLoading]=useState(false);
  const [satData,setSatData]=useState(null);
  const [satLoading,setSatLoading]=useState(false);
  const [liveDetect,setLiveDetect]=useState(null);
  const [liveDetectLoading,setLiveDetectLoading]=useState(false);

  const TABS=["Map","Intelligence","Quantum","Legal & Evidence","Monitoring","Timeline","Annotate"];

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
  const runMonitor=useCallback(async()=>{setMonitorLoading(true);setMonitorData(null);try{const r=await fetch("https://qgif-backend.onrender.com/monitoring/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({secret:"qgif-monitor-2026"})});const d=await r.json();setMonitorData(d);}catch(e){setMonitorData({_error:e.message});}finally{setMonitorLoading(false);}},[]);
  const loadDash=useCallback(async()=>{setDashLoading(true);try{const r=await fetch("https://qgif-backend.onrender.com/monitoring/dashboard");const d=await r.json();setDashData(d);}catch(e){setDashData({_error:e.message});}finally{setDashLoading(false);}},[]);
  const runTimeline=useCallback(async(lat,lng,name)=>{setTimelineLoading(true);setTimelineData(null);try{const r=await fetch("https://qgif-backend.onrender.com/historical-timeline",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lat,lng,name})});const d=await r.json();setTimelineData(d);}catch(e){setTimelineData({_error:e.message});}finally{setTimelineLoading(false);}},[]);

  const handleRegionClick=useCallback((name)=>{setRegion(name);setActiveRegion(name);setClickedCoord(null);runPrediction(name,layer,role);runSatelliteCheck(name);},[layer,role,runPrediction,runSatelliteCheck]);
  const handleCoordClick=useCallback(async(lat,lng,name)=>{
    const label=name||`${lat.toFixed(4)}°N, ${Math.abs(lng).toFixed(4)}°W`;
    setClickedCoord(label);setActiveRegion(null);
    setLiveDetectLoading(true);setLiveDetect(null);setSatData(null);
    try{
      const r=await fetch("https://qgif-backend.onrender.com/detect-live",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lat,lng,name:label,radius:5})});
      const d=await r.json();setLiveDetect(d);
      // Also set satData from the detection result for the existing satellite panel
      if(d.satellite_indices){setSatData({
        earth_engine_status:'CONNECTED — REAL SATELLITE DATA',
        satellite_date:d.imagery?.current_image_date,
        ndvi_mean:d.satellite_indices.ndvi_mean,
        ndvi_p10:d.satellite_indices.ndvi_p10,
        degradation_gap:Math.round((d.satellite_indices.ndvi_mean - d.satellite_indices.ndvi_p10)*1000)/1000,
        water_fraction_pct:d.satellite_indices.water_coverage_pct,
        degradation_signal:d.mining_detection.score>50?'YES — land degradation detected':'No strong contrast signal',
      });}
    }catch(e){setLiveDetect({_error:e.message});}
    finally{setLiveDetectLoading(false);}
    // Also run prediction for nearest region
    const regionDists=Object.entries(REGION_COORDS).map(([rname,rd])=>({rname,dist:Math.sqrt(Math.pow(rd.lat-lat,2)+Math.pow(rd.lng-lng,2))}));
    const nearest=regionDists.sort((a,b)=>a.dist-b.dist)[0];
    if(nearest){setRegion(nearest.rname);runPrediction(nearest.rname,layer,role);}
  },[layer,role,runPrediction]);
  const handleTabChange=useCallback((tab)=>{setActiveTab(tab);if(tab==="Monitoring"&&!dashData&&!dashLoading){loadDash();}},[dashData,dashLoading,loadDash]);

  return(
    <div style={{display:"grid",gridTemplateRows:"52px 1fr",height:"100vh",background:BG,color:TEXT,fontFamily:FB,fontSize:13,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:ital,wght@0,400;0,500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body,html{font-family:'Inter','Segoe UI',system-ui,sans-serif;background:#040D1A;color:#E2EEF9;}
        button{font-family:'Inter','Segoe UI',system-ui,sans-serif;transition:all .15s;cursor:pointer;}
        input,select,textarea{font-family:'Inter','Segoe UI',system-ui,sans-serif;}
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-track{background:#040D1A;} ::-webkit-scrollbar-thumb{background:rgba(14,165,233,.2);border-radius:2px;}
        input:focus,select:focus,textarea:focus{outline:none;border-color:#0EA5E9!important;}

        @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes scan{0%{top:0;opacity:0}5%{opacity:1}95%{opacity:1}100%{top:100%;opacity:0}}
        @keyframes qspin{to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes hspulse{0%{r:5;opacity:.9}100%{r:22;opacity:0}}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.4);opacity:.3}}
        @keyframes fadein{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}

        /* typography */
        .t-display{font-size:18px;font-weight:600;letter-spacing:-.02em;line-height:1.3;}
        .t-title{font-size:14px;font-weight:600;letter-spacing:-.01em;}
        .t-body{font-size:13px;line-height:1.65;}
        .t-label{font-family:'DM Mono','Fira Mono',monospace;font-size:9px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#3D5A73;}
        .t-data{font-family:'DM Mono','Fira Mono',monospace;font-size:13px;}
        .t-data-lg{font-family:'DM Mono','Fira Mono',monospace;font-size:20px;font-weight:500;}

        /* cards */
        .card{background:#071526;border:1px solid rgba(14,165,233,.1);border-radius:8px;padding:14px 16px;margin-bottom:10px;}
        .card-hi{background:#071526;border:1px solid rgba(14,165,233,.22);border-radius:8px;padding:14px 16px;margin-bottom:10px;}
        .card-critical{border-left:3px solid #EF4444!important;}
        .card-high{border-left:3px solid #F59E0B!important;}
        .card-medium{border-left:3px solid #EAB308!important;}
        .card-low{border-left:3px solid #10B981!important;}

        /* legacy card class names — map to new */
        .qgif-card{background:#071526;border:1px solid rgba(14,165,233,.1);border-radius:8px;padding:14px 16px;margin-bottom:10px;}
        .qgif-card-highlight{background:#071526;border:1px solid rgba(14,165,233,.22);border-radius:8px;padding:14px 16px;margin-bottom:10px;}

        /* buttons */
        .btn,.qgif-btn-primary,.qgif-btn-secondary{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;}
        .btn-primary,.qgif-btn-primary{background:#0EA5E9;color:#040D1A;font-weight:600;border:none;}
        .btn-primary:hover,.qgif-btn-primary:hover{background:#38BDF8;}
        .btn-primary:disabled,.qgif-btn-primary:disabled{background:#3D5A73;cursor:not-allowed;}
        .btn-outline,.qgif-btn-secondary{background:transparent;color:#0EA5E9;border:1px solid rgba(14,165,233,.3);}
        .btn-outline:hover,.qgif-btn-secondary:hover{background:rgba(14,165,233,.08);}

        /* inputs */
        .input,.qgif-input{background:#071526;border:1px solid rgba(14,165,233,.15);border-radius:6px;padding:8px 12px;color:#E2EEF9;font-size:13px;width:100%;}
        .input:focus,.qgif-input:focus{border-color:#0EA5E9;}
        .select,.qgif-select{background:#071526;border:1px solid rgba(14,165,233,.15);border-radius:6px;padding:8px 12px;color:#E2EEF9;font-size:13px;width:100%;}

        /* stats */
        .stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;margin-bottom:14px;}
        .stat-box{background:#071526;border:1px solid rgba(14,165,233,.08);border-radius:6px;padding:10px 12px;text-align:center;}
        .stat-label{font-family:'DM Mono','Fira Mono',monospace;font-size:9px;color:#3D5A73;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;}
        .stat-value{font-size:18px;font-weight:600;}

        /* section label */
        .section-label{font-family:'DM Mono','Fira Mono',monospace;font-size:9px;color:#3D5A73;letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(14,165,233,.07);}

        /* alert colours */
        .alert-critical{border-left:3px solid #EF4444;background:rgba(239,68,68,.05);}
        .alert-warning{border-left:3px solid #F59E0B;background:rgba(245,158,11,.05);}
        .alert-watch{border-left:3px solid #EAB308;background:rgba(234,179,8,.05);}
        .alert-improvement{border-left:3px solid #10B981;background:rgba(16,185,129,.05);}

        /* tab content */
        .tab-content{width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;}
        .tab-inner{padding:20px;max-width:880px;}
        .tab-scroll{display:flex;gap:2px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex:1;padding:0 2px;}
        .tab-scroll::-webkit-scrollbar{display:none;}

        /* leaflet */
        .qgif-tooltip{background:#071526!important;border:1px solid rgba(14,165,233,.25)!important;color:#E2EEF9!important;font-family:'Inter',sans-serif!important;font-size:12px!important;padding:8px 12px!important;border-radius:6px!important;}
        .leaflet-container{background:#040D1A!important;}
        .leaflet-control-attribution{background:rgba(7,21,38,.9)!important;color:#3D5A73!important;font-size:9px!important;}
        .leaflet-control-attribution a{color:#0EA5E9!important;}
        .leaflet-control-zoom a{background:#071526!important;color:#0EA5E9!important;border-color:rgba(14,165,233,.2)!important;}
        .leaflet-control-zoom a:hover{background:#0A1E33!important;}
        .leaflet-container{touch-action:pan-x pan-y!important;}
        .qgif-hotspot{background:#071526!important;border:1px solid rgba(239,68,68,.3)!important;color:#FCA5A5!important;}

        /* mobile */
        @media(max-width:768px){
          .desktop-sidebar,.desktop-right{display:none!important;}
          .mobile-bottom{display:flex!important;}
          .main-grid{grid-template-columns:1fr!important;}
          .hide-mobile{display:none!important;}
          .tab-inner{padding:12px;}
          .stat-grid{grid-template-columns:repeat(3,1fr)!important;}
        }
        @media(min-width:769px){.mobile-bottom{display:none!important;}}
        .mobile-bottom{display:none;position:fixed;bottom:0;left:0;right:0;background:#071526;border-top:1px solid rgba(14,165,233,.12);z-index:2000;flex-direction:column;max-height:65vh;overflow-y:auto;-webkit-overflow-scrolling:touch;}
        @media(max-width:768px){.mobile-fullscreen-tab{display:flex!important;position:fixed;top:46px;left:0;right:0;bottom:0;z-index:500;background:#040D1A;overflow-y:auto;-webkit-overflow-scrolling:touch;flex-direction:column;}}
        @media(min-width:769px){.mobile-fullscreen-tab{display:none!important;}}
      `}</style>

      {/* TOPBAR */}
      <div style={{display:"flex",alignItems:"center",padding:"0 14px",background:PANEL,borderBottom:`1px solid ${BORDER}`,height:46,gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,paddingRight:12,borderRight:`1px solid ${BORDER}`}}>
          <div style={{width:24,height:24,background:CYAN,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:BG}}>Q</div>
          <span style={{fontSize:13,fontWeight:700,color:TEXT,letterSpacing:"-.01em"}}>QGIF</span>
        </div>
        <div className="tab-scroll">
          {TABS.map(tab=>(
            <button key={tab} onClick={()=>handleTabChange(tab)}
              style={{padding:"4px 10px",borderRadius:5,fontSize:12,fontWeight:activeTab===tab?600:400,border:`1px solid ${activeTab===tab?CYAN:BORDER2}`,background:activeTab===tab?`${CYAN}14`:"transparent",color:activeTab===tab?CYAN:MUTED,whiteSpace:"nowrap",letterSpacing:"-.01em"}}>
              {tab}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:"auto"}}>
          <button onClick={()=>setShowRoleModal(true)} style={{padding:"4px 10px",borderRadius:5,border:`1px solid ${BORDER}`,background:`${CYAN}08`,color:CYAN,fontSize:11,fontWeight:500,whiteSpace:"nowrap"}}>
            {role.icon} <span className="hide-mobile">{role.label}</span>
          </button>
          <span className="hide-mobile" style={{fontFamily:"'DM Mono','Fira Mono',monospace",fontSize:10,color:GREEN,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:GREEN,display:"inline-block",animation:"blink 1.8s ease-in-out infinite"}}/>{time}
          </span>
        </div>
      </div>

      <div className="main-grid" style={{display:"grid",gridTemplateColumns:"180px 1fr 300px",height:"calc(100vh - 46px)",overflow:"hidden"}}>
        <div className="desktop-sidebar" style={{background:PANEL,borderRight:`1px solid ${BORDER}`,overflowY:"auto"}}>
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
          <div style={{display:activeTab==="Map"?"block":"none",width:"100%",height:"100%"}}><MapTab layer={layer} activeRegion={activeRegion} onRegionClick={handleRegionClick} onCoordClick={handleCoordClick} searchQuery={searchQuery} setSearchQuery={setSearchQuery} mapCenter={mapCenter} setMapCenter={setMapCenter} showHotspots={showHotspots} setShowHotspots={setShowHotspots} showTowns={showTowns} setShowTowns={setShowTowns} clickedCoord={clickedCoord} satLoading={liveDetectLoading} satData={satData}/></div>
          <div style={{display:activeTab==="Intelligence"?"flex":"none",width:"100%",height:"100%",flexDirection:"column"}}><IntelligenceTab activeRegion={activeRegion} setActiveRegion={setActiveRegion} diseaseData={diseaseData} diseaseLoading={diseaseLoading} runDisease={runDisease} riskData={riskData} riskLoading={riskLoading} runRisk={runRisk} scData={scData} scLoading={scLoading} scScenario={scScenario} setScScenario={setScScenario} scIntensity={scIntensity} setScIntensity={setScIntensity} scRegion={scRegion} setScRegion={setScRegion} runScenario={runScenario} airData={airData} airLoading={airLoading} runAir={runAir} insuranceData={insuranceData} insuranceLoading={insuranceLoading} runInsurance={runInsurance} damData={damData} damLoading={damLoading} runDam={runDam}/></div>
          <div style={{display:activeTab==="Quantum"?"flex":"none",width:"100%",height:"100%",flexDirection:"column"}}><QuantumHubTab activeRegion={activeRegion} setActiveRegion={setActiveRegion} qData={qData} qLoading={qLoading} qType={qType} setQType={setQType} runQuantum={runQuantum} criminalData={criminalData} criminalLoading={criminalLoading} runCriminal={runCriminal}/></div>
          <div style={{display:activeTab==="Legal & Evidence"?"flex":"none",width:"100%",height:"100%"}}><LawyerTab lawyerData={lawyerData} lawyerLoading={lawyerLoading} runLawyer={runLawyer}/></div>
          <div style={{display:activeTab==="Monitoring"?"flex":"none",width:"100%",height:"100%",overflowY:"auto"}}><MonitoringTab monitorData={monitorData} monitorLoading={monitorLoading} runMonitor={runMonitor} dashData={dashData} dashLoading={dashLoading} loadDash={loadDash}/></div>
          <div style={{display:activeTab==="Timeline"?"flex":"none",width:"100%",height:"100%"}}><TimelineTab timelineData={timelineData} timelineLoading={timelineLoading} runTimeline={runTimeline} activeRegion={activeRegion}/></div>
          <div style={{display:activeTab==="Annotate"?"flex":"none",width:"100%",height:"100%"}}><AnnotateTab/></div>
        </div>

        <div className="desktop-right" style={{background:PANEL,borderLeft:`1px solid ${BORDER}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
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
            {/* LIVE DETECTION PANEL — shows when clicking map */}
            {(liveDetectLoading||liveDetect)&&(
              <div style={{background:`${PURPLE}08`,border:`1px solid ${PURPLE}33`,borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                <div style={{fontFamily:FM,fontSize:9,color:PURPLE,letterSpacing:".08em",marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:liveDetectLoading?AMBER:PURPLE,display:"inline-block",animation:liveDetectLoading?"blink 1s infinite":"none"}}/>
                  LIVE SATELLITE DETECTION ENGINE
                  {liveDetect&&liveDetect.imagery&&<span style={{color:CYAN,marginLeft:6}}>{liveDetect.imagery.current_image_date}</span>}
                </div>
                {liveDetectLoading&&<div style={{fontFamily:FB,fontSize:11,color:MUTED}}>Running 7-index satellite analysis... (20-30 seconds)</div>}
                {!liveDetectLoading&&liveDetect&&!liveDetect._error&&(
                  <div>
                    {/* Mining Detection */}
                    <div style={{background:P2,borderRadius:7,padding:"8px 10px",marginBottom:8}}>
                      <div style={{fontFamily:FM,fontSize:8,color:RED,marginBottom:4,letterSpacing:".06em"}}>⛏ MINING ACTIVITY DETECTION</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <div style={{fontFamily:FB,fontSize:18,fontWeight:700,color:liveDetect.mining_detection?.score>70?RED:liveDetect.mining_detection?.score>40?AMBER:GREEN}}>{liveDetect.mining_detection?.score}<span style={{fontSize:10,color:MUTED}}>/100</span></div>
                        <Tag label={liveDetect.mining_detection?.level||'--'} color={SEV_C[liveDetect.mining_detection?.level]||MUTED}/>
                      </div>
                      <div style={{height:5,background:"rgba(255,255,255,.05)",borderRadius:3,overflow:"hidden",marginBottom:6}}>
                        <div style={{height:"100%",width:`${liveDetect.mining_detection?.score||0}%`,background:liveDetect.mining_detection?.score>70?RED:liveDetect.mining_detection?.score>40?AMBER:GREEN,borderRadius:3}}/>
                      </div>
                      <div style={{fontFamily:FB,fontSize:11,color:TEXT2,lineHeight:1.5}}>{liveDetect.mining_detection?.classification}</div>
                      {liveDetect.mining_detection?.new_clearing_ha>0&&(
                        <div style={{fontFamily:FM,fontSize:9,color:AMBER,marginTop:4}}>
                          New clearing since {liveDetect.imagery?.baseline_image_date}: <b>{liveDetect.mining_detection.new_clearing_ha} ha</b> · Forest loss: <b>{liveDetect.mining_detection.forest_loss_pct}%</b>
                        </div>
                      )}
                    </div>

                    {/* Water Contamination */}
                    <div style={{background:P2,borderRadius:7,padding:"8px 10px",marginBottom:8}}>
                      <div style={{fontFamily:FM,fontSize:8,color:CYAN,marginBottom:4,letterSpacing:".06em"}}>WATER CONTAMINATION PROXY</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:6}}>
                        <div>
                          <div style={{fontFamily:FM,fontSize:8,color:MUTED}}>Turbidity proxy</div>
                          <div style={{fontFamily:FB,fontSize:12,fontWeight:700,color:liveDetect.water_contamination?.turbidity_proxy_ntu>200?RED:GREEN}}>{liveDetect.water_contamination?.turbidity_proxy_ntu} NTU</div>
                        </div>
                        <div>
                          <div style={{fontFamily:FM,fontSize:8,color:MUTED}}>Mercury proxy</div>
                          <div style={{fontFamily:FB,fontSize:12,fontWeight:700,color:liveDetect.water_contamination?.mercury_proxy_mgl>0.01?RED:GREEN}}>{liveDetect.water_contamination?.mercury_proxy_mgl} mg/L</div>
                        </div>
                        <div>
                          <div style={{fontFamily:FM,fontSize:8,color:MUTED}}>× WHO limit</div>
                          <div style={{fontFamily:FB,fontSize:12,fontWeight:700,color:liveDetect.water_contamination?.mercury_proxy_times_who>5?RED:GREEN}}>{liveDetect.water_contamination?.mercury_proxy_times_who}×</div>
                        </div>
                      </div>
                      <div style={{fontFamily:FM,fontSize:8,color:AMBER}}>⚠ PROXY — Not a direct chemical measurement. Water testing required.</div>
                    </div>

                    {/* Health Risk */}
                    <div style={{background:P2,borderRadius:7,padding:"8px 10px",marginBottom:8}}>
                      <div style={{fontFamily:FM,fontSize:8,color:GREEN,marginBottom:4,letterSpacing:".06em"}}> HEALTH RISK FROM SATELLITE</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                        <div>
                          <div style={{fontFamily:FM,fontSize:8,color:MUTED}}>Outbreak probability</div>
                          <div style={{fontFamily:FB,fontSize:14,fontWeight:700,color:liveDetect.health_risk?.outbreak_probability_30days_pct>50?RED:AMBER}}>{liveDetect.health_risk?.outbreak_probability_30days_pct}%</div>
                        </div>
                        <div>
                          <div style={{fontFamily:FM,fontSize:8,color:MUTED}}>Neurological risk</div>
                          <div style={{fontFamily:FB,fontSize:14,fontWeight:700,color:liveDetect.health_risk?.neurological_risk_pct>50?RED:GREEN}}>{liveDetect.health_risk?.neurological_risk_pct}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Change period */}
                    <div style={{fontFamily:FM,fontSize:9,color:MUTED,lineHeight:1.6}}>
                      Change detection: <span style={{color:CYAN}}>{liveDetect.imagery?.baseline_image_date}</span> → <span style={{color:CYAN}}>{liveDetect.imagery?.current_image_date}</span><br/>
                      Indices used: BSI, MNDWI, Iron Oxide Ratio, Clay Mineral Ratio, NDVI Change<br/>
                      <span style={{color:GREEN}}>All calculated live from Sentinel-2 satellite pixels</span>
                    </div>

                    {/* Actions */}
                    {liveDetect.what_to_do_next&&(
                      <div style={{marginTop:8}}>
                        <div style={{fontFamily:FM,fontSize:8,color:MUTED,marginBottom:6,letterSpacing:".06em"}}>RECOMMENDED ACTIONS</div>
                        {liveDetect.what_to_do_next.map((a,i)=>(
                          <div key={i} style={{display:"flex",gap:7,padding:"5px 8px",background:BG,borderRadius:5,marginBottom:4}}>
                            <span style={{color:CYAN,flexShrink:0,fontSize:10}}>→</span>
                            <span style={{fontFamily:FB,fontSize:10,color:TEXT2,lineHeight:1.5}}>{a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!liveDetectLoading&&liveDetect&&liveDetect._error&&(
                  <div style={{fontFamily:FB,fontSize:11,color:AMBER}}>Detection error: {liveDetect._error}</div>
                )}
              </div>
            )}
            {loading&&<Spinner label={"Analysing "+(region||"region")+"..."}/>}
            {!loading&&!prediction&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:250,gap:12,textAlign:"center",padding:16}}>
                <div style={{fontSize:40,opacity:.15}}>️</div>
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
                    <span>{["","",""][i]}</span>{a}
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

      {/* MOBILE BOTTOM PANEL — Map tab only */}
      {activeTab==="Map"&&(
      <div className="mobile-bottom">
        {/* Search bar */}
        <div style={{padding:"8px 10px",borderBottom:`1px solid ${BORDER}`,display:"flex",gap:6}}>
          <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search town or region..."
            style={{flex:1,background:P2,border:`1px solid ${CYAN}33`,borderRadius:6,padding:"7px 10px",color:TEXT,fontSize:13,outline:"none",fontFamily:FB}}/>
          <button onClick={()=>{const q=searchQuery.toLowerCase();const town=GHANA_TOWNS.find(t=>t.name.toLowerCase().includes(q));const reg=Object.entries(REGION_COORDS).find(([k])=>k.toLowerCase().includes(q));if(town){setMapCenter([town.lat,town.lng,13]);handleCoordClick(town.lat,town.lng,town.name);}else if(reg){setMapCenter([reg[1].lat,reg[1].lng,10]);handleRegionClick(reg[0]);}}}
            style={{background:CYAN,border:"none",borderRadius:6,padding:"7px 14px",color:BG,fontSize:13,fontWeight:700,cursor:"pointer"}}>Go</button>
        </div>

        {/* Region buttons */}
        <div style={{padding:"8px 10px",borderBottom:`1px solid ${BORDER}`}}>
          <div style={{fontFamily:FM,fontSize:9,color:MUTED,marginBottom:5,letterSpacing:".06em",textTransform:"uppercase"}}>Tap Region</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {REGIONS.map(r=>(
              <button key={r.name} onClick={()=>handleRegionClick(r.name)}
                style={{padding:"5px 9px",borderRadius:5,border:`1px solid ${activeRegion===r.name?CYAN:BORDER2}`,background:activeRegion===r.name?`${CYAN}15`:"transparent",color:activeRegion===r.name?CYAN:MUTED,fontSize:11,fontFamily:FB,cursor:"pointer"}}>
                {r.name.replace(' Region','')}
              </button>
            ))}
          </div>
        </div>

        {/* Live detection */}
        {liveDetectLoading&&<div style={{padding:"12px 10px",display:"flex",alignItems:"center",gap:8}}><span style={{width:6,height:6,borderRadius:"50%",background:AMBER,display:"inline-block",animation:"blink 1s infinite"}}/><span style={{fontFamily:FB,fontSize:12,color:MUTED}}>Running satellite detection... 20-30 seconds</span></div>}
        {!liveDetectLoading&&liveDetect&&!liveDetect._error&&(
          <div style={{padding:"10px 12px",borderBottom:`1px solid ${BORDER}`}}>
            <div style={{fontFamily:FM,fontSize:9,color:PURPLE,marginBottom:8,letterSpacing:".06em"}}>LIVE DETECTION · {liveDetect.imagery?.current_image_date} · {liveDetect.location}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
              {[["Mining Score",liveDetect.mining_detection?.score,"/100",liveDetect.mining_detection?.score>70?RED:liveDetect.mining_detection?.score>40?AMBER:GREEN],["Mercury Proxy",liveDetect.water_contamination?.mercury_proxy_mgl,"mg/L",liveDetect.water_contamination?.mercury_proxy_mgl>0.01?RED:GREEN],["Outbreak Risk",liveDetect.health_risk?.outbreak_probability_30days_pct,"%",liveDetect.health_risk?.outbreak_probability_30days_pct>50?RED:AMBER]].map(([label,val,unit,col])=>(
                <div key={label} style={{background:P2,borderRadius:6,padding:"7px 8px",textAlign:"center"}}>
                  <div style={{fontFamily:FM,fontSize:8,color:MUTED,marginBottom:2}}>{label}</div>
                  <div style={{fontFamily:FB,fontSize:16,fontWeight:700,color:col}}>{val}</div>
                  <div style={{fontFamily:FM,fontSize:8,color:MUTED}}>{unit}</div>
                </div>
              ))}
            </div>
            <div style={{fontFamily:FB,fontSize:11,color:TEXT2,lineHeight:1.5}}>{liveDetect.mining_detection?.classification}</div>
          </div>
        )}

        {/* Prediction */}
        {loading&&<div style={{padding:12}}><Spinner label="Analysing..."/></div>}
        {!loading&&prediction&&!prediction._error&&(
          <div style={{padding:"10px 12px"}}>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
              <Tag label={prediction.severity} color={SEV_C[prediction.severity]} bg={SEV_BG[prediction.severity]}/>
              <Tag label={prediction.confidence} color={CYAN}/>
            </div>
            <div style={{fontFamily:FH,fontSize:14,color:TEXT,marginBottom:6,fontWeight:"normal",lineHeight:1.4}}>{prediction.title}</div>
            <div style={{fontFamily:FB,fontSize:11,color:TEXT,lineHeight:1.7,padding:"8px 10px",background:P2,borderRadius:7,borderLeft:`3px solid ${CYAN}`,marginBottom:8}}>{prediction.analysis}</div>
            {(prediction.findings||[]).slice(0,2).map((f,i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"6px 10px",background:P2,borderRadius:6,marginBottom:5}}>
                <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,marginTop:4,background:{critical:RED,high:AMBER,medium:"#F5C842",low:GREEN}[f.severity]||CYAN}}/>
                <div style={{fontFamily:FB,fontSize:11,color:TEXT,lineHeight:1.6}}>{f.text}</div>
              </div>
            ))}
          </div>
        )}
        {!loading&&!prediction&&!liveDetect&&(
          <div style={{padding:"20px 12px",textAlign:"center"}}>
            <div style={{fontFamily:FB,fontSize:13,color:MUTED,marginBottom:4}}>Tap a region or anywhere on the map</div>
            <div style={{fontFamily:FM,fontSize:10,color:MUTED}}>Live satellite analysis will appear here</div>
          </div>
        )}
        <div style={{height:20}}/>
      </div>
      )}

      {/* MOBILE NON-MAP TABS — full screen content */}
      {activeTab!=="Map"&&(
      <div className="mobile-fullscreen-tab">
        <style>{`@media(max-width:768px){.mobile-fullscreen-tab{display:flex!important;position:fixed;top:46px;left:0;right:0;bottom:0;z-index:500;background:#040D1A;overflow-y:auto;-webkit-overflow-scrolling:touch;flex-direction:column;}} @media(min-width:769px){.mobile-fullscreen-tab{display:none!important;}}`}</style>
        {activeTab==="Intelligence"&&<IntelligenceTab activeRegion={activeRegion} setActiveRegion={setActiveRegion} diseaseData={diseaseData} diseaseLoading={diseaseLoading} runDisease={runDisease} riskData={riskData} riskLoading={riskLoading} runRisk={runRisk} scData={scData} scLoading={scLoading} scScenario={scScenario} setScScenario={setScScenario} scIntensity={scIntensity} setScIntensity={setScIntensity} scRegion={scRegion} setScRegion={setScRegion} runScenario={runScenario} airData={airData} airLoading={airLoading} runAir={runAir} insuranceData={insuranceData} insuranceLoading={insuranceLoading} runInsurance={runInsurance} damData={damData} damLoading={damLoading} runDam={runDam}/>}
        {activeTab==="Quantum"&&<QuantumHubTab activeRegion={activeRegion} setActiveRegion={setActiveRegion} qData={qData} qLoading={qLoading} qType={qType} setQType={setQType} runQuantum={runQuantum} criminalData={criminalData} criminalLoading={criminalLoading} runCriminal={runCriminal}/>}
        {activeTab==="Legal & Evidence"&&<LawyerTab lawyerData={lawyerData} lawyerLoading={lawyerLoading} runLawyer={runLawyer}/>}
        {activeTab==="Monitoring"&&<MonitoringTab monitorData={monitorData} monitorLoading={monitorLoading} runMonitor={runMonitor} dashData={dashData} dashLoading={dashLoading} loadDash={loadDash}/>}
        {activeTab==="Timeline"&&<TimelineTab timelineData={timelineData} timelineLoading={timelineLoading} runTimeline={runTimeline} activeRegion={activeRegion}/>}
        {activeTab==="Annotate"&&<AnnotateTab/>}
      </div>
      )}


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