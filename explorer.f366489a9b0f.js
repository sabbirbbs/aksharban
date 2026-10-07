/* Accessible controls and 3D picking share this exact navigation state. */
(function(){
'use strict';
const C=BabelCore,N=GardenNavigation,G=GardenModel,A=window.AksharApp,$=id=>document.getElementById(id);
const bn=A.bn,short=A.short;
let journey=null;
let state=N.validate({}),walkTimer=null,holdTimer=null,walking=false,auto=false,walkDirection=[0,-1],activeKey=null,dragMode='pan';
const titles={forest:'যেদিকে ইচ্ছে, চলতে থাকো',tree:'এবার একটি ডাল',bough:'কোন শাখায় যাবে?',branch:'একটি পাতা ছুঁয়ে দেখো',leaf:'একটি পাতা, একটি পৃষ্ঠা'};
const hints={forest:'কাছের গাছগুলো · টেনে চললে আরও গাছ আসবে',tree:'৪টি ডাল · রঙ দেখে বা বাটন চেপে বেছে নাও',bough:'৫টি শাখা · পছন্দের শাখায় ক্লিক করো',branch:'৩২টি পাতা · বেছে নিলে কাছে দেখা যাবে',leaf:'পাতাটি পড়ো, অথবা আগের ধাপে ফিরে যাও'};
function write(replace=false){A.writeHash(N.hashBrowse(state),replace);}
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
 $('returnForest').hidden=depth===0;$('panMode').disabled=depth!==0;$('orbitMode').disabled=depth!==0;
 $('gestureHelp').textContent=depth===0?(dragMode==='pan'?'বনের মধ্যে চলতে টেনে নাও। গাছ ছুঁলে তার ডাল খুলবে।':'টেনে দৃশ্য ঘোরাও। এগোতে «টেনে চলি» বেছে নাও।'):'অংশটি ঘুরিয়ে দেখো; zoom out করলে এক ধাপ বাইরে ফিরবে।';
 const here=window.AksharGarden?.coords()||G.locate(state.tree);$('worldX').value=here[0].toString();$('worldZ').value=here[1].toString();
 $('browseBack').disabled=depth===0;$('groveMoves').hidden=depth!==0;$('leafSummary').hidden=depth!==4;
 const choices=$('explorerChoices');choices.replaceChildren();choices.hidden=depth===4;
 if(depth===0){
  const [cx,cz]=state.x!=null?[BigInt(state.x),BigInt(state.z)]:G.locate(state.tree);const offsets=[[0,0],[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  for(const [x,z] of offsets){const tree=G.treeAt(cx+BigInt(x),cz+BigInt(z)).toString(36);const b=button('বৃক্ষ '+short(tree),x===0&&z===0?'মাঝের গাছ · ৪টি ডাল':'কাছের গাছ · ৪টি ডাল',()=>choose({tree,x:(cx+BigInt(x)).toString(),z:(cz+BigInt(z)).toString()}));choices.append(b);}
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
function show(value,{historyWrite=true,focus=true}={}){const validated=N.validate(value);cancelJourney();stopWalking();state=validated;A.cancelPending();A.hideDialogs();window.AksharGarden?.browse(state);render(focus);if(historyWrite)write();}
function choose(value){try{show(N.descend(state,value));}catch(e){A.toast(e.message);}}
function openLeaf(){stopWalking();A.open(C.at(state.tree,state.bough,state.branch,state.leaf));}
$('explorerTitle').setAttribute('tabindex','-1');
$('browseBack').addEventListener('click',()=>show(N.parent(state)));
$('openSelectedLeaf').addEventListener('click',openLeaf);
$('copyView').addEventListener('click',()=>{cancelJourney(true);stopWalking();A.copy(N.fullLink(location.href,N.hashBrowse(window.AksharGarden.state())),'দৃশ্যের পূর্ণ লিংক কপি হয়েছে।');});
$('home').addEventListener('click',e=>{e.preventDefault();show(N.validate({}));window.scrollTo({top:0,behavior:'auto'});});
$('exploreTop').addEventListener('click',()=>{A.hideDialogs();show(state);$('explorerTitle').scrollIntoView({block:'start',behavior:'auto'});});
$('searchTop').addEventListener('click',()=>{cancelJourney(true);A.cancelPending();stopWalking();A.hideDialogs();$('searchPanel').scrollIntoView({block:'start',behavior:'auto'});$('query').focus({preventScroll:true});});
function stride(){return Number($('travelStride').value)||1;}
function stopWalking({commit=true}={}){clearTimeout(holdTimer);holdTimer=null;clearTimeout(walkTimer);walkTimer=null;walking=false;auto=false;activeKey=null;window.AksharGarden?.finish(commit);$('autoWalk').setAttribute('aria-pressed','false');$('autoWalk').textContent='▷ হাঁটতে থাকি';$('travelStatus').textContent='';}
function walkTick(){if(!walking)return;if(document.hidden||document.querySelector('dialog[open]')||state.level!=='forest'){stopWalking();return;}window.AksharGarden.shift(walkDirection[0]*.045*stride(),walkDirection[1]*.045*stride());walkTimer=setTimeout(walkTick,40);}
function startWalking(dx,dz,isAuto=false){stopWalking();walkDirection=[dx,dz];walking=true;auto=isAuto;window.AksharGarden.begin();$('autoWalk').setAttribute('aria-pressed','true');$('autoWalk').textContent='■ হাঁটা থামাই';$('travelStatus').textContent='চলছি… থামতে «হাঁটা থামাই» বা Esc চাপো।';walkTick();}
for(const [id,dx,dz] of [['moveLeft',-1,0],['moveRight',1,0],['moveForward',0,-1],['moveBack',0,1]]){
 const b=$(id);let held=false;
 b.addEventListener('pointerdown',e=>{held=false;b.setPointerCapture?.(e.pointerId);clearTimeout(holdTimer);holdTimer=setTimeout(()=>{held=true;startWalking(dx,dz);},260);});
 b.addEventListener('pointerup',()=>{clearTimeout(holdTimer);if(held)stopWalking();});
 b.addEventListener('pointercancel',()=>{held=true;stopWalking();});b.addEventListener('lostpointercapture',()=>{clearTimeout(holdTimer);if(held)stopWalking();});
 b.addEventListener('click',()=>{if(held){held=false;return;}if(auto){startWalking(dx,dz,true);return;}stopWalking();walkDirection=[dx,dz];window.AksharGarden.move(BigInt(dx)*BigInt(stride()),BigInt(dz)*BigInt(stride()));});
}
$('autoWalk').addEventListener('click',()=>walking?stopWalking():startWalking(...walkDirection,true));
window.addEventListener('blur',stopWalking);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopWalking();});document.addEventListener('focusin',e=>{if(/INPUT|TEXTAREA/.test(e.target.tagName)){if(journey)cancelJourney(true);if(walking)stopWalking();}});
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&walking){e.preventDefault();stopWalking();return;}
 if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||state.level!=='forest')return;
 const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],a:[-1,0],d:[1,0],w:[0,-1],s:[0,1]}[e.key.length===1?e.key.toLowerCase():e.key];if(!dir)return;e.preventDefault();if(activeKey!==e.key){startWalking(...dir);activeKey=e.key;}
});
window.addEventListener('keyup',e=>{if(e.key===activeKey)stopWalking();});
$('world').addEventListener('pointerdown',()=>{if(walking)stopWalking();},true);
for(const [id,mode] of [['panMode','pan'],['orbitMode','orbit']])$(id).addEventListener('click',()=>{cancelJourney(true);stopWalking();dragMode=mode;window.AksharGarden.interaction(mode);$('panMode').setAttribute('aria-pressed',String(mode==='pan'));$('orbitMode').setAttribute('aria-pressed',String(mode==='orbit'));render();});
$('returnForest').addEventListener('click',()=>show({...state,level:'forest'}));
$('enterTree').addEventListener('click',()=>{stopWalking();const s=window.AksharGarden.state();choose({tree:s.tree,x:s.x,z:s.z});});
$('worldHome').addEventListener('click',()=>show({level:'forest',tree:'0'}));
$('randomRegion').addEventListener('click',()=>{try{const l=C.location(C.parseAddress(C.randomAddress()));show({...l,level:'forest'});$('travelStatus').textContent='দূরের বনে পৌঁছেছি। গাছ বেছে নাও, অথবা আবার চলতে থাকো।';}catch(e){A.toast(e.message);}});
function travelToCoordinates(){let field=$('worldX');$('coordinateError').hidden=true;for(const id of ['worldX','worldZ'])$(id).removeAttribute('aria-invalid');try{const x=G.coordinate(field.value);field=$('worldZ');const z=G.coordinate(field.value);show({level:'forest',tree:G.treeAt(x,z).toString(36),x:x.toString(),z:z.toString()});$('travelStatus').textContent='এই অঞ্চলে পৌঁছেছি।';}catch(e){$('coordinateError').textContent=e.message;$('coordinateError').hidden=false;field.setAttribute('aria-invalid','true');field.focus();}}
A.bindAction('#coordinateForm','#coordinateGo','#worldX,#worldZ',travelToCoordinates);
for(const id of ['worldX','worldZ'])$(id).addEventListener('focus',stopWalking);
for(const id of ['worldX','worldZ'])$(id).addEventListener('input',()=>{$('coordinateError').hidden=true;$(id).removeAttribute('aria-invalid');});
$('zoomIn').addEventListener('click',()=>window.AksharGarden?.zoom(.8));$('zoomOut').addEventListener('click',()=>window.AksharGarden?.zoom(1.25));
window.addEventListener('akshar-grove-change',e=>{state=N.validate(e.detail.state);render();write(e.detail.replace);});
window.aksharSelectPart=loc=>{if(state.level==='forest')choose({tree:loc.tree,x:loc.x,z:loc.z});else if(state.level==='tree'&&loc.bough)choose(loc.bough);else if(state.level==='bough'&&loc.branch)choose(loc.branch);else if(state.level==='branch'&&loc.leaf)choose(loc.leaf);else if(state.level==='leaf')openLeaf();};
function paintArrival(value,animate=true){state=N.validate(value);window.AksharGarden?.browse(state,{animate});render();}
function finishJourney(success,snap=false){const j=journey;if(!j)return;clearTimeout(j.timer);journey=null;$('arrivalBanner').hidden=true;if(success&&snap)paintArrival(j.target,false);j.resolve(success);}
function cancelJourney(keepPlace=false){if(!journey)return;finishJourney(false);if(keepPlace){write(true);$('explorerTitle').focus({preventScroll:true});}}
function arrive(value){
 cancelJourney();stopWalking();A.hideDialogs();const target=N.validate(value),depth=N.levels.indexOf(target.level);
 if(depth===0||!window.AksharGarden?.available()||matchMedia('(prefers-reduced-motion:reduce)').matches){paintArrival(target,false);return Promise.resolve(true);}
 $('arrivalBanner').hidden=false;$('arrivalBanner').scrollIntoView({block:'nearest',behavior:'auto'});
 return new Promise(resolve=>{
  const j={target,resolve,timer:null,index:0};journey=j;const labels=['বাগানে পৌঁছেছি…','এই গাছের ভেতরে…','ডালের কাছে…','শাখাটি ধরে এগোই…','পাতাটি খুলছে…'];
  function step(){if(journey!==j)return;const level=N.levels[j.index];paintArrival({...target,level,mx:0,mz:0},j.index>0);$('arrivalStatus').textContent=labels[j.index];for(const el of document.querySelectorAll('[data-stage]')){const active=N.levels.indexOf(el.dataset.stage)<=j.index;el.classList.toggle('reached',active);if(el.dataset.stage===level)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');}
   j.timer=setTimeout(()=>{if(journey!==j)return;if(j.index===depth){finishJourney(true);return;}j.index++;step();},j.index===0?240:560);
  }step();
 });
}
async function openView(value,{animate=false,historyWrite=true}={}){A.cancelPending();if(!animate||!window.AksharGarden?.available()||matchMedia('(prefers-reduced-motion:reduce)').matches){show(value,{historyWrite,focus:historyWrite});return true;}const opened=await arrive(value);if(opened){if(historyWrite)write();$('explorerTitle').focus({preventScroll:true});}return opened;}
function zoomOut(){cancelJourney();if(state.level==='forest')return;show(N.parent(state));A.toast('এক ধাপ বাইরে এসেছো।');}
$('skipJourney').addEventListener('click',()=>finishJourney(true,true));
$('cancelJourney').addEventListener('click',()=>cancelJourney(true));
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&journey){e.preventDefault();cancelJourney(true);}});
window.addEventListener('akshar-manual-view',()=>{cancelJourney(true);A.cancelPending();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&journey)finishJourney(true,true);});
window.AksharExplorer={state:()=>({...state}),show,arrive,openView,cancelJourney,zoomOut,fromPage(loc){stopWalking();const place=state.tree===loc.tree&&state.x!=null?{x:state.x,z:state.z}:{};state=N.validate({...loc,...place,level:'leaf'});window.AksharGarden?.browse(state);render();},backToBranch(loc){show({...state,...loc,level:'branch'});$('explorerTitle').scrollIntoView({block:'start',behavior:'auto'});}};
async function restore(animate=false){try{stopWalking({commit:false});if(location.hash==='#main')return;const route=N.parse(location.hash);if(route.kind==='page'||route.kind==='recipe')await A.openRoute(route,{animate,historyWrite:false});else{await openView(route.state,{animate,historyWrite:false});if(route.migrated){A.writeHash(N.hashBrowse(route.state),true);A.toast('পুরোনো বাগানের প্রথম পাতাটি নতুন বিন্যাসে খোলা হয়েছে।');}}}catch(e){A.toast(e.message);}}
window.addEventListener('popstate',()=>restore(false));window.addEventListener('hashchange',()=>{if(location.hash!==lastHash){lastHash=location.hash;restore(true);}});let lastHash=location.hash;
// pushState does not fire hashchange. A small guard prevents duplicate pop/hash restores.
window.addEventListener('popstate',()=>{lastHash=location.hash;});
render();restore(true);
})();
