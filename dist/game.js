import {addBallStitching,addNearGrass,detailMaterial} from './realism/SurfaceDetail.js';
import {buildWillowBat,createHuman} from './realism/PlayerBody.js';
import {boot} from './play.js';
import * as THREE from './three.module.js';
const $=id=>document.getElementById(id), canvas=$('game');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){$('panel').innerHTML='<h1>WebGL is unavailable</h1><p>Open this game in a browser with hardware acceleration enabled.</p>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color('#afcbd5');scene.fog=new THREE.Fog('#b5c9cc',65,180);
const camera=new THREE.PerspectiveCamera(64,innerWidth/innerHeight,.025,240);camera.position.set(.12,1.72,1.1);camera.lookAt(0,1.55,-20);
scene.add(new THREE.HemisphereLight('#e0edff','#526235',2.2));const sun=new THREE.DirectionalLight('#ffdfb1',3.1);sun.position.set(-35,40,-25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:130});sun.shadow.bias=-.0004;scene.add(sun);
const mat=(c,rough=1)=>new THREE.MeshStandardMaterial({color:c,roughness:rough});const grass=mat('#54834b'),clay=mat('#c2ac7b'),white=mat('#eee8d5'),navy=mat('#163b57'),skin=mat('#a97552');
function mesh(geo,m,x,y,z,parent=scene){let o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(w,h,d,m,x,y,z,p){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,p);}
function cylinder(r1,r2,h,m,x,y,z,p){return mesh(new THREE.CylinderGeometry(r1,r2,h,12),m,x,y,z,p);}
mesh(new THREE.CircleGeometry(86,96),grass,0,-.035,-10).rotation.x=-Math.PI/2;
for(let i=0;i<16;i++){let strip=box(8,.012,145,mat(i%2?'#5a8850':'#527e48'),(i-7.5)*8,-.019,-10);strip.receiveShadow=true;strip.castShadow=false;}
box(3.05,.025,20.12,clay,0,-.02,-9.06);box(3.8,.01,22,mat('#a59a66'),0,-.035,-9.06);
// Fine, deterministic pitch wear gives the surface depth without an image dependency.
let seed=31;function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
const marks=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.001,1),mat('#978658'),650),dummy=new THREE.Object3D();for(let i=0;i<650;i++){dummy.position.set((random()-.5)*2.9,.024,-22+random()*24);dummy.scale.set(.01+random()*.035,1,.02+random()*.15);dummy.rotation.y=random()*3;dummy.updateMatrix();marks.setMatrixAt(i,dummy.matrix);}scene.add(marks);
for(const z of [-19.12,1]){const dir=z<0?1:-1;box(2.64,.009,.045,white,0,.005,z);box(3.05,.009,.045,white,0,.005,z+dir*1.22);for(const x of [-1.32,1.32])box(.04,.009,2,white,x,.005,z+dir*.6);for(const x of [-.095,0,.095])cylinder(.019,.019,.711,white,x,.3555,z);box(.2286,.025,.025,white,0,.711,z);}
// A full 3D stadium, including tiered seating, roof, railings and floodlights.
const seatMats=['#254653','#dae0cb','#b8c5b7','#698480'].map(c=>mat(c));
for(let sector=0;sector<36;sector++){const a=sector/36*Math.PI*2;let group=new THREE.Group();group.position.set(Math.sin(a)*74,0,Math.cos(a)*74-10);group.rotation.y=a;scene.add(group);for(let tier=0;tier<4;tier++){box(12,1.5,3,mat('#506268'),0,2+tier*2.6,tier*3,group);for(let row=0;row<3;row++){box(12,.12,.08,white,0,2.9+tier*2.6+row*.4,tier*3+row*.7,group);for(let s=0;s<19;s++){box(.37,.42,.34,seatMats[Math.floor(random()*4)],(s-9)*.6,2.9+tier*2.6+row*.4,tier*3+row*.7,group);}}}box(12,.32,17,mat('#d2d5c9'),0,14,4,group);box(.18,13,.18,white,-5.8,6.5,9,group);box(12,1.25,.2,navy,0,.9,-2,group);}
const rope=new THREE.Mesh(new THREE.TorusGeometry(64,.065,6,180),white);rope.rotation.x=Math.PI/2;rope.position.set(0,.06,-10);scene.add(rope);
for(let i=0;i<6;i++){let a=i*Math.PI/3+.2,x=Math.sin(a)*68,z=Math.cos(a)*68-10;cylinder(.13,.3,24,mat('#a8b3b1'),x,12,z);let light=box(6,2,.25,mat('#fff3c9'),x,24,z);light.lookAt(0,24,-10);}
box(11,5,.15,white,0,2.7,-42);
// Batch static architecture into instanced draws to keep mobile GPU overhead low.
scene.updateMatrixWorld(true);const batches=new Map();scene.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.geometry.type==='BoxGeometry'){const key=o.material.color.getHexString();if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);}});for(const list of batches.values()){const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),list[0].material,list.length);list.forEach((o,i)=>{const p=o.geometry.parameters,m=o.matrixWorld.clone();m.scale(new THREE.Vector3(p.width,p.height,p.depth));batch.setMatrixAt(i,m);o.parent.remove(o);o.geometry.dispose();});batch.receiveShadow=true;batch.castShadow=true;scene.add(batch);}
function person(x,z){return createHuman(scene,x,z);}
let bowler=person(.55,-27);
box(.075,.07,.04,skin,0,-.005,0,bowler.hand);for(let i=0;i<4;i++){const finger=cylinder(.009,.011,.065,skin,-.028+i*.018,-.06,.006,bowler.hand);finger.rotation.x=.35;}box(.025,.055,.025,skin,.047,-.018,0,bowler.hand);
let umpire=person(-.8,-23);umpire.torso.material=mat('#e7dfca');
detailMaterial(clay,'soil');const nearGrass=addNearGrass(scene);
const ball=mesh(new THREE.SphereGeometry(.0361,20,16),mat('#b51e2e',.43),0,-5,0);const seam=new THREE.Mesh(new THREE.TorusGeometry(.0363,.0012,4,40),white);ball.add(seam);addBallStitching(ball);
scene.add(camera);sun.shadow.camera.layers.enable(1);
const batModel=buildWillowBat(),batRig=batModel.rig;scene.add(batRig);
for(const [x,z] of [[0,6],[-3,7],[-6,6.5],[15,1],[-18,-25]]){const f=createHuman(scene,x,z);if(z>3){f.limbs[0].rotation.x=-.2;f.limbs[1].rotation.x=-.2;f.limbs[2].rotation.x=-.6;f.limbs[3].rotation.x=-.6;}}
boot({scene,camera,renderer,canvas,ball,batRig,bowler,batModel,sun,nearGrass});
