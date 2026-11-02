import { gradeAnswer } from "./grade.js";

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
  state.step = next;
  state.lock = false;
  state.question = QUESTIONS[next] || null;
  document.body.className = "";
  if (next === "heat") document.body.classList.add("is-heat");
  if (next === "draw") document.body.classList.add("is-draw");
  if (next === "explain") document.body.classList.add("is-write");
  if (next === "done") document.body.classList.add("is-done");

  choices.innerHTML = "";
  actions.innerHTML = "";
  order.hidden = true;
  form.hidden = true;
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
syncMute();
fitCanvas();
enter("title");
requestAnimationFrame(frame);
