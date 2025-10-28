// ========= Extracted from the sign =========
// Restaurant: inferred as "McDonald’s" from "McVALUE" brand language & food items.
// Deal type: BOGO (second item for $1)
// Price: "$1 for 2nd item"
// Schedule: not shown on sign → assume "Limited time • At participating locations"
// Typical 2nd item price for savings math: assumed $4.29 (user-editable)

const state = {
  restaurant: "McDonald’s",
  dealTitle: "Buy One, Add One for $1",
  dealType: "BOGO (second for $1)",
  dealPrice: "$1 for 2nd item",
  schedule: "Limited time • At participating locations",
  typicalSecondItemPrice: 4.29,
  city: "",
  shareProofBase: 120
};

// Elements
const restaurantName = document.getElementById("restaurantName");
const dealTitle = document.getElementById("dealTitle");
const dealType = document.getElementById("dealType");
const dealPrice = document.getElementById("dealPrice");
const dealSchedule = document.getElementById("dealSchedule");
const savingsLine = document.getElementById("savingsLine");
const shareBtn = document.getElementById("shareBtn");
const copyCardBtn = document.getElementById("copyCardBtn");
const likeBtn = document.getElementById("likeBtn");
const likeCountEl = document.getElementById("likeCount");
const shareResult = document.getElementById("shareResult");
const shareProof = document.getElementById("shareProof");

const inRestaurant = document.getElementById("inRestaurant");
const inTypical = document.getElementById("inTypical");
const inSchedule = document.getElementById("inSchedule");
const inCity = document.getElementById("inCity");
const applyBtn = document.getElementById("applyBtn");

function fmtCurrency(n){return n.toLocaleString(undefined,{style:'currency',currency:'USD'});}

function render(){
  restaurantName.textContent = state.restaurant;
  dealTitle.textContent = state.dealTitle;
  dealType.textContent = state.dealType;
  dealPrice.textContent = state.dealPrice;
  dealSchedule.textContent = `Available: ${state.schedule}`;
  const assumedSave = Math.max(0, state.typicalSecondItemPrice - 1);
  savingsLine.textContent = `Savings summary: Second item for $1 (save up to ~${fmtCurrency(assumedSave)} vs typical ${fmtCurrency(state.typicalSecondItemPrice)}).`;

  // playful rolling proof count (non-persistent)
  const roll = Math.floor(performance.now()/1000)%5; // gently wobble 0..4
  shareProof.textContent = state.shareProofBase + roll;
}

// Likes with localStorage persistence per-browser
const LS_KEY = "dealLikes_McVALUE_BuyOneAddOne";
function getLikes(){
  const n = parseInt(localStorage.getItem(LS_KEY) || "0",10);
  return isNaN(n) ? 0 : n;
}
function setLikes(n){
  localStorage.setItem(LS_KEY, String(n));
  likeCountEl.textContent = n;
}
setLikes(getLikes());

likeBtn.addEventListener("click", ()=>{
  setLikes(getLikes()+1);
  likeBtn.classList.add("pulse");
  setTimeout(()=>likeBtn.classList.remove("pulse"),180);
});

// Share helpers
function buildShareText(){
  const city = state.city ? ` in ${state.city}` : "";
  return `🔥 Deal at ${state.restaurant}${city}: ${state.dealTitle} — ${state.dealPrice}. ` +
         `Likely limited time at participating locations. ` +
         `Second item just $1 (save up to ~${fmtCurrency(Math.max(0,state.typicalSecondItemPrice-1))}). ` +
         `#McValue #FoodDeals`;
}

async function shareTextOrLink(){
  const text = buildShareText();
  try{
    await navigator.clipboard.writeText(text + "\n" + "(mock link): https://deals.example/mcvalue-bogo-1");
    shareResult.textContent = "✅ Copied deal text & mock link to clipboard!";
  }catch(err){
    // Fallback: render a mock share link UI
    const url = "https://deals.example/mcvalue-bogo-1";
    shareResult.innerHTML = `🔗 Mock share link: <a href="${url}" target="_blank" rel="noopener">${url}</a> — copy it manually if needed.`;
  }
}

shareBtn.addEventListener("click", shareTextOrLink);
copyCardBtn.addEventListener("click", async ()=>{
  try{
    await navigator.clipboard.writeText(buildShareText());
    shareResult.textContent = "✅ Deal text copied!";
  }catch(e){
    shareResult.textContent = "ℹ️ Clipboard isn’t available. Select & copy manually.";
  }
});

applyBtn.addEventListener("click", ()=>{
  state.restaurant = inRestaurant.value.trim() || state.restaurant;
  const v = parseFloat(inTypical.value);
  if(!Number.isNaN(v) && v>=0) state.typicalSecondItemPrice = v;
  state.schedule = inSchedule.value.trim() || state.schedule;
  state.city = inCity.value.trim();
  render();
  shareResult.textContent = "✅ Applied!";
  setTimeout(()=>shareResult.textContent="",1500);
});

render();
