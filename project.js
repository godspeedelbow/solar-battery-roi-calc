import {proposalKind} from './proposal-kind.js';
import {validateShading} from './shading.js?v=northern-trees';
import {calculateRoi,roiSettings} from './roi.js';
import {arbitrageSettings} from './arbitrage.js?v=cash-no-wear';
import {validatePrices} from './prices.js';
import {solarSettings} from './solar.js?v=nne-final';
import {validateEnvironment} from './environment.js';
import {panelSummary} from './catalog.js';
export const STORAGE_KEY = 'solar-household-project-v1';
export function createProject() {
 return {version:1,house:{bearingConvention:'north-clockwise',name:'Our house',latitude:null,longitude:null,roofs:[{id:'roof-1',name:'Roof 1',area:null,tilt:null,azimuth:null},{id:'roof-2',name:'Roof 2 · west',area:null,tilt:null,azimuth:null}]},proposals:[],consumption:null,replay:null,tariffs:{notes:'',confirmed:false},strategy:{eagerness:50},todos:['Model shading on the west side of the second roof.']};
}
export function newProposal(roofCount=2){return {id:crypto.randomUUID(),name:'Untitled proposal',kind:'scenario',cost:null,batteryModel:'',batteryType:'',inverterModel:'',panelWatts:null,panels:Array(roofCount).fill(0),inverterKw:null,batteryKwh:null,chargeKw:null,dischargeKw:null,roundTripEfficiency:null,reservePercent:10,notes:''};}
export function cloneProposal(p){return {...structuredClone(p),kind:'scenario',id:crypto.randomUUID(),name:`${p.name} · copy`};}
export function validateProject(p){
 if(!p||p.version!==1||!p.house||!Array.isArray(p.house.roofs)||p.house.roofs.length<2||p.house.roofs.length>20||!Array.isArray(p.proposals)||!p.strategy||!p.tariffs||!Array.isArray(p.todos))throw Error('Not a supported household project.');
 if(!p.house.bearingConvention){for(const roof of p.house.roofs){if(roof.azimuth!==null){if(!Number.isFinite(roof.azimuth)||roof.azimuth < -180||roof.azimuth > 180)throw Error('Invalid legacy roof orientation.');roof.azimuth=(roof.azimuth+180)%360;}}p.house.bearingConvention='north-clockwise';}
 if(p.house.bearingConvention!=='north-clockwise')throw Error('Unsupported bearing convention.');
 const number=(value,min,max,label)=>{if(value!==null&&(!Number.isFinite(value)||value<min||value>max))throw Error(`Invalid ${label}.`);};
 validateShading(p.house.shading);number(p.house.latitude,-90,90,'latitude');number(p.house.longitude,-180,180,'longitude');number(p.strategy.eagerness,0,100,'eagerness');
 p.house.roofs.forEach(r=>{if(typeof r.name!=='string')throw Error('Roof name is required.');number(r.area,0,10000,'roof area');number(r.tilt,0,90,'roof tilt');number(r.azimuth,0,360,'roof compass bearing');});
 const ids=new Set();p.proposals.forEach(r=>{r.kind=proposalKind(r);if(typeof r.id!=='string'||ids.has(r.id)||typeof r.name!=='string'||!Array.isArray(r.panels)||r.panels.length>p.house.roofs.length)throw Error('Invalid proposal.');ids.add(r.id);while(r.panels.length<p.house.roofs.length)r.panels.push(0);for(const key of ['cost','panelWatts','inverterKw','batteryKwh','chargeKw','dischargeKw'])number(r[key],0,1e8,key);number(r.roundTripEfficiency,1,100,'efficiency');number(r.reservePercent,0,99,'reserve');if(r.panelCount!=null&&(!Number.isInteger(r.panelCount)||r.panelCount<0||r.panelCount>20000))throw Error('Invalid total panel count.');r.panels.forEach(n=>{if(n!==null&&(!Number.isInteger(n)||n<0||n>10000))throw Error('Panel counts must be non-negative whole numbers.');});});
 if(p.consumption!==null){if(!Array.isArray(p.consumption.rows)||!p.consumption.rows.length)throw Error('Invalid consumption data.');let prev=null;for(const r of p.consumption.rows){const time=Date.parse(r.time);if(!Number.isFinite(time)||time%3600000!==0||!Number.isFinite(r.kwh)||r.kwh<0||(prev!==null&&time-prev!==3600000))throw Error('Invalid or incomplete hourly consumption.');prev=time;}}
 if(p.arbitrage?.overrides)for(const proposal of p.proposals)arbitrageSettings(p,proposal);
 if(p.roi?.overrides)for(const proposal of p.proposals)if(p.roi.overrides[proposal.id])calculateRoi(roiSettings(p,proposal,0));
 if(p.prices!=null)validatePrices(p.prices);
 if(p.solarModel!=null)solarSettings(p.solarModel);
 if(p.environment!=null)validateEnvironment(p.environment);
 return p;
}
export function missingInputs(project,proposal){const missing=[];if(!project.consumption)missing.push('Hourly consumption');if(!project.environment||!project.prices)missing.push('Historical solar & prices');if(!project.tariffs.importRatesVerified)missing.push('Invoice tariffs');if(project.tariffs.importRatesVerified&&!project.tariffs.exportTermsVerified)missing.push('Export compensation & proposal contract fees');if(project.house.latitude===null||project.house.longitude===null)missing.push('House location');const panelInfo=panelSummary(proposal);if(!panelInfo.assigned)missing.push('Panel allocation across roofs');if(panelInfo.mismatch)missing.push('Roof allocation does not match total panel count');if(proposal.reservePercent===null)missing.push('Battery reserve setting');project.house.roofs.forEach((r,i)=>{if(proposal.panels[i]>0&&r.tilt===null)missing.push(`${r.name} tilt`);if(proposal.panels[i]>0&&r.azimuth===null)missing.push(`${r.name} orientation`);});if(!proposal.panelWatts||!(panelInfo.count>0)||!proposal.inverterKw)missing.push('Panel & inverter specifications');if(proposal.batteryKwh!==0&&(!proposal.batteryKwh||!proposal.chargeKw||!proposal.dischargeKw||!proposal.roundTripEfficiency))missing.push('Battery specifications');if(proposal.cost===null)missing.push('Total system price');if(proposal.catalogEvidence?.originalQuoteAccess?.status==='not_retrieved')missing.push('Original quote verification');if(proposal.catalogEvidence&&!proposal.catalogEvidence.priceEligibilityVerified&&!proposal.catalogEvidence.priceDeductionBasisVerified)missing.push('Quoted price applicability');if(proposal.catalogEvidence?.batteryModuleMatchConfirmed===false)missing.push('Exact battery module and controller confirmation');return missing;}
