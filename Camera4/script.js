/* =========================
PROMO REALITY CHECK — JS
- Parses product list + default prices from DOM.
- Populates calculator selects and price inputs.
- Computes savings: regular total vs deal total for chosen quantity of pairs.
- Generates 12 months of mock price data for each product and draws a canvas line chart (no external libs).
- Shredder: slices the inline SVG poster into strips and drops them; reset restores.
ASSUMPTIONS encoded here:
- Eligible products: Cheeseburger, Crispy Chicken Sandwich, McNuggets (6pc), Fries.
- Regular prices are initial estimates derived from typical US pricing; users can edit.
- No schedule printed on poster → assume Mon–Sun, All Day (called out visibly as assumption).
========================= */

const products = Array.from(document.querySelectorAll('.products .prod')).map((el)=>({
  name: el.querySelector('h3').textContent.trim(),
  price: parseFloat(el.querySelector('.money').dataset.price)
}));

/* ---------- Calculator wiring ---------- */
const sel1 = document.getElementById('item1');
const sel2 = document.getElementById('item2');
const p1 = document.getElementById('price1');
const p2 = document.getElementById('price2');
const dealPrice = document.getElementById('dealPrice');
const qty = document.getElementById('qty');
const regTotal = document.getElementById('regTotal');
const dealTotal = document.getElementById('dealTotal');
const savings = document.getElementById('savings');

function money(n){ return `$${(Math.round(n*100)/100).toFixed(2)}`; }

function fillSelect(sel){
  products.forEach((p,i)=>{
    const o = document.createElement('option');
    o.value = i; o.textContent = `${p.name} — ${money(p.price)}`;
    sel.appendChild(o);
  });
}

fillSelect(sel1);
fillSelect(sel2);

// Seed price inputs with selected default product prices
function syncPriceInputs(){
  p1.value = products[+sel1.value].price.toFixed(2);
  p2.value = products[+sel2.value].price.toFixed(2);
}
sel1.addEventListener('change', syncPriceInputs);
sel2.addEventListener('change', syncPriceInputs);
syncPriceInputs();

function compute(){
  const q = Math.max(1, parseInt(qty.value||'1',10));
  const rp1 = Math.max(0, parseFloat(p1.value||0));
  const rp2 = Math.max(0, parseFloat(p2.value||0));
  const addPrice = Math.max(0, parseFloat(dealPrice.value||1));

  // Regular world: both at regular price
  const regular = q * (rp1 + rp2);
  // Deal world: first at regular, second at fixed $1 (or adjusted)
  const withDeal = q * (rp1 + addPrice);
  const save = Math.max(0, regular - withDeal);
  const pct = regular>0 ? (save/regular)*100 : 0;

  regTotal.textContent = `${money(regular)} Regular Total`;
  dealTotal.textContent = `${money(withDeal)} With Deal`;
  savings.textContent   = `${money(save)} saved (${pct.toFixed(0)}%)`;

  // Auto update recommendation sentence with a concrete pair example
  const rec = document.getElementById('recommendation');
  const s1 = products[+sel1.value].name;
  const s2 = products[+sel2.value].name;
  const cheap = Math.min(rp1,rp2);
  const eff = Math.max(0, cheap - addPrice);
  rec.innerHTML = `Pick <strong>${s1}</strong> at regular and add <strong>${s2}</strong> for ${money(addPrice)}.
    If the cheaper item normally costs ${money(cheap)}, your per-pair savings ≈ <strong>${money(eff)}</strong>
    (${regular>0? (eff/(rp1+rp2)*100).toFixed(0) : 0}% off the pair vs. regular).`;
}

['input','change'].forEach(evt=>{
  [sel1,sel2,p1,p2,dealPrice,qty].forEach(el=>el.addEventListener(evt, compute));
});
compute();

/* ---------- Mock price history + Canvas line chart ---------- */
/* We simulate gentle month-to-month variability around the starting price.
   This is purely for educational visualization. */
const months = ["Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep"]; // 12 points
function generateSeries(base){
  const data = [];
  let v = base*0.95; // start slightly below
  for(let i=0;i<12;i++){
    const drift = (Math.random()-0.5)*0.12; // +-12%
    v = Math.max(0.6*base, Math.min(1.4*base, v*(1+drift*0.2) + base*drift*0.05));
    data.push(parseFloat(v.toFixed(2)));
  }
  return data;
}
const series = products.map(p=>({name:p.name, base:p.price, data:generateSeries(p.price)}));

const colors = ['#d93025','#0f9d58','#1a73e8','#f9ab00','#8e24aa','#0097a7']; // few lines max
const canvas = document.getElementById('priceChart');
const ctx = canvas.getContext('2d');

function drawChart(){
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const pad = {l:60,r:20,t:20,b:30};

  // Compute y scale
  const all = series.flatMap(s=>s.data);
  const ymin = Math.min(...all)*0.9;
  const ymax = Math.max(...all)*1.1;
  const yRange = ymax - ymin;

  // Axes
  ctx.strokeStyle = '#d9deea';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, H-pad.b);
  ctx.lineTo(W-pad.r, H-pad.b);
  ctx.stroke();

  // Y ticks
  ctx.fillStyle = '#666b73';
  ctx.font = '12px Inter, system-ui';
  const ticks = 5;
  for(let i=0;i<=ticks;i++){
    const yVal = ymin + (yRange * i / ticks);
    const y = (H-pad.b) - ((yVal - ymin)/yRange)*(H-pad.t-pad.b);
    ctx.fillText(`$${yVal.toFixed(2)}`, 8, y+4);
    ctx.strokeStyle = '#eef1f7';
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W-pad.r, y);
    ctx.stroke();
  }

  // X labels
  const stepX = (W-pad.l-pad.r)/(months.length-1);
  months.forEach((m, i)=>{
    const x = pad.l + i*stepX;
    ctx.fillStyle = '#666b73';
    ctx.fillText(m, x-10, H-10);
  });

  // Lines
  series.forEach((s, si)=>{
    ctx.strokeStyle = colors[si % colors.length];
    ctx.lineWidth = 2;
    ctx.beginPath();
    s.data.forEach((val, i)=>{
      const x = pad.l + i*stepX;
      const y = (H-pad.b) - ((val - ymin)/yRange)*(H-pad.t-pad.b);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  });

  // Legend
  const legend = document.getElementById('chartLegend');
  legend.innerHTML = '';
  series.forEach((s, si)=>{
    const row = document.createElement('div');
    row.className = 'key';
    row.innerHTML = `<span class="swatch" style="background:${colors[si % colors.length]}"></span>${s.name}`;
    legend.appendChild(row);
  });
}
drawChart();

/* ---------- Shredder ---------- */
/* We clone the poster as N vertical strips (divs with background of the SVG snapshot via data URL)
   and animate translateY + rotate for a playful "drop" effect. */
const shredBtn = document.getElementById('shredBtn');
const resetBtn = document.getElementById('resetShredBtn');
const posterWrap = document.getElementById('posterWrap');

let shredded = false;

function svgToDataURL(svgEl){
  // Serialize inline SVG to data URL for use as background image in strips
  const xml = new XMLSerializer().serializeToString(svgEl);
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(xml);
}

function shredPoster(){
  if(shredded) return;
  const svg = posterWrap.querySelector('svg');
  const url = svgToDataURL(svg);
  const strips = 18;
  const w = posterWrap.clientWidth;
  const h = posterWrap.clientHeight;
  const stripW = w / strips;

  // Hide original
  svg.style.visibility = 'hidden';

  for(let i=0;i<strips;i++){
    const s = document.createElement('div');
    s.className = 'strip';
    s.style.position = 'absolute';
    s.style.left = (i*stripW)+'px';
    s.style.top = '0px';
    s.style.width = stripW+'px';
    s.style.height = '100%';
    s.style.backgroundImage = `url("${url}")`;
    s.style.backgroundSize = `${w}px ${h}px`;
    s.style.backgroundPosition = `-${i*stripW}px 0`;
    s.style.transition = 'transform .9s cubic-bezier(.2,.7,.2,1), opacity .9s';
    posterWrap.appendChild(s);

    // async animate
    requestAnimationFrame(()=>{
      const rot = (Math.random()*20-10);
      const dy = h + 40 + Math.random()*60;
      s.style.transform = `translateY(${dy}px) rotate(${rot}deg)`;
      s.style.opacity = '0.2';
    });
  }
  shredded = true;
  shredBtn.disabled = true;
  resetBtn.disabled = false;
}

function resetPoster(){
  posterWrap.querySelectorAll('.strip').forEach(n=>n.remove());
  const svg = posterWrap.querySelector('svg');
  svg.style.visibility = 'visible';
  shredded = false;
  shredBtn.disabled = false;
  resetBtn.disabled = true;
}

shredBtn.addEventListener('click', shredPoster);
resetBtn.addEventListener('click', resetPoster);

/* Accessibility niceties */
document.querySelectorAll('.btn').forEach(b=>b.addEventListener('keydown',e=>{
  if(e.key==='Enter' || e.key===' '){ e.preventDefault(); b.click(); }
}));
