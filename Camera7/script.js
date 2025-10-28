// ===== Grab Elements =====
const els = {
  uploadProxy: document.getElementById('uploadProxy'),
  fileInput: document.getElementById('fileInput'),
  uploadStatus: document.getElementById('uploadStatus'),
  thumbWrap: document.getElementById('thumbWrap'),
  thumb: document.getElementById('thumb'),

  landing: document.getElementById('landing'),
  cta: document.getElementById('cta'),
  loader: document.getElementById('loader'),

  results: document.getElementById('results'),
  verdictTitle: document.getElementById('verdictTitle'),
  verdictQuip: document.getElementById('verdictQuip'),
  seeWhy: document.getElementById('seeWhy'),
  reset: document.getElementById('reset'),

  why: document.getElementById('why'),
  posterPreview: document.getElementById('posterPreview'),
  savingsPct: document.getElementById('savingsPct'),
  dealFacts: document.getElementById('dealFacts'),
  flagsTable: document.getElementById('flagsTable').querySelector('tbody'),
};

// ===== State =====
let appState = {
  imageDataUrl: null,
  ocrText: '',
  detected: {
    priceNow: null,
    priceWas: null,
    percentOff: null,
    descriptor: null,
  },
  savingsPct: null,
  flags: [],
  verdict: null, // 'buy' | 'dont'
};

// ===== Utility =====
function resetAll() {
  appState = {
    imageDataUrl: null,
    ocrText: '',
    detected: { priceNow: null, priceWas: null, percentOff: null, descriptor: null },
    savingsPct: null,
    flags: [],
    verdict: null,
  };

  els.uploadStatus.textContent = 'No image yet';
  els.uploadStatus.classList.remove('ok');
  els.thumbWrap.classList.add('hidden');
  els.thumb.src = '';
  els.posterPreview.src = '';
  els.savingsPct.textContent = '—%';
  els.dealFacts.innerHTML = '';
  els.flagsTable.innerHTML = '';
  els.verdictTitle.textContent = '—';
  els.verdictQuip.textContent = '';
  els.results.classList.add('hidden');
  els.why.classList.add('hidden');
  els.landing.classList.remove('hidden');
  document.querySelector('.verdict-card')?.classList.remove('buy','dont');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function prettyMoney(n){
  if(n == null || isNaN(n)) return '—';
  return `$${n.toFixed(2)}`;
}

// Simple playful quips
function quipFor(verdict, pct){
  if(verdict === 'buy'){
    if(pct >= 40) return `That price drop slapped harder than a chef's kiss.`;
    if(pct >= 25) return `Wallet says “thank you,” taste buds say “finally.”`;
    return `A respectable deal—like finding fries at the bottom of the bag.`;
  } else {
    if(pct <= 5) return `This “deal” is just a hat with no cow. Save your pennies.`;
    if(pct <= 12) return `Meh. Feels like tipping your future self with loose change.`;
    return `Close, but your budget wants a second opinion.`;
  }
}

// ===== OCR + Parsing =====
function parseDealFromText(text){
  const out = { priceNow:null, priceWas:null, percentOff:null, descriptor:null };

  const lines = text.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  out.descriptor = lines[0]?.slice(0,80) || 'Detected deal';

  const priceMatches = [...text.matchAll(/(?:\$+\s*)(\d{1,3}(?:[.,]\d{2})?)|(\d{1,3})\s?¢/g)];
  const prices = priceMatches.map(m=>{
    if(m[1]) return parseFloat(m[1].replace(',', '.'));
    if(m[2]) return parseFloat(m[2])/100;
    return null;
  }).filter(n=>n!=null).sort((a,b)=>a-b);

  const pctMatch = text.match(/(\d{1,3})\s?%/);
  if(pctMatch){
    const pct = parseInt(pctMatch[1],10);
    if(pct >= 1 && pct <= 95) out.percentOff = pct;
  }

  const wasMatch = text.match(/(?:was|reg(?:ular)?|msrp|strikethrough)[^\d$]{0,8}\$?\s?(\d{1,3}(?:[.,]\d{2})?)/i);
  if(wasMatch){
    out.priceWas = parseFloat(wasMatch[1].replace(',', '.'));
  }

  if(prices.length){
    out.priceNow = prices[0];
    if(!out.priceWas && prices.length>=2){
      const largest = prices[prices.length-1];
      if(largest > out.priceNow*1.2) out.priceWas = largest;
    }
  }

  return out;
}

function computeSavings(detected){
  const { priceNow, priceWas, percentOff } = detected;
  if(percentOff && priceNow){
    const base = priceNow / (1 - percentOff/100);
    return { original: base, now: priceNow, pct: Math.round(percentOff) };
  }
  if(priceWas && priceNow && priceWas > priceNow){
    const pct = Math.round((1 - priceNow/priceWas)*100);
    return { original: priceWas, now: priceNow, pct };
  }
  if(priceNow){
    const base = priceNow * 1.25;
    const pct = Math.round((1 - priceNow/base)*100);
    return { original: base, now: priceNow, pct };
  }
  return { original: null, now: null, pct: 0 };
}

// ===== Marketing BS Detection =====
function detectFlags(text){
  const flags = [];

  function add(sev, trigger, reason){
    flags.push({ severity: sev, trigger, reason });
  }

  const urgency = /(limited time|today only|one day only|ends [0-9\/\-]+|hurry|while supplies last|members[-\s]?only)/i;
  if(urgency.test(text)) add('yellow', text.match(urgency)[0], 'Urgency/exclusivity can pressure decisions. Check if timeline is realistic and not fabricated scarcity.');

  const vague = /(up to|as low as|from\s?\$|starting at)/i;
  if(vague.test(text)) add('yellow', text.match(vague)[0], 'Vague baseline—final price may be higher than the headlined number.');

  if(/\*/.test(text)){
    add('red', '* (asterisk)', 'Asterisk implies conditions. Look for tiny text or exclusions that change the real deal.');
  }
  const exclusions = /(exclusions apply|see (store|website) for details|participating locations only|terms and conditions)/i;
  if(exclusions.test(text)) add('yellow', text.match(exclusions)[0], 'Hidden conditions can shrink the offer’s value.');

  if(/\d{1,3}\s?%/.test(text) && !/\$/.test(text)){
    add('yellow', text.match(/\d{1,3}\s?%/)[0], 'Percent-off without a visible baseline price makes savings unverifiable.');
  }

  const bait = /(add-ons? extra|\+?\s*extra|toppings extra|drinks not included|tax not included)/i;
  if(bait.test(text)) add('yellow', text.match(bait)[0], 'Headline price may exclude essentials pictured. Total cost likely higher.');

  const free = /\bfree\b/i;
  if(free.test(text)){
    const withPurchase = /(with purchase|w\/ purchase|buy one|get one)/i;
    if(withPurchase.test(text)){
      add('green', 'free (with purchase)', '“Free” is clearly conditional—good disclosure when legible.');
    } else {
      add('yellow', 'free', '“Free” without clear terms can be misleading. Ensure what you must buy (if anything) is stated.');
    }
  }

  const legalese = /(not valid with|no substitutions|subject to change|management reserves the right)/i;
  if(legalese.test(text)) add('yellow', text.match(legalese)[0], 'Legalese suggests constraints—double-check what’s actually included.');

  const msrp = /(msrp|was \$?\d|compare at)/i;
  if(msrp.test(text)) add('yellow', text.match(msrp)[0], 'Reference price anchors can inflate perceived savings. Verify the real “was” price.');

  const bundle = /(\b\d+\s*for\s*\$\s*\d+(\.\d{2})?\b)/i;
  if(bundle.test(text) && !/(oz|lb|ml|g)\b/i.test(text)){
    add('yellow', text.match(bundle)[0], 'Bundle lacks unit sizes; per-unit value unclear.');
  }

  if(/\d{1,3}\s?%/i.test(text) && /(was|reg)/i.test(text)){
    add('green', 'percent + was', 'Percent savings tied to a visible baseline is more transparent.');
  }

  return flags;
}

// ===== Verdict =====
function decideVerdict(pct){
  return pct >= 20 ? 'buy' : 'dont';
}

function showConfetti(){
  confetti({ particleCount: 140, spread: 70, origin: { y: 0.65 } });
  setTimeout(()=>confetti({ particleCount: 90, spread: 120, startVelocity: 45, origin: { y: 0.4 } }), 250);
}

// ===== UI Rendering =====
function renderResults(){
  const card = document.querySelector('.verdict-card');
  const pct = appState.savingsPct ?? 0;
  const verdict = appState.verdict;

  if(verdict === 'buy'){
    card.classList.add('buy'); card.classList.remove('dont');
    els.verdictTitle.textContent = `Buy!`;
    els.verdictQuip.textContent = quipFor('buy', pct);
    showConfetti();
  } else {
    card.classList.add('dont'); card.classList.remove('buy');
    els.verdictTitle.textContent = `Don't buy!`;
    els.verdictQuip.textContent = quipFor('dont', pct);
  }
}

function renderWhy(){
  els.savingsPct.textContent = `${Math.max(0, appState.savingsPct||0)}%`;
  els.posterPreview.src = appState.imageDataUrl || '';

  const d = appState.detected;
  const facts = [
    ['Headline', d.descriptor ? d.descriptor : '—'],
    ['Deal price', prettyMoney(d.priceNow)],
    ['Original price (est.)', prettyMoney(computeSavings(d).original)],
  ];
  if(d.percentOff != null) facts.push(['Percent off (detected)', `${d.percentOff}%`]);
  els.dealFacts.innerHTML = facts.map(([k,v])=>`<li><strong>${k}:</strong> ${v}</li>`).join('');

  els.flagsTable.innerHTML = '';
  appState.flags.forEach(f=>{
    const tr = document.createElement('tr');
    const sev = document.createElement('td');
    const trig = document.createElement('td');
    const rea = document.createElement('td');

    const pill = document.createElement('span');
    pill.className = `pill ${f.severity}`;
    pill.textContent = f.severity;
    sev.appendChild(pill);

    trig.textContent = f.trigger;
    rea.textContent = f.reason;

    tr.appendChild(sev); tr.appendChild(trig); tr.appendChild(rea);
    els.flagsTable.appendChild(tr);
  });
}

// ===== Events =====

// NEW: Make the visible button open the hidden file input (works even if input is visually hidden)
els.uploadProxy.addEventListener('click', (e)=>{
  e.preventDefault();
  els.fileInput.click();
});

// Handle file selection
els.fileInput.addEventListener('change', async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const url = await fileToDataURL(file);
  appState.imageDataUrl = url;

  els.uploadStatus.textContent = `Image uploaded${file.name ? `: ${file.name}` : ''}`;
  els.uploadStatus.classList.add('ok');
  els.thumbWrap.classList.remove('hidden');
  els.thumb.src = url;
});

// CTA: analyze
els.cta.addEventListener('click', async ()=>{
  if(!appState.imageDataUrl){
    els.uploadStatus.textContent = 'Please upload an image first';
    els.uploadStatus.classList.remove('ok');
    els.uploadStatus.classList.add('shake');
    setTimeout(()=>els.uploadStatus.classList.remove('shake'), 600);
    return;
  }

  els.loader.classList.remove('hidden');

  try{
    const { data } = await Tesseract.recognize(appState.imageDataUrl, 'eng');
    appState.ocrText = (data?.text || '').trim();

    appState.detected = parseDealFromText(appState.ocrText);

    const comp = computeSavings(appState.detected);
    appState.savingsPct = Math.max(0, Math.min(95, isFinite(comp.pct)? comp.pct : 0));
    appState.verdict = decideVerdict(appState.savingsPct);

    appState.flags = detectFlags(appState.ocrText);
  } catch(err){
    appState.ocrText = '';
    appState.detected = { priceNow:null, priceWas:null, percentOff:null, descriptor:'(could not read poster)' };
    appState.savingsPct = 0;
    appState.verdict = 'dont';
    appState.flags = [{ severity:'yellow', trigger:'OCR error', reason:'We could not read the text clearly. Low contrast or tiny fonts can hide important terms.' }];
  } finally{
    els.loader.classList.add('hidden');
    els.landing.classList.add('hidden');
    els.results.classList.remove('hidden');
    renderResults();
  }
});

// See why
els.seeWhy.addEventListener('click', ()=>{
  renderWhy();
  els.why.classList.remove('hidden');
  els.why.scrollIntoView({ behavior:'smooth', block:'start' });
});

// Reset
els.reset.addEventListener('click', resetAll);

// Kickoff
resetAll();

// Shake animation for missing upload
const style = document.createElement('style');
style.textContent = `
  .shake{animation:shake .45s ease}
  @keyframes shake{
    0%{transform:translateX(0)}
    25%{transform:translateX(-4px)}
    50%{transform:translateX(4px)}
    75%{transform:translateX(-3px)}
    100%{transform:translateX(0)}
  }
`;
document.head.appendChild(style);
