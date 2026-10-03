(function(){
  'use strict';
  const T=window.THREE,C=window.BabelCore,G=window.GardenModel,root=document.getElementById('world');
  let cx=0n,cz=0n,focusTree=0n,selected=null,renderer=null,night=false;
  let low=matchMedia('(max-width:700px)').matches,reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const label=n=>n.toString(36).length>18?n.toString(36).slice(0,7)+'…'+n.toString(36).slice(-5):n.toString(36);
  let scope={level:'forest',tree:'0',bough:1,branch:1,leaf:1};
  function announce(){focusTree=G.treeAt(cx,cz);document.getElementById('treeCaption').textContent='বৃক্ষ '+label(focusTree);document.getElementById('groveTitle').textContent=cx===0n&&cz===0n?'প্রথম প্রাঙ্গণ':'প্রাঙ্গণ '+label(cx)+' / '+label(cz);}
  let rebuild=()=>{},reset=()=>{},setLight=()=>{},refocus=()=>{},zoom=()=>{};
  const api={tree:()=>focusTree,coords:()=>[cx,cz],
    move(dx,dz){cx+=BigInt(dx);cz+=BigInt(dz);scope={...scope,level:'forest',tree:G.treeAt(cx,cz).toString(36)};selected=null;announce();rebuild();reset();window.dispatchEvent(new CustomEvent('akshar-grove-change',{detail:scope}));},
    browse(value){scope={...value};focusTree=C.fromBase36(scope.tree);[cx,cz]=G.locate(focusTree);selected=scope.level==='leaf'?scope:null;announce();rebuild();refocus();},
    home(){this.browse({level:'forest',tree:'0',bough:1,branch:1,leaf:1});},
    reset:()=>{reset();refocus();},zoom:factor=>zoom(factor),
    quality(value){low=value;if(renderer){renderer.setPixelRatio(low?1:Math.min(devicePixelRatio||1,1.75));rebuild();}},night(value){night=value;setLight();}};
  window.AksharGarden=api;announce();
  function fallback(error){console.warn('3D unavailable; text navigation remains available.',error?.message||'');document.getElementById('worldFallback').hidden=false;if(renderer)renderer.domElement.style.display='none';}
  if(!T){fallback();return;}
  try{
    const scene=new T.Scene(),fog=new T.FogExp2(0xd4e0c6,.022);scene.fog=fog;
    renderer=new T.WebGLRenderer({antialias:!low,alpha:true,powerPreference:'default'});renderer.setPixelRatio(low?1:Math.min(devicePixelRatio||1,1.75));renderer.setSize(root.clientWidth,root.clientHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;root.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','গাছে চাপলে ডাল, ডালে চাপলে শাখা, শাখায় চাপলে পাতা দেখাবে; ঘোরাতে টেনে নাও');
    const camera=new T.PerspectiveCamera(45,root.clientWidth/root.clientHeight,.1,150);
    const hemi=new T.HemisphereLight(0xfff8db,0x5c7854,2.5),sun=new T.DirectionalLight(0xffe9ab,2.9),fill=new T.DirectionalLight(0xaccec2,1.4);sun.position.set(-9,18,10);fill.position.set(14,9,-10);scene.add(hemi,sun,fill);
    const groundMaterial=new T.MeshStandardMaterial({color:0x9cae83,roughness:1});const ground=new T.Mesh(new T.CircleGeometry(90,64),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.15;scene.add(ground);
    const pond=new T.Mesh(new T.CircleGeometry(6,48),new T.MeshStandardMaterial({color:0x638f7c,metalness:.3,roughness:.24,transparent:true,opacity:.83}));pond.rotation.x=-Math.PI/2;pond.position.set(-9,-.09,9);pond.scale.set(1,.54,1);scene.add(pond);
    const treeMat=new T.MeshStandardMaterial({color:0x69593d,roughness:1});const leafMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.82,side:T.DoubleSide,vertexColors:true});
    const limbGeo=new T.CylinderGeometry(.72,1,1,6,1);const leafShape=new T.Shape();leafShape.moveTo(0,0);leafShape.bezierCurveTo(-.7,.47,-.45,1.1,0,1.55);leafShape.bezierCurveTo(.54,1.08,.58,.41,0,0);const leafGeo=new T.ShapeGeometry(leafShape,4);const pos=leafGeo.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,.13*Math.sin(pos.getY(i)*2)*Math.max(0,1-Math.abs(pos.getX(i))*2));leafGeo.computeVertexNormals();
    const stonesMat=new T.MeshStandardMaterial({color:0xb0b198,roughness:1}),stoneGeo=new T.DodecahedronGeometry(1,0),dummy=new T.Object3D(),up=new T.Vector3(0,1,0),vA=new T.Vector3(),vB=new T.Vector3();
    const stones=new T.InstancedMesh(stoneGeo,stonesMat,26);for(let i=0;i<26;i++){const ang=i*.28;dummy.position.set(Math.sin(ang)*3.7-1,.04,3+i*.9);dummy.rotation.set(.1,i*.3,.12);dummy.scale.set(.64,.14,.43);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);}scene.add(stones);
    const patches=new Map();let clickable=[],focusLeaves=null;
    const halo=new T.Mesh(leafGeo,new T.MeshStandardMaterial({color:0xf8c76a,emissive:0xe5a433,emissiveIntensity:.4,side:T.DoubleSide}));halo.visible=false;scene.add(halo);
    const ecology=new T.Group();scene.add(ecology);const reedGeo=new T.ConeGeometry(.09,.8,3),reedMat=new T.MeshStandardMaterial({color:0x789260,roughness:1});const reeds=new T.InstancedMesh(reedGeo,reedMat,450);const rand=C.random('ground-v1');for(let i=0;i<450;i++){const x=(rand()/4294967296-.5)*42,z=(rand()/4294967296-.5)*42;dummy.position.set(x,.25,z);dummy.scale.set(1,.6+(rand()/4294967296),1);dummy.rotation.set(.1,rand()/4294967296*6.3,.16);dummy.updateMatrix();reeds.setMatrixAt(i,dummy.matrix);}ecology.add(reeds);
    function makePatch(x,z){const id=G.treeAt(x,z),model=G.treeModel(id),group=new T.Group();group.userData={x,z,id};
      const trunks=new T.InstancedMesh(limbGeo,treeMat,model.limbs.length),trunkMatrices=[],leafMatrices=[];trunks.userData={id,model,kind:'trunks'};
      model.limbs.forEach((b,i)=>{vA.fromArray(b.a);vB.fromArray(b.b);dummy.position.copy(vA).add(vB).multiplyScalar(.5);const length=vA.distanceTo(vB);dummy.quaternion.setFromUnitVectors(up,vB.sub(vA).normalize());dummy.scale.set(b.ra,length,b.ra);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);trunkMatrices.push(dummy.matrix.clone());});trunks.computeBoundingSphere();group.add(trunks);
      const leaves=new T.InstancedMesh(leafGeo,leafMat,640);const dark=new T.Color(0x48784a),light=new T.Color(0xa8be69),color=new T.Color();model.leaves.forEach((l,i)=>{dummy.position.fromArray(l.position);dummy.rotation.set(...l.rotation);dummy.scale.setScalar(l.scale);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leafMatrices.push(dummy.matrix.clone());leaves.setColorAt(i,color.copy(dark).lerp(light,l.color));});leaves.computeBoundingSphere();leaves.userData={id,model,kind:'leaves'};group.add(leaves);scene.add(group);return {group,leaves,trunks,model,leafMatrices,trunkMatrices};}
    rebuild=()=>{const radius=low?1:2,wanted=new Set();for(let z=-radius;z<=radius;z++)for(let x=-radius;x<=radius;x++){const ax=cx+BigInt(x),az=cz+BigInt(z),key=ax+','+az;wanted.add(key);let p=patches.get(key);if(!p){p=makePatch(ax,az);patches.set(key,p);}p.group.position.set(x*G.SIZE,0,z*G.SIZE);if(x===0&&z===0)focusLeaves=p.leaves;}
      for(const [key,p] of patches)if(!wanted.has(key)){scene.remove(p.group);p.group.traverse(obj=>{if(obj.isInstancedMesh)obj.dispose();});patches.delete(key);}
      const palette=[0x719c46,0xd3a249,0x6299a0,0xb38a92,0x9fa653],zero=new T.Matrix4().makeScale(0,0,0),col=new T.Color();
      const levels=window.GardenNavigation.levels,depth=levels.indexOf(scope.level);
      clickable=[];
      for(const p of patches.values()){
        p.group.visible=depth===0||p.group.userData.id===focusTree;
        if(!p.group.visible)continue;
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
    const view={theta:.42,phi:.24,radius:24,target:new T.Vector3()};let dirty=true;
    reset=()=>{const mobile=root.clientWidth<700;view.theta=.32;view.phi=.22;view.radius=mobile?29:24;view.target.set(0,4.7,0);dirty=true;};
    refocus=()=>{
      if(scope.level==='forest'||scope.level==='tree'){reset();return;}
      const leaves=focusLeaves?.userData.model.leaves.filter(l=>l.bough===scope.bough&&(scope.level==='bough'||l.branch===scope.branch)&&(scope.level!=='leaf'||l.leaf===scope.leaf))||[];
      if(!leaves.length)return;
      view.target.set(0,0,0);for(const l of leaves)view.target.add(vA.fromArray(l.position));view.target.multiplyScalar(1/leaves.length);
      // Look inward from the chosen limb so the trunk cannot hide it.
      view.theta=Math.atan2(view.target.x,view.target.z);view.phi=.35;view.radius=scope.level==='leaf'?4.5:scope.level==='branch'?8.5:14;dirty=true;
    };
    zoom=factor=>{view.radius=Math.max(3,Math.min(60,view.radius*factor));dirty=true;};
    function updateCamera(){const v=view;camera.position.set(v.target.x+Math.sin(v.theta)*Math.cos(v.phi)*v.radius,v.target.y+Math.sin(v.phi)*v.radius,v.target.z+Math.cos(v.theta)*Math.cos(v.phi)*v.radius);camera.lookAt(v.target);camera.updateMatrixWorld();}
    setLight=()=>{fog.color.set(night?0x163b32:0xd4e0c6);hemi.intensity=night?.85:2.5;sun.intensity=night?.65:2.9;fill.intensity=night?1.1:1.4;groundMaterial.color.set(night?0x385c40:0x9cae83);root.style.background=night?'radial-gradient(ellipse at 72% 20%,#426a50,#183c32 55%,#122e27)':'';dirty=true;};
    const ray=new T.Raycaster(),mouse=new T.Vector2(),pointers=new Map();let gesture=null,moved=false,pinchDistance=0;
    function pick(x,y){
      const rect=renderer.domElement.getBoundingClientRect();mouse.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);updateCamera();ray.setFromCamera(mouse,camera);scene.updateMatrixWorld(true);
      const hits=ray.intersectObjects(clickable,false);
      for(const hit of hits){if(!Number.isInteger(hit.instanceId))continue;const data=hit.object.userData,part=data.kind==='leaves'?G.slot(hit.instanceId):data.model.limbs[hit.instanceId];
        if(scope.level==='tree'&&!part.bough)continue;if(scope.level==='bough'&&(!part.branch||part.bough!==scope.bough))continue;if(scope.level==='branch'&&(data.kind!=='leaves'||part.bough!==scope.bough||part.branch!==scope.branch))continue;
        window.aksharSelectPart?.({tree:data.id.toString(36),bough:part.bough,branch:part.branch,leaf:part.leaf});break;
      }
    }
    const canvas=renderer.domElement;canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);gesture={x:e.clientX,y:e.clientY,theta:view.theta,phi:view.phi};moved=false;if(pointers.size===2){const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a[0]-b[0],a[1]-b[1]);moved=true;}});
    canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinchDistance>0&&distance>0)view.radius=Math.max(3,Math.min(60,view.radius*pinchDistance/distance));pinchDistance=distance;moved=true;}else if(gesture){const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;view.theta=gesture.theta-dx*.005;view.phi=Math.max(.04,Math.min(.85,gesture.phi+dy*.004));}dirty=true;});
    canvas.addEventListener('pointerup',e=>{if(pointers.size===1&&!moved)pick(e.clientX,e.clientY);pointers.delete(e.pointerId);gesture=null;pinchDistance=0;});canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;});canvas.addEventListener('wheel',e=>{e.preventDefault();view.radius=Math.max(3,Math.min(60,view.radius+e.deltaY*.025));dirty=true;},{passive:false});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback(Error('WebGL context lost'));});
    function resize(){const w=Math.max(1,root.clientWidth),h=Math.max(1,root.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;}
    if(window.ResizeObserver)new ResizeObserver(resize).observe(root);else window.addEventListener('resize',resize);
    const fireGeo=new T.BufferGeometry(),firePos=new Float32Array(90*3);for(let i=0;i<90;i++){firePos[i*3]=(rand()/4294967296-.5)*35;firePos[i*3+1]=1+rand()/4294967296*9;firePos[i*3+2]=(rand()/4294967296-.5)*35;}fireGeo.setAttribute('position',new T.BufferAttribute(firePos,3));const fire=new T.Points(fireGeo,new T.PointsMaterial({color:0xf7d784,size:.07,transparent:true,opacity:.6,depthWrite:false}));scene.add(fire);
    let lastFrame=0;reset();rebuild();function frame(t){requestAnimationFrame(frame);if(document.hidden||document.querySelector('dialog[open]'))return;if(t-lastFrame<(low?1000/30:1000/60))return;lastFrame=t;if(!reduce){fire.position.y=Math.sin(t*.00035)*.2;if(halo.visible)halo.material.emissiveIntensity=.4+Math.sin(t*.002)*.15;dirty=true;}if(dirty){updateCamera();renderer.render(scene,camera);dirty=false;}}requestAnimationFrame(frame);
    window.addEventListener('akshar-dialog-close',()=>{dirty=true;});
  }catch(error){fallback(error);}
})();
