# Mind Reader ✂️🪨📄

A rock paper scissors game that learns how you play. Built first as a command-line game in Python, then rebuilt as a web page you can play in your browser. This is part of my ongoing journey to strengthen my programming fundamentals by building real, working projects.

🎮 **Play it here:** https://zainabtoyin.github.io/Rock_Paper_Scissors/

## 🧠 Why This Project Is Different

Most rock paper scissors games pick a random move and stop there. This one studies you. After every round the computer updates what it knows about your habits, predicts your next move, and plays whatever beats it. A live chart shows exactly what it thinks of you, so you can watch yourself being read in real time.

I built it step by step with Claude as my coding mentor: start with the smallest version (`random.choice()`, `if` statements, `input()`), then add the learning AI, then port the same logic to JavaScript. I read, ran and questioned each stage before moving to the next.

## 📌 What It Does

* Plays first-to-5 against a computer that predicts your moves
* Learns two things: how often you throw each move, and what you throw after a win, a loss or a tie
* Shows a live chart of what the computer believed about you before each round
* Gives you a predictability score, so you can see how easy you are to read
* Remembers your habits between visits (web version, saved in your browser)
* Works with the keyboard: press R, P or S
* Has a "Reset what it knows" button to wipe its memory of you

## 🔍 How the AI Works

1. Before you reveal your move, it predicts it from your history
2. If it has seen enough of your pattern after the last result, it uses that. Otherwise it uses your overall habits
3. It plays the move that beats its prediction, but ignores its own prediction 12% of the time so you can't exploit it
4. After the round it grades itself and learns from what you threw

## 🛠️ Built With

* Python (terminal version): lists, dictionaries, functions, classes, loops, `random`, `collections`
* HTML, CSS and JavaScript (web version), no libraries or frameworks
* `localStorage` so the AI remembers you between visits
* SVG for the move shapes and the live chart
* GitHub Pages for hosting

## 🚀 How to Run

**Web version:** open the link above, or download this repository and open `index.html` in your browser.

**Terminal version:**

1. Make sure you have Python 3 installed
2. Clone or download this repository
3. In your terminal, run:

```
python3 python/main.py
```

4. Type `r`, `p` or `s` to play, or `q` to quit

## 📂 Project Structure

```
Rock_Paper_Scissors/
├── index.html       # Web version: page structure
├── style.css        # Web version: design
├── brain.js         # Web version: rules and the AI
├── game.js          # Web version: screen, animation and chart
├── python/
│   └── main.py      # Terminal version
└── README.md        # Project documentation
```

## 🌱 Future Improvements

* Look at your last two moves instead of one
* Difficulty levels (change the noise, or turn learning off)
* Save the terminal version's memory to a file
* Add sound effects
* Add a "best of" scoreboard across matches

## 👩🏾‍💻 Author

Zainab Toyin: Learning to code, one project at a time [LinkedIn](https://www.linkedin.com/in/zainabtoyin)

Hamdalat Akinwande