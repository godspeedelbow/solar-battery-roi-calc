import {solarInputReader,solarInputSource} from './solar-inputs.js?v=pvgis-inputs-v2';
import {shadedIrradiance} from './shading.js?v=northern-trees';
import {environmentSignature} from './environment.js';
export const SOLAR_DEFAULTS={temperatureCoefficientPct:-0.35,inverterEfficiencyPct:96,otherLossPct:10,u0:25,u1:6.84};
export function solarSettings(input={}){const s={...SOLAR_DEFAULTS,...input};for(const [key,min,max] of [['temperatureCoefficientPct',-1,0],['inverterEfficiencyPct',1,100],['otherLossPct',0,100],['u0',1,100],['u1',0,50]])if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error(`Invalid solar assumption: ${key}.`);return s;}
export function simulateSolar(project,proposal){
 const e=project.environment;if(!e)throw Error('Waiting for historical weather and sunlight.');if(e.signature!==environmentSignature(project.house))throw Error('Weather/solar inputs changed. Waiting for automatic refresh.');
 if(!Number.isFinite(proposal.panelWatts)||proposal.panelWatts<=0||!Number.isFinite(proposal.inverterKw)||proposal.inverterKw<=0)throw Error('Enter panel wattage and inverter AC limit.');
 if(!proposal.panels.every(n=>Number.isInteger(n)&&n>=0)||proposal.panels.reduce((a,b)=>a+b,0)<=0)throw Error('Assign panels to the roofs.');if(proposal.panelCount!=null&&proposal.panelCount!==proposal.panels.reduce((a,b)=>a+b,0))throw Error('Panel allocation differs from total panel count.');
 const inputReader=solarInputReader(project);let alternativeRoofHours=0,fallbackRoofHours=0;
 const s=solarSettings(project.solarModel);const weather=e.series.weather.rows;
 const roofs=project.house.roofs.map((roof,i)=>{const count=proposal.panels[i]??0;if(count&&!e.series[roof.id])throw Error(`Missing sunlight for ${roof.name}.`);return {id:roof.id,name:roof.name,roof,count,kwp:count*proposal.panelWatts/1000,rows:e.series[roof.id]?.rows};});
 const monthly=new Map();const roofTotals=roofs.map(r=>({id:r.id,name:r.name,kwh:0,dcKwh:0}));let totalKwh=0,dcKwh=0,clippedKwh=0,peakKw=0;
 const output=[];
 for(let i=0;i<weather.length;i++){
  const w=weather[i];if(!Number.isFinite(w.temperature_2m)||!Number.isFinite(w.wind_speed_10m)||w.wind_speed_10m<0)throw Error('Invalid weather input.');
  const dc=roofs.map(r=>{if(!r.count)return 0;const rad=r.rows[i];if(rad?.time!==w.time||!Number.isFinite(rad.global_tilted_irradiance)||rad.global_tilted_irradiance<0)throw Error('Solar/weather hours do not align.');const alternative=inputReader?.(w.time,r.roof);if(inputReader){if(alternative)alternativeRoofHours++;else fallbackRoofHours++;}const g=shadedIrradiance({time:w.time,g:alternative?.g??rad.global_tilted_irradiance,approximateDirectFraction:alternative?.directFraction??null,solar:e.series.solar?.rows[i],house:project.house,roof:r.roof});const temp=w.temperature_2m+g/(s.u0+s.u1*w.wind_speed_10m);return Math.max(0,r.kwp*g/1000*(1+s.temperatureCoefficientPct/100*(temp-25)))*(1-s.otherLossPct/100);});
  const totalDc=dc.reduce((a,b)=>a+b,0),available=totalDc*s.inverterEfficiencyPct/100,ac=Math.min(proposal.inverterKw,available),clipped=available-ac;const roofKwh=dc.map(value=>totalDc?ac*value/totalDc:0);
  roofKwh.forEach((value,j)=>{roofTotals[j].kwh+=value;roofTotals[j].dcKwh+=dc[j];});totalKwh+=ac;dcKwh+=totalDc;clippedKwh+=clipped;peakKw=Math.max(peakKw,ac);
  const month=w.time.slice(0,7);if(!monthly.has(month))monthly.set(month,{month,kwh:0,roofKwh:roofs.map(()=>0),clippedKwh:0});const m=monthly.get(month);m.kwh+=ac;m.clippedKwh+=clipped;roofKwh.forEach((v,j)=>m.roofKwh[j]+=v);output.push({time:w.time,acKwh:ac,dcKwh:totalDc,clippedKwh:clipped,roofKwh});
 }
 if(!output.length)throw Error('No weather hours available.');return {start:e.start,end:e.end,hours:output.length,totalKwh,dcKwh,clippedKwh,peakKw,roofTotals,monthly:[...monthly.values()],rows:output,settings:s,inputSource:solarInputSource(project),inputCoverage:{alternativeRoofHours,fallbackRoofHours}};
}
