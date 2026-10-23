export const SOLAR_INPUTS_VERSION='pvgis-inputs-v2';
export const solarInputLabels={'open-meteo':'Open-Meteo · current',sarah3:'PVGIS · SARAH3',era5:'PVGIS · ERA5'};
export function solarInputSource(project){return project.solarInputSource??'open-meteo';}
export function solarInputReader(project){
 const source=solarInputSource(project);
 if(!Object.hasOwn(solarInputLabels,source))throw Error('Unknown solar input source.');
 if(source==='open-meteo')return null;
 const data=project.solarInputData;
 if(!data)throw Error('Loading PVGIS solar inputs…');
 if(data.version!==1||!data.sources?.[source])throw Error('PVGIS solar inputs are unavailable.');
 if(Math.abs(project.house.latitude-data.location.latitude)>0.000001||Math.abs(project.house.longitude-data.location.longitude)>0.000001)throw Error('PVGIS inputs were fetched for the saved home location. Select Open-Meteo after changing location.');
 return (time,roof)=>{
  const original=data.roofs.find(r=>r.id===roof.id);
  if(!original)return null;
  if(original.tilt!==roof.tilt||original.azimuth!==roof.azimuth)throw Error(`PVGIS inputs for ${roof.name} need refreshing after changing roof geometry. Select Open-Meteo.`);
  const row=data.sources[source][roof.id]?.[time];
  if(!row)return null;
  if(!row.every(v=>Number.isFinite(v)&&v>=0))throw Error('Invalid PVGIS irradiance.');
  return {g:row[0],directFraction:row[0]>0?Math.min(1,row[1]/row[0]):0};
 };
}
export function solarInputCoverage(project,start,end){
 const read=solarInputReader(project);if(!read)return null;
 let total=0,alternative=0;
 for(const roof of project.house.roofs){if(!project.proposals.some(p=>(p.panels[project.house.roofs.indexOf(roof)]??0)>0))continue;
  for(let t=Date.parse(start);t<Date.parse(end);t+=3600000){total++;if(read(new Date(t).toISOString(),roof))alternative++;}
 }
 return {total,alternative,fallback:total-alternative};
}
