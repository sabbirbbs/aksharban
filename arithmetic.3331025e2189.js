/* Frozen a1 integer-expression codec. Equations are data, never executable JS.
 * 0 literal, 1 add, 2 subtract, 3 multiply, 4 power, 5 repeat, 6 join.
 * Counts/lengths are canonical unsigned LEB128. Integers are big-endian.
 * repeat(B,k,m) = B * (150^(k*m)-1)/(150^k-1)
 * join(A,k,B) = A*150^k+B. All pages have exactly 3200 code points.
 */
(function(root){
'use strict';
const C=root.BabelCore||(typeof require==='function'?require('./core.js'):null);
const MAX_BITS=23134,MAX=(1n<<BigInt(MAX_BITS))-1n,MAX_BYTES=4096,MAX_NODES=192,MAX_DEPTH=18;
const powers=new Map([[0,1n]]),symbolIndex=new Map(C.ALPHABET.map((c,i)=>[c,i]));
function power150(k){if(!powers.has(k))powers.set(k,150n**BigInt(k));return powers.get(k);}
function fail(){throw Error('সমীকরণের শেয়ার লিংকটি সঠিক নয় অথবা সীমার বাইরে।');}
function bounded(n){if(n<0n||n>MAX)fail();return n;}
function pow(a,e){let n=1n;while(e){if(e%2)n=bounded(n*a);e=Math.floor(e/2);if(e)a=bounded(a*a);}return n;}
function varint(n){const b=[];do{b.push((n&127)|(n>=128?128:0));n=Math.floor(n/128);}while(n);return b;}
function integerBytes(n){if(n===0n)return [];let s=n.toString(16);if(s.length%2)s='0'+s;return s.match(/../g).map(h=>parseInt(h,16));}
function literal(n){const bytes=integerBytes(n);return {op:0,value:n,bytes,cost:1+varint(bytes.length).length+bytes.length,depth:1,nodes:1};}
function node(op,a,b,k,m){
 let value,extra=0;try{
  if(op===1)value=bounded(a.value+b.value);
  else if(op===2)value=bounded(a.value-b.value);
  else if(op===3)value=bounded(a.value*b.value);
  else if(op===4){value=pow(a.value,k);extra=varint(k).length;}
  else if(op===5){value=bounded(a.value*((power150(k*m)-1n)/(power150(k)-1n)));extra=varint(k).length+varint(m).length;}
  else if(op===6){value=bounded(a.value*power150(k)+b.value);extra=varint(k).length;}
 }catch{return null;}
 const depth=1+Math.max(a.depth,b?.depth||0),nodes=1+a.nodes+(b?.nodes||0);
 if(depth>MAX_DEPTH||nodes>MAX_NODES)return null;
 return {op,a,b,k,m,value,cost:1+a.cost+(b?.cost||0)+extra,depth,nodes};
}
function pack(tree){const out=[];function walk(t){out.push(t.op);if(t.op===0){out.push(...varint(t.bytes.length),...t.bytes);return;}if(t.op===5)out.push(...varint(t.k),...varint(t.m));if(t.op===6)out.push(...varint(t.k));walk(t.a);if(t.op===4)out.push(...varint(t.k));if(t.b)walk(t.b);}walk(tree);return out;}
function decode(bytes){
 if(!bytes||bytes.length<2||bytes.length>MAX_BYTES||Array.from(bytes).some(x=>!Number.isInteger(x)||x<0||x>255))fail();
 let pos=0,nodes=0;
 function byte(){if(pos>=bytes.length)fail();return bytes[pos++];}
 function uint(max){let n=0,scale=1,last;for(let i=0;i<3;i++){last=byte();n+=(last&127)*scale;if(n>max)fail();if(last<128){if(i&&last===0)fail();return n;}scale*=128;}fail();}
 function walk(depth){
  if(depth>MAX_DEPTH||++nodes>MAX_NODES)fail();const op=byte();let a,b,k,m;
  if(op===0){const len=uint(Math.ceil(MAX_BITS/8));if(pos+len>bytes.length||len&&bytes[pos]===0)fail();let n=0n;for(let i=0;i<len;i++)n=(n<<8n)|BigInt(byte());return bounded(n);}
  if(op>6)fail();
  if(op===5){k=uint(3200);m=uint(3200);if(k<1||m<2||k*m>3200)fail();}
  if(op===6){k=uint(3199);if(k<1)fail();}
  a=walk(depth+1);
  if(op===4){const e=uint(MAX_BITS);if(e<2)fail();return pow(a,e);}
  if(op===5){if(a>=power150(k))fail();return bounded(a*((power150(k*m)-1n)/(power150(k)-1n)));}
  b=walk(depth+1);
  if(op===1)return bounded(a+b);
  if(op===2)return bounded(a-b);
  if(op===3)return bounded(a*b);
  if(op===6){if(b>=power150(k))fail();return bounded(a*power150(k)+b);}
  fail();
 }
 const n=walk(1);if(pos!==bytes.length||n>=C.engine.M)fail();return n;
}
function describe(t){if(t.op===0)return t.value.toString().length>40?'['+t.value.toString().length+' digits]':t.value.toString();if(t.op===4)return '('+describe(t.a)+'^'+t.k+')';if(t.op===5)return 'repeat('+describe(t.a)+','+t.k+','+t.m+')';if(t.op===6)return '('+describe(t.a)+'*150^'+t.k+'+'+describe(t.b)+')';return '('+describe(t.a)+['','+','−','×'][t.op]+describe(t.b)+')';}
function take(best,candidate){return candidate&&candidate.value===best.value&&candidate.cost<best.cost?candidate:best;}
function rootFloor(n,e){if(n<2n)return n;let x=1n<<BigInt(Math.ceil(n.toString(2).length/e));for(let i=0;i<40;i++){const y=(BigInt(e-1)*x+n/(x**BigInt(e-1)))/BigInt(e);if(y>=x)return x;x=y;}return x;}
// The search is deliberately bounded and heuristic. Its result is not a proof of
// the shortest possible equation. Each yield is also a main-thread fallback slice.
function* numberTree(n,budget,depth=0){
 let best=literal(n);if(n<256n||depth>3||budget.numbers--<=0)return best;
 yield;
 const bits=n.toString(2).length,top=Number(n>>BigInt(Math.max(0,bits-52))),log=Math.log2(top)+Math.max(0,bits-52);
 const consider=function*(power){if(!power)return;const d=n-power.value;if(d===0n){best=take(best,power);return;}
  const absolute=d<0n?-d:d;
  // Only descend when the remainder is actually small, not a new full-size input.
  if(absolute.toString(2).length>bits*.6)return;
  const rem=yield* numberTree(absolute,budget,depth+1);best=take(best,d>0n?node(1,power,rem):node(2,power,rem));
 };
 for(const base of [2,3,5,10,150,256]){
  const e=Math.floor(log/Math.log2(base));
  for(const exponent of [e,e+1])if(exponent>=2&&exponent<=MAX_BITS)yield* consider(node(4,literal(BigInt(base)),null,exponent));
  yield;
 }
 if(depth===0){
  // Perfect/near powers with a large, non-special base (e.g. a 500-digit square).
  for(const e of [2,3,4,5,8,16]){
   const a=rootFloor(n,e);for(const base of [a,a+1n]){
    const candidate=node(4,literal(base),null,e);if(!candidate)continue;const d=n-candidate.value,abs=d<0n?-d:d;
    if(abs===0n||abs.toString(2).length<=Math.min(64,bits*.3)){
     const compactBase=yield* numberTree(base,budget,depth+1);yield* consider(node(4,compactBase,null,e));
    }
   }yield;
  }
 }
 if(depth<2)for(const factor of [2,3,5,7,10,11,13,17,31,150,256]){
  if(budget.numbers<=0)break;const f=BigInt(factor);if(n%f)continue;
  let q=n,e=0;while(e<32&&q%f===0n){q/=f;e++;}
  const rest=yield* numberTree(q,budget,depth+1),left=e===1?literal(f):node(4,literal(f),null,e);
  best=take(best,node(3,left,rest));yield;
 }
 return best;
}
function repeatPrefix(digits){const pi=new Uint16Array(digits.length);let chosen=null;for(let i=1;i<digits.length;i++){let j=pi[i-1];while(j&&digits[i]!==digits[j])j=pi[j-1];if(digits[i]===digits[j])j++;pi[i]=j;const len=i+1,k=len-j;if(j&&len%k===0&&len/k>=2&&(!chosen||len-k>chosen.len-chosen.k))chosen={len,k,m:len/k};}return chosen;}
function* textTree(digits,budget,depth=0){
 let n=0n;for(const d of digits)n=n*150n+BigInt(d);let best=literal(n);
 if(digits.length<8||depth>=10||budget.segments--<=0)return best;yield;
 const len=digits.length,prefix=repeatPrefix(digits),suffix=repeatPrefix([...digits].reverse());
 for(const [p,backward] of [[prefix,false],[suffix,true]]){
  if(!p||p.len-p.k<6)continue;const start=backward?len-p.len:0;
  const block=yield* textTree(digits.slice(start,start+p.k),budget,depth+1);
  let candidate=node(5,block,null,p.k,p.m);
  if(p.len<len){const rest=yield* textTree(backward?digits.slice(0,start):digits.slice(p.len),budget,depth+1);candidate=backward?node(6,rest,candidate,p.len):node(6,candidate,rest,len-p.len);}
  best=take(best,candidate);yield;
 }
 // Split around the longest run; supports text surrounded by padding and edits
 // inside otherwise repetitive pages. Balanced splits also find mixed blocks.
 let run=null;for(let i=0;i<len;){let j=i+1;while(j<len&&digits[j]===digits[i])j++;if(j-i>=8&&(!run||j-i>run.end-run.start))run={start:i,end:j};i=j;}
 const cuts=run&&run.end-run.start<len?[run.start,run.end].filter(x=>x>0&&x<len):depth<2&&len>=128?[Math.floor(len/2)]:[];
 if(cuts.length&&budget.segments>0){
  const boundaries=[0,...cuts,len],parts=[];for(let i=1;i<boundaries.length;i++)parts.push({tree:yield* textTree(digits.slice(boundaries[i-1],boundaries[i]),budget,depth+1),len:boundaries[i]-boundaries[i-1]});
  let combined=parts[0].tree;for(let i=1;i<parts.length&&combined;i++)combined=node(6,combined,parts[i].tree,parts[i].len);best=take(best,combined);
 }
 return best;
}
function* steps(raw,address){
 const chars=Array.from(C.validate(raw,'raw').text);if(chars.length!==3200)throw Error('পাতাটি অসম্পূর্ণ।');
 const digits=chars.map(c=>symbolIndex.get(c)),budget={numbers:28,segments:48};
 let tree=yield* textTree(digits,budget),target='t';const rank=tree.value;
 if(tree.cost>8)tree=take(tree,yield* numberTree(rank,budget));
 if(address!==undefined){const numeric=C.parseAddress(address),other=yield* numberTree(numeric,{numbers:20,segments:0});if(other.cost<tree.cost){tree=other;target='a';}}
 const bytes=pack(tree),expected=target==='t'?rank:C.parseAddress(address);
 if(bytes.length>MAX_BYTES||decode(bytes)!==expected)throw Error('সমীকরণ থেকে একই পাতা ফেরানো যায়নি।');
 return {bytes,target,equation:describe(tree)};
}
function optimize(raw,address){const it=steps(raw,address);let next;do{next=it.next();}while(!next.done);return next.value;}
async function optimizeAsync(raw,address){const it=steps(raw,address),clock=()=>root.performance?.now?.()??Date.now();for(;;){const start=clock();let count=0;do{const next=it.next();if(next.done)return next.value;count++;}while(count<8&&clock()-start<4);await new Promise(resolve=>setTimeout(resolve,0));}}
const api={decode,optimize,optimizeAsync,steps,limits:Object.freeze({bits:MAX_BITS,bytes:MAX_BYTES,nodes:MAX_NODES,depth:MAX_DEPTH})};
root.ArithmeticLinks=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
