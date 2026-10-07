(function(){
  'use strict';
  const T=window.THREE,C=window.BabelCore,G=window.GardenModel,root=document.getElementById('world');
  let ready=false;
  let cx=0n,cz=0n,mx=0,mz=0,focusTree=0n,selected=null,renderer=null,night=false,interaction='pan';
  let low=matchMedia('(max-width:700px)').matches,reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const label=n=>{const s=String(n);return s.length>18?s.slice(0,8)+'…'+s.slice(-6):s;};
  let scope={level:'forest',tree:'0',bough:1,branch:1,leaf:1},travelActive=false,travelChanged=false,travelRecorded=false;
  function current(){return {...scope,x:cx.toString(),z:cz.toString(),...(scope.level==='forest'?{mx,mz}:{})};}
  function announce(){focusTree=G.treeAt(cx,cz);document.getElementById('groveTitle').textContent=cx===0n&&cz===0n?'প্রথম প্রাঙ্গণ · চারদিকে পথ খোলা':'দিগন্তের পথে';document.getElementById('worldLocation').textContent='X '+label(cx)+' · Z '+label(cz);}
  function send(){window.dispatchEvent(new CustomEvent('akshar-grove-change',{detail:{state:current(),replace:travelActive&&travelRecorded}}));if(travelActive)travelRecorded=true;}
  let transition=()=>refocus(),rebuild=()=>{},reposition=()=>{},reset=()=>{},setLight=()=>{},refocus=()=>{},zoom=factor=>{if(factor>1&&scope.level!=='forest')window.AksharExplorer?.zoomOut();},stats=()=>({renderedTrees:0,detailedTrees:0});
  const api={available:()=>ready,tree:()=>focusTree,coords:()=>[cx,cz],state:current,stats:()=>stats(),
    begin(){window.dispatchEvent(new Event('akshar-manual-view'));if(travelActive)return;travelActive=true;travelChanged=false;travelRecorded=false;},
    finish(commit=true){if(commit&&travelActive&&travelChanged)send();travelActive=false;travelChanged=false;travelRecorded=false;},
    shift(dx,dz){if(scope.level!=='forest')return;const p=G.shift(G.cursor(cx,cz,mx,mz),dx,dz),changed=p.x!==cx||p.z!==cz;cx=p.x;cz=p.z;mx=p.mx;mz=p.mz;scope={...scope,tree:G.treeAt(cx,cz).toString(36)};travelChanged=true;announce();if(changed){rebuild();send();}else reposition();},
    move(dx,dz){window.dispatchEvent(new Event('akshar-manual-view'));this.finish();cx+=BigInt(dx);cz+=BigInt(dz);mx=mz=0;scope={...scope,level:'forest',tree:G.treeAt(cx,cz).toString(36)};selected=null;announce();rebuild();send();},
    browse(value,{animate=true}={}){travelActive=false;travelChanged=false;scope={...value};focusTree=C.fromBase36(scope.tree);[cx,cz]=scope.x!=null?[BigInt(scope.x),BigInt(scope.z)]:G.locate(focusTree);mx=scope.level==='forest'?(scope.mx||0):0;mz=scope.level==='forest'?(scope.mz||0):0;selected=scope.level==='leaf'?scope:null;announce();rebuild();transition(animate);},
    home(){this.browse({level:'forest',tree:'0',bough:1,branch:1,leaf:1});},
    interaction(value){interaction=value==='orbit'?'orbit':'pan';if(renderer)renderer.domElement.style.cursor=interaction==='pan'?'grab':'move';},
    reset:()=>{reset();refocus();},zoom:(factor,options)=>zoom(factor,options),
    quality(value){low=value;if(renderer){renderer.setPixelRatio(low?1:Math.min(devicePixelRatio||1,1.75));rebuild();}},night(value){night=value;setLight();}};
  window.AksharGarden=api;announce();
  function fallback(error){ready=false;console.warn('3D unavailable; text navigation remains available.',error?.message||'');document.getElementById('worldFallback').hidden=false;if(renderer)renderer.domElement.style.display='none';}
  if(!T){fallback();return;}
  try{
    const scene=new T.Scene(),fog=new T.FogExp2(0xd4e0c6,.022);scene.fog=fog;
    renderer=new T.WebGLRenderer({antialias:!low,alpha:true,powerPreference:'default'});renderer.setPixelRatio(low?1:Math.min(devicePixelRatio||1,1.75));renderer.setSize(root.clientWidth,root.clientHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;root.appendChild(renderer.domElement);
    ready=true;
    renderer.domElement.setAttribute('aria-label','বনের মধ্যে চলতে টেনে নাও; গাছে চাপলে ডাল, শাখা ও পাতা খুলবে');
    const camera=new T.PerspectiveCamera(45,root.clientWidth/root.clientHeight,.1,150);
    const hemi=new T.HemisphereLight(0xfff8db,0x5c7854,2.5),sun=new T.DirectionalLight(0xffe9ab,2.9),fill=new T.DirectionalLight(0xaccec2,1.4);sun.position.set(-9,18,10);fill.position.set(14,9,-10);scene.add(hemi,sun,fill);
    const groundMaterial=new T.MeshStandardMaterial({color:0x9cae83,roughness:1});const ground=new T.Mesh(new T.PlaneGeometry(2000,2000),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.15;scene.add(ground);
    const treeMat=new T.MeshStandardMaterial({color:0x69593d,roughness:1});const leafMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.82,side:T.DoubleSide,vertexColors:true});
    const limbGeo=new T.CylinderGeometry(.72,1,1,6,1);const leafShape=new T.Shape();leafShape.moveTo(0,0);leafShape.bezierCurveTo(-.7,.47,-.45,1.1,0,1.55);leafShape.bezierCurveTo(.54,1.08,.58,.41,0,0);const leafGeo=new T.ShapeGeometry(leafShape,4);const pos=leafGeo.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,.13*Math.sin(pos.getY(i)*2)*Math.max(0,1-Math.abs(pos.getX(i))*2));leafGeo.computeVertexNormals();
    const stonesMat=new T.MeshStandardMaterial({color:0xb0b198,roughness:1}),stoneGeo=new T.DodecahedronGeometry(1,0),dummy=new T.Object3D(),up=new T.Vector3(0,1,0),vA=new T.Vector3(),vB=new T.Vector3();
    const patches=new Map();let clickable=[],focusLeaves=null;
    const halo=new T.Mesh(leafGeo,new T.MeshStandardMaterial({color:0xf8c76a,emissive:0xe5a433,emissiveIntensity:.4,side:T.DoubleSide}));halo.visible=false;scene.add(halo);
    const reedGeo=new T.ConeGeometry(.12,.8,3),reedMat=new T.MeshStandardMaterial({color:0x789260,roughness:1}),canopyGeo=new T.IcosahedronGeometry(1,1),canopyMat=new T.MeshStandardMaterial({color:0x779653,roughness:1});
    const rand=C.random('ground-v2');
    function groundDetails(group,id){
      const r=C.random('land/'+id.toString(36)),grass=new T.InstancedMesh(reedGeo,reedMat,16),rocks=new T.InstancedMesh(stoneGeo,stonesMat,3);
      for(let i=0;i<16;i++){dummy.position.set((r()/4294967296-.5)*G.SIZE,.25,(r()/4294967296-.5)*G.SIZE);dummy.rotation.set(0,r()/4294967296*6.3,.12);dummy.scale.set(.8,.5+r()/4294967296,1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}
      for(let i=0;i<3;i++){dummy.position.set((r()/4294967296-.5)*G.SIZE,.1,(r()/4294967296-.5)*G.SIZE);dummy.rotation.set(0,r()/4294967296*6.3,.1);dummy.scale.set(.45,.22,.36);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);}
      group.add(grass,rocks);
    }
    function disposePatch(p){scene.remove(p.group);p.group.traverse(obj=>{if(obj.isInstancedMesh)obj.dispose();});}
    function makeProxy(x,z){
      const id=G.treeAt(x,z),group=new T.Group(),r=C.random('tree-v1/'+id.toString(36));r();const height=8.8+r()/4294967296*2.1;
      group.userData={x,z,id};const trunk=new T.Mesh(limbGeo,treeMat);trunk.position.y=height/2;trunk.scale.set(.65,height,.65);trunk.userData={id,x,z,kind:'proxy'};group.add(trunk);
      const crown=new T.InstancedMesh(canopyGeo,canopyMat,4);for(let i=0;i<4;i++){const angle=i*Math.PI/2;dummy.position.set(Math.cos(angle)*1.7,height*.7+(i%2),Math.sin(angle)*1.7);dummy.rotation.set(0,angle,0);dummy.scale.set(2.3,2.8,2.3);dummy.updateMatrix();crown.setMatrixAt(i,dummy.matrix);}crown.userData={id,x,z,kind:'proxy'};group.add(crown);groundDetails(group,id);scene.add(group);return {group,proxy:true,targets:[trunk,crown]};
    }
    function makePatch(x,z){const id=G.treeAt(x,z),model=G.treeModel(id),group=new T.Group();group.userData={x,z,id};
      const trunks=new T.InstancedMesh(limbGeo,treeMat,model.limbs.length),trunkMatrices=[],leafMatrices=[];trunks.userData={id,x,z,model,kind:'trunks'};
      model.limbs.forEach((b,i)=>{vA.fromArray(b.a);vB.fromArray(b.b);dummy.position.copy(vA).add(vB).multiplyScalar(.5);const length=vA.distanceTo(vB);dummy.quaternion.setFromUnitVectors(up,vB.sub(vA).normalize());dummy.scale.set(b.ra,length,b.ra);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);trunkMatrices.push(dummy.matrix.clone());});trunks.computeBoundingSphere();group.add(trunks);
      const leaves=new T.InstancedMesh(leafGeo,leafMat,640);const dark=new T.Color(0x48784a),light=new T.Color(0xa8be69),color=new T.Color();model.leaves.forEach((l,i)=>{dummy.position.fromArray(l.position);dummy.rotation.set(...l.rotation);dummy.scale.setScalar(l.scale);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leafMatrices.push(dummy.matrix.clone());leaves.setColorAt(i,color.copy(dark).lerp(light,l.color));});leaves.computeBoundingSphere();leaves.userData={id,x,z,model,kind:'leaves'};group.add(leaves);groundDetails(group,id);scene.add(group);return {group,leaves,trunks,model,leafMatrices,trunkMatrices};}
    reposition=()=>{for(const p of patches.values())p.group.position.set((Number(p.group.userData.x-cx)-mx)*G.SIZE,0,(Number(p.group.userData.z-cz)-mz)*G.SIZE);dirty=true;};
    stats=()=>({renderedTrees:patches.size,detailedTrees:[...patches.values()].filter(p=>!p.proxy).length});
    rebuild=()=>{const radius=low?3:4,wanted=new Set();for(let z=-radius;z<=radius;z++)for(let x=-radius;x<=radius;x++){const ax=cx+BigInt(x),az=cz+BigInt(z),key=ax+','+az,detailed=Math.max(Math.abs(x),Math.abs(z))<=(low?1:2);wanted.add(key);let p=patches.get(key);if(p&&!!p.proxy===detailed){disposePatch(p);patches.delete(key);p=null;}if(!p){p=detailed?makePatch(ax,az):makeProxy(ax,az);patches.set(key,p);}if(x===0&&z===0)focusLeaves=p.leaves;}
      for(const [key,p] of patches)if(!wanted.has(key)){disposePatch(p);patches.delete(key);}
      reposition();
      const palette=[0x719c46,0xd3a249,0x6299a0,0xb38a92,0x9fa653],zero=new T.Matrix4().makeScale(0,0,0),col=new T.Color();
      const levels=window.GardenNavigation.levels,depth=levels.indexOf(scope.level);
      clickable=[];
      for(const p of patches.values()){
        p.group.visible=depth===0||(p.group.userData.x===cx&&p.group.userData.z===cz);
        if(!p.group.visible)continue;
        if(p.proxy){clickable.push(...p.targets);continue;}
        p.model.leaves.forEach((l,i)=>{
          const visible=(depth<2||l.bough===scope.bough)&&(depth<3||l.branch===scope.branch)&&(depth<4||l.leaf===scope.leaf);
          p.leaves.setMatrixAt(i,visible?p.leafMatrices[i]:zero);
          col.setHex(depth===1?palette[l.bough-1]:depth===2?palette[l.branch-1]:0x76a44d);col.multiplyScalar(.82+l.color*.35);p.leaves.setColorAt(i,col);
        });
        p.model.limbs.forEach((l,i)=>{const visible=(depth<2||!l.bough||l.bough===scope.bough)&&(depth<3||!l.branch||l.branch===scope.branch);p.trunks.setMatrixAt(i,visible?p.trunkMatrices[i]:zero);});
        p.leaves.instanceMatrix.needsUpdate=true;p.leaves.instanceColor.needsUpdate=true;p.trunks.instanceMatrix.needsUpdate=true;
        clickable.push(p.leaves,p.trunks);
      }
      halo.visible=!!selected;
      if(selected&&focusLeaves){const l=focusLeaves.userData.model.leaves[G.leafIndex(selected)];halo.position.fromArray(l.position);halo.rotation.set(...l.rotation);halo.scale.setScalar(l.scale*1.1);}
      dirty=true;
    };
    const view={theta:.42,phi:.24,radius:24,target:new T.Vector3()};let dirty=true,tween=null,lastFrame=0,lastOut=-Infinity;
    const snapshot=()=>({theta:view.theta,phi:view.phi,radius:view.radius,target:view.target.clone()});
    const apply=v=>{view.theta=v.theta;view.phi=v.phi;view.radius=v.radius;view.target.copy(v.target);};
    transition=animate=>{const from=snapshot();refocus();const to=snapshot();if(!animate||reduce){tween=null;return;}to.theta=from.theta+Math.atan2(Math.sin(to.theta-from.theta),Math.cos(to.theta-from.theta));apply(from);tween={from,to,start:lastFrame};dirty=true;};
    reset=()=>{tween=null;const mobile=root.clientWidth<700;view.theta=.32;view.phi=scope.level==='forest'?.58:.22;view.radius=scope.level==='forest'?(mobile?43:38):(mobile?29:24);view.target.set(0,4.7,0);dirty=true;};
    refocus=()=>{
      if(scope.level==='forest'||scope.level==='tree'){reset();return;}
      const leaves=focusLeaves?.userData.model.leaves.filter(l=>l.bough===scope.bough&&(scope.level==='bough'||l.branch===scope.branch)&&(scope.level!=='leaf'||l.leaf===scope.leaf))||[];
      if(!leaves.length)return;
      view.target.set(0,0,0);for(const l of leaves)view.target.add(vA.fromArray(l.position));view.target.multiplyScalar(1/leaves.length);
      // Look inward from the chosen limb so the trunk cannot hide it.
      view.theta=Math.atan2(view.target.x,view.target.z);view.phi=.35;view.radius=scope.level==='leaf'?4.5:scope.level==='branch'?8.5:14;dirty=true;
    };
    zoom=(factor,{gesture=false}={})=>{
      if(!Number.isFinite(factor)||factor<=0)return;window.dispatchEvent(new Event('akshar-manual-view'));
      const next=view.radius*factor,limit={leaf:7,branch:13,bough:21,tree:root.clientWidth<700?42:36}[scope.level];
      if(factor>1&&limit&&next>limit){if(!gesture||Date.now()-lastOut>650){lastOut=Date.now();window.AksharExplorer?.zoomOut();}return;}
      tween=null;view.radius=Math.max(scope.level==='forest'?18:3,Math.min(65,next));dirty=true;
    };
    function updateCamera(){const v=view;camera.position.set(v.target.x+Math.sin(v.theta)*Math.cos(v.phi)*v.radius,v.target.y+Math.sin(v.phi)*v.radius,v.target.z+Math.cos(v.theta)*Math.cos(v.phi)*v.radius);camera.lookAt(v.target);camera.updateMatrixWorld();}
    setLight=()=>{fog.color.set(night?0x163b32:0xd4e0c6);hemi.intensity=night?.85:2.5;sun.intensity=night?.65:2.9;fill.intensity=night?1.1:1.4;groundMaterial.color.set(night?0x385c40:0x9cae83);root.style.background=night?'radial-gradient(ellipse at 72% 20%,#426a50,#183c32 55%,#122e27)':'';dirty=true;};
    const ray=new T.Raycaster(),mouse=new T.Vector2(),pointers=new Map();let gesture=null,moved=false,pinchDistance=0;
    function pick(x,y){
      const rect=renderer.domElement.getBoundingClientRect();mouse.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);updateCamera();ray.setFromCamera(mouse,camera);scene.updateMatrixWorld(true);
      const hits=ray.intersectObjects(clickable,false);
      for(const hit of hits){const data=hit.object.userData;if(scope.level==='forest'){window.aksharSelectPart?.({tree:data.id.toString(36),x:data.x.toString(),z:data.z.toString()});break;}if(!Number.isInteger(hit.instanceId))continue;const part=data.kind==='leaves'?G.slot(hit.instanceId):data.model.limbs[hit.instanceId];
        if(scope.level==='tree'&&!part.bough)continue;if(scope.level==='bough'&&(!part.branch||part.bough!==scope.bough))continue;if(scope.level==='branch'&&(data.kind!=='leaves'||part.bough!==scope.bough||part.branch!==scope.branch))continue;
        window.aksharSelectPart?.({tree:data.id.toString(36),bough:part.bough,branch:part.branch,leaf:part.leaf});break;
      }
    }
    const canvas=renderer.domElement;canvas.style.cursor='grab';
    canvas.addEventListener('pointerdown',e=>{window.dispatchEvent(new Event('akshar-manual-view'));tween=null;pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);if(pointers.size===1){gesture={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,theta:view.theta,phi:view.phi};moved=false;api.begin();}else{const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a[0]-b[0],a[1]-b[1]);moved=true;gesture=null;}});
    canvas.addEventListener('pointermove',e=>{
      if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);
      if(pointers.size>=2){const [a,b]=[...pointers.values()],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinchDistance>0&&distance>0)zoom(pinchDistance/distance,{gesture:true});pinchDistance=distance;moved=true;}
      else if(gesture){const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;
        if(moved&&scope.level==='forest'&&interaction==='pan'){
          const sx=e.clientX-gesture.lastX,sy=e.clientY-gesture.lastY,scale=2*view.radius*Math.tan(Math.PI/8)/Math.max(1,root.clientHeight)/G.SIZE,forward=sy/Math.max(.25,Math.sin(view.phi));
          api.shift((-sx*Math.cos(view.theta)-forward*Math.sin(view.theta))*scale,(sx*Math.sin(view.theta)-forward*Math.cos(view.theta))*scale);
        }else if(moved){view.theta=gesture.theta-dx*.005;view.phi=Math.max(.12,Math.min(1.25,gesture.phi+dy*.004));}
        if(moved){gesture.lastX=e.clientX;gesture.lastY=e.clientY;}
      }dirty=true;
    });
    function release(e,cancel=false){const tapped=!cancel&&pointers.size===1&&!moved;pointers.delete(e.pointerId);gesture=null;pinchDistance=0;if(!pointers.size){api.finish();if(tapped)pick(e.clientX,e.clientY);}else moved=true;}
    canvas.addEventListener('pointerup',e=>release(e));canvas.addEventListener('pointercancel',e=>release(e,true));canvas.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))release(e,true);});
    window.addEventListener('blur',()=>{pointers.clear();gesture=null;api.finish();});
    canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(Math.max(-.5,Math.min(.5,e.deltaY*.0015))),{gesture:true});},{passive:false});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback(Error('WebGL context lost'));});
    function resize(){const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;}
    if(window.ResizeObserver)new ResizeObserver(resize).observe(root);else window.addEventListener('resize',resize);
    const fireGeo=new T.BufferGeometry(),firePos=new Float32Array(90*3);for(let i=0;i<90;i++){firePos[i*3]=(rand()/4294967296-.5)*35;firePos[i*3+1]=1+rand()/4294967296*9;firePos[i*3+2]=(rand()/4294967296-.5)*35;}fireGeo.setAttribute('position',new T.BufferAttribute(firePos,3));const fire=new T.Points(fireGeo,new T.PointsMaterial({color:0xf7d784,size:.07,transparent:true,opacity:.6,depthWrite:false}));scene.add(fire);
    reset();rebuild();function frame(t){requestAnimationFrame(frame);if(document.hidden||document.querySelector('dialog[open]'))return;if(t-lastFrame<(low?1000/30:1000/60))return;lastFrame=t;if(tween){const k=Math.max(0,Math.min(1,(t-tween.start)/480)),e=k*k*(3-2*k),{from,to}=tween;view.theta=from.theta+(to.theta-from.theta)*e;view.phi=from.phi+(to.phi-from.phi)*e;view.radius=from.radius+(to.radius-from.radius)*e;view.target.copy(from.target).lerp(to.target,e);dirty=true;if(k===1)tween=null;}if(!reduce){fire.position.y=Math.sin(t*.00035)*.2;if(halo.visible)halo.material.emissiveIntensity=.4+Math.sin(t*.002)*.15;dirty=true;}if(dirty){updateCamera();renderer.render(scene,camera);dirty=false;}}requestAnimationFrame(frame);
    window.addEventListener('akshar-dialog-close',()=>{dirty=true;});
  }catch(error){fallback(error);}
})();
