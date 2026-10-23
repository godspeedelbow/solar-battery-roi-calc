import {localStamp} from './calendar.js';
export function selectedPeriod(route,saved,reference){return route.period||saved||reference;}
export function dateCrumbs(period,reference,label,monthLabel){if(period===reference)return [{label,period}];const year=period.slice(0,4);if(period.length===4)return [{label,period:reference},{label:year,period}];const crumbs=[{label:year,period:year},{label:monthLabel(period.slice(0,7)),period:period.slice(0,7)}];if(period.length===10)crumbs.push({label:String(Number(period.slice(8))),period});return crumbs;}
export function periodIncludes(time,period,reference){if(period===reference.key)return Date.parse(time)>=reference.start&&Date.parse(time)<reference.end;return localStamp(time).startsWith(period);}
