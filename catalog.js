import {ensureShading} from './shading.js?v=northern-trees';
// Source catalog -> editable scenarios. Unknowns remain unknown.
export function scenarioFromCatalog(record) {
 return {
  id:`preset-${record.id}`,sourcePresetId:record.id,name:record.name,catalogRevision:record.catalog_revision??1,supplier:structuredClone(record.supplier??null),
  cost:record.price.total_after_deduction_sek,panelCount:record.solar.panel_count,
  panelWatts:record.solar.panel_watts,panels:record.solar.roof_allocations.map(r=>r.panel_count),
  inverterKw:record.inverter.ac_kw,batteryKwh:record.battery.usable_capacity_kwh,
  reportedBatteryKwh:record.battery.reported_capacity_kwh,
  chargeKw:record.battery.max_charge_kw,dischargeKw:record.battery.max_discharge_kw,
  roundTripEfficiency:record.battery.round_trip_efficiency_pct,
  reservePercent:record.battery.minimum_reserve_pct,
  batteryModel:record.battery.manufacturer_model??'',batteryType:record.battery.chemistry??'',inverterModel:record.inverter.manufacturer_model??'',
  monthlyFee:record.price.monthly_software_or_energy_fee_sek,
  notes:record.notes.join('\n'),
  catalogEvidence:structuredClone({priceNote:record.price.projection_note??null,installerClaims:record.status==='scenario'?null:record.installer_claims??null,sourceIds:record.source_ids,provenance:record.provenance,conflicts:record.conflicts,missingInputs:record.missing_inputs,originalQuoteAccess:record.original_quote_access??null,priceEligibilityVerified:record.price.deduction_eligibility_verified,priceDeductionBasisVerified:record.price.deduction_basis_verified??false,batteryModuleMatch:record.battery.module_match_status??null,batteryModuleMatchConfirmed:record.battery.module_match_confirmed??null,batteryPowerBasis:record.battery.power_rating_basis??null,batteryChemistry:record.battery.chemistry??null,batteryTechnologyFamily:record.battery.technology_family??null,batteryChemistryStatus:record.battery.chemistry_status??null,layoutImage:record.solar.layout_image??null,manufacturerResearch:record.manufacturer_research??null,quotedBatteryModel:record.battery.manufacturer_model??null,quotedInverterModel:record.inverter.manufacturer_model??null,allocationStatus:record.solar.allocation_status??null})
 };
}
export function mergeCatalog(project,catalog){
 const next=structuredClone(project);
 if(catalog.proposals.some(r=>r.solar.roof_allocations.length===3)&&next.house.roofs.length===2){const opposite=next.house.roofs[0];next.house.roofs.push({id:'roof-3',name:'NNE roof',area:opposite.area,tilt:opposite.tilt??15,azimuth:opposite.azimuth==null?19:(opposite.azimuth+180)%360,tiltSource:'Same pitch as SSW roof, user specified',orientationSource:'Opposite SSW roof, user specified'});}
 const retired=new Set(catalog.removed_proposal_ids??[]);const before=next.proposals.length;next.proposals=next.proposals.filter(p=>!retired.has(p.sourcePresetId)&&!retired.has(p.id.replace(/^preset-/,'')));const removed=before-next.proposals.length;
 const seen=new Set(next.importedCatalogIds??next.proposals.map(p=>p.sourcePresetId).filter(Boolean));
 let added=0,updated=0;
 for(const record of catalog.proposals){
  if(record.status==='superseded')continue;
  const fresh=scenarioFromCatalog(record);
  const existing=next.proposals.find(p=>p.id===fresh.id&&p.sourcePresetId===record.id);
  if(existing&&(existing.catalogRevision??1)<fresh.catalogRevision){
   const previousRecord=catalog.migration_baselines?.find(p=>p.id===record.id&&(p.catalog_revision??1)===(existing.catalogRevision??1))??catalog.previous_presets?.find(p=>p.id===record.id&&(p.catalog_revision??1)===(existing.catalogRevision??1));
   if(previousRecord){
    const baseline=scenarioFromCatalog(previousRecord);
    // Three-way merge: upgrade untouched source fields, never overwrite user overrides.
    for(const key of ['name','cost','panelCount','panelWatts','panels','inverterKw','batteryKwh','reportedBatteryKwh','chargeKw','dischargeKw','roundTripEfficiency','reservePercent','monthlyFee','notes','batteryModel','batteryType','inverterModel']){
     if(existing[key]===undefined||JSON.stringify(existing[key])===JSON.stringify(baseline[key]))existing[key]=structuredClone(fresh[key]);
    }
    existing.catalogEvidence=fresh.catalogEvidence;existing.catalogRevision=fresh.catalogRevision;existing.supplier=fresh.supplier;updated++;
   }
  }
  if(existing&&JSON.stringify(existing.catalogEvidence?.installerClaims)!==JSON.stringify(fresh.catalogEvidence.installerClaims)){existing.catalogEvidence??={};existing.catalogEvidence.installerClaims=structuredClone(fresh.catalogEvidence.installerClaims);updated++;}
  if(seen.has(record.id))continue;
  if(!existing){next.proposals.push(fresh);added++;}
  seen.add(record.id);
 }
 for(const p of next.proposals)while(p.panels.length<next.house.roofs.length)p.panels.push(0);next.importedCatalogIds=[...seen];
 return {project:next,added,updated,removed};
}
export function panelSummary(proposal){
 const assigned=proposal.panels.every(n=>Number.isInteger(n));
 const allocated=proposal.panels.reduce((sum,n)=>sum+(n??0),0);
 const count=assigned?allocated:(proposal.panelCount??null);
 return {count,assigned,allocated,kwp:count!==null&&proposal.panelWatts!==null?count*proposal.panelWatts/1000:null,mismatch:assigned&&proposal.panelCount!=null&&allocated!==proposal.panelCount};
}

export function mergeHouseReference(project,reference){
 const next=structuredClone(project);let changed=ensureShading(next.house);
 for(const ref of reference.roofs){if(!next.house.roofs.some(r=>r.id===ref.id)){next.house.roofs.push({id:ref.id,name:ref.name,area:ref.usable_area_m2??null,tilt:ref.tilt_degrees,azimuth:ref.measured_bearing_degrees,tiltSource:ref.tilt_source,orientationSource:'Opposite SSW roof; bearing derived from user specification',grossDimensionsM:ref.gross_surface_dimensions_m??null});changed=true;}}
 for(const ref of reference.roofs){const roof=next.house.roofs.find(r=>r.id===ref.id);if(roof&&!roof.grossDimensionsM&&ref.gross_surface_dimensions_m){roof.grossDimensionsM=ref.gross_surface_dimensions_m;roof.grossAreaM2=ref.gross_area_m2??ref.gross_surface_area_m2??null;changed=true;}}
 for(const p of next.proposals)while(p.panels.length<next.house.roofs.length)p.panels.push(0);

 if(reference.location&&!next.house.locationReferenceImported){for(const key of ['latitude','longitude'])if(next.house[key]===null){next.house[key]=reference.location[key];changed=true;}next.house.locationReferenceImported=true;changed=true;}
 for(const ref of reference.roofs){const roof=next.house.roofs.find(r=>r.id===ref.id);if(roof&&ref.tilt_degrees!==null&&!roof.tiltReferenceImported){if(roof.tilt===null){roof.tilt=ref.tilt_degrees;roof.tiltSource=ref.tilt_source;changed=true;}roof.tiltReferenceImported=true;changed=true;}}
 const revision=reference.orientation_revision??1;
 if((next.house.orientationReferenceRevision??(next.house.orientationReferenceImported?1:0))>=revision)return {project:next,changed};
 for(const ref of reference.roofs){const roof=next.house.roofs.find(r=>r.id===ref.id);if(!roof)continue;
  const measured=ref.measured_bearing_degrees!=null;
  const azimuth=measured?ref.measured_bearing_degrees:ref.approximate_bearing_degrees;
  const replaceEstimate=next.house.orientationReferenceImported&&roof.azimuth===ref.approximate_bearing_degrees&&roof.orientationSource==='User compass direction (approximate, not measured)';
  if((!next.house.orientationReferenceImported&&roof.azimuth===null)||replaceEstimate){roof.azimuth=azimuth;roof.orientationSource=measured?`User phone compass: ${ref.measured_bearing_degrees}° from north; north-reference setting unverified.`:'User compass direction (approximate, not measured)';changed=true;}
  if(roof.name==='Roof 1'||roof.name==='Roof 2 · west'){roof.name=ref.name;changed=true;}
 }
 next.house.orientationReferenceImported=true;next.house.orientationReferenceRevision=revision;return {project:next,changed:true};
}
