"use strict";

// Everything on screen: buttons, animation, the tape and the result dialog.
// Needs brain.js to be loaded first.

const WIN_SCORE = 5;
const LABEL = { rock: "Rock", paper: "Paper", scissors: "Scissors" };
const KEYS = { r: "rock", p: "paper", s: "scissors" };
const COUNTDOWN = ["Rock...", "Paper...", "Scissors..."];
const IDLE_NOTE = "Press R, P or S on your keyboard, or tap a button.";

const CHART = { width: 360, height: 210, left: 34, right: 12, top: 12, bottom: 40, maxRounds: 14, minSlots: 6 };
const OUTCOME = { win: "you won", lose: "you lost", tie: "a tie" };

const $ = (selector) => document.querySelector(selector);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const beatMs = reducedMotion ? 120 : 420;

const ui = {
  status: $("#status"),
  note: $("#note"),
  chart: $("#chart"),
  chartEmpty: $("#chartEmpty"),
  meterPct: $("#meterPct"),
  meterFill: $("#meterFill"),
  meterSub: $("#meterSub"),
  buttons: document.querySelectorAll(".move"),
  dialog: $("#result"),
};
const stages = {
  you: { box: $("#stageYou"), name: $("#nameYou") },
  ai: { box: $("#stageAi"), name: $("#nameAi") },
};

// The AI's memory lives in the browser so it recognizes you next visit.
const store = {
  key: "mindreader.v1",
  load() {
    try { return JSON.parse(localStorage.getItem(this.key)); } catch { return null; }
  },
  save(brain) {
    try { localStorage.setItem(this.key, JSON.stringify(brain)); } catch { /* storage blocked */ }
  },
  clear() {
    try { localStorage.removeItem(this.key); } catch { /* storage blocked */ }
  },
};

let brain = new MindReader(store.load());
const game = { you: 0, ai: 0, rounds: [], busy: false };


/* Rendering */

function setStage(stage, move, caption = LABEL[move]) {
  stage.box.querySelector("use").setAttribute("href", `#s-${move}`);
  stage.name.textContent = caption;
}

function say(text, tone = "", note = "") {
  ui.status.textContent = text;
  ui.status.className = `status ${tone}`;
  ui.note.textContent = note;
}

function renderScore() {
  const fill = (box, score) => box.replaceChildren(
    ...Array.from({ length: WIN_SCORE }, (_, i) => {
      const pip = document.createElement("span");
      pip.className = i < score ? "pip on" : "pip";
      return pip;
    })
  );
  fill($("#pipsYou"), game.you);
  fill($("#pipsAi"), game.ai);
}

// The tape: what the AI believed about you before each round.
function renderTape() {
  const { width, height, left, right, top, bottom } = CHART;
  const rounds = game.rounds.slice(-CHART.maxRounds);
  const firstNumber = game.rounds.length - rounds.length + 1;
  const slots = Math.max(CHART.minSlots, rounds.length);
  const x = (i) => left + (i * (width - left - right)) / (slots - 1);
  const y = (p) => top + (1 - p) * (height - top - bottom);

  const grid = [0, 0.5, 1].map((p) => `
    <line class="grid ${p === 0 ? "base" : ""}" x1="${left}" x2="${width - right}" y1="${y(p)}" y2="${y(p)}"/>
    <text x="${left - 6}" y="${y(p) + 3}" text-anchor="end">${p * 100}%</text>`).join("");

  const traces = MOVES.map((move) => {
    const points = rounds.map((r, i) => `${x(i)},${y(r.odds[move])}`).join(" ");
    return `<polyline class="trace ${move}" points="${points}"/>`;
  }).join("");

  // A dot on the line of the move you really threw. Solid means the AI called it.
  const marks = rounds.map((r, i) => {
    const n = firstNumber + i;
    const hit = r.guess === r.move;
    const pct = Math.round(r.odds[r.move] * 100);
    return `
      <circle class="call ${hit ? "hit" : "miss"}" cx="${x(i)}" cy="${y(r.odds[r.move])}" r="6">
        <title>Round ${n}: you threw ${r.move}. The AI gave it ${pct}%.</title>
      </circle>
      <rect class="outcome ${r.result}" x="${x(i) - 5}" y="${height - bottom + 12}" width="10" height="10" rx="2">
        <title>Round ${n}: ${OUTCOME[r.result]}</title>
      </rect>
      <text x="${x(i)}" y="${height - 4}" text-anchor="middle">${n}</text>`;
  }).join("");

  ui.chart.innerHTML = grid + traces + marks;
  ui.chartEmpty.hidden = rounds.length > 0;
}

function renderMeter() {
  const share = brain.predictability;
  const pct = share === null ? null : Math.round(share * 100);
  ui.meterPct.textContent = pct === null ? "No reads yet" : `${pct}%`;
  ui.meterFill.style.width = `${pct ?? 0}%`;
  ui.meterSub.textContent = pct === null
    ? "The higher this goes, the easier you are to read."
    : `It called ${brain.hits} of ${brain.calls} of your moves.`;
}

function renderAll() {
  renderScore();
  renderTape();
  renderMeter();
}


/* One round */

function setBusy(busy) {
  game.busy = busy;
  ui.buttons.forEach((button) => (button.disabled = busy));
}

async function countdown() {
  const shaking = !reducedMotion;
  for (const { box, name } of Object.values(stages)) {
    box.className = shaking ? "stage shaking" : "stage";
    box.querySelector("use").setAttribute("href", "#s-hidden");
    name.textContent = "...";
  }
  for (const word of COUNTDOWN) {
    say(word);
    await sleep(beatMs);
  }
}

function announce(result, move, reply) {
  const [winner, loser] = { win: ["you", "ai"], lose: ["ai", "you"], tie: [] }[result];
  stages[winner]?.box.classList.add("won");
  stages[loser]?.box.classList.add("lost");
  stages.you.box.classList.remove("shaking");
  stages.ai.box.classList.remove("shaking");

  if (result === "win") say(`${LABEL[move]} beats ${reply}. You take the round.`, "win");
  else if (result === "lose") say(`${LABEL[reply]} beats ${move}. Mind Reader takes it.`, "lose");
  else say("Tie. Nobody scores.");
}

function explain(guess, move, basis) {
  ui.note.textContent =
    guess === null ? "It had no read on you yet, so it guessed."
    : guess === move ? `It saw ${guess} coming, based on ${basis}.`
    : `It expected ${guess}, based on ${basis}. You fooled it.`;
}

async function playRound(move) {
  if (game.busy) return;
  setBusy(true);

  const { guess, odds, basis } = brain.predict();
  const reply = brain.respond(guess);
  await countdown();

  const result = judge(move, reply);
  setStage(stages.you, move);
  setStage(stages.ai, reply);
  announce(result, move, reply);
  explain(guess, move, basis);

  if (result === "win") game.you += 1;
  if (result === "lose") game.ai += 1;
  game.rounds.push({ odds, guess, move, result });
  brain.learn(move, result, guess);
  store.save(brain);
  renderAll();

  if (Math.max(game.you, game.ai) === WIN_SCORE) {
    await sleep(reducedMotion ? 300 : 1100);
    showResult();
  }
  setBusy(false);
}


/* Match start and end */

function verdict(pct) {
  if (pct === null) return "";
  if (pct >= 60) return "You're an open book. Mix it up next time.";
  if (pct >= 40) return "Some habits are showing. Stay unpredictable.";
  return "Hard to read. Nice poker face.";
}

function showResult() {
  const share = brain.predictability;
  const pct = share === null ? null : Math.round(share * 100);
  const favorite = brain.favorite;

  $("#resultTitle").textContent = game.you === WIN_SCORE ? "You outsmarted it" : "Mind Reader wins";
  $("#resultScore").textContent = `Final score: you ${game.you}, computer ${game.ai}.`;
  $("#resultPred").textContent = pct === null ? "Not enough rounds" : `${pct}% (${brain.hits} of ${brain.calls})`;
  $("#resultFav").textContent = `${LABEL[favorite]} (${brain.overall[favorite]} times, all matches)`;
  $("#resultVerdict").textContent = verdict(pct);
  ui.dialog.showModal();
}

function startMatch() {
  Object.assign(game, { you: 0, ai: 0, rounds: [] });
  brain.startMatch();
  for (const stage of Object.values(stages)) stage.box.className = "stage";
  setStage(stages.you, "hidden", "Pick a move");
  setStage(stages.ai, "hidden", "Waiting");
  say("Choose rock, paper or scissors.", "", IDLE_NOTE);
  renderAll();
}


/* Input */

ui.buttons.forEach((button) => button.addEventListener("click", () => playRound(button.dataset.move)));

document.addEventListener("keydown", (event) => {
  const move = KEYS[event.key.toLowerCase()];
  const modified = event.metaKey || event.ctrlKey || event.altKey;
  if (move && !modified && !ui.dialog.open) playRound(move);
});

$("#again").addEventListener("click", () => {
  ui.dialog.close();
  startMatch();
  ui.buttons[0].focus();
});

$("#forget").addEventListener("click", () => {
  store.clear();
  brain = new MindReader();
  startMatch();
  say("Memory cleared.", "", "The computer knows nothing about you again.");
});

startMatch();
