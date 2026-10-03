/* Accessible controls and 3D picking share this exact navigation state. */
(function(){
'use strict';
const C=BabelCore,N=GardenNavigation,G=GardenModel,A=window.AksharApp,$=id=>document.getElementById(id);
const bn=A.bn,short=A.short;
let state=N.validate({});
const titles={forest:'একটি গাছ বেছে নাও',tree:'এবার একটি ডাল',bough:'কোন শাখায় যাবে?',branch:'একটি পাতা ছুঁয়ে দেখো',leaf:'একটি পাতা, একটি পৃষ্ঠা'};
const hints={forest:'গাছে ক্লিক করলে তার ডালগুলো খুলবে',tree:'৪টি ডাল · রঙ দেখে বা বাটন চেপে বেছে নাও',bough:'৫টি শাখা · পছন্দের শাখায় ক্লিক করো',branch:'৩২টি পাতা · বেছে নিলে কাছে দেখা যাবে',leaf:'পাতাটি পড়ো, অথবা আগের ধাপে ফিরে যাও'};
function write(){A.writeHash(N.hashBrowse(state));}
function canOpen(s){try{C.at(s.tree,s.bough,s.branch,s.leaf);return true;}catch{return false;}}
function button(title,note,fn,css=''){
 const b=document.createElement('button');b.type='button';b.className=css;b.textContent=title;
 if(note){const small=document.createElement('small');small.textContent=note;b.append(small);}b.addEventListener('click',fn);return b;
}
function render(focus=false){
 const depth=N.levels.indexOf(state.level),crumb=$('breadcrumbs');crumb.replaceChildren();
 const names=['বাগান','বৃক্ষ '+short(state.tree),'ডাল '+bn(state.bough),'শাখা '+bn(state.branch),'পাতা '+bn(state.leaf)];
 for(let i=0;i<=depth;i++){if(i){const sep=document.createElement('span');sep.textContent='›';sep.setAttribute('aria-hidden','true');crumb.append(sep);}const b=button(names[i],'',()=>show({...state,level:N.levels[i]}));if(i===depth)b.setAttribute('aria-current','location');crumb.append(b);}
 $('explorerTitle').textContent=titles[state.level];$('stepHint').textContent=hints[state.level];$('sceneHint').textContent=hints[state.level];
 $('treeCaption').textContent=names.slice(1,depth+1).join(' · ')||'গাছ → ডাল → শাখা → পাতা';
 $('browseBack').disabled=depth===0;$('groveMoves').hidden=depth!==0;$('leafSummary').hidden=depth!==4;
 const choices=$('explorerChoices');choices.replaceChildren();choices.hidden=depth===4;
 if(depth===0){
  const [cx,cz]=G.locate(state.tree);const offsets=[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  for(const [x,z] of offsets){const tree=G.treeAt(cx+BigInt(x),cz+BigInt(z)).toString(36);const b=button('বৃক্ষ '+short(tree),x===0&&z===0?'মাঝের গাছ · ৪টি ডাল':'কাছের গাছ · ৪টি ডাল',()=>choose(tree));choices.append(b);}
 }else if(depth<4){
  const total=[0,4,5,32][depth],noun=['','ডাল','শাখা','পাতা'][depth],key=['','bough','branch','leaf'][depth];
  for(let i=1;i<=total;i++){const next=N.descend(state,i),b=button(noun+' '+bn(i),depth===1?'৫টি শাখা':depth===2?'৩২টি পাতা':'একটি পড়ার পাতা',()=>choose(i),depth===3?'leaf-choice':'');
   if(!canOpen(next)){b.disabled=true;b.lastChild.textContent='সসীম সংগ্রহের বাইরে';}
   if(depth<3)b.style.borderLeft='5px solid '+['#719c46','#d3a249','#6299a0','#b38a92','#9fa653'][i-1];
   b.dataset[key]=String(i);choices.append(b);
  }
 }else{
  $('explorerTitle').textContent='পাতা '+bn(state.leaf);$('leafDescription').textContent='এই পাতাটিই একটি পৃষ্ঠা। এখানে সর্বোচ্চ ৩,২০০ ইউনিকোড চিহ্ন থাকে।';
 }
 if(focus){$('explorerTitle').focus({preventScroll:true});choices.scrollTop=0;}
}
function show(value,{historyWrite=true,focus=true}={}){state=N.validate(value);A.cancelPending();A.hideDialogs();window.AksharGarden?.browse(state);render(focus);if(historyWrite)write();}
function choose(value){try{show(N.descend(state,value));}catch(e){A.toast(e.message);}}
function openLeaf(){A.open(C.at(state.tree,state.bough,state.branch,state.leaf));}
$('explorerTitle').setAttribute('tabindex','-1');
$('browseBack').addEventListener('click',()=>show(N.parent(state)));
$('openSelectedLeaf').addEventListener('click',openLeaf);
$('copyView').addEventListener('click',()=>A.copy(N.fullLink(location.href,N.hashBrowse(state)),'দৃশ্যের পূর্ণ লিংক কপি হয়েছে।'));
$('home').addEventListener('click',e=>{e.preventDefault();show(N.validate({}));window.scrollTo({top:0,behavior:'auto'});});
$('exploreTop').addEventListener('click',()=>{A.hideDialogs();show(state);$('explorerTitle').scrollIntoView({block:'start',behavior:'auto'});});
$('searchTop').addEventListener('click',()=>{A.hideDialogs();$('searchPanel').scrollIntoView({block:'start',behavior:'auto'});$('query').focus({preventScroll:true});});
for(const [id,dx,dz] of [['moveLeft',-1,0],['moveRight',1,0],['moveForward',0,-1],['moveBack',0,1]])$(id).addEventListener('click',()=>window.AksharGarden?.move(dx,dz));
$('zoomIn').addEventListener('click',()=>window.AksharGarden?.zoom(.8));$('zoomOut').addEventListener('click',()=>window.AksharGarden?.zoom(1.25));
window.addEventListener('akshar-grove-change',e=>{state=N.validate(e.detail);render();write();});
window.aksharSelectPart=loc=>{if(state.level==='forest')choose(loc.tree);else if(state.level==='tree'&&loc.bough)choose(loc.bough);else if(state.level==='bough'&&loc.branch)choose(loc.branch);else if(state.level==='branch'&&loc.leaf)choose(loc.leaf);else if(state.level==='leaf')openLeaf();};
window.AksharExplorer={state:()=>({...state}),show,fromPage(loc){state=N.validate({...loc,level:'leaf'});window.AksharGarden?.browse(state);render();},backToBranch(loc){show({...loc,level:'branch'});}};
async function restore(){try{if(location.hash==='#main')return;const route=N.parse(location.hash);if(route.kind==='page')await A.open(route.address,{highlight:route.highlight,historyWrite:false});else{A.cancelPending();show(route.state,{historyWrite:false,focus:false});if(route.migrated){A.writeHash(N.hashBrowse(route.state),true);A.toast('পুরোনো বাগানের প্রথম পাতাটি নতুন বিন্যাসে খোলা হয়েছে।');}}}catch(e){A.toast(e.message);}}
window.addEventListener('popstate',restore);window.addEventListener('hashchange',()=>{if(location.hash!==lastHash){lastHash=location.hash;restore();}});let lastHash=location.hash;
// pushState does not fire hashchange. A small guard prevents duplicate pop/hash restores.
window.addEventListener('popstate',()=>{lastHash=location.hash;});
render();restore();
})();
