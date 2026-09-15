import * as THREE from '../three.module.js';
// Only positions already travelled after real bat contact. Never a landing hint.
export class OutgoingBallTrail {
 constructor(scene){this.samples=[];this.time=0;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(64*3),3));geometry.setDrawRange(0,0);this.line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xfff3bf,transparent:true,opacity:.65,depthWrite:false}));this.line.frustumCulled=false;scene.add(this.line);this.line.visible=false;}
 update(dt,state,position,contact){
  if(state!=='flight'||!contact){this.samples=[];this.time=0;this.line.visible=false;return;}
  if(dt<=0)return;this.time+=dt;this.samples.push({t:this.time,p:position.clone()});while(this.samples.length>64||(this.samples.length>2&&this.samples[0].t<this.time-.075))this.samples.shift();
  const attr=this.line.geometry.attributes.position;this.samples.forEach((s,i)=>attr.setXYZ(i,s.p.x,s.p.y,s.p.z));attr.needsUpdate=true;this.line.geometry.setDrawRange(0,this.samples.length);this.line.visible=this.samples.length>1;
 }
}
