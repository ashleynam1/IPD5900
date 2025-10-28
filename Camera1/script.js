/* ========= DOM refs ========= */
const $ = (s) => document.querySelector(s);
const dropzone   = $('#dropzone');
const fileInput  = $('#fileInput');
const pickBtn    = $('#pickBtn');
const demoBtn    = $('#demoBtn');
const scanBtn    = $('#scanBtn');
const preview    = $('#preview');
const autoOpen   = $('#autoOpen');
const progress   = $('#progress');
const progressBar= $('#progressBar');
const results    = $('#results');
const storeBlock = $('#storeBlock');
const explainEl  = $('#explain');
const ocrTextEl  = $('#ocrText');

/* ========= Demo asset =========
   Replace with your hosted sign image if you want. */
const DEMO_SRC = "https://raw.githubusercontent.com/plotdevice/dummy-assets/main/mcd-mcvalue.jpg";

/* ========= Brand → slogans/keywords → deal links =========
   - phrases: high-signal slogans / promo phrases (weighted)
   - keywords: menu items or brand-y words (medium)
   - weak: generic promo words to help disambiguation (low)
   You can keep adding brands and phrases here. */
const BRANDS = [
  {
    id: "mcd",
    name: "McDonald’s",
    dealUrl: "https://www.mcdonalds.com/us/en-us/deals.html",
    phrases: [
      { p: "mcvalue", w: 6 },
      { p: "i'm lovin it", w: 4 }, { p: "im lovin it", w: 4 },
      { p: "buy one add one", w: 6 },
      { p: "add one for 1", w: 5 }, { p: "$1", w: 2 }
    ],
    keywords: ["mcdonalds","big mac","mcchicken","mcnuggets","fries","filet o fish","quarter pounder"],
    weak: ["deal","value","limited time","download app","order ahead","rewards"]
  },
  {
    id: "bk",
    name: "Burger King",
    dealUrl: "https://www.bk.com/offers",
    phrases: [
      { p: "have it your way", w: 6 }, { p: "bk stacker", w: 4 }
    ],
    keywords: ["burger king","whopper","royal crispy","chicken fries"],
    weak: ["deal","offer","value"]
  },
  {
    id: "wendys",
    name: "Wendy’s",
    dealUrl: "https://www.wendys.com/deals",
    phrases: [{ p:"fresh never frozen", w:6 }],
    keywords:["wendys","frosty","baconator","junior bacon","nuggets"],
    weak:["deal","offer","reward"]
  },
  {
    id: "kfc",
    name: "KFC",
    dealUrl: "https://www.kfc.com/offers",
    phrases: [{ p:"finger lickin good", w:6 }],
    keywords:["kfc","kentucky fried chicken","bucket","tenders","wings","colonel"],
    weak:["deal","box","combo"]
  },
  {
    id: "tacobell",
    name: "Taco Bell",
    dealUrl: "https://www.tacobell.com/deals-and-offers",
    phrases: [{ p:"live mas", w:6 }, { p:"think outside the bun", w:5 }],
    keywords:["taco bell","crunchwrap","doritos locos","quesarito","baja blast"],
    weak:["deal","value","box"]
  },
  {
    id: "subway",
    name: "Subway",
    dealUrl: "https://www.subway.com/en-US/deals?country=USA",
    phrases: [{ p:"eat fresh", w:6 }],
    keywords:["subway","footlong","sub","bmt","italian bmt","sweet onion teriyaki"],
    weak:["coupon","deal"]
  },
  {
    id: "arbys",
    name: "Arby’s",
    dealUrl: "https://www.arbys.com/deals/",
    phrases: [{ p:"we have the meats", w:6 }],
    keywords:["arbys","beef n cheddar","curly fries","gyros"],
    weak:["deal","offer"]
  },
  {
    id: "littlecaesars",
    name: "Little Caesars",
    dealUrl: "https://littlecaesars.com/en-us/deals/",
    phrases: [{ p:"pizza pizza", w:6 }],
    keywords:["little caesars","crazy bread","hot n ready"],
    weak:["deal","coupon"]
  }
];

/* Optional: phrase-pattern → direct link overrides for specific promos.
   If the OCR text matches one of these patterns AND the brand matches,
   we’ll send the user to the more specific page (else brand.dealUrl). */
const DEAL_OVERRIDES = [
  {
    brandId: "mcd",
    patterns: [
      /buy\s*one[, ]+add\s*one/gi,
      /add\s*one\s*for\s*\$?\s*1/gi
    ],
    // Public deep links for one-off offers change; safest is deals hub. Keep override
    // pointing to deals hub (or update when you have a stable deep link).
    url: "https://www.mcdonalds.com/us/en-us/deals.html"
  }
];

/* ========= Utilities ========= */
const norm = (t) => t
  .toLowerCase()
  .replace(/[\u2018\u2019']/g,"'")
  .replace(/[^\p{L}\p{N}\s\$]/gu," ")
  .replace(/\s+/g," ")
  .trim();

const mkFuse = (corpus) =>
  new Fuse(corpus.map((p)=>({text:p.p, w:p.w||1})), {
    includeScore: true,
    threshold: 0.45, // tolerant to small OCR errors
    keys: ['text'],
    ignoreLocation: true,
    minMatchCharLength: 3
  });

function scoreBrand(text, brand) {
  const nt = norm(text);
  let score = 0;
  const hits = [];

  // 1) Exact-ish (fuzzy) phrase hits (high weight)
  const fuse = mkFuse(brand.phrases || []);
  const phraseCandidates = (brand.phrases || []).map(x=>x.p);
  for (const cand of phraseCandidates) {
    const res = fuse.search(cand);
    // check if the candidate actually appears (Fuse may match fuzzily)
    if (res.length && nt.includes(cand.replace(/[^a-z0-9 \$]/g,''))) continue; // exact path already in text
    if (res.length && res[0].score <= 0.45) {
      const w = (brand.phrases.find(p=>p.p===cand)?.w)||3;
      score += w;
      hits.push(`phrase:“${cand}” +${w}`);
    }
  }
  // also do simple contains for the phrases
  for (const p of (brand.phrases||[])) {
    const needle = norm(p.p);
    if (needle && nt.includes(needle)) {
      score += p.w || 3;
      hits.push(`phrase:“${p.p}” +${p.w||3}`);
    }
  }

  // 2) Brand keywords (medium)
  for (const k of (brand.keywords||[])) {
    const needle = norm(k);
    if (needle && nt.includes(needle)) {
      score += 2;
      hits.push(`keyword:“${k}” +2`);
    }
  }

  // 3) Weak signals (low)
  for (const w of (brand.weak||[])) {
    const needle = norm(w);
    if (needle && nt.includes(needle)) {
      score += 0.5;
      hits.push(`weak:“${w}” +0.5`);
    }
  }

  return { score: +score.toFixed(2), hits };
}

function bestBrand(text) {
  const scored = BRANDS.map(b => {
    const {score, hits} = scoreBrand(text, b);
    return { brand: b, score, hits };
  }).sort((a,b)=>b.score-a.score);

  const best = scored[0];
  const second = scored[1] || {score:0};

  // Confidence heuristic
  const margin = best.score - second.score;
  const confidence =
    best.score >= 8 && margin >= 2 ? 'high' :
    best.score >= 5 && margin >= 1 ? 'medium' : 'low';

  return { best, second, confidence, all: scored };
}

function getOverrideUrl(brandId, text) {
  for (const o of DEAL_OVERRIDES) {
    if (o.brandId !== brandId) continue;
    if (o.patterns.some(rx => rx.test(text))) return o.url;
  }
  return null;
}

/* ========= Image intake ========= */
const showPreview = (src) => { preview.src = src; preview.style.display='block'; scanBtn.disabled=false; }
const dataURLFromFile = (f)=> new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });

pickBtn.addEventListener('click', ()=>fileInput.click());
fileInput.addEventListener('change', async e=>{
  const f=e.target.files?.[0]; if(!f) return; showPreview(await dataURLFromFile(f));
});
demoBtn.addEventListener('click', ()=>showPreview(DEMO_SRC));
['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, e=>{e.preventDefault(); dropzone.classList.add('drag');}));
['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, e=>{e.preventDefault(); dropzone.classList.remove('drag');}));
dropzone.addEventListener('drop', async e=>{
  const f=e.dataTransfer.files?.[0];
  if (f && f.type.startsWith('image/')) showPreview(await dataURLFromFile(f));
});
window.addEventListener('paste', async e=>{
  const item=[...e.clipboardData.items].find(i=>i.type.startsWith('image/'));
  if(item){ const f=item.getAsFile(); showPreview(await dataURLFromFile(f)); }
});

/* ========= OCR + detect + link ========= */
scanBtn.addEventListener('click', async ()=>{
  if(!preview.src) return;
  results.hidden = true;
  storeBlock.innerHTML = ''; explainEl.textContent = '';
  progress.hidden = false; progressBar.style.width='0%'; scanBtn.disabled=true;

  try {
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => { if (m.status==='recognizing text' && m.progress!=null) progressBar.style.width = Math.round(m.progress*100)+'%'; }
    });
    const { data } = await worker.recognize(preview.src);
    await worker.terminate();

    const text = (data.text || '').trim();
    ocrTextEl.textContent = text || '(no text)';

    const { best, second, confidence, all } = bestBrand(text);

    // Build result UI
    const block = document.createElement('div');
    const chosen = best.brand;
    const overrideUrl = getOverrideUrl(chosen.id, text);
    const finalUrl = overrideUrl || chosen.dealUrl;

    block.innerHTML = `
      <p class="brand">${chosen.name}
        <span class="badge">confidence: ${confidence} (score ${best.score.toFixed(2)}; next ${second.score?.toFixed(2) ?? 0})</span>
      </p>
      <a class="cta" target="_blank" rel="noopener" href="${finalUrl}">Open ${chosen.name} Deals</a>
      <a class="cta secondary" target="_blank" rel="noopener"
         href="https://www.google.com/search?q=${encodeURIComponent(chosen.name+' deal ' + text.slice(0,100))}">Search this exact offer</a>
    `;
    storeBlock.appendChild(block);

    const why = [
      `Top candidate: ${chosen.name}`,
      `Score breakdown:`,
      ...best.hits.map(h=>'• '+h),
      '',
      `Others:`,
      ...all.slice(1,4).map(r=>`- ${r.brand.name}: ${r.score}`)
    ].join('\n');
    explainEl.textContent = why;

    results.hidden = false;

    if (autoOpen.checked && confidence === 'high') {
      window.open(finalUrl, '_blank', 'noopener');
    }
  } catch (err) {
    console.error(err);
    alert('Detection failed. Try a clearer photo or different angle.');
  } finally {
    progress.hidden = true;
    scanBtn.disabled = false;
  }
});
