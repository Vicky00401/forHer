// ✅ AFTER — everything from jsdelivr, single Three.js instance
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.129.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.129.0/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'https://cdn.jsdelivr.net/npm/meshoptimizer@0.18.1/meshopt_decoder.module.js';
import { gsap } from 'https://cdn.skypack.dev/gsap';;

// ─── Date & Progress ──────────────────────────────────────────────────────────
const BIRTHDAY    = new Date('2026-04-10T00:00:00');
const COUNT_START = new Date('2026-03-15T00:00:00');
const TOTAL_DAYS  = Math.round((BIRTHDAY - COUNT_START) / 86400000); // 26

function getDayIndex() {
  const now = new Date(); now.setHours(0,0,0,0);
  const s   = new Date(COUNT_START); s.setHours(0,0,0,0);
  return Math.max(0, Math.min(TOTAL_DAYS, Math.floor((now - s) / 86400000)));
}
// p = 0.000 on Mar 15  →  p = 1.000 exactly on Apr 10  →  shadow fully gone, full texture
function getMoonProgress() { return Math.min(1, getDayIndex() / TOTAL_DAYS); }

// ─── Silent Ping ──────────────────────────────────────────────────────────────
(function () {
  const t = new Date().toLocaleString('en-IN', {
    timeZone:'Asia/Kolkata', weekday:'long', year:'numeric',
    month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'
  });
  fetch('/api/moon-ping/', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      time: t, day_index: getDayIndex(),
      days_remaining: TOTAL_DAYS - getDayIndex(),
      moon_progress_percent: Math.round(getMoonProgress() * 100)
    })
  }).catch(() => {});
})();

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
let object1;

// ══════════════════════════════════════════════════════════════════════════════
//  LIVE 2D AURORA CANVAS  — sits behind the WebGL canvas
//  6 drifting nebula blobs  •  4 aurora bands  •  2 lightning wisps
//  200 dust particles in two tints  •  everything animates every frame
// ══════════════════════════════════════════════════════════════════════════════
const bgCanvas = document.createElement('canvas');
bgCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;';
document.body.insertBefore(bgCanvas, document.body.firstChild);
const bgCtx = bgCanvas.getContext('2d');

// 6 nebula blobs — purples, magentas, deep blues, teal
const auroraBlobs = [
  { x:0.12, y:0.28, vx: 0.000055, vy: 0.000038, r:0.62, hue:268, sat:85 },
  { x:0.78, y:0.52, vx:-0.000042, vy:-0.000028, r:0.55, hue:302, sat:78 },
  { x:0.44, y:0.82, vx: 0.000032, vy:-0.000048, r:0.50, hue:248, sat:80 },
  { x:0.88, y:0.18, vx:-0.000028, vy: 0.000042, r:0.40, hue:322, sat:72 },
  { x:0.22, y:0.68, vx: 0.000038, vy: 0.000025, r:0.46, hue:192, sat:75 },
  { x:0.60, y:0.35, vx:-0.000030, vy: 0.000035, r:0.42, hue:280, sat:70 },
];

// 200 dust particles — purple tint (2 in 3) + cyan tint (1 in 3)
const dustParticles = [];
for (let i = 0; i < 200; i++) {
  dustParticles.push({
    x: Math.random(), y: Math.random(),
    vx:(Math.random()-0.5)*0.000048, vy:(Math.random()-0.5)*0.000028,
    r: 0.3 + Math.random()*1.4,
    opacity: 0.05 + Math.random()*0.14,
    phase: Math.random()*Math.PI*2,
    tint: (i%3!==0) ? [180,155,255] : [155,220,255],
  });
}

// 2 slow lightning wisps
const wisps = [
  { x:0.30, y:0.40, vx: 0.000018, vy: 0.000010, phase:0.0 },
  { x:0.70, y:0.60, vx:-0.000014, vy:-0.000012, phase:2.1 },
];

function resizeBg() { bgCanvas.width=window.innerWidth; bgCanvas.height=window.innerHeight; }
resizeBg();

function drawAurora(t) {
  const W=bgCanvas.width, H=bgCanvas.height;
  bgCtx.clearRect(0,0,W,H);

  // Barely-visible deep space base that breathes
  const base = 2 + Math.sin(t*0.025)*2;
  bgCtx.fillStyle=`rgb(${Math.round(base+1)},${Math.round(base)},${Math.round(base+6)})`;
  bgCtx.fillRect(0,0,W,H);

  // ── 6 nebula blobs — opacity reduced ~40% ──────────────────────────────────
  for (const b of auroraBlobs) {
    b.x+=b.vx; b.y+=b.vy;
    if (b.x<-0.2||b.x>1.2) b.vx*=-1;
    if (b.y<-0.2||b.y>1.2) b.vy*=-1;
    const cx=b.x*W, cy=b.y*H, rx=b.r*Math.max(W,H);
    const hue=b.hue+Math.sin(t*0.016+b.x*5)*25;
    const alpha=0.038+Math.sin(t*0.010+b.y*3)*0.016;
    const g=bgCtx.createRadialGradient(cx,cy,0,cx,cy,rx);
    g.addColorStop(0,   `hsla(${hue},${b.sat}%,24%,${alpha})`);
    g.addColorStop(0.30,`hsla(${hue},${b.sat}%,16%,${alpha*0.65})`);
    g.addColorStop(0.65,`hsla(${hue},${b.sat}%,10%,${alpha*0.28})`);
    g.addColorStop(1,   `hsla(${hue},${b.sat}%, 5%,0)`);
    bgCtx.fillStyle=g; bgCtx.fillRect(0,0,W,H);
  }

  // ── Aurora band 1 — upper purple, opacity reduced ~45% ─────────────────────
  const b1y=H*(0.28+Math.sin(t*0.0065)*0.08), b1h=H*0.30;
  const a1=0.07+Math.sin(t*0.010)*0.03;
  const g1=bgCtx.createLinearGradient(0,b1y-b1h,0,b1y+b1h);
  g1.addColorStop(0,   'rgba(0,0,0,0)');
  g1.addColorStop(0.22,`rgba(45,8,90,${a1*0.45})`);
  g1.addColorStop(0.50,`rgba(70,18,130,${a1})`);
  g1.addColorStop(0.78,`rgba(45,8,90,${a1*0.45})`);
  g1.addColorStop(1,   'rgba(0,0,0,0)');
  bgCtx.fillStyle=g1; bgCtx.fillRect(0,b1y-b1h,W,b1h*2);

  // ── Aurora band 2 — lower magenta, opacity reduced ~45% ───────────────────
  const b2y=H*(0.70+Math.sin(t*0.0085+1.8)*0.07), b2h=H*0.24;
  const a2=0.055+Math.sin(t*0.013+2.2)*0.025;
  const g2=bgCtx.createLinearGradient(0,b2y-b2h,0,b2y+b2h);
  g2.addColorStop(0,   'rgba(0,0,0,0)');
  g2.addColorStop(0.28,`rgba(90,8,65,${a2*0.5})`);
  g2.addColorStop(0.50,`rgba(115,14,85,${a2})`);
  g2.addColorStop(0.72,`rgba(90,8,65,${a2*0.5})`);
  g2.addColorStop(1,   'rgba(0,0,0,0)');
  bgCtx.fillStyle=g2; bgCtx.fillRect(0,b2y-b2h,W,b2h*2);

  // ── Aurora band 3 — teal ribbon, opacity reduced ~45% ──────────────────────
  const ripple=Math.sin(t*0.0055)*0.14;
  const g3=bgCtx.createLinearGradient(W*(0.08+ripple),0,W*(0.92+ripple),0);
  const a3=0.030+Math.sin(t*0.012+1.2)*0.012;
  g3.addColorStop(0,   'rgba(0,0,0,0)');
  g3.addColorStop(0.25,`rgba(8,42,95,${a3})`);
  g3.addColorStop(0.50,`rgba(18,65,140,${a3*1.6})`);
  g3.addColorStop(0.75,`rgba(8,42,95,${a3})`);
  g3.addColorStop(1,   'rgba(0,0,0,0)');
  bgCtx.fillStyle=g3; bgCtx.fillRect(0,H*0.33,W,H*0.34);

  // ── Aurora band 4 — violet radial bloom, opacity reduced ~45% ─────────────
  const b4x=W*(0.50+Math.sin(t*0.0042)*0.18);
  const g4=bgCtx.createRadialGradient(b4x,H*0.5,0,b4x,H*0.5,W*0.45);
  const a4=0.020+Math.sin(t*0.009+3.0)*0.009;
  g4.addColorStop(0,  `rgba(60,20,100,${a4})`);
  g4.addColorStop(0.5,`rgba(30,10,60,${a4*0.4})`);
  g4.addColorStop(1,  'rgba(0,0,0,0)');
  bgCtx.fillStyle=g4; bgCtx.fillRect(0,0,W,H);

  // ── Lightning wisps — slow-moving flickering glows ─────────────────────────
  for (const w of wisps) {
    w.x+=w.vx; w.y+=w.vy; w.phase+=0.018;
    if (w.x<0.1||w.x>0.9) w.vx*=-1;
    if (w.y<0.1||w.y>0.9) w.vy*=-1;
    const wx=w.x*W, wy=w.y*H;
    const flicker=0.5+0.5*Math.sin(t*3.5+w.phase*7);
    const wAlpha=flicker*(0.04+Math.sin(t*0.8+w.phase)*0.025);
    if (wAlpha>0.005) {
      const gw=bgCtx.createRadialGradient(wx,wy,0,wx,wy,W*0.12);
      gw.addColorStop(0,  `rgba(200,180,255,${wAlpha})`);
      gw.addColorStop(0.4,`rgba(140,120,255,${wAlpha*0.4})`);
      gw.addColorStop(1,  'rgba(0,0,0,0)');
      bgCtx.fillStyle=gw; bgCtx.fillRect(0,0,W,H);
    }
  }

  // ── 200 dust particles ─────────────────────────────────────────────────────
  for (const d of dustParticles) {
    d.x+=d.vx; d.y+=d.vy;
    if (d.x<0) d.x=1; if (d.x>1) d.x=0;
    if (d.y<0) d.y=1; if (d.y>1) d.y=0;
    const pulse=d.opacity*(0.65+0.35*Math.sin(t*1.0+d.phase));
    bgCtx.beginPath();
    bgCtx.arc(d.x*W,d.y*H,d.r,0,Math.PI*2);
    bgCtx.fillStyle=`rgba(${d.tint[0]},${d.tint[1]},${d.tint[2]},${pulse})`;
    bgCtx.fill();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  CAMERA  — FOV-based zoom so HTML UI is never affected
// ══════════════════════════════════════════════════════════════════════════════
const BASE_FOV=28, MIN_FOV=12, MAX_FOV=50;
let targetFov=BASE_FOV, currentFov=BASE_FOV;

const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,0,14);
camera.lookAt(0,0,0);

// ─── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping          = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure  = 0;
renderer.shadowMap.enabled    = true;
renderer.shadowMap.type       = THREE.PCFSoftShadowMap;
renderer.outputEncoding       = THREE.sRGBEncoding;
renderer.localClippingEnabled = true;
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);
renderer.domElement.style.touchAction = 'none';

// ── Model-only zoom: wheel + pinch change FOV, never move camera ──────────────
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  targetFov = Math.max(MIN_FOV, Math.min(MAX_FOV, targetFov + e.deltaY * 0.04));
}, { passive:false });

let lastPinchDist = null;
renderer.domElement.addEventListener('touchstart', (e) => {
  if (e.touches.length===2) {
    const dx=e.touches[0].clientX-e.touches[1].clientX;
    const dy=e.touches[0].clientY-e.touches[1].clientY;
    lastPinchDist=Math.sqrt(dx*dx+dy*dy);
  }
}, { passive:true });
renderer.domElement.addEventListener('touchmove', (e) => {
  if (e.touches.length===2 && lastPinchDist!==null) {
    e.preventDefault();
    const dx=e.touches[0].clientX-e.touches[1].clientX;
    const dy=e.touches[0].clientY-e.touches[1].clientY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    targetFov=Math.max(MIN_FOV,Math.min(MAX_FOV,targetFov+(lastPinchDist-dist)*0.08));
    lastPinchDist=dist;
  }
}, { passive:false });
renderer.domElement.addEventListener('touchend', ()=>{ lastPinchDist=null; });

// ─── Lights ───────────────────────────────────────────────────────────────────
const keyLight = new THREE.DirectionalLight(0xb8ccf0, 1);
keyLight.castShadow=true;
keyLight.shadow.mapSize.set(4096,4096);
keyLight.shadow.camera.near= 0.5; keyLight.shadow.camera.far=25;
keyLight.shadow.camera.left=-4;   keyLight.shadow.camera.right=4;
keyLight.shadow.camera.top= 4;    keyLight.shadow.camera.bottom=-4;
keyLight.shadow.bias=-0.0003;
scene.add(keyLight);

// Corona rim — blazing white-blue at Day 0 (eclipse), gone at full moon
const rimLight = new THREE.SpotLight(0xd0e8ff, 1);
rimLight.angle=Math.PI/5.0; rimLight.penumbra=0.60;
rimLight.decay=1.2; rimLight.distance=35;
scene.add(rimLight);

const backLight = new THREE.DirectionalLight(0x0d1a35, 0.35);
backLight.position.set(-5,-1.5,-4);
scene.add(backLight);

scene.add(new THREE.AmbientLight(0x030610, 0.5));
scene.add(new THREE.HemisphereLight(0x0a1428, 0x000000, 0.15));

// ── Phase-driven light update ─────────────────────────────────────────────────
// p=0 (Day 0,  Mar 15): light directly behind moon (178°) → ultra-thin rim only
//                        rimLight blazing → creates white corona halo
// p=1 (Day 26, Apr 10): light near-front  (6°)  → full face lit, rim off
function updateLightForPhase(p) {
  const angle = THREE.MathUtils.lerp(Math.PI*0.988, Math.PI*0.033, p);
  keyLight.position.set(Math.sin(angle)*9, 4.8-p*2.0, Math.cos(angle)*9.5);
  keyLight.intensity = THREE.MathUtils.lerp(0.5, 5.4, p);

  rimLight.position.set(Math.sin(angle)*5.5, 5.2-p*2.5, Math.cos(angle)*5.5);
  rimLight.intensity = THREE.MathUtils.lerp(10.0, 0.2, p); // blazing at eclipse

  backLight.intensity = THREE.MathUtils.lerp(0.65, 0.12, p);

  // Sync exposure after initial fade-in animation
  if (frame > 330) renderer.toneMappingExposure = THREE.MathUtils.lerp(0.42, 1.02, p);
}

// ══════════════════════════════════════════════════════════════════════════════
//  SHADOW SPHERE  — dark mesh clipped by a plane, reveals the moon day by day
//
//  Clip plane normal (-1,0,0), constant C:
//    fragment clipped when:  dot((-1,0,0), pos) + C < 0
//                        →   -x + C < 0   →   x > C
//
//  Day  0 (p=0.000): C = cx + R·0.993  →  only a 0.7% rim escapes → eclipse halo
//  Day 26 (p=1.000): C = cx - R        →  shadow covers nothing   → full moon
// ══════════════════════════════════════════════════════════════════════════════
const SHADOW_R = 1.08;
const shadowClipPlane = new THREE.Plane(new THREE.Vector3(-1,0,0), 0);
const shadowSphere = new THREE.Mesh(
  new THREE.SphereGeometry(SHADOW_R, 128, 128),
  new THREE.MeshBasicMaterial({
    color:0x010406, depthWrite:false, side:THREE.FrontSide,
    clippingPlanes:[shadowClipPlane],
  })
);
shadowSphere.renderOrder = 2;
scene.add(shadowSphere);

function updateShadow(p) {
  const cx = getMoonWorldPos(p).x;
  const R  = SHADOW_R; // scale always 1.0
  // Ultra-thin at day 0, fully open on Apr 10
  shadowClipPlane.constant = THREE.MathUtils.lerp(cx + R*0.993, cx - R, p);
}

// ─── Lens Flare (2D canvas overlay) ──────────────────────────────────────────
const flareCanvas = document.createElement('canvas');
flareCanvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;';
document.body.appendChild(flareCanvas);
const flareCtx = flareCanvas.getContext('2d');
function resizeFlare() { flareCanvas.width=window.innerWidth; flareCanvas.height=window.innerHeight; }
resizeFlare();

function drawFlare(progress) {
  const W=flareCanvas.width, H=flareCanvas.height;
  flareCtx.clearRect(0,0,W,H);
  const fo=Math.max(0, 1-progress*3.5);
  if (fo<=0) return;

  const angle=THREE.MathUtils.lerp(Math.PI*0.988, Math.PI*0.033, progress);
  const sx=(0.60+Math.sin(angle)*0.14)*W, sy=0.16*H;

  // Outer halo
  const g1=flareCtx.createRadialGradient(sx,sy,0,sx,sy,W*0.30);
  g1.addColorStop(0,  `rgba(255,225,170,${0.26*fo})`);
  g1.addColorStop(0.3,`rgba(200,185,255,${0.10*fo})`);
  g1.addColorStop(1,  'rgba(0,0,0,0)');
  flareCtx.fillStyle=g1; flareCtx.fillRect(0,0,W,H);

  // Bright core
  const g2=flareCtx.createRadialGradient(sx,sy,0,sx,sy,W*0.045);
  g2.addColorStop(0,  `rgba(255,248,225,${0.60*fo})`);
  g2.addColorStop(0.4,`rgba(255,225,165,${0.22*fo})`);
  g2.addColorStop(1,  'rgba(0,0,0,0)');
  flareCtx.fillStyle=g2; flareCtx.fillRect(0,0,W,H);

  // Anamorphic streak
  const sLen=W*0.38*fo;
  const sg=flareCtx.createLinearGradient(sx-sLen,sy,sx+sLen,sy);
  sg.addColorStop(0,   'rgba(180,215,255,0)');
  sg.addColorStop(0.35,`rgba(205,228,255,${0.14*fo})`);
  sg.addColorStop(0.50,`rgba(225,238,255,${0.32*fo})`);
  sg.addColorStop(0.65,`rgba(205,228,255,${0.14*fo})`);
  sg.addColorStop(1,   'rgba(180,215,255,0)');
  flareCtx.strokeStyle=sg; flareCtx.lineWidth=1.5;
  flareCtx.beginPath(); flareCtx.moveTo(sx-sLen,sy); flareCtx.lineTo(sx+sLen,sy); flareCtx.stroke();

  // Ghost flares
  const ghosts=[{t:0.28,r:W*0.026,a:0.09},{t:0.52,r:W*0.015,a:0.07},{t:0.76,r:W*0.020,a:0.05},{t:1.08,r:W*0.011,a:0.04}];
  for (const gh of ghosts) {
    const gx=sx+(W*0.5-sx)*gh.t, gy=sy+(H*0.5-sy)*gh.t;
    const gg=flareCtx.createRadialGradient(gx,gy,0,gx,gy,gh.r);
    gg.addColorStop(0,  `rgba(185,215,255,${gh.a*fo})`);
    gg.addColorStop(0.5,`rgba(165,198,255,${gh.a*0.4*fo})`);
    gg.addColorStop(1,  'rgba(0,0,0,0)');
    flareCtx.fillStyle=gg; flareCtx.beginPath(); flareCtx.arc(gx,gy,gh.r,0,Math.PI*2); flareCtx.fill();
  }
}

// ─── Moon position — rises and centres over 26 days ──────────────────────────
const POS_START = new THREE.Vector3( 0.1,-1.2,0);
const POS_END   = new THREE.Vector3(-0.3,-0.05,0);
function getMoonWorldPos(p) { return new THREE.Vector3().lerpVectors(POS_START,POS_END,p); }

// ─── Model ────────────────────────────────────────────────────────────────────
// ── Draco + Meshopt decoders attached before load ────────────────────────────
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.preload(); // starts fetching decoder wasm before the model arrives

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
loader.setMeshoptDecoder(MeshoptDecoder);

loader.load('./model/mainpage_model/scene.gltf', (gltf) => {
  object1 = gltf.scene;
  const p=getMoonProgress(), pos=getMoonWorldPos(p);

  // ── Responsive scale — desktop: 1.45, mobile: 1.10 ──
  const isMobile = window.innerWidth <= 640;
  const TARGET_SCALE  = isMobile ? 1.10 : 1.45;
  const ENTRANCE_SCALE = isMobile ? 0.92 : 1.24;

  object1.scale.setScalar(TARGET_SCALE);
  object1.position.copy(pos);
  object1.rotation.x=THREE.MathUtils.degToRad(-5);
  object1.rotation.y=THREE.MathUtils.degToRad(200);
  object1.rotation.z=0;

  object1.traverse(node => {
    if (node.isMesh) {
      node.castShadow=node.receiveShadow=true;
      if (node.material) {
        if (node.material.roughness!==undefined) node.material.roughness=0.92;
        if (node.material.metalness!==undefined) node.material.metalness=0.02;
        node.material.envMapIntensity=0.2;
      }
    }
  });

  // ── Shadow sphere scale matches moon ──
  shadowSphere.scale.setScalar(TARGET_SCALE);
  shadowSphere.position.copy(pos);
  scene.add(object1);

  // ── Dismiss loader once model is ready ──
  const loaderEl = document.getElementById('loader');
  if (loaderEl) loaderEl.classList.add('hide');

  updateLightForPhase(p);
  updateShadow(p);

  // Exposure fade-in
  const exp={v:0};
  gsap.to(exp,{
    v: THREE.MathUtils.lerp(0.42,1.02,p),
    duration:5.5, ease:'power2.inOut',
    onUpdate:()=>{ renderer.toneMappingExposure=exp.v; }
  });

  // Scale entrance — eases from ENTRANCE_SCALE up to TARGET_SCALE
  const s={v:ENTRANCE_SCALE};
  gsap.to(s,{
    v:TARGET_SCALE, duration:5.5, ease:'power3.out',
    onUpdate:()=>{ if(object1){object1.scale.setScalar(s.v);shadowSphere.scale.setScalar(s.v);} }
  });

}, undefined, err=>console.error('Model load error:',err));

// ─── Stars — 3 parallax layers ────────────────────────────────────────────────
const starLayers=[];
function buildStarLayer(count,radius,size,speed,opacityBase) {
  const pos=new Float32Array(count*3), col=new Float32Array(count*3);
  const pal=[[1.0,0.97,0.93],[0.76,0.85,1.0],[0.90,0.78,1.0],[1.0,0.82,0.95],[0.70,0.78,1.0],[0.95,0.90,1.0]];
  for (let i=0;i<count;i++) {
    const th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1), r=radius+Math.random()*20;
    pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.sin(ph)*Math.sin(th); pos[i*3+2]=r*Math.cos(ph);
    const c=pal[Math.floor(Math.random()*pal.length)], b=0.4+Math.random()*0.6;
    col[i*3]=c[0]*b; col[i*3+1]=c[1]*b; col[i*3+2]=c[2]*b;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',   new THREE.BufferAttribute(col,3));
  const mat=new THREE.PointsMaterial({vertexColors:true,size,sizeAttenuation:true,transparent:true,opacity:opacityBase,depthWrite:false});
  const pts=new THREE.Points(geo,mat); scene.add(pts);
  return {points:pts,mat,speed,opacityBase};
}
starLayers.push(buildStarLayer(1800,100,0.045,0.000025,0.62));
starLayers.push(buildStarLayer( 900, 82,0.068,0.000055,0.82));
starLayers.push(buildStarLayer( 300, 70,0.095,0.000100,0.96));

// ─── Nebula clouds ────────────────────────────────────────────────────────────
const nebulaGroups=[];
function buildNebulaCloud(count,hR,hG,hB,rotSpeed,yc) {
  const pos=new Float32Array(count*3), col=new Float32Array(count*3);
  for (let i=0;i<count;i++) {
    const th=Math.random()*Math.PI*2, ph=(Math.random()-0.5)*0.9+Math.PI*0.5, r=68+Math.random()*30;
    pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.sin(ph)*Math.sin(th)*yc; pos[i*3+2]=r*Math.cos(ph);
    const t=Math.random(); col[i*3]=hR+t*0.06; col[i*3+1]=hG+t*0.03; col[i*3+2]=hB+t*0.12;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',   new THREE.BufferAttribute(col,3));
  const mat=new THREE.PointsMaterial({vertexColors:true,size:0.14,sizeAttenuation:true,transparent:true,opacity:0.22,depthWrite:false});
  const pts=new THREE.Points(geo,mat); scene.add(pts);
  return {points:pts,mat,rotSpeed};
}
nebulaGroups.push(buildNebulaCloud(600,0.08,0.02,0.18, 0.000060,0.18));
nebulaGroups.push(buildNebulaCloud(450,0.14,0.02,0.12,-0.000048,0.14));
nebulaGroups.push(buildNebulaCloud(350,0.02,0.04,0.20, 0.000035,0.20));

// ─── Shooting stars ───────────────────────────────────────────────────────────
const shootingStars=[]; let nextShoot=4+Math.random()*6;
function spawnShootingStar() {
  const angle=Math.random()*Math.PI*2, r=55;
  const x1=Math.cos(angle)*r, y1=(Math.random()-0.5)*30, z1=Math.sin(angle)*r*0.3-40;
  const len=8+Math.random()*12, dx=(Math.random()-0.5)*0.5, dy=-0.3-Math.random()*0.4, dz=0.1;
  const norm=Math.sqrt(dx*dx+dy*dy+dz*dz);
  const geo=new THREE.BufferGeometry(), pts=new Float32Array(6);
  pts[0]=x1;pts[1]=y1;pts[2]=z1;pts[3]=x1+dx/norm*len;pts[4]=y1+dy/norm*len;pts[5]=z1+dz/norm*len;
  geo.setAttribute('position',new THREE.BufferAttribute(pts,3));
  const mat=new THREE.LineBasicMaterial({color:0xd0e8ff,transparent:true,opacity:0.9});
  const line=new THREE.Line(geo,mat); scene.add(line);
  shootingStars.push({line,mat,life:0,maxLife:0.6+Math.random()*0.5,vx:dx/norm*0.4,vy:dy/norm*0.4,vz:dz/norm*0.4});
}
function updateShootingStars(elapsed,delta) {
  if (elapsed>nextShoot){spawnShootingStar();nextShoot=elapsed+5+Math.random()*10;}
  for (let i=shootingStars.length-1;i>=0;i--) {
    const s=shootingStars[i]; s.life+=delta;
    const prog=s.life/s.maxLife;
    s.mat.opacity=prog<0.3?prog/0.3*0.9:(1-(prog-0.3)/0.7)*0.9;
    const pa=s.line.geometry.attributes.position.array;
    pa[0]+=s.vx;pa[1]+=s.vy;pa[2]+=s.vz;pa[3]+=s.vx;pa[4]+=s.vy;pa[5]+=s.vz;
    s.line.geometry.attributes.position.needsUpdate=true;
    if (s.life>=s.maxLife){scene.remove(s.line);s.line.geometry.dispose();s.mat.dispose();shootingStars.splice(i,1);}
  }
}

// ─── Animate ──────────────────────────────────────────────────────────────────
const BASE_ROT_Y=THREE.MathUtils.degToRad(200), BASE_ROT_X=THREE.MathUtils.degToRad(-5);
const clock=new THREE.Clock();
let frame=0, lastElapsed=0;

function animate() {
  requestAnimationFrame(animate);
  const elapsed=clock.getElapsedTime(), delta=elapsed-lastElapsed; lastElapsed=elapsed;

  // 1. Aurora canvas
  drawAurora(elapsed);

  // 2. Moon gentle breathe
  if (object1) {
    object1.rotation.y=BASE_ROT_Y+Math.sin(elapsed*0.055)*THREE.MathUtils.degToRad(0.35);
    object1.rotation.x=BASE_ROT_X+Math.sin(elapsed*0.038)*THREE.MathUtils.degToRad(0.25);
  }

  // 3. Smooth FOV zoom — only the 3D scene scales, HTML stays fixed
  currentFov=THREE.MathUtils.lerp(currentFov,targetFov,0.08);
  if (Math.abs(currentFov-camera.fov)>0.01) { camera.fov=currentFov; camera.updateProjectionMatrix(); }

  // 4. Stars twinkle + parallax drift
  for (const layer of starLayers) {
    layer.mat.opacity=Math.max(0.1,layer.opacityBase+Math.sin(elapsed*0.8+layer.speed*100000)*0.10);
    layer.points.rotation.y+=layer.speed;
    layer.points.rotation.x+=layer.speed*0.35;
  }

  // 5. Nebula rotation
  for (const neb of nebulaGroups) {
    neb.points.rotation.y+=neb.rotSpeed;
    neb.points.rotation.z+=neb.rotSpeed*0.4;
    neb.mat.opacity=0.17+Math.sin(elapsed*0.06+neb.rotSpeed*1000)*0.06;
  }

  // 6. Shooting stars
  updateShootingStars(elapsed,delta);

  // 7. Phase sync every 5 s
  if (++frame%300===0 && object1) {
    const p=getMoonProgress();
    updateLightForPhase(p); updateShadow(p); drawFlare(p);
  }

  renderer.render(scene,camera);
}

drawFlare(getMoonProgress());
animate();

// ─── Midnight reload — advances moon phase automatically ──────────────────────
function scheduleMidnightReload() {
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
  setTimeout(() => location.reload(), msUntilMidnight);
}
scheduleMidnightReload();

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize',()=>{
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  resizeBg(); resizeFlare(); drawFlare(getMoonProgress());
});
