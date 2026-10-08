/* Aksharban core v1. Public deterministic permutation, NOT encryption. */
(function initBabelCore(root) {
  'use strict';
  const RANGES = [[0x980,0x983],[0x985,0x98c],[0x98f,0x990],[0x993,0x9a8],[0x9aa,0x9b0],[0x9b2,0x9b2],[0x9b6,0x9b9],[0x9bc,0x9c4],[0x9c7,0x9c8],[0x9cb,0x9ce],[0x9d7,0x9d7],[0x9dc,0x9dd],[0x9df,0x9e3],[0x9e6,0x9fe]];
  const bengali = RANGES.flatMap(([a,b]) => Array.from({length:b-a+1},(_,i)=>String.fromCodePoint(a+i)));
  const extras = ' \n\t\u00a0।॥\u200c\u200d.,!?;:\'"-_/\\()[]{}@#%&*+=<>|~`^$“”‘’…–—•±×÷−°§';
  const ALPHABET = Object.freeze([...new Set([...bengali,...extras])]);
  function hash(text, seed=2166136261) {
    let h=seed>>>0;
    for (let i=0;i<text.length;i++) h=Math.imul(h^text.charCodeAt(i),16777619)>>>0;
    h^=h>>>16; h=Math.imul(h,0x85ebca6b); h^=h>>>13; h=Math.imul(h,0xc2b2ae35); return (h^(h>>>16))>>>0;
  }
  function random(seed) {
    let a=hash(seed,2166136261), b=hash(seed,2246822519), c=hash(seed,3266489917), d=hash(seed,668265263);
    return ()=>{ a>>>=0;b>>>=0;c>>>=0;d>>>=0;let t=(a+b)|0;a=b^(b>>>9);b=(c+(c<<3))|0;c=(c<<21)|(c>>>11);d=(d+1)|0;t=(t+d)|0;c=(c+t)|0;return t>>>0; };
  }
  function createEngine(alphabet=ALPHABET,length=3200) {
    if(length<2||length%2||new Set(alphabet).size!==alphabet.length)throw Error('Invalid universe');
    const N=BigInt(alphabet.length), H=N**BigInt(length/2), M=H*H;
    const WORDS=Math.ceil(H.toString(2).length/32), index=new Map(alphabet.map((c,i)=>[c,BigInt(i)]));
    function rank(text){ const chars=Array.from(text); if(chars.length!==length)throw Error(`Expected ${length} code points`); let x=0n; for(const ch of chars){const d=index.get(ch);if(d===undefined)throw Error('Unsupported character');x=x*N+d;}return x; }
    function unrank(x){ if(x<0n||x>=M)throw Error('Out of range');const chars=new Array(length);for(let i=length-1;i>=0;i--){chars[i]=alphabet[Number(x%N)];x/=N;}return chars.join(''); }
    function F(r,round){ const next=random('aksharban/feistel/v1/'+round+'/'+r.toString(16));let hex='';for(let i=0;i<WORDS;i++)hex+=next().toString(16).padStart(8,'0');return BigInt('0x'+hex)%H; }
    function permute(x,inverse=false){ if(x<0n||x>=M)throw Error('Out of range');let l=x/H,r=x%H;if(!inverse){for(let i=0;i<8;i++) [l,r]=[r,(l+F(r,i))%H];}else{for(let i=7;i>=0;i--) [l,r]=[(r-F(l,i)+H)%H,l];}return l*H+r; }
    function encode(text){return permute(rank(text),true);}
    function decode(address){return unrank(permute(address));}
    return {N,H,M,length,alphabet,rank,unrank,permute,encode,decode};
  }
  const engine=createEngine();
  const MAX_ADDRESS_DIGITS=engine.M.toString(36).length;
  function formatAddress(x){if(x<0n||x>=engine.M)throw Error('Address out of range');const body=x.toString(36);return 'ab1.'+body+'.'+hash(body).toString(36);}
  function parseAddress(value){
    let s=value.trim(); if(s.includes('#'))s=s.slice(s.indexOf('#')+1);
    if(s.startsWith('a='))s=new URLSearchParams(s).get('a')||'';
    if(s.length>MAX_ADDRESS_DIGITS+20)throw Error('ঠিকানাটি অতিরিক্ত বড়।');
    const parts=/^ab1\.(0|[1-9a-z][0-9a-z]*)\.([0-9a-z]+)$/.exec(s);
    if(!parts||hash(parts[1]).toString(36)!==parts[2])throw Error('ঠিকানাটি সঠিক নয়, অথবা কপি করার সময় কেটে গেছে।');
    let x=0n;for(const d of parts[1])x=x*36n+BigInt(parseInt(d,36));
    if(x>=engine.M)throw Error('এই ঠিকানা বাগানের সীমানার বাইরে।');return x;
  }
  function validate(text,mode='nfc'){
    const normalized=mode==='nfc'?text.replace(/\r\n?/g,'\n').normalize('NFC'):text;
    const chars=Array.from(normalized), allowed=new Set(ALPHABET);
    if(chars.length===0)throw Error('খোঁজার জন্য কিছু বাংলা লেখা দাও।');
    if(chars.length>3200)throw Error('এক পাতায় সর্বোচ্চ ৩,২০০ code point রাখা যায়।');
    const bad=[...new Set(chars.filter(c=>!allowed.has(c)))];
    if(bad.length)throw Error('এই বাগানে নেই: '+bad.slice(0,5).map(c=>c+' (U+'+c.codePointAt(0).toString(16).toUpperCase()+')').join(', ')+'। বাংলা অক্ষর ও প্রচলিত চিহ্ন ব্যবহার করো।');
    return {text:normalized,changed:normalized!==text,count:chars.length};
  }
  // A small authored word list: reading aid, not a dictionary or language validator.
  const WORDS=Object.freeze('আকাশ বাতাস নদী জল মাটি আলো ছায়া পাতা গাছ ডাল শাখা বন বাগান ফুল ফল বৃষ্টি মেঘ রোদ চাঁদ সূর্য তারা রাত দিন সকাল দুপুর সন্ধ্যা ঘর পথ মানুষ শিশু বন্ধু মা বাবা নাম কথা ভাষা বাংলা অক্ষর শব্দ বই গল্প কবিতা গান সুর স্বপ্ন স্মৃতি সময় মন ভালো ভালোবাসা হাসি চোখ হাত পাখি মাছ সাগর পাহাড় মাঠ সবুজ নীল লাল সাদা কালো হলুদ নতুন পুরোনো কাছে দূরে এখানে সেখানে আমি তুমি আমরা আমাদের তোমার আমার তার সে এই সেই একটি এক দুই তিন চার পাঁচ আজ কাল আবার ধীরে চলা দেখা পড়া লেখা খোঁজা পাওয়া থাকা যাওয়া ফিরে শুরু শেষ সঙ্গে মাঝে পরে আগে থেকে দিয়ে জন্য এবং কিন্তু যদি যখন তখন'.split(' '));
  function search(text,mode='nfc',surround='blank',variant=0){
    if(!['blank','chaos','words'].includes(surround))throw Error('Unknown surrounding text mode');
    if(!Number.isSafeInteger(variant)||variant<0)throw Error('Invalid search variation');
    const input=validate(text,mode), q=Array.from(input.text), next=random('search/v1/'+mode+'/'+surround+'/'+input.text+(variant?'/'+variant:''));
    const page=Array(3200).fill(' ');
    if(surround==='chaos')for(let i=0;i<3200;i++)page[i]=ALPHABET[next()%ALPHABET.length];
    if(surround==='words'){
      let i=0;while(i<3200){const word=WORDS[next()%WORDS.length]+(next()%14===0?'।\n':' ');for(const c of word){if(i>=3200)break;page[i++]=c;}}
    }
    const offset=surround==='blank'&&variant===0?0:next()%(3200-q.length+1);
    page.splice(offset,q.length,...q);
    const raw=page.join(''),address=engine.encode(raw);
    return {address:formatAddress(address),raw,query:input.text,offset,count:input.count,changed:input.changed,location:location(address)};
  }
  function open(address){const x=parseAddress(address);return {address:formatAddress(x),raw:engine.decode(x),location:location(x)};}
  // Layout 2: one visual leaf is exactly one content page. The ab1 permutation is unchanged.
  const SLOTS=4n*5n*32n, TREES=(engine.M+SLOTS-1n)/SLOTS;
  function location(x){if(typeof x!=='bigint'||x<0n||x>=engine.M)throw Error('Invalid address');let v=x;const leaf=Number(v%32n)+1;v/=32n;const branch=Number(v%5n)+1;v/=5n;const bough=Number(v%4n)+1;v/=4n;return {tree:v.toString(36),bough,branch,leaf};}
  function at(tree,bough=1,branch=1,leaf=1){
    if(arguments.length>4)throw Error('একটি পাতাই একটি পৃষ্ঠা; আলাদা পৃষ্ঠা নম্বর নেই।');
    for(const [x,max] of [[bough,4],[branch,5],[leaf,32]])if(!Number.isInteger(x)||x<1||x>max)throw Error('পাতার অবস্থান সঠিক নয়।');
    const t=typeof tree==='bigint'?tree:fromBase36(tree);
    if(t<0n||t>=TREES)throw Error('গাছের ঠিকানা সঠিক নয়।');
    const x=t*SLOTS+BigInt(((bough-1)*5+branch-1)*32+leaf-1);
    if(x>=engine.M)throw Error('শেষ গাছের এই পাতাটি এই জগতে নেই।');return formatAddress(x);
  }
  function branchRange(address){const x=parseAddress(address),start=x-x%32n;return {start,count:Number(engine.M-start<32n?engine.M-start:32n)};}
  function fromBase36(s){if(!/^[0-9a-z]+$/.test(s)||s.length>MAX_ADDRESS_DIGITS)throw Error('Invalid number');let n=0n;for(const c of s)n=n*36n+BigInt(parseInt(c,36));return n;}
  function randomAddress(){
    const bits=engine.M.toString(2).length,bytes=new Uint8Array(Math.ceil(bits/8));let x;
    if(!root.crypto?.getRandomValues)throw Error('এই ব্রাউজারে random generator পাওয়া যায়নি।');
    do{root.crypto.getRandomValues(bytes);bytes[0]&=(1<<(bits%8||8))-1;x=BigInt('0x'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''));}while(x>=engine.M);
    return formatAddress(x);
  }
  function neighbor(address,delta){const x=parseAddress(address);return formatAddress((x+BigInt(delta)+engine.M)%engine.M);}
  function sqrt(n){if(n<0n)throw Error('negative');if(n<2n)return n;let x=1n<<BigInt(Math.ceil(n.toString(2).length/2));let y=(x+n/x)>>1n;while(y<x){x=y;y=(x+n/x)>>1n;}return x;}
  const zig=n=>n>=0n?2n*n:-2n*n-1n, unzig=n=>n%2n===0n?n/2n:-(n+1n)/2n;
  function pair(x,z){x=BigInt(x);z=BigInt(z);const a=zig(x),b=zig(z),s=a+b;return s*(s+1n)/2n+b;}
  function unpair(n){const w=(sqrt(8n*n+1n)-1n)/2n,t=w*(w+1n)/2n,b=n-t;return [unzig(w-b),unzig(b)];}
  const api={ALPHABET,WORDS,engine,createEngine,hash,random,validate,search,open,formatAddress,parseAddress,randomAddress,neighbor,location,at,branchRange,fromBase36,pair,unpair,TREES,SLOTS};
  root.BabelCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
