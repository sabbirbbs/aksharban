importScripts('core.40eb3e92e0ee.js');
onmessage=({data})=>{
 try{const {id,op,args}=data;if(!['open','search'].includes(op))throw Error('Unsupported operation');postMessage({id,result:BabelCore[op](...args)});}
 catch(error){postMessage({id:data.id,error:error.message});}
};
