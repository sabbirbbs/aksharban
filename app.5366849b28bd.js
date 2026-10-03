(function(){
'use strict';
const C=window.BabelCore,N=window.GardenNavigation,$=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const bn=n=>String(n).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[d]);
const short=s=>s.length>22?s.slice(0,10)+'…'+s.slice(-7):s;
const state={result:null,fontSize:innerWidth<700?20:22,bookmarks:[],highlight:null,busy:false,temporary:false,recents:[],words:false,searchVariant:0,exporting:false};
const permitted=new Set(['open','search']);let worker=null,workerURL=null,callID=0,jobID=0;const pending=new Map();
function overlayHost(){return $$('dialog[open]').at(-1)||document.body;}
function toast(message){overlayHost().append($('#toast'));$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
function workerFallback(){if(worker)worker.terminate();worker=null;if(workerURL){URL.revokeObjectURL(workerURL);workerURL=null;}for(const [id,p] of pending){clearTimeout(p.timer);pending.delete(id);setTimeout(()=>{try{p.resolve(C[p.op](...p.args));}catch(e){p.reject(e);}},0);}}
try{
 const source=$('#core-source').textContent;
 if(source.trim()){workerURL=URL.createObjectURL(new Blob([source,'\nonmessage=({data})=>{try{if(!["search","open"].includes(data.op))throw Error("Unsupported operation");postMessage({id:data.id,result:BabelCore[data.op](...data.args)});}catch(e){postMessage({id:data.id,error:e.message});}};'],{type:'text/javascript'}));worker=new Worker(workerURL);}
 else if(location.protocol!=='file:')worker=new Worker('worker.68967a67fc71.js');
 if(worker){worker.onmessage=e=>{const p=pending.get(e.data.id);if(!p)return;clearTimeout(p.timer);pending.delete(e.data.id);e.data.error?p.reject(Error(e.data.error)):p.resolve(e.data.result);};worker.onerror=e=>{e.preventDefault();workerFallback();};}
}catch{workerFallback();}
function core(op,args){if(!permitted.has(op))return Promise.reject(Error('Unsupported operation'));return new Promise((resolve,reject)=>{if(!worker){setTimeout(()=>{try{resolve(C[op](...args));}catch(e){reject(e);}},0);return;}const id=++callID,timer=setTimeout(workerFallback,6000);pending.set(id,{op,args,resolve,reject,timer});try{worker.postMessage({id,op,args});}catch{workerFallback();}});}
function busy(value){state.busy=value;if(value)overlayHost().append($('#loading'));$('#loading').hidden=!value;$('#searchSubmit').disabled=value;$('#addressSubmit').disabled=value;$('#addressSubmit').textContent=value?'পাতা খুলছে…':'পাতাটি খুলি ↗';$('#randomLeaf').disabled=value;$('#leafJumpSubmit').disabled=value;$('#leafJumpSubmit').textContent=value?'পাতা খুলছে…':'পাতাটি খুলি ↗';$('#reader').setAttribute('aria-busy',String(value));}
function locationText(l){return `বৃক্ষ ${short(l.tree)} · ডাল ${bn(l.bough)} · শাখা ${bn(l.branch)} · পাতা ${bn(l.leaf)}`;}
function hideDialogs(){for(const d of $$('dialog[open]'))d.close();}
function showDialog(d){if(d.open)return;hideDialogs();d.showModal();}
function closeReader(){hideDialogs();if(state.result)window.AksharExplorer?.show({...window.AksharExplorer.state(),...state.result.location,level:'leaf'});}
for(const d of $$('dialog')){d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){if(d.id==='reader')closeReader();else d.close();}});d.addEventListener('close',()=>{document.body.classList.toggle('reader-open',!!$('#reader').open);overlayHost().append($('#toast'),$('#loading'));window.dispatchEvent(new Event('akshar-dialog-close'));});}
$('#reader').addEventListener('cancel',e=>{e.preventDefault();closeReader();});
function branchRange(){return C.branchRange(state.result.address);}
function renderText(page,arr,h){
 let found=0,buffer='',style='',i=0;const wordList=state.words?[...C.WORDS].sort((a,b)=>b.length-a.length):[];
 function flush(){if(!buffer)return;if(style){const m=document.createElement('mark');m.className=style;m.textContent=buffer;page.append(m);}else page.append(document.createTextNode(buffer));buffer='';}
 while(i<arr.length){let kind='',count=1;if(h&&i>=h.start&&i<h.start+h.length)kind='query-match';else if(state.words){const remaining=arr.slice(i,i+14).join(''),w=wordList.find(w=>remaining.startsWith(w));if(w&&(!h||i+w.length<=h.start||i>=h.start+h.length)){kind='word-match';count=Array.from(w).length;found++;}}
  if(kind!==style){flush();style=kind;}buffer+=arr.slice(i,i+count).join('');i+=count;
 }flush();$('#wordStatus').textContent=state.words?'ছোট শব্দতালিকায় '+bn(found)+'টি মিল চিহ্নিত হয়েছে; এটি পূর্ণাঙ্গ অভিধান বা বাক্যের অর্থ যাচাই নয়।':'';
}
function renderPage(){
 const r=state.result;if(!r)return;
 const chars=Array.from(r.raw),h=state.highlight;
 const query=h?chars.slice(h.start,h.start+h.length).join(''):'';
 $('#readerTitle').textContent=query?(Array.from(query).length>72?Array.from(query).slice(0,72).join('')+'…':query):'পাতা '+bn(r.location.leaf);
 $('#readerLocation').textContent=locationText(r.location);$('#readerLocation').title='পূর্ণ বৃক্ষ: '+r.location.tree;
 const page=$('#pageText');page.style.setProperty('--reader-font',state.fontSize+'px');page.replaceChildren();
 // Hide trailing padding for reading only; downloads and address math retain every scalar.
 const display=r.raw.replace(/ +$/,'')||' ',arr=Array.from(display);
 renderText(page,arr,h);
 $('#readerLeafLabel').textContent='পাতা '+bn(r.location.leaf)+' · এই শাখায় '+bn(branchRange().count)+'টি পাতা';$('#readerMeta').textContent='৩,২০০ ইউনিকোড চিহ্ন · '+bn(state.fontSize)+'px';$('#fullAddress').value=r.address;$('#addressStatus').textContent='✓ সম্পূর্ণ ঠিকানা · '+bn(r.address.length)+'টি চিহ্ন · '+locationText(r.location);$('#unicodeDump').hidden=true;$('#unicodeDump').textContent='';
 $('#readerNotice').textContent=(h?'চিহ্নিত লেখাটি এই পাতায় পাওয়া গেছে। ':'এটি গাণিতিকভাবে তৈরি একটি পাতা। ')+(r.changed?'একই অক্ষরের সমতুল্য রূপগুলো মিলিয়ে নেওয়া হয়েছে। ':'')+(display!==r.raw?'পড়ার সুবিধায় শেষের ফাঁকা স্থান আড়াল করা হয়েছে; TXT-তে সব অক্ষর থাকবে।':'');
 $('#saveLeaf').textContent=state.bookmarks.some(b=>b.address===r.address)?'♥ সংগ্রহে আছে':'♡ সংগ্রহে রাখি';
 $('#previousLeaf').disabled=r.location.leaf===1;$('#nextLeaf').disabled=r.location.leaf===branchRange().count;
 $('#fontSmaller').disabled=state.fontSize<=16;$('#fontLarger').disabled=state.fontSize>=36;
 $('#firstLeaf').disabled=r.location.leaf===1;$('#lastLeaf').disabled=r.location.leaf===branchRange().count;
 $('#anotherMatch').disabled=!h||h.length===3200;$('#downloadBranch').textContent='শাখার '+bn(branchRange().count)+'টি পাতা TXT ↓';
 $('#leafJump').value=String(r.location.leaf);$('#leafJumpError').hidden=true;$('#leafJump').removeAttribute('aria-invalid');
}
function hashFor(r,h){return N.hashPage(r.address,h);}
function writeHash(hash,replace=false){if(location.hash===hash)return;try{history[replace?'replaceState':'pushState'](null,'',hash);}catch{/* Sandboxed file viewers may disallow history; copy still builds the full URL. */}}
function addRecent(result,highlight){state.recents=state.recents.filter(b=>b.address!==result.address);state.recents.unshift({address:result.address,title:$('#readerTitle').textContent,highlight});state.recents=state.recents.slice(0,30);try{localStorage.setItem('aksharban-recents-v1',JSON.stringify(state.recents));}catch{}}
function focusReaderStart(){const reader=$('#reader');if(!reader.open)return;$('#readerTitle').focus({preventScroll:true});reader.scrollTop=0;$('#pageText').scrollTop=0;}
function present(result,highlight=null,historyWrite=true){state.result=result;state.highlight=highlight;window.AksharExplorer?.fromPage(result.location);renderPage();addRecent(result,highlight);if(historyWrite)writeHash(hashFor(result,highlight));showDialog($('#reader'));document.body.classList.add('reader-open');$('#leafJumpStatus').textContent='';focusReaderStart();}
async function run(op,args,{errorTarget='#searchError',highlight=null,historyWrite=true}={}){
 const ticket=++jobID;busy(true);$(errorTarget).hidden=true;
 try{const result=await core(op,args);if(ticket!==jobID)return false;let h=highlight;if(op==='search')h={start:result.offset,length:result.count};present(result,h,historyWrite);return true;}
 catch(error){if(ticket===jobID){$(errorTarget).textContent=error.message;$(errorTarget).hidden=false;toast(error.message);}return false;}
 finally{if(ticket===jobID)busy(false);}
}
function open(address,opts){return run('open',[address],opts);}
function inputCount(){const text=$('#query').value.replace(/\r\n?/g,'\n').normalize('NFC');$('#inputMeta').textContent=bn(Array.from(text).length)+' / ৩,২০০ ইউনিকোড চিহ্ন';}
// All three actions share direct activation; no native form submission is needed.
function bindAction(formSelector,buttonSelector,inputSelector,action){
 const form=$(formSelector),button=$(buttonSelector),inputs=$$(inputSelector);button.type='button';
 const activate=e=>{e.preventDefault();action();};
 button.addEventListener('click',activate);
 for(const input of inputs)input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229&&!(e.shiftKey&&input.tagName==='TEXTAREA'))activate(e);});
 form.addEventListener('submit',activate);
}
async function searchFromInput(){
 if(state.busy){toast('পাতাটি খুলছে—একটু অপেক্ষা করো।');return;}
 const field=$('#query');field.removeAttribute('aria-invalid');state.searchVariant=0;
 const opened=await run('search',[field.value,'nfc',$('#surround').value]);
 if(!opened&&!$('#searchError').hidden){field.setAttribute('aria-invalid','true');field.focus();}
}
$('#query').addEventListener('input',()=>{inputCount();$('#searchError').hidden=true;$('#query').removeAttribute('aria-invalid');});
bindAction('#searchForm','#searchSubmit','#query',searchFromInput);
$('#randomLeaf').addEventListener('click',()=>{try{open(C.randomAddress());}catch(e){toast(e.message);}});
function openAddressDialog(){
 if(state.busy){++jobID;busy(false);}
 $('#addressError').hidden=true;$('#addressInput').removeAttribute('aria-invalid');showDialog($('#addressDialog'));$('#addressInput').focus();
}
async function openFromInput(){
 if(state.busy){toast('পাতাটি খুলছে—একটু অপেক্ষা করো।');return;}
 const field=$('#addressInput'),error=$('#addressError');error.hidden=true;field.removeAttribute('aria-invalid');
 try{
  const value=field.value.trim();if(!value)throw Error('পাতার সম্পূর্ণ কোড অথবা পূর্ণ লিংক দাও।');
  const route=N.parse(value);
  if(route.kind==='page'){
   const opened=await open(route.address,{errorTarget:'#addressError',highlight:route.highlight});
   if(!opened&&!error.hidden){field.setAttribute('aria-invalid','true');field.focus();}
  }else{window.AksharExplorer.show(route.state);if(route.migrated)toast('পুরোনো বাগানের প্রথম পাতাটি নতুন বিন্যাসে খোলা হয়েছে।');}
 }catch(err){error.textContent=err.message;error.hidden=false;field.setAttribute('aria-invalid','true');field.focus();}
}
$('#addressButton').addEventListener('click',e=>{e.preventDefault();openAddressDialog();});
$('#addressInput').addEventListener('input',()=>{$('#addressError').hidden=true;$('#addressInput').removeAttribute('aria-invalid');});
bindAction('#addressForm','#addressSubmit','#addressInput',openFromInput);
function loadBookmarks(){try{const data=JSON.parse(localStorage.getItem('aksharban-bookmarks-v1')||'[]');if(Array.isArray(data))state.bookmarks=data.filter(b=>{try{C.parseAddress(b.address);return true;}catch{return false;}}).slice(0,50);}catch{state.temporary=true;}$('#bookmarkCount').textContent=bn(state.bookmarks.length);}
function persist(){try{localStorage.setItem('aksharban-bookmarks-v1',JSON.stringify(state.bookmarks));state.temporary=false;}catch{state.temporary=true;}$('#bookmarkCount').textContent=bn(state.bookmarks.length);}
function bookmark(){const r=state.result;if(!r)return;if(!state.bookmarks.some(b=>b.address===r.address)){const title=$('#readerTitle').textContent;state.bookmarks.unshift({address:r.address,title,highlight:state.highlight});if(state.bookmarks.length>50)state.bookmarks.pop();persist();}renderPage();toast(state.temporary?'ব্রাউজারে স্থায়ীভাবে রাখা গেল না। সংগ্রহের ব্যাকআপ নামিয়ে রাখো।':'পাতাটি সংগ্রহে রাখা হয়েছে।');}
function collection(){const list=$('#bookmarkList');list.replaceChildren();if(!state.bookmarks.length){const p=document.createElement('p');p.textContent='এখনও কোনো পাতা রাখা হয়নি। পাতার ভিতর থেকে ♡ চাপো।';list.append(p);}state.bookmarks.forEach((b,i)=>{const row=document.createElement('div');row.className='bookmark-row';const btn=document.createElement('button');btn.textContent=b.title||'অচেনা পাতা';btn.type='button';const small=document.createElement('small');small.textContent=locationText(C.location(C.parseAddress(b.address)));btn.append(small);btn.addEventListener('click',()=>open(b.address,{highlight:validHighlight(b.highlight)}));const del=document.createElement('button');del.type='button';del.textContent='সরাই';del.setAttribute('aria-label','সংগ্রহ থেকে '+(b.title||'পাতা')+' সরাই');del.addEventListener('click',()=>{const removed=state.bookmarks.splice(i,1)[0];persist();collection();toast('সরানো হয়েছে।');const undo=document.createElement('button');undo.textContent='ফিরিয়ে আনি';undo.addEventListener('click',()=>{if(!state.bookmarks.some(x=>x.address===removed.address)){state.bookmarks.splice(i,0,removed);persist();collection();}$('#toast').classList.remove('show');});$('#toast').append(' ',undo);});row.append(btn,del);list.append(row);});}
$('#bookmarksTop').addEventListener('click',()=>{collection();showDialog($('#bookmarksDialog'));});$('#saveLeaf').addEventListener('click',bookmark);
function downloadBytes(data,type,name){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('#exportCollection').addEventListener('click',()=>downloadBytes(JSON.stringify({version:'ab1',bookmarks:state.bookmarks},null,2),'application/json','aksharban-collection.json'));
$('#importCollection').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1500000)throw Error('ফাইলটি অতিরিক্ত বড়।');const data=JSON.parse(await file.text());if(data.version!=='ab1'||!Array.isArray(data.bookmarks))throw Error('এটি অক্ষরবনের সংগ্রহ ফাইল নয়।');const valid=data.bookmarks.slice(0,50).map(b=>{C.parseAddress(b.address);return {address:b.address,title:String(b.title||'অচেনা পাতা').slice(0,160),highlight:validHighlight(b.highlight)};});for(const b of valid)if(!state.bookmarks.some(x=>x.address===b.address))state.bookmarks.push(b);state.bookmarks=state.bookmarks.slice(0,50);persist();collection();toast(state.temporary?'এই সেশনে সংগ্রহ যোগ হয়েছে।':'সংগ্রহ যোগ হয়েছে।');}catch(error){toast(error.message);}e.target.value='';});
async function copy(value,message){try{if(!navigator.clipboard?.writeText)throw Error('clipboard');await navigator.clipboard.writeText(value);toast(message);}catch{const field=$('#copyValue');field.value=value;if(!$('#copyDialog').open)$('#copyDialog').showModal();field.focus();field.select();}}
$('#copyAddress').addEventListener('click',()=>state.result&&copy(state.result.address,'সম্পূর্ণ ঠিকানা কপি হয়েছে।'));
$('#shareLeaf').addEventListener('click',()=>{if(state.result)copy(N.fullLink(location.href,hashFor(state.result,state.highlight)),'পূর্ণ লিংক কপি হয়েছে।');});
$('#downloadText').addEventListener('click',()=>{if(state.result)downloadBytes(state.result.raw,'text/plain;charset=utf-8','aksharban-'+C.hash(state.result.address).toString(36)+'.txt');});
$('#downloadLocation').addEventListener('click',()=>{if(state.result)downloadBytes(JSON.stringify({version:'ab1',address:state.result.address,highlight:state.highlight},null,2),'application/json','aksharban-leaf-address.json');});
function neighbor(delta){if(!state.result||state.busy)return;const n=C.parseAddress(state.result.address)+BigInt(delta);const range=branchRange();if(n<range.start||n>=range.start+BigInt(range.count))return;open(C.formatAddress(n));}
$('#previousLeaf').addEventListener('click',()=>neighbor(-1));$('#nextLeaf').addEventListener('click',()=>neighbor(1));
$('#fontSmaller').addEventListener('click',()=>{state.fontSize=Math.max(16,state.fontSize-2);renderPage();});$('#fontLarger').addEventListener('click',()=>{state.fontSize=Math.min(36,state.fontSize+2);renderPage();});
$('#plainToggle').addEventListener('click',e=>{const plain=$('#reader').classList.toggle('plain');e.currentTarget.setAttribute('aria-pressed',String(plain));e.currentTarget.textContent=plain?'পাতার আকৃতি':'সোজা পাতা';});
$('#inspectUnicode').addEventListener('click',()=>{const out=$('#unicodeDump');out.hidden=!out.hidden;if(!out.hidden)out.textContent=Array.from(state.result.raw).map((c,i)=>`${i+1}\tU+${c.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')}\t${c===' '?'SPACE':c==='\n'?'LF':c==='\t'?'TAB':c}`).join('\n');});
async function jumpToLeaf(){
 if(!state.result)return;
 if(state.busy){toast('পাতাটি খুলছে—একটু অপেক্ষা করো।');return;}
 const field=$('#leafJump'),error=$('#leafJumpError'),status=$('#leafJumpStatus');error.hidden=true;status.textContent='';field.removeAttribute('aria-invalid');
 try{
  const leaf=N.leafNumber(field.value,branchRange().count),l=state.result.location,address=C.at(l.tree,l.bough,l.branch,leaf);
  if(address===state.result.address){focusReaderStart();status.textContent='তুমি এখন পাতা '+bn(leaf)+'-এ আছো।';toast(status.textContent);return;}
  const opened=await open(address,{errorTarget:'#leafJumpError'});
  if(opened){status.textContent='পাতা '+bn(leaf)+' খোলা হয়েছে।';toast(status.textContent);}
 }catch(err){error.textContent=err.message;error.hidden=false;field.setAttribute('aria-invalid','true');field.focus();}
}
bindAction('#leafJumpForm','#leafJumpSubmit','#leafJump',jumpToLeaf);
$('#leafJump').addEventListener('input',()=>{$('#leafJumpError').hidden=true;$('#leafJumpStatus').textContent='';$('#leafJump').removeAttribute('aria-invalid');});
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.dataset.close==='reader'?closeReader():$('#'+b.dataset.close).close()));
$('#aboutTop').addEventListener('click',()=>{$('#alphabetPreview').textContent=C.ALPHABET.map(c=>c===' '?'␠':c==='\n'?'↵':c==='\t'?'⇥':c).join(' ');showDialog($('#aboutDialog'));});
$('#resetCamera').addEventListener('click',()=>window.AksharGarden?.reset());
let low=innerWidth<700;$('#qualityToggle').setAttribute('aria-pressed',String(low));$('#qualityToggle').textContent=low?'আরও বিস্তারিত':'হালকা দৃশ্য';$('#qualityToggle').addEventListener('click',e=>{low=!low;e.currentTarget.setAttribute('aria-pressed',String(low));e.currentTarget.textContent=low?'আরও বিস্তারিত':'হালকা দৃশ্য';window.AksharGarden?.quality(low);});
$('#themeToggle').addEventListener('click',()=>{const night=document.body.classList.toggle('night');$('#themeToggle').textContent=night?'☀':'☾';$('#themeToggle').setAttribute('aria-label',night?'দিনের বাগান দেখো':'রাতের বাগান দেখো');window.AksharGarden?.night(night);});
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();hideDialogs();$('#query').focus();}if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;});
function validHighlight(h){return N.highlight(h);}
$('#firstLeaf').addEventListener('click',()=>open(C.formatAddress(branchRange().start)));
$('#lastLeaf').addEventListener('click',()=>{const r=branchRange();open(C.formatAddress(r.start+BigInt(r.count-1)));});
$('#randomInBranch').addEventListener('click',()=>{const r=branchRange(),bytes=new Uint32Array(1);crypto.getRandomValues(bytes);open(C.formatAddress(r.start+BigInt(bytes[0]%r.count)));});
$('#backToBranch').addEventListener('click',()=>{if(state.result)window.AksharExplorer.backToBranch(state.result.location);});
$('#wordToggle').addEventListener('click',e=>{state.words=!state.words;e.currentTarget.setAttribute('aria-pressed',String(state.words));e.currentTarget.textContent=state.words?'শব্দখোঁজ বন্ধ':'শব্দখোঁজ চালু';renderPage();});
$('#anotherMatch').addEventListener('click',()=>{if(!state.highlight||state.busy)return;const q=Array.from(state.result.raw).slice(state.highlight.start,state.highlight.start+state.highlight.length).join('');run('search',[q,'raw',$('#surround').value==='blank'?'chaos':$('#surround').value,++state.searchVariant]);});
$('#recentTop').addEventListener('click',()=>{const list=$('#recentList');list.replaceChildren();if(!state.recents.length){const p=document.createElement('p');p.textContent='এখনও কোনো পাতা পড়া হয়নি।';list.append(p);}for(const b of state.recents){const row=document.createElement('div');row.className='bookmark-row';const btn=document.createElement('button');btn.textContent=b.title||'অচেনা পাতা';const small=document.createElement('small');small.textContent=locationText(C.location(C.parseAddress(b.address)));btn.append(small);btn.addEventListener('click',()=>open(b.address,{highlight:validHighlight(b.highlight)}));row.append(btn);list.append(row);}showDialog($('#recentDialog'));});
let exportCancelled=false;
$('#cancelDownload').addEventListener('click',()=>{exportCancelled=true;});
$('#downloadBranch').addEventListener('click',async()=>{
 if(!state.result||state.exporting)return;
 state.exporting=true;exportCancelled=false;$('#branchProgress').hidden=false;$('#downloadBranch').disabled=true;
 const range=branchRange(),parts=['অক্ষরবন · Bangla Core v1\nশাখার প্রথম পাতার ঠিকানা: '+C.formatAddress(range.start)+'\n\n'];$('#exportProgress').max=range.count;$('#exportProgress').value=0;
 try{for(let i=0;i<range.count;i++){
   if(exportCancelled)break;
   const result=await core('open',[C.formatAddress(range.start+BigInt(i))]);
   parts.push('── পাতা '+bn(i+1)+' ──\n'+result.raw+'\n\n');$('#exportProgress').value=i+1;$('#exportLabel').textContent=bn(i+1)+' / '+bn(range.count);
  }
  if(!exportCancelled){downloadBytes(parts.join(''),'text/plain;charset=utf-8','aksharban-branch-'+C.hash(range.start.toString()).toString(36)+'.txt');toast('শাখার পাতাগুলো তৈরি হয়েছে।');}else toast('পাতাগুলো নামানো বাতিল হয়েছে।');
 }catch(e){toast(e.message);}finally{state.exporting=false;$('#downloadBranch').disabled=false;$('#branchProgress').hidden=true;}
});
try{const saved=JSON.parse(localStorage.getItem('aksharban-recents-v1')||'[]');if(Array.isArray(saved))state.recents=saved.filter(b=>{try{C.parseAddress(b.address);return true;}catch{return false;}}).slice(0,30);}catch{}
window.AksharApp={open,copy,toast,bn,short,hideDialogs,writeHash,bindAction,cancelPending(){++jobID;busy(false);}};
loadBookmarks();
})();
