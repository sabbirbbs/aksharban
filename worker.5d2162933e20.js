importScripts('core.40eb3e92e0ee.js');
importScripts('arithmetic.3331025e2189.js');
importScripts('sharing.6cb4ae51ecd4.js');
onmessage=({data})=>{
 try{const {id,op,args}=data;if(!['open','search','share'].includes(op))throw Error('Unsupported operation');postMessage({id,result:op==='share'?ShareLinks.best(...args):BabelCore[op](...args)});}
 catch(error){postMessage({id:data.id,error:error.message});}
};
