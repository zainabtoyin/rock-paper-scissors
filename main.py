"""Mind Reader: rock paper scissors against a computer that learns how you play.

After every round it updates two memories: how often you throw each move,
and what you tend to throw after each (move, result). It then plays whatever
beats the move it expects from you.
"""
import random
import sys
import time
from collections import Counter, defaultdict

MOVES = ("rock", "paper", "scissors")
BEATS = {"rock": "scissors", "paper": "rock", "scissors": "paper"}
COUNTER = {loser: winner for winner, loser in BEATS.items()}
SHORTCUTS = {"r": "rock", "p": "paper", "s": "scissors"}

WIN_SCORE = 5
NOISE = 0.12      # how often the AI ignores its own prediction
MIN_PATTERN = 2   # samples needed before trusting a pattern
MIN_HABIT = 3     # samples needed before trusting overall habits

COLOR = sys.stdout.isatty()
ANIMATE = sys.stdin.isatty()

HANDS = {
    "rock": ["    _______   ", "---'   ____)  ", "      (_____) ", "      (_____) ", "      (____)  ", "---.__(___)   "],
    "paper": ["    _______   ", "---'   ____)__", "          ____)", "          ____)", "         ____) ", "---.____(___) "],
    "scissors": ["    _______   ", "---'   ____)__", "          ____)", "       __(___)  ", "      (____)    ", "---.__(___)     "],
}
MIRROR = str.maketrans("()/\\", ")(\\/")

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass


def judge(player, computer):
    """Result from the player's point of view: win, lose or tie."""
    if player == computer:
        return "tie"
    return "win" if BEATS[player] == computer else "lose"


class MindReader:
    def __init__(self):
        self.overall = Counter()
        self.patterns = defaultdict(Counter)   # (move, result) -> what you threw next
        self.last_round = None
        self.calls = 0   # predictions it actually made
        self.hits = 0    # predictions that were right

    def predict(self):
        """Guess the player's next move. Returns (guess, odds, basis)."""
        after_last = self.patterns.get(self.last_round, Counter())

        if sum(after_last.values()) >= MIN_PATTERN:
            move, result = self.last_round
            outcome = "loss" if result == "lose" else result
            counts, basis = after_last, f"your habit after a {outcome} with {move}"
        elif sum(self.overall.values()) >= MIN_HABIT:
            counts, basis = self.overall, "how often you throw each move"
        else:
            return None, {move: 1 / 3 for move in MOVES}, None

        total = sum(counts.values())
        odds = {move: counts[move] / total for move in MOVES}
        best = max(odds.values())
        guess = random.choice([move for move in MOVES if odds[move] == best])
        return guess, odds, basis

    def respond(self, guess):
        """Play whatever beats the guess. The noise stops you exploiting it."""
        if guess is None or random.random() < NOISE:
            return random.choice(MOVES)
        return COUNTER[guess]

    def learn(self, move, result, guess):
        if guess:
            self.calls += 1
            self.hits += guess == move
        self.overall[move] += 1
        if self.last_round:
            self.patterns[self.last_round][move] += 1
        self.last_round = (move, result)

    @property
    def predictability(self):
        return self.hits / self.calls if self.calls else None


def paint(text, code):
    return f"\033[{code}m{text}\033[0m" if COLOR else text


def bold(text): return paint(text, "1")
def dim(text): return paint(text, "2")
def red(text): return paint(text, "91")
def green(text): return paint(text, "92")
def yellow(text): return paint(text, "93")
def cyan(text): return paint(text, "96")


def pause(seconds):
    if ANIMATE:
        time.sleep(seconds)


def bar(share, width=20):
    filled = round(share * width)
    return "█" * filled + dim("░" * (width - filled))


def show_title():
    print()
    print(cyan("  ╔══════════════════════════════════════╗"))
    print(cyan("  ║") + bold("     M I N D   R E A D E R   R P S      ") + cyan("║"))
    print(cyan("  ║") + dim("   the computer is studying you...      ") + cyan("║"))
    print(cyan("  ╚══════════════════════════════════════╝"))
    print(f"  First to {WIN_SCORE} wins. Type r, p or s, or q to quit.\n")


def countdown():
    for word in ("ROCK", "PAPER", "SCISSORS"):
        print("  " + yellow(word + "..."), end="\r" if ANIMATE else "\n", flush=True)
        pause(0.45)
    print("  " + bold("SHOOT!") + " " * 12)


def show_hands(player, computer):
    print(f"\n  {bold('YOU'):<24}{'':>6}{bold('COMPUTER')}")
    for mine, theirs in zip(HANDS[player], HANDS[computer]):
        print("  " + cyan(mine) + "   " + red(theirs[::-1].translate(MIRROR)))


def show_thinking(guess, odds, basis):
    print("\n  " + dim("┌─ what the AI was thinking " + "─" * 20))
    if guess is None:
        print("  " + dim("│ ") + "It had no read on you yet, so it guessed.")
    else:
        for move in MOVES:
            tag = yellow(" ◄ predicted") if move == guess else ""
            print(f"  {dim('│')} {move:<9}{bar(odds[move])} {odds[move] * 100:3.0f}%{tag}")
        print("  " + dim(f"│ based on {basis}"))
    print("  " + dim("└" + "─" * 46))


def ask_move():
    """Return a valid move, or None if the player quits."""
    while True:
        try:
            answer = input("  " + bold("Your move > ")).strip().lower()
        except EOFError:
            return None
        answer = SHORTCUTS.get(answer, answer)
        if answer in MOVES:
            return answer
        if answer in ("q", "quit", "exit"):
            return None
        print("  " + red("Try r, p, s (or q to quit)."))


def show_report(brain, you, ai):
    print("\n" + cyan("  ══════════════ MATCH REPORT ══════════════"))
    print(f"  Final score: you {green(str(you))} - {red(str(ai))} computer")

    share = brain.predictability
    if share is None:
        print("  Not enough rounds to read your mind.\n")
        return

    print(f"  Predictability: {bar(share)} {share:.0%} ({brain.hits} of {brain.calls})")
    if share >= 0.6:
        print("  " + yellow("You're an open book. Mix it up next time."))
    elif share >= 0.4:
        print("  " + yellow("Some habits are showing. Stay unpredictable."))
    else:
        print("  " + yellow("Hard to read. Nice poker face."))

    favorite = max(MOVES, key=lambda move: brain.overall[move])
    print(f"  Your favorite move: {bold(favorite)} ({brain.overall[favorite]} times)\n")


def play():
    show_title()
    brain = MindReader()
    you = ai = 0

    while max(you, ai) < WIN_SCORE:
        print(dim(f"  Score: you {you} - {ai} computer\n"))
        move = ask_move()
        if move is None:
            break

        guess, odds, basis = brain.predict()   # it decides before you reveal
        reply = brain.respond(guess)

        countdown()
        show_hands(move, reply)

        result = judge(move, reply)
        if result == "win":
            you += 1
            print("\n  " + green(f"{move} beats {reply}. You win the round."))
        elif result == "lose":
            ai += 1
            print("\n  " + red(f"{reply} beats {move}. The computer takes it."))
        else:
            print("\n  " + yellow("Tie. Nobody scores."))

        show_thinking(guess, odds, basis)
        brain.learn(move, result, guess)
        print()

    if you == WIN_SCORE:
        print("  " + green("You outsmarted the machine!"))
    elif ai == WIN_SCORE:
        print("  " + red("The Mind Reader wins this time."))
    show_report(brain, you, ai)


if __name__ == "__main__":
    try:
        play()
    except KeyboardInterrupt:
        print("\n  Bye!")