import {simulateHousehold} from './household.js?v=cash-no-wear';
import {simulateSolar} from './solar.js?v=nne-final';
import {simulateArbitrage} from './arbitrage.js?v=cash-no-wear';
import {makeSolarForecaster} from './forecasts.js?v=tree-shading';
self.onmessage=({data})=>{const {id,kind,project,proposal,archive}=data;try{const forecast=archive?makeSolarForecaster(project,proposal,archive):null;const result=kind==='solar'?simulateSolar(project,proposal):kind==='arbitrage'?simulateArbitrage(project,proposal,forecast):simulateHousehold(project,proposal,forecast);self.postMessage({id,result});}catch(error){self.postMessage({id,error:error.message});}};
