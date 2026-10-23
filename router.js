const referenceYear=value=>/^\d{4}-\d{4}$/.test(value)&&Number(value.slice(5))===Number(value.slice(0,4))+1;
export function validPeriod(value){if(/^\d{4}$/.test(value))return true;if(/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const t=Date.parse(value+'T00:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===value;}
const sections = new Set(['compare', 'house', 'data', 'strategy', 'roi', 'maximum']);
export function parseRoute(hash) {
 try {
  const parts = hash.replace(/^#\/?/, '').split('/');
  if(['strategy','maximum'].includes(parts[0])&&parts.length===2&&(validPeriod(parts[1])||referenceYear(parts[1])))return {page:parts[0],period:parts[1]};
  if (parts.length === 1 && sections.has(parts[0])) return {page:parts[0]};
  if (parts[0] === 'proposals' && parts[1] && parts.length <= 3 && (!parts[2] || ['monthly','hourly'].includes(parts[2]))) {
   return {page:'detail', proposalId:decodeURIComponent(parts[1]), granularity:parts[2] || 'monthly'};
  }
 } catch { /* Invalid percent escapes are an invalid route. */ }
 return {page:'compare'};
}
export function routeHash(route) {
 if(['strategy','maximum'].includes(route.page)&&route.period&&(validPeriod(route.period)||referenceYear(route.period)))return '#/'+route.page+'/'+route.period;
 if (route.page === 'detail' && route.proposalId) return `#/proposals/${encodeURIComponent(route.proposalId)}/${route.granularity === 'hourly' ? 'hourly' : 'monthly'}`;
 return `#/${sections.has(route.page) ? route.page : 'compare'}`;
}
