export function proposalKind(p){return p.kind==='proposal'||p.kind==='scenario'?p.kind:p.id?.startsWith('preset-')&&!p.id.includes('solar-only')?'proposal':'scenario';}
export const cleanProposalName=name=>(name||'Untitled proposal').replace(/\s*\(scenario\)/gi,'').trim();
export function proposalLabel(p){return `${proposalKind(p)} · ${cleanProposalName(p.name)}`;}
export function appendProposalName(element,name,kind){const tag=document.createElement('span');tag.className='proposal-kind-tag '+kind;tag.textContent=kind;element.append(tag,document.createTextNode(' '+cleanProposalName(name)));}
