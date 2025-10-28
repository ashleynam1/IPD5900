/* Core assumptions used in calculations:
   - For each pair of items, you pay: regularPrice (first item) + addOnPrice ($1 from the sign).
   - Any leftover odd item is charged at regularPrice.
   - Savings = (regularPrice * qty) - (dealCost).
   - Percentage = savings / (regularPrice * qty).
*/

const itemSelect = document.getElementById('item');
const regularPriceInput = document.getElementById('regularPrice');
const qtyInput = document.getElementById('qty');
const addOnInput = document.getElementById('addOnPrice');
const calcBtn = document.getElementById('calcBtn');

const regularTotalEl = document.getElementById('regularTotal');
const dealTotalEl = document.getElementById('dealTotal');
const saveAmtEl = document.getElementById('saveAmt');
const savePctEl = document.getElementById('savePct');
const resultBox = document.getElementById('result');
const blurbEl = document.getElementById('blurb');

// Sync default regular price when the item changes
itemSelect.addEventListener('change', () => {
  const opt = itemSelect.options[itemSelect.selectedIndex];
  const baseline = parseFloat(opt.dataset.regular || '0');
  regularPriceInput.value = baseline.toFixed(2);
});

// Currency formatter
const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

function calc() {
  const regular = Math.max(0, parseFloat(regularPriceInput.value || '0'));
  const qty = Math.max(1, parseInt(qtyInput.value || '1', 10));
  const addOn = Math.max(0, parseFloat(addOnInput.value || '1'));

  const pairs = Math.floor(qty / 2);
  const leftover = qty % 2;

  const regularTotal = regular * qty;
  const dealCost = pairs * (regular + addOn) + leftover * regular;

  const savings = Math.max(0, regularTotal - dealCost);
  const pct = regularTotal > 0 ? (savings / regularTotal) * 100 : 0;

  regularTotalEl.textContent = fmt.format(regularTotal);
  dealTotalEl.textContent = fmt.format(dealCost);
  saveAmtEl.textContent = fmt.format(savings);
  savePctEl.textContent = `${pct.toFixed(1)}% off`;

  const itemName = itemSelect.options[itemSelect.selectedIndex].textContent;
  const pairText = pairs > 0 ? `${pairs} pair${pairs>1?'s':''}` : `no full pairs`;
  blurbEl.textContent = `With ${qty} × ${itemName} at a regular price of ${fmt.format(regular)}, ` +
    `this deal gives you ${pairText}, charging the second item in each pair at ${fmt.format(addOn)}.`;

  resultBox.classList.add('show');
}

calcBtn.addEventListener('click', calc);

// Nice: auto-calc on input for faster iteration
[regularPriceInput, qtyInput, addOnInput].forEach(el => el.addEventListener('input', () => {
  if (resultBox.classList.contains('show')) calc();
}));
