import { gradeAnswer, toTraditional } from "./grade.js";

const CHAIN = [
  { id: "sun", text: "太陽加熱陸地" },
  { id: "rise", text: "熱空氣膨脹上升" },
  { id: "low", text: "陸地附近氣壓變低" },
  { id: "fill", text: "冷空氣由海洋補上" },
  { id: "wind", text: "空氣流動，形成風" },
];

const WHY = {
  sun: "一切由太陽加熱陸地開始。",
  rise: "陸地熱了，熱空氣才會膨脹上升。",
  low: "熱空氣升走，近地面的氣壓才變低。",
  fill: "氣壓變低之後，冷空氣才會流過來補上。",
  wind: "冷空氣補上，空氣流動起來，才形成風。",
};

const QUESTIONS = {
  predictHeat: {
    kicker: "先猜一猜",
    title: "太陽同時曬著陸地和海洋。哪裡的空氣會先變熱？",
    lead: "選之前先想：沙石和海水，誰熱得比較快？",
    next: "heat",
    nextLabel: "去加熱陸地",
    choices: [
      { text: "陸地上方的空氣", ok: true, why: "對。沙石熱得比海水快，陸地上方的空氣先變熱。" },
      { text: "海洋上方的空氣", ok: false, why: "海水要吸收很多熱才升溫，海洋上的空氣熱得較慢。" },
      { text: "兩邊一樣快", ok: false, why: "陸地和海洋吸熱的速度不一樣。再選一次。" },
    ],
  },
  predictMove: {
    kicker: "看完再判斷",
    title: "這些受熱的空氣會怎樣？",
    lead: "紅色粒子就是陸地上方的空氣。想想粒子之間的距離。",
    next: "pressure",
    nextLabel: "接著看氣壓",
    choices: [
      { text: "膨脹，然後上升", ok: true, why: "對。粒子距離拉開就是膨脹，空氣變輕，於是上升。" },
      { text: "收縮，然後下沉", ok: false, why: "受熱時粒子會散開，不是擠在一起。" },
      { text: "停住不動", ok: false, why: "受熱後空氣變輕，不會停在原地。" },
    ],
  },
  pressure: {
    kicker: "再想一步",
    title: "熱空氣升走以後，陸地附近的空氣變少。氣壓會怎樣？",
    lead: "空氣少了，壓向地面的力會變大，還是變小？",
    next: "direction",
    nextLabel: "決定風的方向",
    choices: [
      { text: "變低", ok: true, why: "對。陸地附近變成低氣壓。海洋上的冷空氣比較密集，是高氣壓。" },
      { text: "變高", ok: false, why: "空氣少了，壓下來的力變小，所以氣壓變低。" },
      { text: "沒有分別", ok: false, why: "空氣變少，氣壓一定會改變。" },
    ],
  },
  direction: {
    kicker: "推出方向",
    title: "空氣由高氣壓流向低氣壓。冷空氣會往哪裡走？",
    lead: "先指出起點和終點，再動手劃。",
    next: "draw",
    nextLabel: "去劃這股風",
    choices: [
      { text: "由海洋流向陸地", ok: true, why: "對。海洋是高氣壓，陸地是低氣壓，冷空氣流向陸地。" },
      { text: "由陸地流向海洋", ok: false, why: "陸地現在是低氣壓，空氣是流進去，不是流走。" },
    ],
  },
};

const PROGRESS = [
  { label: "受熱", steps: ["title", "predictHeat", "heat", "predictMove"] },
  { label: "氣壓", steps: ["pressure"] },
  { label: "海風", steps: ["direction", "draw"] },
  { label: "排序", steps: ["order"] },
  { label: "說出來", steps: ["explain", "done"] },
];

const PASS_SENTENCE = "熱空氣上升，冷空氣補上，空氣流動就成為風。";

const ADAPT_CARDS = [
  { id: "hot", text: "熱空氣上升" },
  { id: "cold", text: "冷空氣補上" },
  { id: "wind", text: "空氣流動就成為風" },
  { id: "extra", text: "冷空氣上升" },
];

const VOICE_LANGS = ["zh-HK", "zh-TW", "zh-CN"];

const sky = document.getElementById("sky");
const world = document.getElementById("world");
const air = document.getElementById("air");
const ctx = air.getContext("2d");
const sunBtn = document.getElementById("sun-btn");
const tagLand = document.getElementById("tag-land");
const tagSea = document.getElementById("tag-sea");
const badgeLow = document.getElementById("badge-low");
const badgeHigh = document.getElementById("badge-high");
const kicker = document.getElementById("kicker");
const prompt = document.getElementById("prompt");
const lead = document.getElementById("lead");
const feedback = document.getElementById("feedback");
const choices = document.getElementById("choices");
const order = document.getElementById("order");
const form = document.getElementById("answer-form");
const answer = document.getElementById("answer");
const result = document.getElementById("result");
const scaffold = document.getElementById("scaffold");
const voiceBtn = document.getElementById("voice-btn");
const voiceTip = document.getElementById("voice-tip");
const adapt = document.getElementById("adapt");
const adaptOpen = document.getElementById("adapt-open");
const adaptClose = document.getElementById("adapt-close");
const drops = document.getElementById("drops");
const actions = document.getElementById("actions");
const progress = document.getElementById("progress");
const muteBtn = document.getElementById("mute");
const restartBtn = document.getElementById("restart");

function readMute() {
  try {
    return localStorage.getItem("wind-game-mute") === "1";
  } catch {
    return false;
  }
}

const particles = [];
const state = {
  step: "title",
  lock: false,
  muted: readMute(),
  badges: false,
  question: null,
  picked: [],
  bank: [],
  drawFails: 0,
  gradeTries: 0,
  stroke: null,
  drawing: false,
  finalText: "",
  finalScore: 0,
  adaptOn: false,
  adaptDeck: [],
  placed: { hot: null, cold: null, wind: null },
  selectedCard: null,
};

let audioCtx = null;

function sceneBox() {
  const width = sky.clientWidth;
  const height = sky.clientHeight;
  const scale = Math.min(width / 1200, height / 680);
  const w = 1200 * scale;
  const h = 680 * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
}

function px(nx, ny) {
  const box = sceneBox();
  return { x: box.x + nx * box.w, y: box.y + ny * box.h };
}

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, sky.clientWidth);
  const height = Math.max(1, sky.clientHeight);
  air.width = Math.round(width * dpr);
  air.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  placeHotspots();
}

function placeHotspots() {
  pin(sunBtn, 168 / 1200, 128 / 680, 104 / 1200);
  pin(tagLand, 0.16, 0.9);
  pin(tagSea, 0.8, 0.9);
  pin(badgeLow, 0.24, 0.48);
  pin(badgeHigh, 0.72, 0.42);
}

function pin(el, nx, ny, nw) {
  const box = sceneBox();
  const x = box.x + nx * box.w;
  const y = box.y + ny * box.h;
  if (nw) {
    const size = Math.max(64, nw * box.w);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.left = `${x - size / 2}px`;
    el.style.top = `${y - size / 2}px`;
    return;
  }
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}

function tone(kind) {
  if (state.muted) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const time = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.045, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    if (kind === "ok") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, time);
      osc.frequency.exponentialRampToValueAtTime(680, time + 0.14);
    } else if (kind === "no") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(196, time);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(540, time);
      gain.gain.setValueAtTime(0.03, time);
    }
    osc.start(time);
    osc.stop(time + 0.22);
  } catch {
    /* 音效失敗不應阻住探究 */
  }
}

function showFeedback(text, kind) {
  feedback.textContent = text;
  feedback.className = kind || "";
}

function showContinue(next, label) {
  actions.innerHTML = "";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary";
  button.dataset.next = next;
  button.textContent = label;
  actions.appendChild(button);
}

function renderProgress() {
  const current = PROGRESS.findIndex((item) => item.steps.includes(state.step));
  progress.innerHTML = "";
  PROGRESS.forEach((item, index) => {
    const pip = document.createElement("div");
    pip.className = "pip";
    if (index < current) pip.classList.add("done");
    if (index === current) pip.classList.add("on");
    const dot = document.createElement("i");
    const label = document.createElement("span");
    label.textContent = item.label;
    pip.append(dot, label);
    progress.appendChild(pip);
  });
}

function enter(next) {
  stopVoice();
  state.step = next;
  state.lock = false;
  state.question = QUESTIONS[next] || null;
  state.adaptOn = false;
  state.adaptDeck = [];
  state.placed = { hot: null, cold: null, wind: null };
  state.selectedCard = null;
  document.body.className = "";
  if (next === "heat") document.body.classList.add("is-heat");
  if (next === "draw") document.body.classList.add("is-draw");
  if (next === "explain") document.body.classList.add("is-write");
  if (next === "done") document.body.classList.add("is-done");
  fitCanvas();

  choices.innerHTML = "";
  actions.innerHTML = "";
  order.hidden = true;
  form.hidden = true;
  adapt.hidden = true;
  drops.hidden = true;
  result.innerHTML = "";
  scaffold.hidden = true;
  showFeedback("");
  badgeLow.classList.toggle("show", state.badges);
  badgeHigh.classList.toggle("show", state.badges);
  renderProgress();

  if (next === "title") renderTitle();
  else if (next === "heat") renderHeat();
  else if (next === "draw") renderDraw();
  else if (next === "order") renderOrder();
  else if (next === "explain") renderExplain();
  else if (next === "done") renderDone();
  else renderQuestion(state.question);

  if (next === "explain") answer.focus();
  else if (next !== "title") prompt.focus();
}

function renderTitle() {
  kicker.textContent = "海邊的謎題";
  prompt.textContent = "沒有人吹氣，風從哪裡來？";
  lead.textContent = "你是風之工程師。先猜，再觀察，最後用一句話說出風是怎樣形成的。";
  showContinue("predictHeat", "開始探究");
}

function renderHeat() {
  kicker.textContent = "動手看";
  prompt.textContent = "點一下太陽，加熱陸地。";
  lead.textContent = "看看陸地上方的空氣會出現什麼變化。";
}

function renderQuestion(question) {
  kicker.textContent = question.kicker;
  prompt.textContent = question.title;
  lead.textContent = question.lead;
  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.dataset.choice = String(index);
    button.textContent = choice.text;
    choices.appendChild(button);
  });
}

function onChoice(button) {
  const question = state.question;
  if (!question || state.lock) return;
  const choice = question.choices[Number(button.dataset.choice)];
  if (choice.ok) {
    state.lock = true;
    button.classList.add("is-right");
    choices.querySelectorAll("button").forEach((item) => {
      item.disabled = true;
    });
    tone("ok");
    showFeedback(choice.why, "ok");
    if (question === QUESTIONS.predictMove) riseParticles();
    if (question === QUESTIONS.pressure) {
      state.badges = true;
      badgeLow.classList.add("show");
      badgeHigh.classList.add("show");
    }
    showContinue(question.next, question.nextLabel);
    return;
  }
  button.classList.add("is-wrong");
  tone("no");
  showFeedback(choice.why, "no");
  window.setTimeout(() => button.classList.remove("is-wrong"), 360);
}

function renderDraw() {
  kicker.textContent = "動手驗證";
  prompt.textContent = "從海洋劃向陸地。";
  lead.textContent = "用手指或滑鼠，由右邊的海洋劃到左邊的陸地，帶動冷空氣。";
  showDrawFallback();
}

function showDrawFallback() {
  if (state.drawFails < 2 || document.getElementById("draw-fallback-action")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "primary sea";
  button.id = "draw-fallback-action";
  button.textContent = "改為看冷空氣流過去";
  button.addEventListener("click", succeedDraw);
  actions.appendChild(button);
}

function renderOrder() {
  kicker.textContent = "把原因排好";
  prompt.textContent = "風形成的過程，哪一步先發生？";
  lead.textContent = "點句子，按 1 到 5 排好。排錯了，可以點走那一步。";
  state.picked = [];
  state.bank = shuffle(CHAIN);
  paintOrder();
}

function paintOrder() {
  order.hidden = false;
  order.innerHTML = "";
  const slots = document.createElement("div");
  slots.className = "slots";
  for (let index = 0; index < CHAIN.length; index += 1) {
    const slot = document.createElement("button");
    slot.type = "button";
    const id = state.picked[index];
    const item = CHAIN.find((step) => step.id === id);
    slot.className = item ? "slot" : "slot empty";
    const number = document.createElement("span");
    number.className = "n";
    number.textContent = String(index + 1);
    const text = document.createElement("span");
    text.textContent = item ? item.text : "點下面的句子";
    slot.append(number, text);
    slot.disabled = !item;
    slot.addEventListener("click", () => removePick(index));
    slots.appendChild(slot);
  }
  const bank = document.createElement("div");
  bank.className = "bank";
  state.bank.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = item.text;
    button.addEventListener("click", () => addPick(item.id));
    bank.appendChild(button);
  });
  order.append(slots, bank);
}

function addPick(id) {
  if (state.picked.length >= CHAIN.length) return;
  state.picked.push(id);
  state.bank = state.bank.filter((item) => item.id !== id);
  tone("tap");
  showFeedback("");
  actions.innerHTML = "";
  paintOrder();
  if (state.picked.length === CHAIN.length) judgeOrder();
}

function removePick(index) {
  const [removed] = state.picked.splice(index, 1);
  if (!removed) return;
  state.bank.push(CHAIN.find((item) => item.id === removed));
  tone("tap");
  showFeedback("");
  actions.innerHTML = "";
  paintOrder();
}

function judgeOrder() {
  const badAt = state.picked.findIndex((id, index) => id !== CHAIN[index].id);
  if (badAt === -1) {
    tone("ok");
    showFeedback("順序正確。你已經把原因排好了。下一步，用自己的一句話說出來。", "ok");
    showContinue("explain", "用自己的句子寫一次");
    return;
  }
  tone("no");
  order.querySelectorAll(".slot")[badAt].classList.add("is-wrong");
  showFeedback(`${badAt + 1} 還不對。${WHY[CHAIN[badAt].id]}`, "no");
}

function renderExplain() {
  kicker.textContent = "說出過程";
  prompt.textContent = "用自己的句子，寫出風是怎樣形成的。";
  lead.textContent = "寫完整個過程，90 分或以上就可以過關。";
  form.hidden = false;
  adapt.hidden = true;
  drops.hidden = true;
  adaptOpen.hidden = false;
  adaptClose.hidden = false;
  answer.focus();
}

function renderResult(graded) {
  result.innerHTML = "";
  const card = document.createElement("div");
  card.className = `score-card ${graded.passed ? "pass" : "fail"}`;
  const ring = document.createElement("div");
  ring.className = "ring";
  ring.style.setProperty("--p", String(graded.score));
  ring.style.setProperty("--c", graded.passed ? "#2f8f5b" : "#d4573a");
  ring.setAttribute("aria-hidden", "true");
  const number = document.createElement("span");
  number.textContent = String(graded.score);
  ring.appendChild(number);
  const comment = document.createElement("p");
  comment.className = "comment";
  comment.textContent = graded.comment;
  const list = document.createElement("ul");
  list.className = "checks";
  [
    ["熱空氣上升", graded.checks.hot],
    ["冷空氣補上", graded.checks.cold],
    ["空氣流動就成為風", graded.checks.wind],
    ["順序正確", graded.checks.order],
  ].forEach(([label, ok]) => {
    const item = document.createElement("li");
    item.className = ok ? "ok" : "no";
    item.textContent = `${ok ? "已寫到" : "還未寫到"}：${label}`;
    list.appendChild(item);
  });
  card.append(ring, comment, list);
  result.appendChild(card);
  card.scrollIntoView({ block: "nearest" });
  scaffold.hidden = graded.passed || state.gradeTries < 2;
  scaffold.textContent = "可以按這個骨架再寫：熱空氣＿＿，冷空氣＿＿，空氣流動就成為＿＿。";
  actions.innerHTML = "";
  if (graded.passed) {
    state.finalText = answer.value.trim();
    state.finalScore = graded.score;
    adaptOpen.hidden = true;
    stopVoice();
    showContinue("done", graded.score === 100 ? "滿分過關" : "過關，領取證書");
    actions.querySelector("button")?.scrollIntoView({ block: "end" });
  }
}

function renderDone() {
  kicker.textContent = "風之工程師";
  prompt.textContent = state.finalScore === 100 ? "滿分。你說出了風形成的過程。" : "過關。你說出了風形成的過程。";
  lead.textContent = `這次得分 ${state.finalScore}。白天的海風，就是這一句：熱空氣上升，冷空氣補上，空氣流動就成為風。`;
  const quote = document.createElement("blockquote");
  quote.textContent = state.finalText;
  const night = document.createElement("div");
  night.className = "night";
  night.innerHTML = `
    <h3>想深一層</h3>
    <p>晚上陸地冷得比海洋快。你猜，風會改為往哪裡吹？</p>
    <button type="button" class="primary sea" id="night-hint">看提示</button>
    <p id="night-answer" hidden>近地面氣壓變高，風由陸地吹向海洋。這叫陸風。你可以用同樣的三步，跟同學解釋一次。</p>
  `;
  actions.innerHTML = "";
  actions.append(quote, night);
  world.classList.add("is-wind");
  spawnConfetti();
  tone("ok");
}

function heatLand() {
  if (state.step !== "heat" || state.lock) return;
  state.lock = true;
  tone("ok");
  world.classList.add("is-hot");
  spawnHot();
  window.setTimeout(() => enter("predictMove"), 650);
}

function spawnHot() {
  particles.length = 0;
  for (let index = 0; index < 16; index += 1) {
    const nx = 0.27 + (Math.random() - 0.5) * 0.07;
    const ny = 0.6 + (Math.random() - 0.5) * 0.04;
    particles.push({
      nx, ny, ntx: nx, nty: ny,
      r: 6 + Math.random() * 3,
      color: "#ff7a3c",
      alpha: 0.92,
      phase: "jitter",
      seed: Math.random() * 10,
    });
  }
}

function riseParticles() {
  particles.forEach((particle) => {
    const dx = particle.nx - 0.28;
    const dy = particle.ny - 0.64;
    const dist = Math.hypot(dx, dy) || 1;
    particle.ntx = particle.nx + (dx / dist) * (0.05 + Math.random() * 0.04);
    particle.nty = Math.max(0.18, particle.ny - 0.28 - Math.random() * 0.08);
    particle.phase = "glide";
    particle.alpha = 0.75;
  });
}

function spawnBreeze() {
  const start = performance.now();
  for (let index = 0; index < 22; index += 1) {
    particles.push({
      nx: 0.8 + Math.random() * 0.1,
      ny: 0.56 + Math.random() * 0.08,
      ntx: 0.24 + Math.random() * 0.1,
      nty: 0.62 + (Math.random() - 0.5) * 0.05,
      r: 6 + Math.random() * 3,
      color: "#2f9ed0",
      alpha: 0.95,
      phase: "wait",
      release: start + index * 50,
      seed: Math.random() * 10,
    });
  }
}

function spawnConfetti() {
  const colors = ["#ffd56a", "#ff7a3c", "#2f9ed0", "#fffaf3", "#2f8f5b"];
  for (let index = 0; index < 36; index += 1) {
    particles.push({
      nx: 0.15 + Math.random() * 0.7,
      ny: 0.05 + Math.random() * 0.15,
      ntx: 0,
      nty: 0,
      r: 3 + Math.random() * 3,
      color: colors[index % colors.length],
      alpha: 0.95,
      phase: "fall",
      vy: 0.004 + Math.random() * 0.006,
      seed: Math.random() * 10,
    });
  }
}

function succeedDraw() {
  if (state.lock) return;
  state.lock = true;
  state.stroke = null;
  tone("ok");
  world.classList.add("is-wind");
  spawnBreeze();
  showFeedback("冷空氣補上了。樹枝動起來，這股流動就是風。", "ok");
  window.setTimeout(() => enter("order"), 1700);
}

function pointerPos(event) {
  const rect = sky.getBoundingClientRect();
  const box = sceneBox();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return { nx: (x - box.x) / box.w, ny: (y - box.y) / box.h };
}

function onPointerDown(event) {
  if (state.step !== "draw" || state.lock) return;
  const pos = pointerPos(event);
  if (pos.nx < 0.6 || pos.ny < 0.28 || pos.ny > 0.96) {
    state.drawFails += 1;
    showDrawFallback();
    tone("no");
    showFeedback("要從右邊的海洋開始劃。", "no");
    return;
  }
  event.preventDefault();
  air.setPointerCapture(event.pointerId);
  state.drawing = true;
  state.stroke = { x1: pos.nx, y1: pos.ny, x2: pos.nx, y2: pos.ny };
}

function onPointerMove(event) {
  if (!state.drawing || !state.stroke) return;
  event.preventDefault();
  const pos = pointerPos(event);
  state.stroke.x2 = pos.nx;
  state.stroke.y2 = pos.ny;
}

function onPointerUp(event) {
  if (!state.drawing || !state.stroke) return;
  state.drawing = false;
  const pos = pointerPos(event);
  state.stroke.x2 = pos.nx;
  state.stroke.y2 = pos.ny;
  const moved = state.stroke.x1 - pos.nx;
  const reachedLand = pos.nx < 0.48 && moved > 0.16;
  if (reachedLand) {
    succeedDraw();
    return;
  }
  state.stroke = null;
  state.drawFails += 1;
  showDrawFallback();
  tone("no");
  showFeedback("再劃長一點，一直劃到左邊的陸地。", "no");
}

function shuffle(list) {
  const copy = list.slice();
  for (let guard = 0; guard < 6; guard += 1) {
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    if (copy.some((item, index) => item.id !== list[index].id)) return copy;
  }
  return copy;
}

function frame(now) {
  requestAnimationFrame(frame);
  const width = sky.clientWidth;
  const height = sky.clientHeight;
  ctx.clearRect(0, 0, width, height);
  particles.forEach((particle) => {
    if (particle.phase === "wait") {
      if (now < particle.release) return;
      particle.phase = "glide";
    }
    if (particle.phase === "glide") {
      particle.nx += (particle.ntx - particle.nx) * 0.045;
      particle.ny += (particle.nty - particle.ny) * 0.045;
    } else if (particle.phase === "fall") {
      particle.ny += particle.vy;
      particle.nx += Math.sin(now / 220 + particle.seed) * 0.002;
      if (particle.ny > 1.05) particle.alpha = 0;
    }
    const point = px(particle.nx, particle.ny);
    let x = point.x;
    let y = point.y;
    if (particle.phase === "jitter") {
      x += Math.sin(now / 90 + particle.seed) * 3;
      y += Math.cos(now / 110 + particle.seed) * 3;
    }
    ctx.globalAlpha = particle.alpha * 0.22;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(x, y, particle.r * 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = particle.alpha;
    ctx.beginPath();
    ctx.arc(x, y, particle.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.min(1, particle.alpha);
    ctx.fillStyle = "rgba(255, 250, 243, 0.9)";
    ctx.beginPath();
    ctx.arc(x - particle.r * 0.28, y - particle.r * 0.28, particle.r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  if (state.stroke) {
    const start = px(state.stroke.x1, state.stroke.y1);
    const end = px(state.stroke.x2, state.stroke.y2);
    ctx.strokeStyle = "rgba(20, 122, 150, 0.9)";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    ctx.fillStyle = "rgba(20, 122, 150, 0.95)";
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - 18 * Math.cos(angle - 0.45), end.y - 18 * Math.sin(angle - 0.45));
    ctx.lineTo(end.x - 18 * Math.cos(angle + 0.45), end.y - 18 * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
  }
}

let recognition = null;
let voiceLangIndex = 0;
let voiceListening = false;
let voiceBase = "";
let voiceHeard = false;
let voiceWantStop = false;
let voiceRetry = false;
let voiceNote = "";
let drag = null;
let skipClick = false;
let skipTimer = 0;

function setupVoice() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) {
    markVoiceUnsupported();
    return;
  }
  try {
    recognition = new Ctor();
  } catch {
    markVoiceUnsupported();
    return;
  }
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    voiceListening = true;
    voiceHeard = false;
    voiceBtn.textContent = "停止輸入";
    voiceBtn.setAttribute("aria-pressed", "true");
    voiceTip.hidden = false;
    voiceTip.textContent = "正在聽你說話……";
  };
  recognition.onresult = (event) => {
    let text = "";
    for (let index = 0; index < event.results.length; index += 1) {
      text += event.results[index][0].transcript;
    }
    text = text.trim();
    if (!text) return;
    voiceHeard = true;
    const limit = answer.maxLength > 0 ? answer.maxLength : 160;
    answer.value = toTraditional(text).slice(0, limit);
    answer.dispatchEvent(new Event("input"));
  };
  recognition.onerror = (event) => {
    const code = event.error;
    if (code === "aborted") return;
    if (code === "no-speech") return;
    if (code === "language-not-supported" && voiceLangIndex < VOICE_LANGS.length - 1) {
      voiceLangIndex += 1;
      voiceRetry = true;
      return;
    }
    if (code === "language-not-supported") {
      markVoiceUnsupported();
      return;
    }
    voiceTip.hidden = false;
    if (code === "not-allowed" || code === "service-not-allowed") {
      voiceNote = "mic";
      voiceTip.textContent = "未能使用麥克風，可以改為打字。";
      return;
    }
    voiceNote = "fail";
    voiceTip.textContent = "語音輸入暫時未能使用，可以改為打字。";
  };
  recognition.onend = () => {
    voiceListening = false;
    const stopped = voiceWantStop;
    const retry = voiceRetry;
    const note = voiceNote;
    voiceWantStop = false;
    voiceRetry = false;
    voiceNote = "";
    voiceBtn.textContent = "語音輸入";
    voiceBtn.setAttribute("aria-pressed", "false");
    if (retry) {
      window.setTimeout(() => startVoice(), 0);
      return;
    }
    if (!voiceHeard) answer.value = voiceBase;
    if (voiceBtn.disabled || note) return;
    if (voiceHeard) {
      voiceTip.hidden = false;
      voiceTip.textContent = "可以改一改句子，再交給評分。";
      return;
    }
    if (!stopped) {
      voiceTip.hidden = false;
      voiceTip.textContent = "沒有聽到說話，再按一次語音輸入。";
    }
  };
}

function markVoiceUnsupported() {
  recognition = null;
  voiceBtn.disabled = true;
  voiceBtn.setAttribute("aria-pressed", "false");
  voiceTip.hidden = false;
  voiceTip.textContent = "此裝置不支援語音輸入";
}

function startVoice() {
  if (!recognition || voiceBtn.disabled || state.step !== "explain" || state.adaptOn) return;
  voiceBase = answer.value;
  voiceHeard = false;
  voiceWantStop = false;
  recognition.lang = VOICE_LANGS[voiceLangIndex];
  try {
    recognition.start();
  } catch (error) {
    if (error && error.name === "InvalidStateError") return;
    voiceTip.hidden = false;
    voiceTip.textContent = "語音輸入暫時未能使用，可以改為打字。";
  }
}

function stopVoice() {
  if (!recognition || !voiceListening) return;
  voiceWantStop = true;
  voiceRetry = false;
  try {
    recognition.stop();
  } catch {
    voiceListening = false;
  }
}

function openAdapt() {
  if (state.step !== "explain" || state.lock) return;
  stopVoice();
  state.adaptOn = true;
  if (state.adaptDeck.length === 0) {
    state.adaptDeck = shuffle(ADAPT_CARDS);
    state.placed = { hot: null, cold: null, wind: null };
    state.selectedCard = null;
  }
  document.body.classList.add("is-adapt");
  fitCanvas();
  form.hidden = true;
  adapt.hidden = false;
  drops.hidden = false;
  adaptClose.hidden = false;
  prompt.textContent = "把卡片放到圖旁邊的空位。";
  lead.textContent = "拖卡片到空位，也可以先點卡片再點空位。三個空位都放對就可以過關。";
  showFeedback("");
  paintAdapt();
  document.querySelector("#adapt-bank .drag-card")?.focus();
}

function closeAdapt() {
  if (!state.adaptOn || state.lock) return;
  cleanupDrag();
  state.adaptOn = false;
  state.selectedCard = null;
  document.body.classList.remove("is-adapt");
  fitCanvas();
  adapt.hidden = true;
  drops.hidden = true;
  form.hidden = false;
  prompt.textContent = "用自己的句子，寫出風是怎樣形成的。";
  lead.textContent = "寫完整個過程，90 分或以上就可以過關。";
  showFeedback("");
  answer.focus();
}

function makeCard(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip drag-card";
  if (state.selectedCard === item.id) button.classList.add("is-selected");
  button.dataset.id = item.id;
  button.textContent = item.text;
  button.setAttribute("aria-pressed", state.selectedCard === item.id ? "true" : "false");
  button.disabled = state.lock;
  return button;
}

function paintAdapt() {
  const bank = document.getElementById("adapt-bank");
  bank.innerHTML = "";
  state.adaptDeck.forEach((item) => {
    const placed = Object.values(state.placed).includes(item.id);
    if (!placed) bank.appendChild(makeCard(item));
  });
  drops.querySelectorAll(".drop").forEach((slot) => {
    const slotId = slot.dataset.slot;
    const cardId = state.placed[slotId];
    const well = slot.querySelector(".drop-well");
    const label = slot.querySelector(".drop-label").textContent;
    well.querySelectorAll(".drag-card").forEach((node) => node.remove());
    slot.classList.toggle("is-filled", Boolean(cardId));
    if (!cardId) {
      slot.setAttribute("aria-label", `空位，${label}`);
      slot.tabIndex = 0;
      return;
    }
    const item = state.adaptDeck.find((card) => card.id === cardId);
    well.appendChild(makeCard(item));
    slot.setAttribute("aria-label", `${label}，${item.text}`);
    slot.tabIndex = -1;
  });
}

function toggleSelect(id) {
  if (state.lock) return;
  state.selectedCard = state.selectedCard === id ? null : id;
  paintAdapt();
  document.querySelector(`.drag-card[data-id="${id}"]`)?.focus();
  showFeedback(state.selectedCard ? "再點一個空位。" : "");
}

function flashSlot(slotId) {
  const slot = drops.querySelector(`.drop[data-slot="${slotId}"]`);
  if (!slot) return;
  slot.classList.remove("is-shake");
  void slot.offsetWidth;
  slot.classList.add("is-shake");
  window.setTimeout(() => slot.classList.remove("is-shake"), 360);
}

function tryPlace(cardId, slotId) {
  if (state.lock || !state.adaptOn) return;
  if (cardId === "extra") {
    state.selectedCard = null;
    paintAdapt();
    tone("no");
    showFeedback("這張用不到，請拖另外的卡片。", "no");
    flashSlot(slotId);
    return;
  }
  if (state.placed[slotId] === cardId) {
    state.selectedCard = null;
    paintAdapt();
    return;
  }
  if (state.placed[slotId]) {
    state.selectedCard = null;
    paintAdapt();
    tone("no");
    showFeedback("這裡已經有一張卡片。", "no");
    flashSlot(slotId);
    return;
  }
  if (cardId !== slotId) {
    state.selectedCard = null;
    paintAdapt();
    tone("no");
    showFeedback("這張不是放在這裡，再試一次。", "no");
    flashSlot(slotId);
    return;
  }
  Object.keys(state.placed).forEach((key) => {
    if (state.placed[key] === cardId) state.placed[key] = null;
  });
  state.placed[slotId] = cardId;
  state.selectedCard = null;
  const done = ["hot", "cold", "wind"].every((key) => state.placed[key] === key);
  if (done) {
    completeAdapt();
    return;
  }
  tone("ok");
  showFeedback("放對了。", "ok");
  paintAdapt();
}

function completeAdapt() {
  state.lock = true;
  const graded = gradeAnswer(PASS_SENTENCE);
  state.finalText = PASS_SENTENCE;
  state.finalScore = graded.passed ? graded.score : 100;
  answer.value = PASS_SENTENCE;
  paintAdapt();
  adaptClose.hidden = true;
  tone("ok");
  showFeedback("三個空位都放對了。", "ok");
  showContinue("done", state.finalScore === 100 ? "滿分過關" : "過關，領取證書");
  const nextButton = actions.querySelector("button");
  nextButton?.focus();
  nextButton?.scrollIntoView({ block: "end" });
}

function slotFromPoint(x, y) {
  const nodes = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [document.elementFromPoint(x, y)];
  for (const node of nodes) {
    if (!node) continue;
    const slot = node.closest?.(".drop");
    if (slot && drops.contains(slot)) return slot;
  }
  let nearest = null;
  let nearestDist = 20;
  drops.querySelectorAll(".drop").forEach((slot) => {
    const rect = slot.getBoundingClientRect();
    const cx = Math.min(Math.max(x, rect.left), rect.right);
    const cy = Math.min(Math.max(y, rect.top), rect.bottom);
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < nearestDist) {
      nearest = slot;
      nearestDist = dist;
    }
  });
  return nearest;
}

function clearSlotHighlight() {
  drops.querySelectorAll(".drop.is-over").forEach((slot) => slot.classList.remove("is-over"));
}

function cleanupDrag() {
  if (!drag) return;
  try {
    drag.card.releasePointerCapture(drag.pointerId);
  } catch {
    /* 指標已經放開 */
  }
  drag.card.classList.remove("is-lifting");
  drag.ghost.remove();
  drag = null;
  clearSlotHighlight();
  document.body.classList.remove("is-dragging");
}

function startDrag(card, event) {
  if (drag || card.disabled) return;
  event.preventDefault();
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.classList.add("drag-ghost");
  ghost.setAttribute("aria-hidden", "true");
  ghost.tabIndex = -1;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  document.body.appendChild(ghost);
  card.classList.add("is-lifting");
  document.body.classList.add("is-dragging");
  drag = {
    id: card.dataset.id,
    card,
    ghost,
    dx: event.clientX - rect.left,
    dy: event.clientY - rect.top,
    startX: event.clientX,
    startY: event.clientY,
    pointerId: event.pointerId,
    moved: false,
  };
  try {
    card.setPointerCapture(event.pointerId);
  } catch {
    /* 仍然靠 document 上的指標事件完成拖放 */
  }
}

function onAdaptPointerMove(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (event.cancelable) event.preventDefault();
  if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 16) drag.moved = true;
  drag.ghost.style.left = `${event.clientX - drag.dx}px`;
  drag.ghost.style.top = `${event.clientY - drag.dy}px`;
  const hit = slotFromPoint(event.clientX, event.clientY);
  drops.querySelectorAll(".drop").forEach((slot) => {
    slot.classList.toggle("is-over", slot === hit);
  });
}

function armSkipClick() {
  skipClick = true;
  window.clearTimeout(skipTimer);
  skipTimer = window.setTimeout(() => {
    skipClick = false;
  }, 250);
}

function onAdaptPointerUp(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const id = drag.id;
  const moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 16;
  const slot = moved ? slotFromPoint(event.clientX, event.clientY) : null;
  cleanupDrag();
  armSkipClick();
  if (!moved) {
    toggleSelect(id);
    return;
  }
  state.selectedCard = null;
  if (slot) tryPlace(id, slot.dataset.slot);
  else paintAdapt();
}

function restart() {
  if (state.step !== "title" && state.step !== "done") {
    const ok = window.confirm("要重新開始這次探究嗎？");
    if (!ok) return;
  }
  particles.length = 0;
  state.stroke = null;
  state.drawing = false;
  state.badges = false;
  state.drawFails = 0;
  state.gradeTries = 0;
  state.finalText = "";
  state.finalScore = 0;
  answer.value = "";
  world.classList.remove("is-hot", "is-wind");
  badgeLow.classList.remove("show");
  badgeHigh.classList.remove("show");
  enter("title");
}

function syncMute() {
  muteBtn.textContent = state.muted ? "聲音關" : "聲音開";
  muteBtn.setAttribute("aria-pressed", state.muted ? "true" : "false");
}

choices.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-choice]");
  if (button) onChoice(button);
});

actions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-next]");
  if (!button) return;
  if (button.dataset.next === "predictHeat") tone("tap");
  enter(button.dataset.next);
});

document.getElementById("coach").addEventListener("click", (event) => {
  if (!event.target.closest("#night-hint")) return;
  const note = document.getElementById("night-answer");
  if (note) note.hidden = false;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  stopVoice();
  if (!answer.value.trim()) {
    answer.setCustomValidity("先寫下一句，再交給評分。");
    answer.reportValidity();
    return;
  }
  answer.setCustomValidity("");
  state.gradeTries += 1;
  const graded = gradeAnswer(answer.value);
  tone(graded.passed ? "ok" : "no");
  renderResult(graded);
});

answer.addEventListener("input", () => answer.setCustomValidity(""));
voiceBtn.addEventListener("click", () => {
  if (!recognition || voiceBtn.disabled) return;
  if (voiceListening) stopVoice();
  else startVoice();
});
adaptOpen.addEventListener("click", openAdapt);
adaptClose.addEventListener("click", closeAdapt);
drops.addEventListener("click", (event) => {
  const slot = event.target.closest(".drop");
  if (!slot || !state.selectedCard || state.lock || !state.adaptOn) return;
  if (event.target.closest(".drag-card")) return;
  tryPlace(state.selectedCard, slot.dataset.slot);
});
drops.addEventListener("keydown", (event) => {
  if (!state.adaptOn || state.lock) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  const slot = event.target.closest(".drop");
  if (!slot || event.target.closest(".drag-card") || !state.selectedCard) return;
  event.preventDefault();
  tryPlace(state.selectedCard, slot.dataset.slot);
});
document.addEventListener("keydown", (event) => {
  if (!state.adaptOn || state.lock) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".drag-card");
  if (!card) return;
  event.preventDefault();
  toggleSelect(card.dataset.id);
});
document.addEventListener("pointerdown", (event) => {
  const card = event.target.closest(".drag-card");
  if (!card || state.step !== "explain" || !state.adaptOn || state.lock) return;
  if (event.button > 0) return;
  startDrag(card, event);
}, { passive: false });
document.addEventListener("pointermove", onAdaptPointerMove, { passive: false });
document.addEventListener("pointerup", onAdaptPointerUp);
document.addEventListener("pointercancel", onAdaptPointerUp);
document.addEventListener("click", (event) => {
  if (!skipClick) return;
  skipClick = false;
  window.clearTimeout(skipTimer);
  if (event.target.closest(".drag-card, .drop")) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);
sunBtn.addEventListener("click", heatLand);
air.addEventListener("pointerdown", onPointerDown);
air.addEventListener("pointermove", onPointerMove);
air.addEventListener("pointerup", onPointerUp);
air.addEventListener("pointercancel", onPointerUp);
restartBtn.addEventListener("click", restart);
muteBtn.addEventListener("click", () => {
  state.muted = !state.muted;
  try {
    localStorage.setItem("wind-game-mute", state.muted ? "1" : "0");
  } catch {
    /* 私隱模式寫不入也不影響遊戲 */
  }
  syncMute();
  if (!state.muted) tone("tap");
});

new ResizeObserver(fitCanvas).observe(sky);
setupVoice();
syncMute();
fitCanvas();
enter("title");
requestAnimationFrame(frame);
