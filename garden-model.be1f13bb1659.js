/* Pure geometry and world-address model, shared by renderer and tests. */
(function(root){
  'use strict';
  const C=root.BabelCore||(typeof require==='function'?require('./core.js'):null);
  const SIZE=19, mod=(n,m)=>(n%m+m)%m;
  function treeAt(x,z){return mod(C.pair(BigInt(x),BigInt(z)),C.TREES);}
  function locate(tree){return C.unpair(typeof tree==='bigint'?tree:C.fromBase36(tree));}
  function slot(index){return {bough:Math.floor(index/160)+1,branch:Math.floor(index%160/32)+1,leaf:index%32+1};}
  function leafIndex(loc){return ((loc.bough-1)*5+loc.branch-1)*32+loc.leaf-1;}
  function treeModel(id){
    const next=C.random('tree-v1/'+id.toString(36)),r=()=>next()/4294967296;
    const limbs=[],leaves=[],rootRadius=.7+r()*.2,height=8.8+r()*2.1,twist=r()*Math.PI*2;
    let currentBough=0,currentBranch=0;
    const add=(a,b,ra,rb)=>limbs.push({a,b,ra,rb,bough:currentBough,branch:currentBranch});
    for(let s=0;s<7;s++){const h=s*height/7;add([Math.sin(s*.45)*.22,h,Math.cos(s*.4)*.17],[Math.sin((s+1)*.45)*.22,h+height/7,Math.cos((s+1)*.4)*.17],rootRadius*(1-s/8),rootRadius*(1-(s+1)/8));}
    for(let j=0;j<7;j++){const a=j*Math.PI*2/7;add([0,.5,0],[Math.cos(a)*(1.6+r()),.03,Math.sin(a)*(1.6+r())],.24,.04);}
    for(let b=0;b<4;b++)for(let branch=0;branch<5;branch++){
      currentBough=b+1;currentBranch=branch+1;
      const angle=twist+b*Math.PI/2+branch*.19, y=2.2+branch*height*.115;
      const len=4.3-branch*.22+r()*.8, start=[.1,y,.1];
      const end=[Math.cos(angle)*len,y+1.8+r()*.8,Math.sin(angle)*len];
      const mid=[end[0]*.56,y+.6,end[2]*.56];add(start,mid,.24-branch*.022,.13);add(mid,end,.13,.035);
      for(let twig=0;twig<8;twig++){
        const t=.28+twig*.085,side=twig%2?1:-1;
        const p=[end[0]*t,y+(end[1]-y)*t,end[2]*t];
        const direction=angle+side*(.5+r()*.45),reach=.9+r()*.8;
        const tip=[p[0]+Math.cos(direction)*reach,p[1]+.15+r()*.65,p[2]+Math.sin(direction)*reach];add(p,tip,.035,.011);
        for(let l=0;l<4;l++){
          const u=.32+l*.23;
          leaves.push({position:[p[0]+(tip[0]-p[0])*u+(r()-.5)*.27,p[1]+(tip[1]-p[1])*u+(r()-.5)*.13,p[2]+(tip[2]-p[2])*u+(r()-.5)*.27],rotation:[-.5-r()*.6,direction+(l%2?-.45:.5),r()*.65],scale:.65+r()*.44,color:r(),...slot((b*5+branch)*32+twig*4+l)});
        }
      }
    }
    return {limbs,leaves,height};
  }
  const api={SIZE,treeAt,locate,slot,leafIndex,treeModel};root.GardenModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
