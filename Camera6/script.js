// === CodePen-safe bootstrap ===
window.addEventListener('DOMContentLoaded', () => {
  /* ====== element map ====== */
  const els = {
    views: {
      landing: document.getElementById('landing'),
      analysis: document.getElementById('analysis'),
      result: document.getElementById('result'),
      why: document.getElementById('why'),
    },
    input: document.getElementById('posterInput'),
    preview: document.getElementById('posterPreview'),
    hint: document.getElementById('landingHint'),
    cta: document.getElementById('ctaAnalyze'),
    ocrStatus: document.getElementById('ocrStatus'),
    verdictCard: document.getElementById('verdictCard'),
    verdictText: document.getElementById('verdictText'),
    quip: document.getElementById('quip'),
    btnWhy: document.getElementById('btnWhy'),
    btnUploadNew: document.getElementById('btnUploadNew'),
    btnBackToResult: document.getElementById('btnBackToResult'),
    btnReset: document.getElementById('btnReset'),
    gloom: document.getElementById('gloomVignette'),
    savingsPercent: document.getElementById('savingsPercent'),
    promoPrice: document.getElementById('promoPrice'),
    basePrice: document.getElementById('basePrice'),
    reasonList: document.getElementById('reasonList'),
    flagList: document.getElementById('flagList'),
    stage: document.getElementById('posterStage'),
    whyPoster: document.getElementById('whyPoster'),
    highlightLayer: document.getElementById('highlightLayer'),
    workCanvas: document.getElementById('workCanvas'),
  };

  const STATE = {
    imageBlobUrl: null,
    ocr: null,
    flags: [],
    marks: [],
    prices: { promo: null, base: null, percentSaved: null, assumptions: [] },
    dominantColors: [],
    highlightColor: '#00d0ff',
  };

  /* ====== views ====== */
  function showView(name){
    Object.values(els.views).forEach(v => v.classList.remove('active'));
    els.views[name].classList.add('active');
    if (name === 'result') resizeGloom();
  }
  function resetAll(){
    if (STATE.imageBlobUrl) URL.revokeObjectURL(STATE.imageBlobUrl);
    STATE.imageBlobUrl = null; STATE.ocr = null; STATE.flags = []; STATE.marks = [];
    STATE.prices = { promo: null, base: null, percentSaved: null, assumptions: [] };
    STATE.dominantColors = []; STATE.highlightColor = '#00d0ff';
    els.preview.innerHTML = '';
    els.whyPoster.removeAttribute('src');
    els.highlightLayer.innerHTML = '';
    els.flagList.innerHTML = '';
    els.reasonList.innerHTML = '';
    els.savingsPercent.textContent = '—';
    els.promoPrice.textContent = '$—';
    els.basePrice.textContent = '$—';
    els.verdictText.textContent = '—';
    els.quip.textContent = '—';
    els.gloom.style.opacity = 0;
    els.hint.hidden = true;
    els.input.value = '';
    showView('landing');
  }

  /* ====== landing ====== */
  els.input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (STATE.imageBlobUrl) URL.revokeObjectURL(STATE.imageBlobUrl);
    STATE.imageBlobUrl = URL.createObjectURL(file);
    els.preview.innerHTML = '';
    const img = document.createElement('img');
    img.alt = 'Poster preview';
    img.src = STATE.imageBlobUrl;
    els.preview.appendChild(img);
    els.hint.hidden = true;
  });

  els.cta.addEventListener('click', async () => {
    if (!STATE.imageBlobUrl) { els.hint.hidden = false; return; }
    showView('analysis');              // show spinner immediately
    await runAnalysis();               // then OCR/analysis
  });

  els.btnUploadNew.addEventListener('click', () => showView('landing'));
  els.btnWhy.addEventListener('click', () => showView('why'));
  els.btnBackToResult.addEventListener('click', () => showView('result'));
  els.btnReset.addEventListener('click', resetAll);

  window.addEventListener('load', resetAll); // always return to Landing on reload
  window.addEventListener('resize', () => { resizeHighlightSvg(); resizeGloom(); });

  /* ====== Tesseract: explicit worker/core paths for CodePen ====== */
  const TESSERACT_OPTS = {
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/worker.min.js',
    corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@2.2.0/tesseract-core.wasm.js',
    langPath:   'https://tessdata.projectnaptha.com/4.0.0_best',
    logger: m => { if (m.status === 'recognizing text') els.ocrStatus.textContent = `Recognizing text: ${(m.progress*100|0)}%`; }
  };

  /* ====== analysis pipeline (same logic as before, shortened here) ====== */
  async function runAnalysis(){
    try{
      els.ocrStatus.textContent = 'Scanning the poster with OCR…';
      // If you were using Tesseract.recognize directly, pass the paths above:
      const { data } = await Tesseract.recognize(STATE.imageBlobUrl, 'eng', TESSERACT_OPTS);

      STATE.ocr = data;

      // ... (all your existing extraction, flags, merging, colors, verdict, and WHY setup)
      // To keep this snippet focused on the click/worker fix, re-use your previous
      // functions computePrices/detectFlags/mergeRegions/etc. unchanged.

      // ---- BEGIN: minimal working result so you can see it change screens ----
      els.verdictText.textContent = 'Buy!';
      els.quip.textContent = 'That’s a hot deal—your wallet just did a happy dance.';
      showView('result');
      try { confetti({ particleCount: 140, spread: 70, origin: { y: 0.6 } }); } catch {}
      // ---- END: minimal working result ----

    } catch (e){
      console.error('OCR failed in CodePen sandbox:', e);
      // graceful fallback so you still leave Landing
      els.verdictText.textContent = 'Don’t buy!';
      els.quip.textContent = 'If we can’t read it, we can’t trust it. 💀';
      showView('result');
      fadeGloom();
    }
  }

  /* ====== small helpers kept unchanged from your version ====== */
  function resizeGloom(){ const c = els.gloom; c.width = innerWidth; c.height = innerHeight; }
  function fadeGloom(){
    const ctx = els.gloom.getContext('2d'); const {width:w, height:h} = els.gloom;
    ctx.clearRect(0,0,w,h);
    const grd = ctx.createRadialGradient(w/2, h*0.4, Math.min(w,h)*0.2, w/2, h*0.5, Math.max(w,h)*0.75);
    grd.addColorStop(0,'rgba(0,0,0,0)'); grd.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);
    els.gloom.style.opacity = 1;
  }
  function resizeHighlightSvg(){
    const rect = els.stage.getBoundingClientRect();
    els.highlightLayer.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
    els.highlightLayer.setAttribute('width', rect.width);
    els.highlightLayer.setAttribute('height', rect.height);
  }
});
