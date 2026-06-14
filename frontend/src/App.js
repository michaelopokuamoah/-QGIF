import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

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

function MapTab({layer,activeRegion,onRegionClick,onCoordClick,searchQuery,setSearchQuery,mapCenter,setMapCenter,showHotspots,setShowHotspots,showTowns,setShowTowns,clickedCoord,satLoading,satData}){
  const mapRef=useRef(null);

  return(
    <div style={{position:"relative",width:"100%",height:"100%",background:"#030A14"}}>
      <style>{`
        .qgif-tooltip{background:#08162A!important;border:1px solid rgba(0,200,240,0.4)!important;color:#D8E8FF!important;font-family:monospace!important;font-size:11px!important;padding:6px 10px!important;border-radius:6px!important;}
        .qgif-hotspot{background:#1a0505!important;border:1px solid rgba(232,58,58,0.6)!important;color:#FFB3B3!important;}
        .qgif-town{background:#0a0a1a!important;border:1px solid rgba(139,92,246,0.4)!important;color:#D8E8FF!important;}
        .qgif-river{background:#051a15!important;border:1px solid rgba(0,232,122,0.4)!important;color:#B3FFE0!important;}
        .leaflet-container{background:#030A14!important;}
        .leaflet-control-attribution{background:rgba(8,22,42,0.85)!important;color:#4A6880!important;font-size:9px!important;}
        .leaflet-control-attribution a{color:#00C8F0!important;}
        .leaflet-control-zoom a{background:#08162A!important;color:#00C8F0!important;border-color:rgba(0,200,240,0.2)!important;}
        .leaflet-control-zoom a:hover{background:#0B1E35!important;}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:0.8}50%{transform:scale(1.4);opacity:0.4}}
      `}</style>

      {/* TOP TOOLBAR */}
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:1000,background:"rgba(3,10,20,.95)",borderBottom:`1px solid ${BORDER}`,padding:"6px 12px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        {/* Search */}
        <div style={{display:"flex",gap:0,flex:1,minWidth:200,maxWidth:320}}>
          <input
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
            placeholder="🔍 Search any town, city or region..."
            style={{flex:1,background:P2,border:`1px solid ${CYAN}33`,borderRight:"none",borderRadius:"6px 0 0 6px",padding:"5px 10px",color:TEXT,fontSize:11,outline:"none",fontFamily:FB}}
          />
          <button
            onClick={()=>{
              const q=searchQuery.toLowerCase();
              const town=GHANA_TOWNS.find(t=>t.name.toLowerCase().includes(q));
              const region=Object.entries(REGION_COORDS).find(([k])=>k.toLowerCase().includes(q));
              if(town){setMapCenter([town.lat,town.lng,13]);onCoordClick(town.lat,town.lng,town.name);}
              else if(region){setMapCenter([region[1].lat,region[1].lng,10]);onRegionClick(region[0]);}
            }}
            style={{background:CYAN,border:"none",borderRadius:"0 6px 6px 0",padding:"5px 10px",color:BG,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FB}}>Go</button>
        </div>

        {/* Layer toggles */}
        {[[showHotspots,setShowHotspots,"🔴 Mining Hotspots",RED],[showTowns,setShowTowns,"🏘 Towns",PURPLE]].map(([state,setter,label,color])=>(
          <button key={label} onClick={()=>setter(!state)}
            style={{padding:"4px 10px",borderRadius:5,border:`1px solid ${state?color:BORDER2}`,background:state?`${color}18`:"transparent",color:state?color:MUTED,fontSize:10,fontFamily:FB,cursor:"pointer",whiteSpace:"nowrap"}}>
            {label}
          </button>
        ))}

        <div style={{fontFamily:FM,fontSize:10,color:CYAN,whiteSpace:"nowrap"}}>{activeRegion||clickedCoord||"Click map or search"}</div>
      </div>

      {/* LIVE SATELLITE STATUS */}
      {(satLoading||satData)&&(
        <div style={{position:"absolute",top:45,left:12,zIndex:1000,background:"rgba(8,22,42,0.95)",border:`1px solid ${satData?.earth_engine_status?.includes('CONNECTED')?GREEN:BORDER}`,borderRadius:8,padding:"7px 12px",maxWidth:280}}>
          {satLoading&&<div style={{fontFamily:FM,fontSize:9,color:AMBER,display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:AMBER,display:"inline-block",animation:"blink 1s infinite"}}/>Querying Earth Engine satellite...</div>}
          {!satLoading&&satData&&satData.earth_engine_status?.includes('CONNECTED')&&(
            <div>
              <div style={{fontFamily:FM,fontSize:9,color:GREEN,marginBottom:4,display:"flex",alignItems:"center",gap:5}}><span style={{width:5,height:5,borderRadius:"50%",background:GREEN,display:"inline-block"}}/>LIVE SENTINEL-2 · {satData.satellite_date}</div>
              <div style={{display:"flex",gap:10}}>
                <div><div style={{fontFamily:FM,fontSize:8,color:MUTED}}>NDVI</div><div style={{fontFamily:FB,fontSize:12,fontWeight:700,color:satData.ndvi_mean>0.5?GREEN:satData.ndvi_mean>0.3?AMBER:RED}}>{satData.ndvi_mean}</div></div>
                <div><div style={{fontFamily:FM,fontSize:8,color:MUTED}}>DEGRADATION</div><div style={{fontFamily:FB,fontSize:12,fontWeight:700,color:satData.degradation_gap>0.25?RED:GREEN}}>{satData.degradation_gap}</div></div>
                <div><div style={{fontFamily:FM,fontSize:8,color:MUTED}}>WATER</div><div style={{fontFamily:FB,fontSize:12,fontWeight:700,color:CYAN}}>{satData.water_fraction_pct}%</div></div>
              </div>
              {satData.degradation_signal?.startsWith('YES')&&<div style={{fontFamily:FM,fontSize:9,color:RED,marginTop:4}}>⚠ LAND DEGRADATION DETECTED</div>}
            </div>
          )}
        </div>
      )}

      {/* MAP */}
      <div style={{position:"absolute",top:42,left:0,right:0,bottom:36}}>
        <MapContainer
          center={mapCenter?[mapCenter[0],mapCenter[1]]:[7.9465,-1.0232]}
          zoom={mapCenter?mapCenter[2]:7}
          style={{width:"100%",height:"100%"}}
          zoomControl={true}
          ref={mapRef}
        >
          {/* Real satellite imagery */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='© Esri, Maxar, Earthstar Geographics'
            maxZoom={19}
          />
          {/* Place labels overlay */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution=''
            maxZoom={19}
            opacity={0.8}
          />

          {/* Click anywhere handler */}
          <ClickHandler onMapClick={(lat,lng)=>onCoordClick(lat,lng,null)}/>

          {/* Region markers */}
          {Object.entries(REGION_COORDS).map(([name,data])=>(
            <Marker key={name} position={[data.lat,data.lng]}
              icon={makeRegionIcon(data.risk,data.sites,activeRegion===name)}
              eventHandlers={{click:()=>onRegionClick(name)}}>
              <Tooltip direction="top" className="qgif-tooltip">
                <b style={{color:getRiskColor(data.risk)}}>{name}</b><br/>
                Risk: <b>{data.risk}</b> · Sites: <b>{data.sites}</b><br/>
                Mercury: <b>{data.mercury} mg/L</b> ({Math.round(data.mercury/0.001)}× WHO)<br/>
                Population: <b>{(data.pop/1000000).toFixed(1)}M</b><br/>
                River: {data.river}<br/>
                <span style={{color:'#00C8F0',fontSize:10}}>Click for full intelligence →</span>
              </Tooltip>
            </Marker>
          ))}

          {/* Town markers */}
          {showTowns&&GHANA_TOWNS.map(t=>(
            <Marker key={t.name} position={[t.lat,t.lng]}
              icon={makeTownIcon(t.type,t.name)}
              eventHandlers={{click:()=>onCoordClick(t.lat,t.lng,t.name)}}>
              <Tooltip direction="top" className="qgif-town">
                <b>{t.name}</b> · {t.type}<br/>
                Population: {t.pop.toLocaleString()}<br/>
                Region: {t.region}<br/>
                <span style={{color:'#00C8F0',fontSize:10}}>Click for satellite analysis →</span>
              </Tooltip>
            </Marker>
          ))}

          {/* Mining hotspots */}
          {showHotspots&&MINING_HOTSPOTS.map((h,i)=>(
            <Marker key={i} position={[h.lat,h.lng]}
              icon={makeHotspotIcon(h.severity)}
              eventHandlers={{click:()=>onCoordClick(h.lat,h.lng,h.name)}}>
              <Tooltip direction="top" className="qgif-hotspot">
                <b style={{color:'#E83A3A'}}>⛏ {h.name}</b><br/>
                Severity: <b>{h.severity}/10</b> · Sites: <b>{h.sites}</b><br/>
                {h.desc}<br/>
                <span style={{color:'#FF8888',fontSize:10}}>Click for criminal network analysis →</span>
              </Tooltip>
            </Marker>
          ))}

        </MapContainer>
      </div>

      {/* LEGEND */}
      <div style={{position:"absolute",bottom:42,right:12,zIndex:1000,background:"rgba(8,22,42,.96)",border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 14px",minWidth:160}}>
        <div style={{fontFamily:FM,fontSize:8,color:MUTED,marginBottom:8,letterSpacing:".08em"}}>RISK INDEX</div>
        {[[RED,"Critical — 30+ sites"],[AMBER,"High — 11-20 sites"],["#F5C842","Medium — 3-7 sites"],[GREEN,"Low — 1-2 sites"]].map(([col,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:7,fontSize:10,fontFamily:FB,color:TEXT2,marginBottom:5}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:col,boxShadow:`0 0 5px ${col}`}}/>{l}
          </div>
        ))}
        <div style={{borderTop:`1px solid ${BORDER2}`,marginTop:8,paddingTop:8}}>
          <div style={{fontFamily:FM,fontSize:8,color:MUTED,marginBottom:5}}>MARKERS</div>
          {[["🔵","Capital city"],["🟣","Major city"],["🟠","Mining town"],["⚪","Town"]].map(([icon,l])=>(
            <div key={l} style={{fontFamily:FB,fontSize:9,color:TEXT2,marginBottom:3}}>{icon} {l}</div>
          ))}
        </div>
        <div style={{borderTop:`1px solid ${BORDER2}`,marginTop:6,paddingTop:6,fontFamily:FM,fontSize:8,color:MUTED}}>
          Numbers in circles = illegal mining sites<br/>
          <span style={{color:CYAN}}>Click anywhere for satellite analysis</span>
        </div>
      </div>

      {/* STATUS BAR */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:36,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:"rgba(3,10,20,.95)",borderTop:`1px solid ${BORDER}`,zIndex:1000}}>
        <div style={{display:"flex",gap:16}}>
          {[["Satellite","Sentinel-2 Live",CYAN],["Towns",`${GHANA_TOWNS.length} mapped`,PURPLE],["Hotspots",`${MINING_HOTSPOTS.length} active`,RED],["Quantum","Active",GREEN]].map(([k,v,col])=>(
            <div key={k} style={{fontFamily:FM,fontSize:9,color:MUTED}}>{k} <span style={{color:col}}>{v}</span></div>
          ))}
        </div>
        <div style={{fontFamily:FM,fontSize:9,color:MUTED}}>Click anywhere on map for live satellite analysis</div>
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
  const [satData,setSatData]=useState(null);
  const [satLoading,setSatLoading]=useState(false);
  const [liveDetect,setLiveDetect]=useState(null);
  const [liveDetectLoading,setLiveDetectLoading]=useState(false);

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
        @media(max-width:768px){
          .desktop-sidebar{display:none!important}
          .desktop-right{display:none!important}
          .mobile-bottom{display:flex!important}
          .tab-scroll{overflow-x:auto!important;flex-wrap:nowrap!important;justify-content:flex-start!important}
          .tab-scroll::-webkit-scrollbar{height:2px}
        }
        @media(min-width:769px){
          .mobile-bottom{display:none!important}
        }
        .mobile-bottom{display:none;position:fixed;bottom:0;left:0;right:0;background:${PANEL};border-top:1px solid ${BORDER};z-index:100;flex-direction:column;max-height:55vh;overflow-y:auto}
      `}</style>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",background:PANEL,borderBottom:`1px solid ${BORDER}`,gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{width:28,height:28,background:"linear-gradient(135deg,#00C8F0,#8B5CF6)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:BG}}>⚛</div>
          <span style={{fontFamily:FH,fontSize:14,color:CYAN,whiteSpace:"nowrap"}}>QGIF</span>
        </div>
        <div className="tab-scroll" style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center",flex:1,overflow:"hidden"}}>
          {TABS.map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:"4px 9px",borderRadius:5,fontFamily:FB,fontSize:10,cursor:"pointer",border:`1px solid ${activeTab===tab?CYAN:BORDER2}`,background:activeTab===tab?`${CYAN}10`:"transparent",color:activeTab===tab?CYAN:MUTED,whiteSpace:"nowrap",flexShrink:0}}>{tab}</button>
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
                      <div style={{fontFamily:FM,fontSize:8,color:CYAN,marginBottom:4,letterSpacing:".06em"}}>💧 WATER CONTAMINATION PROXY</div>
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
                      <div style={{fontFamily:FM,fontSize:8,color:GREEN,marginBottom:4,letterSpacing:".06em"}}>🏥 HEALTH RISK FROM SATELLITE</div>
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

      {/* MOBILE BOTTOM PANEL — shown only on small screens */}
      <div className="mobile-bottom">
        {/* Live satellite status bar */}
        {region&&satData&&satData.earth_engine_status==="CONNECTED — REAL SATELLITE DATA"&&(
          <div style={{padding:"8px 12px",background:`${GREEN}10`,borderBottom:`1px solid ${GREEN}22`,display:"flex",gap:12,alignItems:"center"}}>
            <span style={{fontFamily:FM,fontSize:9,color:GREEN}}>● LIVE SATELLITE {satData.satellite_date}</span>
            <span style={{fontFamily:FM,fontSize:9,color:TEXT2}}>NDVI: {satData.ndvi_mean}</span>
            <span style={{fontFamily:FM,fontSize:9,color:satData.degradation_gap>0.25?AMBER:GREEN}}>Gap: {satData.degradation_gap}</span>
          </div>
        )}
        {/* Region quick-select */}
        <div style={{padding:"8px 12px",borderBottom:`1px solid ${BORDER}`}}>
          <div style={{fontFamily:FM,fontSize:9,color:MUTED,marginBottom:6}}>TAP REGION</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {REGIONS.map(r=>(
              <button key={r.name} onClick={()=>handleRegionClick(r.name)}
                style={{padding:"4px 8px",borderRadius:5,border:`1px solid ${activeRegion===r.name?CYAN:BORDER2}`,background:activeRegion===r.name?`${CYAN}10`:"transparent",color:activeRegion===r.name?CYAN:MUTED,fontSize:10,fontFamily:FB,cursor:"pointer"}}>
                {r.name}
              </button>
            ))}
          </div>
        </div>
        {/* Intelligence output */}
        {loading&&<div style={{padding:12}}><Spinner label="Analysing..."/></div>}
        {!loading&&prediction&&!prediction._error&&(
          <div style={{padding:"10px 12px",overflowY:"auto"}}>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
              <Tag label={prediction.severity} color={SEV_C[prediction.severity]} bg={SEV_BG[prediction.severity]}/>
              <Tag label={prediction.confidence} color={CYAN}/>
            </div>
            <div style={{fontFamily:FH,fontSize:15,color:TEXT,marginBottom:6,fontWeight:"normal"}}>{prediction.title}</div>
            <div style={{fontFamily:FB,fontSize:12,color:TEXT,lineHeight:1.7,padding:"8px 10px",background:P2,borderRadius:7,borderLeft:`3px solid ${CYAN}`,marginBottom:8}}>{prediction.analysis}</div>
            {(prediction.findings||[]).slice(0,2).map((f,i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"6px 10px",background:P2,borderRadius:6,marginBottom:5}}>
                <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,marginTop:4,background:{critical:RED,high:AMBER,medium:"#F5C842",low:GREEN}[f.severity]||CYAN}}/>
                <div style={{fontFamily:FB,fontSize:11,color:TEXT,lineHeight:1.6}}>{f.text}</div>
              </div>
            ))}
          </div>
        )}
        {!loading&&!prediction&&(
          <div style={{padding:"16px 12px",textAlign:"center"}}>
            <div style={{fontFamily:FB,fontSize:13,color:MUTED}}>Tap a region above to get intelligence</div>
          </div>
        )}
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