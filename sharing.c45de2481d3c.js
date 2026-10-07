/* Self-contained links. Frozen v1 recipes; no server lookup or local-storage dependency. */
(function(root){
'use strict';
const C=root.BabelCore||(typeof require==='function'?require('./core.js'):null),B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',symbols=new Map(C.ALPHABET.map((c,i)=>[c,i]));
function encode(bytes){let out='',bits=0,value=0;for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=6){bits-=6;out+=B64[(value>>>bits)&63];}}if(bits)out+=B64[(value<<(6-bits))&63];return out;}
function decode(s){if(!s||s.length>15000||!/^[A-Za-z0-9_-]+$/.test(s)||s.length%4===1)throw Error('শেয়ার লিংকটি অসম্পূর্ণ।');let bits=0,value=0,out=[];for(const ch of s){value=(value<<6)|B64.indexOf(ch);bits+=6;if(bits>=8){bits-=8;out.push((value>>>bits)&255);}}if(encode(out)!==s)throw Error('শেয়ার লিংকটি সঠিক নয়।');return out;}
function checked(body){return body+'.'+C.hash('share/v1/'+body).toString(36);}
function unpack(token){if(typeof token!=='string'||token.length>16000)throw Error('শেয়ার লিংকটি অতিরিক্ত বড়।');const i=token.lastIndexOf('.'),body=token.slice(0,i);if(i<0||checked(body)!==token)throw Error('শেয়ার লিংকটি কেটে গেছে অথবা বদলে গেছে।');return body.split('.');}
function textBytes(text){return Array.from(C.validate(text,'raw').text,c=>symbols.get(c));}
function bytesText(bytes){if(bytes.some(b=>b>=C.ALPHABET.length))throw Error('শেয়ার লিংকের অক্ষর সঠিক নয়।');return bytes.map(b=>C.ALPHABET[b]).join('');}
function hi(h){return h&&Number.isInteger(h.start)&&Number.isInteger(h.length)&&h.start>=0&&h.length>0&&h.start+h.length<=3200?{start:h.start,length:h.length}:null;}
function decorate(hash,h){h=hi(h);return hash+(h?'&s='+h.start+'&n='+h.length:'');}
function compact(address,h){const x=C.parseAddress(address);let hex=x.toString(16);if(hex.length%2)hex='0'+hex;const bytes=hex.match(/../g).map(b=>parseInt(b,16));return decorate('#p='+checked('1.'+encode(bytes)),h);}
function searchSource(text,mode='nfc',surround='blank',variant=0){if(!['nfc','raw'].includes(mode)||!['blank','chaos','words'].includes(surround)||!Number.isSafeInteger(variant)||variant<0)throw Error('শেয়ার সূত্রটি সঠিক নয়।');return {kind:'search',text:C.validate(text,mode).text,mode,surround,variant};}
function searchToken(s){s=searchSource(s.text,s.mode,s.surround,s.variant);return '#r='+checked('s1.'+(s.mode==='raw'?'r':'n')+({blank:'b',chaos:'c',words:'w'}[s.surround])+'.'+s.variant.toString(36)+'.'+encode(textBytes(s.text)));}
function seedAddress(seed){if(!/^[0-9a-f]{32}$/.test(seed))throw Error('পাতার বীজ সঠিক নয়।');const next=C.random('share-page/v1/'+seed),bits=C.engine.M.toString(2).length,count=Math.ceil(bits/32);let n;do{let hex='';for(let i=0;i<count;i++)hex+=next().toString(16).padStart(8,'0');n=BigInt('0x'+hex)&((1n<<BigInt(bits))-1n);}while(n>=C.engine.M);return C.formatAddress(n);}
function randomSource(){const bytes=new Uint8Array(16);if(!root.crypto?.getRandomValues)throw Error('এই ব্রাউজারে random generator পাওয়া যায়নি।');root.crypto.getRandomValues(bytes);return {kind:'seed',seed:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')};}
function seedToken(s){seedAddress(s.seed);return '#r='+checked('g1.'+encode(s.seed.match(/../g).map(b=>parseInt(b,16))));}
function literal(raw,h){const bytes=textBytes(raw);if(bytes.length!==3200)throw Error('পাতাটি অসম্পূর্ণ।');const packed=[];for(let i=0;i<bytes.length;){let end=i+1;while(end<bytes.length&&bytes[end]===bytes[i])end++;const count=end-i;if(count>=4)packed.push(150,count>>8,count&255,bytes[i]);else for(let j=i;j<end;j++)packed.push(bytes[i]);i=end;}return decorate('#r='+checked('t1.'+encode(packed)),h);}
function parse(params){
 const h=hi({start:Number(params.get('s')),length:Number(params.get('n'))});
 if(params.has('p')){const p=unpack(params.get('p'));if(p.length!==2||p[0]!=='1')throw Error('এই শেয়ার লিংকের সংস্করণ সমর্থিত নয়।');const bytes=decode(p[1]);if(bytes.length>3000||(bytes.length>1&&bytes[0]===0))throw Error('পাতার ঠিকানা সঠিক নয়।');const n=BigInt('0x'+bytes.map(b=>b.toString(16).padStart(2,'0')).join(''));return {kind:'page',address:C.formatAddress(n),highlight:h};}
 const p=unpack(params.get('r'));
 if(p[0]==='g1'&&p.length===2){const bytes=decode(p[1]);if(bytes.length!==16)throw Error('পাতার বীজ অসম্পূর্ণ।');const source={kind:'seed',seed:bytes.map(b=>b.toString(16).padStart(2,'0')).join('')};return {kind:'page',address:seedAddress(source.seed),highlight:h,source};}
 if(p[0]==='s1'&&p.length===4){if(!/^[nr][bcw]$/.test(p[1])||!/^(0|[1-9a-z][0-9a-z]{0,10})$/.test(p[2]))throw Error('খোঁজার শেয়ার সূত্র সঠিক নয়।');const source=searchSource(bytesText(decode(p[3])),p[1][0]==='r'?'raw':'nfc',({b:'blank',c:'chaos',w:'words'}[p[1][1]]),parseInt(p[2],36));return {kind:'recipe',args:[source.text,source.mode,source.surround,source.variant],source,autoHighlight:true};}
 if(p[0]==='t1'&&p.length===2){const bytes=decode(p[1]),out=[];for(let i=0;i<bytes.length;){const symbol=bytes[i++];if(symbol===150){if(i+2>=bytes.length)throw Error('পাতার লেখা অসম্পূর্ণ।');const count=(bytes[i++]<<8)|bytes[i++],value=bytes[i++];if(count<4||value>=150||out.length+count>3200)throw Error('পাতার লেখা সঠিক নয়।');for(let j=0;j<count;j++)out.push(value);}else{if(symbol>=150||out.length>=3200)throw Error('পাতার লেখা সঠিক নয়।');out.push(symbol);}}if(out.length!==3200)throw Error('পাতার লেখা অসম্পূর্ণ।');return {kind:'recipe',args:[bytesText(out),'raw','blank',0],highlight:h,autoHighlight:false};}
 throw Error('এই শেয়ার লিংকের সংস্করণ সমর্থিত নয়।');
}
function best(result,h,source){
 const candidates=[{hash:decorate('#a='+result.address,h),kind:'address'},{hash:compact(result.address,h),kind:'compact'},{hash:literal(result.raw,h),kind:'literal'}];
 // Imported metadata is untrusted: only use a recipe that recreates THIS exact address and highlight.
 try{if(source?.kind==='seed'&&seedAddress(source.seed)===result.address)candidates.push({hash:decorate(seedToken(source),h),kind:'seed'});
 if(source?.kind==='search'){const s=searchSource(source.text,source.mode,source.surround,source.variant),r=C.search(s.text,s.mode,s.surround,s.variant);if(r.address===result.address&&h&&h.start===r.offset&&h.length===r.count)candidates.push({hash:searchToken(s),kind:'search'});}}catch{/* Fall back to the exact content/address. */}
 return candidates.sort((a,b)=>a.hash.length-b.hash.length)[0];
}
const api={best,parse,compact,literal,searchSource,searchToken,randomSource,seedAddress,seedToken};root.ShareLinks=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
