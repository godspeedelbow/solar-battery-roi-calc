const HOUR = 3600000;
const zone = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',weekday:'short',hourCycle:'h23'});
export function localParts(time) {return Object.fromEntries(zone.formatToParts(new Date(time)).map(p=>[p.type,p.value]));}
export const defaults = {year:2025,residents:2,baseWatts:180,appliances:1800,hotWaterPerPerson:900,heating:7000,ev:0};
export function modelHousehold(settings) {
 const s={...defaults,...settings};
 for(const key of Object.keys(defaults)) if(!Number.isFinite(s[key])||s[key]<0) throw Error(`Invalid ${key}`);
 if(!Number.isInteger(s.year)||s.year<2000||s.year>2100) throw Error('Choose a year from 2000 to 2100.');
 // Local calendar year boundaries in Stockholm are both UTC+1.
 const start=Date.UTC(s.year-1,11,31,23), end=Date.UTC(s.year,11,31,23);
 const rows=[];
 for(let time=start;time<end;time+=HOUR){const p=localParts(time),h=+p.hour,m=+p.month,weekend=['Sat','Sun'].includes(p.weekday);
  const morning=Math.exp(-(((h-7)/2)**2)),evening=Math.exp(-(((h-19)/3)**2));
  rows.push({time:new Date(time).toISOString(),month:m,hour:h,base:s.baseWatts/1000,appliancesWeight:0.2+morning*(weekend?0.5:1)+evening,hotWaterWeight:0.15+morning+evening*0.6,heatingWeight:[1.7,1.5,1.2,0.7,0.3,0.08,0.03,0.05,0.3,0.8,1.2,1.6][m-1]*(1+0.08*Math.cos(h*Math.PI/12)),evWeight:h>=0&&h<6?1:0});
 }
 for(const [key,total] of [['appliances',s.appliances],['hotWater',s.hotWaterPerPerson*s.residents],['heating',s.heating],['ev',s.ev]]){const sum=rows.reduce((a,r)=>a+r[key+'Weight'],0);for(const r of rows){r[key]=total*r[key+'Weight']/sum;delete r[key+'Weight'];}}
 for(const r of rows) r.kwh=r.base+r.appliances+r.hotWater+r.heating+r.ev;
 return rows;
}
export function summarize(rows){const monthly=Array(12).fill(0),hourly=Array(24).fill(0),counts=Array(24).fill(0);let total=0,peak=0;for(const r of rows){const p=localParts(r.time);monthly[+p.month-1]+=r.kwh;hourly[+p.hour]+=r.kwh;counts[+p.hour]++;total+=r.kwh;peak=Math.max(peak,r.kwh);}return {total,peak,monthly,hourly:hourly.map((v,i)=>counts[i]?v/counts[i]:0),hours:rows.length};}
export function parseConsumption(text){
 const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(lines.length<2)throw Error('CSV needs a header and hourly readings.');
 const delimiter=lines[0].includes(';')?';':',';
 const split=line=>line.split(new RegExp(`${delimiter}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)`)).map(x=>x.trim().replace(/^"|"$/g,''));
 const headers=split(lines[0]).map(x=>x.toLowerCase());
 const ti=headers.findIndex(x=>['timestamp','time','tid','datetime'].includes(x));
 const ki=headers.findIndex(x=>['kwh','consumption_kwh','elanvändning (kwh)','förbrukning (kwh)'].includes(x));
 if(ti<0||ki<0)throw Error('Expected timestamp and consumption_kwh columns (also accepts Tid and Elanvändning (kWh)).');
 const seen=new Set();const rows=lines.slice(1).filter(x=>x.trim()).map((line,i)=>{const cells=split(line),raw=cells[ti]||'';if(!/(Z|[+-]\d\d:\d\d)$/i.test(raw))throw Error(`Row ${i+2}: timestamp needs Z or a UTC offset, e.g. +01:00. This avoids ambiguous daylight-saving hours.`);const time=Date.parse(raw),kwh=Number((cells[ki]||'').replace(',','.'));if(!Number.isFinite(time)||!cells[ki]||!Number.isFinite(kwh)||kwh<0)throw Error(`Row ${i+2}: invalid timestamp or consumption.`);if(time%HOUR!==0)throw Error(`Row ${i+2}: expected an hourly interval start.`);if(seen.has(time))throw Error(`Row ${i+2}: duplicate hour.`);seen.add(time);return {time:new Date(time).toISOString(),kwh};}).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
 if(!rows.length)throw Error('No readings found.');for(let i=1;i<rows.length;i++)if(Date.parse(rows[i].time)-Date.parse(rows[i-1].time)!==HOUR)throw Error('Missing hourly readings. Fill or resolve gaps before importing.');return rows;
}
export function toCsv(rows){return 'timestamp,consumption_kwh\n'+rows.map(r=>`${r.time},${r.kwh.toFixed(6)}`).join('\n')+'\n';}
