"use strict";

// Game rules and the AI. Nothing in this file touches the page.

const MOVES = ["rock", "paper", "scissors"];
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };
const COUNTER = Object.fromEntries(Object.entries(BEATS).map(([win, lose]) => [lose, win]));

const NOISE = 0.12;     // how often the AI ignores its own prediction
const MIN_PATTERN = 2;  // samples needed before trusting a pattern
const MIN_HABIT = 3;    // samples needed before trusting overall habits

const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];
const total = (counts) => Object.values(counts).reduce((a, b) => a + b, 0);

// Result from the player's point of view: "win", "lose" or "tie".
function judge(player, computer) {
  if (player === computer) return "tie";
  return BEATS[player] === computer ? "win" : "lose";
}

class MindReader {
  constructor(memory) {
    const { overall, patterns } = memory ?? {};
    this.overall = { rock: 0, paper: 0, scissors: 0, ...overall };
    this.patterns = patterns ?? {};   // "rock|lose" -> what you threw next
    this.startMatch();
  }

  startMatch() {
    this.lastRound = null;
    this.calls = 0;   // predictions it actually made
    this.hits = 0;    // predictions that were right
  }

  // Looks at your history and guesses your next move. Runs before you reveal.
  predict() {
    const afterLast = this.patterns[this.lastRound] ?? {};
    let counts, basis;

    if (total(afterLast) >= MIN_PATTERN) {
      const [move, result] = this.lastRound.split("|");
      counts = afterLast;
      basis = `your habit after a ${result === "lose" ? "loss" : result} with ${move}`;
    } else if (total(this.overall) >= MIN_HABIT) {
      counts = this.overall;
      basis = "how often you throw each move";
    } else {
      return { guess: null, odds: { rock: 1 / 3, paper: 1 / 3, scissors: 1 / 3 }, basis: null };
    }

    const odds = Object.fromEntries(MOVES.map((m) => [m, (counts[m] ?? 0) / total(counts)]));
    const best = Math.max(...Object.values(odds));
    const guess = pickRandom(MOVES.filter((m) => odds[m] === best));
    return { guess, odds, basis };
  }

  // Plays whatever beats the guess. The noise stops you from exploiting it.
  respond(guess) {
    if (guess === null || Math.random() < NOISE) return pickRandom(MOVES);
    return COUNTER[guess];
  }

  learn(move, result, guess) {
    if (guess) {
      this.calls += 1;
      if (guess === move) this.hits += 1;
    }
    this.overall[move] += 1;
    if (this.lastRound) {
      const row = (this.patterns[this.lastRound] ??= {});
      row[move] = (row[move] ?? 0) + 1;
    }
    this.lastRound = `${move}|${result}`;
  }

  get predictability() {
    return this.calls ? this.hits / this.calls : null;
  }

  get favorite() {
    return MOVES.reduce((best, m) => (this.overall[m] > this.overall[best] ? m : best));
  }

  toJSON() {
    return { overall: this.overall, patterns: this.patterns };
  }
}
