const items = [
{ name: 'Whole Milk', daysLeft: 5, image: 'https://i5.walmartimages.com/seo/Great-Value-Whole-Vitamin-D-Milk-Gallon-Plastic-Jug-128-Fl-Oz_6a7b09b4-f51d-4bea-a01c-85767f1b481a.86876244397d83ce6cdedb030abe6e4a.jpeg' },
{ name: 'Eggs (dozen)', daysLeft: 10, image: 'https://target.scene7.com/is/image/Target/GUEST_afe214fe-c8f7-4d61-ad59-1344ef90fbb9' },
{ name: 'Romaine Lettuce', daysLeft: 2, image: 'https://i5.walmartimages.com/asr/3c80d925-a30f-48d6-82e0-8a84095ddd70.27f29c1aec9667954e72c72969e0dadd.jpeg?odnHeight=768&odnWidth=768&odnBg=FFFFFF' },
{ name: 'Strawberries', daysLeft: 1, image: 'https://i5.walmartimages.com/asr/373f0c0a-d976-4518-967c-9e8c626d1a10.fd992b4534c99ffa7bba91525be393cb.jpeg?odnHeight=768&odnWidth=768&odnBg=FFFFFF' },
{ name: 'Greek Yogurt', daysLeft: -1, image: 'https://storage.googleapis.com/images-lnb-prd-8936dd0.lnb.prd.v8.commerce.mi9cloud.com/product-images/zoom/00894700010137.png' },
{ name: 'Cheddar Cheese', daysLeft: 12, image: 'https://i5.walmartimages.com/seo/Great-Value-Block-Medium-Cheddar-Cheese-8-oz-Plastic-Packaging_4b6f6c58-df25-493b-a2ee-d95752c7ebe7.129ad160714f4e2fb20993ee608b6ee9.jpeg?odnHeight=768&odnWidth=768&odnBg=FFFFFF' },
{ name: 'Chicken Breast', daysLeft: 0, image: 'https://i5.walmartimages.com/seo/Tyson-All-Natural-Fresh-Boneless-Skinless-Chicken-Breasts-1-75-3-0-lb-Tray_c687b5ac-cb31-454e-ad44-b2fd34b6e0ea.259e24e6ef61b1a234d01dd777fa675f.jpeg?odnHeight=768&odnWidth=768&odnBg=FFFFFF' },
{ name: 'Leftover Pasta', daysLeft: 3, image: 'https://www.muellerspasta.com/wp-content/uploads/2022/11/Hero_Dish-1024x893-1.png' },
].slice(0, 8);


const pad = (n) => String(n).padStart(2, '0');
const addDays = (baseDate, d) => new Date(baseDate.getTime() + d * 24 * 60 * 60 * 1000);
const fmtDate = (date) => date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });


const normalized = items.map((it) => {
const now = new Date();
const expiry = it.expiresAt ? new Date(it.expiresAt) : addDays(now, it.daysLeft || 0);
return { ...it, expiresAt: expiry, id: crypto.randomUUID() };
});


const grid = document.getElementById('grid');


function renderCards() {
grid.innerHTML = '';
normalized.forEach((it) => {
const card = document.createElement('article');
card.className = 'card';
card.setAttribute('data-id', it.id);
card.innerHTML = `
<div class="thumb">
<img src="${it.image}" alt="${it.name}" loading="lazy" />
</div>
<div class="body">
<div class="title">${it.name}</div>
<div class="badge" data-badge>Checking…</div>
<div class="time" role="timer" aria-live="off" data-countdown>--:--:--:--</div>
<div class="date">Expires on <span data-expiry>${fmtDate(it.expiresAt)}</span></div>
</div>`;
grid.appendChild(card);
});
}


function getStatus(msLeft) {
if (msLeft <= 0) return { label: 'Expired', tone: 'danger' };
if (msLeft <= 48 * 60 * 60 * 1000) return { label: 'Expiring soon', tone: 'warning' };
return { label: 'Fresh', tone: 'ok' };
}


function formatDuration(ms) {
if (ms <= 0) return '00d : 00h : 00m : 00s';
const totalSeconds = Math.floor(ms / 1000);
const days = Math.floor(totalSeconds / 86400);
const hours = Math.floor((totalSeconds % 86400) / 3600);
const minutes = Math.floor((totalSeconds % 3600) / 60);
const seconds = totalSeconds % 60;
return `${pad(days)}d : ${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s`;
}


function tick() {
const now = new Date();
document.getElementById('now').textContent = `Now: ${fmtDate(now)}`;
normalized.forEach((it) => {
const card = grid.querySelector(`[data-id="${it.id}"]`);
if (!card) return;


const countdownEl = card.querySelector('[data-countdown]');
const badgeEl = card.querySelector('[data-badge]');


const msLeft = it.expiresAt.getTime() - now.getTime();
countdownEl.textContent = formatDuration(msLeft);


const status = getStatus(msLeft);
if (status.tone === 'danger') {
card.classList.add('expired');
if (!card.querySelector('.ribbon')) {
const rb = document.createElement('div');
rb.className = 'ribbon';
rb.textContent = 'EXPIRED';
card.appendChild(rb);
}
} else {
card.classList.remove('expired');
const rb = card.querySelector('.ribbon');
if (rb) rb.remove();
}


badgeEl.textContent = status.label;
});
}


renderCards();
tick();
const interval = setInterval(tick, 1000);


document.getElementById('refreshBtn').addEventListener('click', tick);
window.addEventListener('beforeunload', () => clearInterval(interval));
