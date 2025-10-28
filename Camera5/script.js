/* =========================================================
   Silly-but-useful decision page
   - Modal is hidden by default (see CSS .modal[hidden])
   - Opens ONLY when user clicks “see why →”
     * AND a poster image has been loaded (file or URL)
   - Close button, backdrop click, and Esc all close the modal
   - Witty alerts included, because math tastes better with jokes
========================================================= */

/* Elements */
const decideBtn = document.getElementById('decideBtn');
const loader    = document.getElementById('loader');
const result    = document.getElementById('result');
const verdictEl = document.getElementById('verdictText');
const whyBtn    = document.getElementById('whyBtn');

const priceEl   = document.getElementById('price');
const qtyEl     = document.getElementById('qty');
const dealTypeEl= document.getElementById('dealType');
const perPieceEl= document.getElementById('perPiecePrice');

const regularTotalEl = document.getElementById('regularTotal');
const dealTotalEl    = document.getElementById('dealTotal');
const saveTotalEl    = document.getElementById('saveTotal');
const pctLabel       = document.getElementById('pctLabel');

const ringCanvas = document.getElementById('ring');
const ringCtx    = ringCanvas.getContext('2d');

const modal      = document.getElementById('whyModal');
const closeModalBtn = document.getElementById('closeModal');
const recalcBtn  = document.getElementById('recalc');

const posterFile = document.getElementById('posterFile');
const posterUrl  = document.getElementById('posterUrl');
const applyPoster= document.getElementById('applyPoster');
const uploadStatus = document.getElementById('uploadStatus');

const posterImg  = document.getElementById('posterImg');
const flagsLayer = document.getElementById('flagsLayer');

const confettiCanvas = document.getElementById('confetti');
const confettiCtx = confettiCanvas.getContext('2d');

/* ------- Uploads (appear before the big button) ------- */
let posterLoaded = false;

// File upload
posterFile.addEventListener('change', () => {
  const file = posterFile.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    posterImg.src = e.target.result;
    posterLoaded = true;
    uploadStatus.textContent = 'Image loaded ✓ (fresh from your device)';
    renderFlags();
  };
  reader.readAsDataURL(file);
});

// URL load
applyPoster.addEventListener('click', () => {
  const url = posterUrl.value.trim();
  if (!url) {
    alert("Drop a link in there, Picasso.");
    return;
  }
  posterImg.onload = () => {
    posterLoaded = true;
    uploadStatus.textContent = 'Image loaded ✓ (fetched from the web)';
    renderFlags();
  };
  posterImg.onerror = () => {
    uploadStatus.textContent = 'That URL was spicier than expected — failed to load.';
  };
  posterImg.src = url;
});

/* ------- Decision engine (with a flourish) ------- */
decideBtn.addEventListener('click', async () => {
  decideBtn.hidden = true;
  loader.hidden = false;

  await sleep(900); // dramatic pause

  const {regular, deal, savingsPct} = computeSavings();
  const buy = savingsPct >= 35;

  loader.hidden = true;
  result.hidden = false;
  result.classList.toggle('buy', buy);
  result.classList.toggle('nobuy', !buy);
  verdictEl.textContent = buy ? "Buy!" : "Don't buy!";

  if (buy) {
    launchConfetti();
    setTimeout(stopConfetti, 1800);
    document.body.classList.remove('dim');
  } else {
    document.body.classList.add('dim');
  }

  // Prep the modal numbers (we’ll show them when asked)
  regularTotalEl.textContent = money(regular);
  dealTotalEl.textContent = money(deal);
  saveTotalEl.textContent = money(regular - deal);
  pctLabel.textContent = `${Math.round(savingsPct)}%`;
  drawRing(savingsPct);
});

/* ------- Open modal only when poster is loaded ------- */
whyBtn.addEventListener('click', () => {
  if (!posterLoaded) {
    alert("Upload your poster first—my detective hat needs clues! 🕵️‍♀️");
    return;
  }
  openModal();
});

/* ------- Modal open/close wiring (robust) ------- */
function openModal(){
  modal.hidden = false;
  modal.setAttribute('aria-hidden','false');
  // focus the close button for accessibility
  closeModalBtn.focus();
}
function closeModal(){
  modal.hidden = true;
  modal.setAttribute('aria-hidden','true');
}
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  // close when clicking the backdrop, not the card
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
    closeModal();
  }
});

/* ------- Math (the tasty part) ------- */
function computeSavings(){
  const price = clampMoney(parseFloat(priceEl?.value) || 0);
  const qty   = clampInt(parseInt(qtyEl?.value,10) || 1, 1, 99);
  const type  = dealTypeEl?.value || 'bogo';
  const per   = clampMoney(parseFloat(perPieceEl?.value) || 1);

  let regular = price * qty;
  let deal = 0;

  if (type === 'bogo'){
    deal = price * Math.ceil(qty/2);
  } else if (type === 'second1'){
    deal = price + 1; // two items assumed
  } else if (type === 'perPiece'){
    deal = per * qty;
  }

  const savings = Math.max(0, regular - deal);
  const pct = regular > 0 ? (savings / regular) * 100 : 0;
  return {regular, deal, savingsPct: pct};
}
function money(n){ return `$${(Math.round(n*100)/100).toFixed(2)}`; }
function clampMoney(n){ return Math.max(0, Math.round(n*100)/100); }
function clampInt(n, min, max){ return Math.min(max, Math.max(min, n)); }

/* Recalc in modal */
document.getElementById('recalc').addEventListener('click', () => {
  const {regular, deal, savingsPct} = computeSavings();
  regularTotalEl.textContent = money(regular);
  dealTotalEl.textContent = money(deal);
  saveTotalEl.textContent = money(regular - deal);
  pctLabel.textContent = `${Math.round(savingsPct)}%`;
  drawRing(savingsPct);
});

/* ------- Savings ring (no libs, just vibes) ------- */
function drawRing(pct){
  const ctx = ringCtx, c = ringCanvas;
  const W = c.width, H = c.height, R = Math.min(W,H)/2 - 10, CX = W/2, CY = H/2;
  ctx.clearRect(0,0,W,H);

  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 18; ctx.beginPath();
  ctx.arc(CX,CY,R,0,Math.PI*2); ctx.stroke();

  const cl = pct >= 35 ? '#15a46b' : '#d64545';
  ctx.strokeStyle = cl; ctx.lineCap='round';
  ctx.beginPath();
  const a = (Math.PI*2)*(Math.min(100,pct)/100);
  ctx.arc(CX,CY,R,-Math.PI/2, -Math.PI/2 + a); ctx.stroke();
}

/* ------- Flag overlay (demo rectangles in %) ------- */
const defaultFlags = [
  {x:58, y:33, w:33, h:22, color:'yellow', text:'Time-limited window'},
  {x:58, y:63, w:35, h:9,  color:'green',  text:'Channel restriction clear'},
  {x:62, y:73, w:30, h:8,  color:'yellow', text:'Missing closing time detail'}
];
function renderFlags(list=defaultFlags){
  flagsLayer.innerHTML = '';
  list.forEach(f => {
    const box = document.createElement('div');
    box.className = `flag ${f.color}`;
    box.style.left = f.x + '%';
    box.style.top  = f.y + '%';
    box.style.width  = f.w + '%';
    box.style.height = f.h + '%';
    const label = document.createElement('div'); label.className='label'; label.textContent = f.text;
    box.appendChild(label);
    flagsLayer.appendChild(box);
  });
}

/* ------- Confetti (micro version) ------- */
let confettiRunning = false, particles = [];
function launchConfetti(){
  confettiRunning = true;
  confettiCanvas.hidden = false;
  resizeConfetti();
  particles = Array.from({length: 180}, () => ({
    x: Math.random()*confettiCanvas.width,
    y: -20 - Math.random()*100,
    vx: (Math.random()-.5)*2,
    vy: 2 + Math.random()*2.5,
    r: 2 + Math.random()*3.5,
    c: `hsl(${Math.random()*360},90%,60%)`,
    a: Math.random()*Math.PI*2
  }));
  requestAnimationFrame(stepConfetti);
}
function stepConfetti(){
  if (!confettiRunning) return;
  const ctx = confettiCtx, c = confettiCanvas;
  ctx.clearRect(0,0,c.width,c.height);
  particles.forEach(p=>{
    p.x += p.vx; p.y += p.vy; p.a += 0.1;
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a);
    ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r, p.r*2, p.r*2);
    ctx.restore();
  });
  particles = particles.filter(p => p.y < c.height + 20);
  if (particles.length) requestAnimationFrame(stepConfetti);
  else stopConfetti();
}
function stopConfetti(){ confettiRunning = false; confettiCanvas.hidden = true; }
function resizeConfetti(){
  const dpr = window.devicePixelRatio||1;
  confettiCanvas.width = Math.round(innerWidth * dpr);
  confettiCanvas.height = Math.round(innerHeight * dpr);
  confettiCtx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize', resizeConfetti);

/* ------- Helpers ------- */
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
