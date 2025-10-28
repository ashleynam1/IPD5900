// Elements
const banana = document.getElementById('bananaFill');
const specklesGroup = document.getElementById('speckles');
const bruisesGroup  = document.getElementById('bruises');
const elapsedLabel  = document.getElementById('elapsedLabel');
const ripenessLabel = document.getElementById('ripenessLabel');
const startBtn      = document.getElementById('startBtn');
const pauseBtn      = document.getElementById('pauseBtn');
const resetBtn      = document.getElementById('resetBtn');
const speedRange    = document.getElementById('speedRange');
const speedOut      = document.getElementById('speedOut');

// Gradient stops (for days 0–2)
const gradStop1 = document.getElementById('gStop1');
const gradStop2 = document.getElementById('gStop2');

let running = false;
let lastTs  = null;
let elapsedDays = 0; // simulated days
let speed = parseFloat(speedRange.value); // days per second

// Speckles & bruises
const SPECKLES_COUNT = 180;
const BRUISES_COUNT  = 6;
let speckles = [];
let bruises = [];

init();

// Controls
startBtn.addEventListener('click', () => { running = true; });
pauseBtn.addEventListener('click', () => { running = false; });
resetBtn.addEventListener('click', () => {
  running = false;
  elapsedDays = 0;
  updateVisuals(0);
});
speedRange.addEventListener('input', () => {
  speed = parseFloat(speedRange.value);
  speedOut.textContent = speed % 1 === 0 ? `${speed.toFixed(0)}×` : `${speed.toFixed(2)}×`;
});

// Loop
requestAnimationFrame(loop);
function loop(ts){
  if(!lastTs) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  if(running){
    elapsedDays += dt * speed;
    updateVisuals(elapsedDays);
  }
  requestAnimationFrame(loop);
}

// Init speckles/bruises
function init(){
  const bananaPath = document.getElementById('bananaPath');
  const bbox = bananaPath.getBBox();

  for(let i=0; i<SPECKLES_COUNT; i++){
    const cx = bbox.x + Math.random()*bbox.width;
    const cy = bbox.y + Math.random()*bbox.height;
    const r  = 0.6 + Math.random()*1.6;

    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx', cx.toFixed(2));
    c.setAttribute('cy', cy.toFixed(2));
    c.setAttribute('r',  r.toFixed(2));
    c.setAttribute('fill', '#5a3b1e');
    c.setAttribute('opacity', '0');
    c.style.mixBlendMode = 'multiply';

    const jitter = 0.5 + Math.random()*1.2;
    const ageBias = Math.random()*0.8;

    specklesGroup.appendChild(c);
    speckles.push({el: c, jitter, ageBias});
  }

  for(let i=0; i<BRUISES_COUNT; i++){
    const cx = bbox.x + 0.18*bbox.width + Math.random()*0.68*bbox.width;
    const cy = bbox.y + 0.22*bbox.height + Math.random()*0.56*bbox.height;
    const r  = 14 + Math.random()*20;

    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx', cx.toFixed(2));
    c.setAttribute('cy', cy.toFixed(2));
    c.setAttribute('r',  r.toFixed(2));
    c.setAttribute('fill', '#5a3b1e');
    c.setAttribute('opacity', '0.0');
    c.style.filter = 'blur(2px)';
    c.style.mixBlendMode = 'multiply';

    bruisesGroup.appendChild(c);
    bruises.push(c);
  }

  speedOut.textContent = `${speed.toFixed(0)}×`;
  updateVisuals(0);
}

// Utils
function clamp(x,min,max){ return Math.max(min, Math.min(max, x)); }
function lerpHex(a,b,t){
  const pa = [parseInt(a.slice(1,3),16), parseInt(a.slice(3,5),16), parseInt(a.slice(5,7),16)];
  const pb = [parseInt(b.slice(1,3),16), parseInt(b.slice(3,5),16), parseInt(b.slice(5,7),16)];
  const pc = pa.map((v,i)=> Math.round(v + (pb[i]-v)*t));
  return `#${pc.map(v=>v.toString(16).padStart(2,'0')).join('')}`;
}

// Gradient for 0–2 days (green→yellow)
function setGradientForDays(days){
  const t = clamp(days / 2, 0, 1);
  const left  = lerpHex('#eaf28a', '#ffe44d', t); // pale yellow -> richer yellow
  const right = lerpHex('#a8d34b', '#d6e65a', t); // green -> yellow-green
  gradStop1.setAttribute('stop-color', left);
  gradStop2.setAttribute('stop-color', right);
}

// Solid color after day 2:
// 2–6: ripe yellow; 6–12: yellow→brown
function solidColorForDays(days){
  if(days <= 6){
    return 'hsl(52, 95%, 55%)'; // ripe yellow
  }
  const t = clamp((days - 6) / 6, 0, 1);
  const h = 52 + (35 - 52) * t; // to brown
  const s = 95 + (60 - 95) * t;
  const l = 55 + (35 - 55) * t;
  return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

// Labels
function ripenessForDays(days){
  if(days < 1) return 'Very Green';
  if(days < 2) return 'Green–Yellow';
  if(days < 6) return 'Ripe (Yellow)';
  if(days < 8) return 'Spotty';
  if(days < 10) return 'Very Spotty';
  return 'Overripe';
}

// Main update — NOTE: use inline style so it overrides any CSS fill
function updateVisuals(days){
  if(days <= 2){
    setGradientForDays(days);
    banana.style.fill = 'url(#ripenGradient)';     // << inline style
  } else {
    banana.style.fill = solidColorForDays(days);   // << inline style
  }

  // Speckles 6–10+
  const speckleProgress = clamp((days - 6) / 4, 0, 1);
  for(const s of speckles){
    const local = clamp((speckleProgress - s.ageBias*0.4) * s.jitter, 0, 1);
    const op = Math.pow(local, 1.2) * 0.85;
    s.el.setAttribute('opacity', op.toFixed(2));
  }

  // Bruises 10–12
  const bruiseProgress = clamp((days - 10) / 2, 0, 1);
  bruises.forEach((b,i) => {
    const delay = i * 0.08;
    const p = clamp(bruiseProgress - delay, 0, 1);
    b.setAttribute('opacity', (p * 0.55).toFixed(2));
  });

  const whole = Math.floor(days);
  elapsedLabel.textContent = `${whole} ${whole === 1 ? 'day' : 'days'}`;
  ripenessLabel.textContent = ripenessForDays(days);
}
