// One cache entry per input signature. Disk reads and computations are deduplicated.
export function createCalculationCache({load,store,compute,onReady=()=>{},onError=()=>{},limit=64}){
 const ready=new Map(),pending=new Map(),failures=new Map(),sources=new WeakMap();
 const remember=(key,value)=>{ready.delete(key);ready.set(key,value);while(ready.size>limit)ready.delete(ready.keys().next().value);};
 async function ensure(key,input){if(ready.has(key))return ready.get(key);if(pending.has(key))return pending.get(key).promise;
 const state={phase:'cache',promise:null};pending.set(key,state);
 state.promise=(async()=>{let value;try{value=await load(key);}catch{/* Recompute if local storage is unavailable. */}const restored=value!=null;if(!restored){state.phase='compute';value=await compute(input);try{await store(key,value);}catch(error){onError(error);}}if(value&&typeof value==='object')sources.set(value,restored?'saved':'calculated');remember(key,value);failures.delete(key);pending.delete(key);onReady({key,restored});return value;})().catch(error=>{pending.delete(key);failures.set(key,error);onReady({key,error});throw error;});return state.promise;}
 return {ensure,source:value=>sources.get(value),get(key,input){if(ready.has(key)){const value=ready.get(key);remember(key,value);return value;}if(failures.has(key))throw failures.get(key);if(!pending.has(key))ensure(key,input).catch(()=>{});throw Error(pending.get(key)?.phase==='compute'?'Calculating in the background…':'Loading saved calculation…');},status:key=>ready.has(key)?'ready':pending.get(key)?.phase??'empty'};
}
