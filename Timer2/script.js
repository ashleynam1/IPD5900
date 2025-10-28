/* Daisy Love Timer — improved falling petals
   - Builds a daisy with N petals
   - Each petal has random drift & spin for a natural fall
   - Sequential: small wilt, then a curved tumble away from the flower
   - Last petal decides the mood
*/

const daisyEl    = document.getElementById('daisy');
const messageEl  = document.getElementById('message');
const countEl    = document.getElementById('count');
const startBtn   = document.getElementById('startBtn');
const resetBtn   = document.getElementById('resetBtn');
const petalInput = document.getElementById('petalCount');
const intervalIn = document.getElementById('interval');

let wraps = [];   // array of .petal-wrap
let petals = [];  // array of .petal
let timerId = null;
let running = false;

function setMessage(text) {
  messageEl.classList.remove('swap-in');
  messageEl.classList.add('swap-out');
  setTimeout(() => {
    messageEl.textContent = text;
    messageEl.classList.remove('swap-out');
    messageEl.classList.add('swap-in');
  }, 120);
}

function updateCount(remaining) {
  countEl.textContent = `Petals left: ${remaining}`;
}

function clearMood() {
  document.body.classList.remove('mood-happy', 'mood-sad');
}

function finalMood(petalCount) {
  // starting phrase is "He loves me" => odd petals end on "He loves me"
  const isLove = petalCount % 2 === 1;
  setMessage(isLove ? 'He loves me' : 'He loves me not');
  document.body.classList.add(isLove ? 'mood-happy' : 'mood-sad');
}

function rand(min, max) { return Math.random() * (max - min) + min; }

function buildDaisy(count) {
  daisyEl.innerHTML = '';
  clearMood();
  wraps = [];
  petals = [];

  // center disk
  const center = document.createElement('div');
  center.className = 'center-disk';
  daisyEl.appendChild(center);

  const angleStep = 360 / count;

  for (let i = 0; i < count; i++) {
    // wrapper controls the radial angle; inner is the actual petal
    const wrap = document.createElement('div');
    wrap.className = 'petal-wrap';
    wrap.style.setProperty('--angle', `${i * angleStep}deg`);

    const petal = document.createElement('div');
    petal.className = 'petal';

    // randomized fall personality per petal
    const drift = rand(-140, 140);           // horizontal sway distance
    const spin = rand(240, 540);             // total spin (deg)
    petal.style.setProperty('--drift', `${drift}px`);
    petal.style.setProperty('--spin', `${spin}deg`);

    wrap.appendChild(petal);
    daisyEl.appendChild(wrap);

    wraps.push(wrap);
    petals.push(petal);
  }

  updateCount(count);
  setMessage('Ready?');
}

function startTimer() {
  if (running) return;
  running = true;
  clearMood();

  const total = petals.length;
  const interval = Math.max(200, Number(intervalIn.value) || 1200);

  let i = 0;
  let loves = true; // first petal => "He loves me"

  function step() {
    if (i >= total) {
      running = false;
      return;
    }

    const petal = petals[i];

    // Phase 1: quick wilt
    petal.classList.add('detaching');

    // Update phrase immediately as it begins to go
    setMessage(loves ? 'He loves me' : 'He loves me not');
    loves = !loves;

    // After wilt, start the fall
    setTimeout(() => {
      petal.classList.remove('detaching');
      petal.classList.add('falling');
    }, 260);

    // Update remaining
    updateCount(total - (i + 1));
    i++;

    if (i < total) {
      timerId = setTimeout(step, interval);
    } else {
      // last petal triggered; after fall ends, set mood
      timerId = setTimeout(() => {
        finalMood(total);
        running = false;
      }, 1800);
    }
  }

  step();
}

function resetTimer() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  running = false;
  clearMood();
  buildDaisy(validatedCount());
}

function validatedCount() {
  const n = Math.round(Number(petalInput.value) || 21);
  const clamped = Math.min(48, Math.max(5, n));
  if (clamped !== n) petalInput.value = clamped;
  return clamped;
}

/* Wire up controls */
startBtn.addEventListener('click', () => {
  if (!running) startTimer();
});

resetBtn.addEventListener('click', resetTimer);

petalInput.addEventListener('change', () => {
  if (!running) buildDaisy(validatedCount());
});

window.addEventListener('load', () => {
  buildDaisy(validatedCount());
});
