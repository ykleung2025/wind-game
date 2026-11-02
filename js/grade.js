/**
 * 風形成句子的本機評分。
 * 不把學生答案送出裝置，方便在課室 iPad / GitHub Pages 使用。
 *
 * 滿分句子（標點、空白、箭嘴寫法可以略有不同）：
 * - 熱空氣上升，冷空氣補上，空氣流動就成為風。
 * - 熱空氣上升→冷空氣補上→風
 *
 * 90 分或以上過關：三步都在，而且因果順序正確。
 * 用了別的字，但科學過程完整，會落在 90–99。
 */

const TRAD = {
  气: "氣",
  为: "為",
  动: "動",
  补: "補",
  风: "風",
  热: "熱",
  这: "這",
  来: "來",
  过: "過",
  后: "後",
  于: "於",
  产: "產",
  变: "變",
  对: "對",
  时: "時",
  长: "長",
  从: "從",
  会: "會",
  发: "發",
  说: "說",
  压: "壓",
  胀: "脹",
  轻: "輕",
  陆: "陸",
  边: "邊",
  与: "與",
  现: "現",
  经: "經",
  阳: "陽",
  较: "較",
  团: "團",
  体: "體",
  积: "積",
  升: "升",
};

const CANONICAL = new Set([
  "熱空氣上升冷空氣補上空氣流動成為風",
  "熱空氣上升冷空氣補上風",
]);

function toTrad(text) {
  return [...text].map((ch) => TRAD[ch] || ch).join("");
}

export function normalizeAnswer(raw) {
  let text = toTrad(String(raw ?? "").trim());
  text = text.replace(/昇/g, "升");
  text = text.replace(/\s+/g, "");
  text = text.replace(/->|=>|➔|➜|➡|⟶|➝|⇒/g, "→");
  text = text.replace(/([\u4e00-\u9fff])[-–—－]([\u4e00-\u9fff])/g, "$1→$2");
  text = text.replace(/[，,。．.、；;：:！!？?「」『』""''（）()【】[\]…·~～]/g, "");
  return text;
}

function canonicalKey(text) {
  let key = text.replace(/→/g, "");
  key = key.replace(/空氣流動就是風|空氣流動係風|空氣流動就成為風|空氣流動就形成風|空氣流動成為風|空氣流動形成風|空氣流動變成風/g, "空氣流動成為風");
  key = key.replace(/補充|填補|補位/g, "補上");
  key = key.replace(/形成風|變成風|造成風|產生風|就是風|係風/g, "成為風");
  key = key.replace(/因為|因爲|所以|因此|於是|會|就|便|然後|了|咗|先|再|而|且|並/g, "");
  return key;
}

const RISE = "(?:上升|升起|升高|升(?:咗|了)?上去|向上升|往上升)";

function findHot(text) {
  const patterns = [
    new RegExp(`(?:熱|暖)(?:的|嘅)?空氣(?![^不]{0,3}不)[^不]{0,10}?${RISE}`),
    new RegExp(`(?:受熱(?:後)?(?:的)?空氣|空氣受熱)[^不]{0,12}?${RISE}`),
    new RegExp(`熱氣[^不]{0,6}?${RISE}`),
    /膨脹(?:並|然後|而)?(?:向上|往上)?(?:上升|升起|升(?:咗|了)?上去)/,
  ];
  for (const re of patterns) {
    const match = re.exec(text);
    if (!match) continue;
    if (/不|沒|冇/.test(match[0])) continue;
    const before = text.slice(Math.max(0, match.index - 3), match.index);
    if (/不|沒|冇|非/.test(before)) continue;
    return { index: match.index };
  }
  return null;
}

function findCold(text) {
  const patterns = [
    /(?:冷|凍|涼)(?:的|嘅)?空氣(?![^不]{0,3}不)[^不]{0,12}?(?:補上|補充|填補|補位|補返|流過來|吹過來|過嚟|過來|流來|吹來|流向陸地|吹向陸地|流去陸地)/,
    /較冷的空氣[^不]{0,14}?(?:補上|補充|填補|流向陸地|流來|過來|吹來)/,
    /海洋(?:上|的|較冷)?[^冷]{0,10}?冷?空氣[^不]{0,12}?(?:補上|補充|填補|流向陸地|流來|過來)/,
    /冷空氣由海洋(?:流|吹)?(?:向|去)?陸地/,
  ];
  for (const re of patterns) {
    const match = re.exec(text);
    if (!match) continue;
    if (/不|沒|冇/.test(match[0])) continue;
    const before = text.slice(Math.max(0, match.index - 3), match.index);
    if (/不|沒|冇|非/.test(before)) continue;
    return { index: match.index };
  }
  return null;
}

function findWind(text) {
  const patterns = [
    /空氣(?:一)?流動(?:就|便|會|可以)?(?:成為|變成|形成|造成|產生|是|係)風/g,
    /(?:成為|變成|形成|造成|產生)風/g,
    /→風/g,
    /就是風|係風|變風|就有風/g,
    /(?:補上|補充)(?:後|了|咗)?風/g,
  ];
  let best = null;
  for (const re of patterns) {
    let match;
    while ((match = re.exec(text))) {
      if (/風景|風車|風向/.test(match[0])) continue;
      const before = text.slice(Math.max(0, match.index - 1), match.index);
      if (/不|沒|冇/.test(before)) continue;
      if (!best || match.index >= best.index) best = match;
    }
  }
  return best ? { index: best.index } : null;
}

function governedByNegation(text, match) {
  if (/不|沒|冇/.test(match[0])) return true;
  const before = text.slice(Math.max(0, match.index - 3), match.index);
  return /不|沒|冇|非/.test(before);
}

function findMisconception(text) {
  const coldRise = /(?:冷|凍|涼)(?:的|嘅)?空氣(?:會|就|也|亦|然後)?(?:向上升|往上升|上升|升起|升上去)/.exec(text);
  if (coldRise && !governedByNegation(text, coldRise)) return "cold-rise";

  const hotSink = /(?:熱|暖)(?:的|嘅)?空氣(?:會|就|也|然後)?(?:下沉|下降|向下沉|沉下去)/.exec(text);
  if (hotSink && !governedByNegation(text, hotSink)) return "hot-sink";

  if (/風(?:吹|刮)?.{0,8}?(?:所以|令|使|讓|令到).{0,16}?熱/.test(text) || /因為風/.test(text)) {
    return "wind-causes";
  }
  return null;
}

function orderOk(text, hot, cold, wind) {
  if (!hot || !cold || !wind) return false;
  if (hot.index < cold.index && cold.index < wind.index) return true;
  return /因為.{0,16}熱.{0,16}(?:上升|升起)/.test(text) && cold.index < wind.index;
}

function commentFor({ score, checks }) {
  if (score === 100) {
    return "滿分。你說出了風形成的過程：熱空氣上升，冷空氣補上，空氣流動就成為風。";
  }
  if (checks.misconception === "cold-rise") {
    return "冷空氣不是向上升。熱空氣先上升，騰出位置，冷空氣才流過來補上。";
  }
  if (checks.misconception === "hot-sink") {
    return "熱空氣受熱後會上升，不會下沉。先改這一步，再寫冷空氣和風。";
  }
  if (checks.misconception === "wind-causes") {
    return "風是結果，不是原因。先寫熱空氣上升，再寫冷空氣補上，最後才是空氣流動成為風。";
  }
  if (score >= 90) {
    return "過關。三步和順序都對。若要寫成滿分句子：熱空氣上升，冷空氣補上，空氣流動就成為風。";
  }
  if (checks.hot && checks.cold && checks.wind) {
    return `${score} 分，未過關。三步都有了，但先後還不對。請按這個順序再寫：熱空氣上升，冷空氣補上，空氣流動就成為風。`;
  }
  const missing = [];
  if (!checks.hot) missing.push("熱空氣上升");
  if (!checks.cold) missing.push("冷空氣補上");
  if (!checks.wind) missing.push("空氣流動就成為風");
  if (!checks.hot && !checks.cold && !checks.wind) {
    return "這句還沒有說到風形成的過程。試著按順序寫三步：誰上升、誰補上、空氣流動之後變成什麼。";
  }
  const got = [];
  if (checks.hot) got.push("熱空氣上升");
  if (checks.cold) got.push("冷空氣補上");
  if (checks.wind) got.push("空氣流動就成為風");
  return `${score} 分，未到 90 分。已寫到${got.join("、")}。還差：${missing.join("、")}。`;
}

export function gradeAnswer(raw) {
  const original = String(raw ?? "").trim();
  const text = normalizeAnswer(original);
  if (!text) {
    return {
      score: 0,
      passed: false,
      comment: "還沒有寫下答案。用一句話說出：熱空氣怎樣、冷空氣怎樣、最後怎樣變成風。",
      checks: emptyChecks(),
    };
  }

  const canonical = CANONICAL.has(canonicalKey(text));
  let hot = findHot(text);
  let cold = findCold(text);
  let wind = findWind(text);
  const misconception = findMisconception(text);

  if (canonical && !misconception) {
    hot = hot || { index: 0 };
    cold = cold || { index: 1 };
    wind = wind || { index: 2 };
  }

  const ordered = canonical || orderOk(text, hot, cold, wind);
  const checks = {
    hot: Boolean(hot),
    cold: Boolean(cold),
    wind: Boolean(wind),
    order: Boolean(ordered && hot && cold && wind && !misconception),
    misconception,
  };

  let score = 0;
  if (checks.hot) score += 34;
  if (checks.cold) score += 33;
  if (checks.wind) score += 33;

  if (canonical && !misconception) {
    score = 100;
  } else if (misconception === "hot-sink") {
    score = Math.min(score, 46);
  } else if (misconception === "cold-rise") {
    score = Math.min(score, 50);
  } else if (misconception === "wind-causes") {
    score = Math.min(score, 68);
  } else if (checks.hot && checks.cold && checks.wind && checks.order) {
    score = 94;
  } else if (checks.hot && checks.cold && checks.wind) {
    score = 85;
  } else if (!checks.hot && !checks.cold && !checks.wind) {
    score = 12;
  } else {
    score = Math.min(score, 78);
  }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    passed: score >= 90,
    comment: commentFor({ score, checks }),
    checks,
  };
}

function emptyChecks() {
  return { hot: false, cold: false, wind: false, order: false, misconception: null };
}
