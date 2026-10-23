import {historicalInput,historicalController} from './historical.js?v=cash-no-wear';
import loadHighs from './vendor/highs/build/highs.mjs';
import {solvePerfect} from './perfect.js?v=cash-no-wear';
const ready=loadHighs();let queue=Promise.resolve();self.onmessage=({data})=>{queue=queue.then(async()=>{try{const highs=await ready,input=data.dataset?historicalInput(data.project,data.proposal,data.dataset):data.input,controller=data.dataset?historicalController(input,data.project,data.proposal):null,perfect=await solvePerfect(highs,input,data.settings,data.inverterKw,data.options),result=data.dataset?{controller,perfect}:perfect;self.postMessage({id:data.id,result});}catch(e){self.postMessage({id:data.id,error:e.message});}});};
