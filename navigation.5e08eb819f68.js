/* URL and drill-down state. No network or persistent database required. */
(function(root){
'use strict';
const C=root.BabelCore||(typeof require==='function'?require('./core.js'):null);
const levels=['forest','tree','bough','branch','leaf'];
function validate(s){
 const level=s.level||'forest';if(!levels.includes(level))throw Error('এই দৃশ্যটি সঠিক নয়।');
 const tree=String(s.tree??'0');if(C.fromBase36(tree)>=C.TREES)throw Error('গাছের ঠিকানা সঠিক নয়।');
 const out={level,tree};for(const [key,max] of [['bough',4],['branch',5],['leaf',32]]){const n=Number(s[key]??1);if(!Number.isInteger(n)||n<1||n>max)throw Error('ডাল বা পাতার নম্বর সঠিক নয়।');out[key]=n;}if(level!=='forest'){C.at(tree,level==='tree'?1:out.bough,['tree','bough'].includes(level)?1:out.branch,level==='leaf'?out.leaf:1);}
 if(s.x!=null||s.z!=null){
  const x=String(s.x),z=String(s.z);if(!/^-?\d+$/.test(x)||!/^-?\d+$/.test(z))throw Error('বাগানের স্থানাঙ্ক সঠিক নয়।');
  if(C.pair(BigInt(x),BigInt(z))%C.TREES!==C.fromBase36(tree))throw Error('গাছ ও স্থানাঙ্ক মিলছে না।');
  out.x=BigInt(x).toString();out.z=BigInt(z).toString();
  if(level==='forest')for(const key of ['mx','mz']){const n=Number(s[key]??0);if(!Number.isFinite(n)||n<-.5||n>=.5)throw Error('বাগানের অবস্থান সঠিক নয়।');out[key]=n;}
 }
 return out;
}
function descend(s,choice){s=validate(s);if(s.level==='forest'){const target=typeof choice==='object'?choice:{tree:String(choice)};return validate({level:'tree',...target,bough:1,branch:1,leaf:1});}if(s.level==='tree')return validate({...s,level:'bough',bough:choice,branch:1,leaf:1});if(s.level==='bough')return validate({...s,level:'branch',branch:choice,leaf:1});if(s.level==='branch')return validate({...s,level:'leaf',leaf:choice});return s;}
function parent(s){s=validate(s);return {...s,level:levels[Math.max(0,levels.indexOf(s.level)-1)]};}
function hashBrowse(s){s=validate(s);const p=new URLSearchParams({v:'2',view:s.level,t:s.tree,b:String(s.bough),r:String(s.branch),l:String(s.leaf)});if(s.x!=null){p.set('x',s.x);p.set('z',s.z);if(s.level==='forest'){p.set('mx',s.mx);p.set('mz',s.mz);}}return '#'+p.toString();}
function highlight(h){return h&&Number.isInteger(h.start)&&Number.isInteger(h.length)&&h.start>=0&&h.length>0&&h.start+h.length<=3200?{start:h.start,length:h.length}:null;}
function hashPage(address,h){C.parseAddress(address);const p=new URLSearchParams({a:address});h=highlight(h);if(h){p.set('s',h.start);p.set('n',h.length);}return '#'+p.toString();}
function parse(value){
 let hash=String(value).trim();if(hash.startsWith('ab1.')){C.parseAddress(hash);return {kind:'page',address:hash,highlight:null};}
 if(hash.includes('#'))hash=hash.slice(hash.indexOf('#')+1);const p=new URLSearchParams(hash);
 if(p.has('p')||p.has('r')&&!p.has('view'))return (root.ShareLinks||(typeof require==='function'?require('./sharing.js'):null)).parse(p);
 if(p.has('a')){const address=p.get('a');C.parseAddress(address);return {kind:'page',address,highlight:highlight({start:Number(p.get('s')),length:Number(p.get('n'))})};}
 if(p.has('view')){
  const s=validate({level:p.get('view'),tree:p.get('t')||'0',bough:p.get('b')||1,branch:p.get('r')||1,leaf:p.get('l')||1,...(p.has('x')||p.has('z')?{x:p.get('x'),z:p.get('z'),mx:p.get('mx')??0,mz:p.get('mz')??0}:{})});
  if(p.get('v')==='2')return {kind:'browse',state:s};
  if(p.has('v'))throw Error('এই লিংকের বাগান সংস্করণটি সমর্থিত নয়।');
  // Legacy visual leaves represented 410 pages. Keep their first content page reachable.
  const t=C.fromBase36(s.tree),legacyTrees=(C.engine.M+640n*410n-1n)/(640n*410n);
  if(t>=legacyTrees)throw Error('পুরোনো গাছের ঠিকানা সঠিক নয়।');
  const b=['forest','tree'].includes(s.level)?1:s.bough,r=['forest','tree','bough'].includes(s.level)?1:s.branch,l=s.level==='leaf'?s.leaf:1;
  const first=(t*640n+BigInt(((b-1)*5+r-1)*32+l-1))*410n;
  const loc=C.location(first);return {kind:'browse',state:validate({...loc,level:s.level==='forest'?'forest':'leaf'}),migrated:true};
 }
 if(!hash)return {kind:'browse',state:validate({})};throw Error('লিংক বা ঠিকানাটি পড়া যাচ্ছে না।');
}
function leafNumber(value,max=32){const digits=String(value).trim().replace(/[০-৯]/g,c=>'০১২৩৪৫৬৭৮৯'.indexOf(c));const n=Number(digits);if(!/^\d+$/.test(digits)||!Number.isSafeInteger(n)||n<1||n>max)throw Error('এই শাখার ১ থেকে '+String(max).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[d])+'-এর মধ্যে পাতার নম্বর দাও।');return n;}
function fullLink(base,hash){const url=new URL(base);url.hash=hash;return url.href;}
const api={levels,validate,descend,parent,hashBrowse,hashPage,parse,fullLink,highlight,leafNumber};root.GardenNavigation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
