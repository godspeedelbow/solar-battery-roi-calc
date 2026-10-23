export function proposalKind(p){return p.kind==='proposal'||p.kind==='scenario'?p.kind:p.id?.startsWith('preset-')&&!p.id.includes('solar-only')?'proposal':'scenario';}
export const cleanProposalName=name=>(name||'Untitled proposal').replace(/\s*\(scenario\)/gi,'').trim();
export function proposalLabel(p){return `${proposalKind(p)} · ${cleanProposalName(p.name)}`;}
export function appendProposalName(element,name,kind){const tag=document.createElement('span');tag.className='proposal-kind-tag '+kind;tag.textContent=kind;element.append(tag,document.createTextNode(' '+cleanProposalName(name)));}
export function orderProposals(proposals){const priority=['preset-egna-2026-rev2-solar-only-8-wnw','preset-egna-2026-rev2-solar-only-20-panels'];const rank=p=>proposalKind(p)==='proposal'?0:priority.includes(p.id)?priority.indexOf(p.id)+1:3;return proposals.sort((a,b)=>rank(a)-rank(b));}
