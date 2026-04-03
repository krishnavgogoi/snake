

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const BLOCK_SIZE = 40;
const SPEED_MAP  = { easy: 600, medium: 400, hard: 150, impossible: 50 };

// ─── DOM REFS ──────────────────────────────────────────────────────────────────
const board          = document.querySelector(".board");
const scoreEl        = document.querySelector(".score h2");
const highScoreEl    = document.querySelector(".highscore h2");
const minsEl         = document.querySelector(".time .mins");
const secsEl         = document.querySelector(".time .secs");
const diffSelect     = document.querySelector("#difficulty");
const modal          = document.querySelector(".modal");
const startBtn       = document.querySelector(".modal .bottom .button");
const retryArea      = document.querySelector(".retry");
const retryBtn       = document.querySelector("#retry");
const leaderboardBtn = document.querySelector(".retrybox #leaderboard");
const diffDropdown   = document.querySelector(".retrybox .diff");
const retryHighEl    = document.querySelector(".retrybox .top .top_left h1");
const retryScoreEl   = document.querySelector(".retrybox .top .top_right h1");
const dpadBtns       = document.querySelectorAll(".dpad-btn");

// ─── STATE ─────────────────────────────────────────────────────────────────────
let speed      = SPEED_MAP.medium;
let gameLoopId = null;
let timerId    = null;
let direction  = "right";
let nextDir    = "right";   // input buffer — prevents 180° reversal mid-tick
let snake      = [];
let food       = {};
let blocks     = {};
let scoreno    = 0;
let highScore  = 0;
let mins       = 0;
let secs       = 0;
let cols       = 0;
let rows       = 0;

// ─── DIFFICULTY ────────────────────────────────────────────────────────────────
diffSelect.addEventListener("change", () => {
  speed = SPEED_MAP[diffSelect.value] ?? 400;
});

// ─── TIMER ─────────────────────────────────────────────────────────────────────
function startTimer() {
  clearInterval(timerId);
  timerId = setInterval(() => {
    secsEl.textContent = String(secs).padStart(2, "0");
    minsEl.textContent = String(mins).padStart(2, "0");
    if (++secs === 60) { secs = 0; mins++; }
  }, 1000);
}

function resetTimer() {
  clearInterval(timerId);
  mins = secs = 0;
  minsEl.textContent = secsEl.textContent = "00";
}

// ─── BOARD ─────────────────────────────────────────────────────────────────────
function buildBoard() {
  board.innerHTML = "";
  blocks = {};
  cols = Math.floor(board.clientWidth  / BLOCK_SIZE);
  rows = Math.floor(board.clientHeight / BLOCK_SIZE);

  const frag = document.createDocumentFragment();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const el = document.createElement("div");
      el.classList.add((r + c) % 2 === 0 ? "block1" : "block2");
      frag.appendChild(el);
      blocks[`${r}-${c}`] = el;
    }
  }
  board.appendChild(frag);
}

// ─── FOOD ──────────────────────────────────────────────────────────────────────
function spawnFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * rows), y: Math.floor(Math.random() * cols) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
  blocks[`${food.x}-${food.y}`].classList.add("food");
}

// ─── RENDER ────────────────────────────────────────────────────────────────────
const ANGLE_MAP = { right: 0, down: 90, left: 180, up: 270 };

function render() {
  direction = nextDir; // commit buffered input

  // New head position
  const head = { x: snake[0].x, y: snake[0].y };
  if      (direction === "left")  head.y--;
  else if (direction === "right") head.y++;
  else if (direction === "up")    head.x--;
  else                            head.x++;

  // Wall collision
  if (head.x < 0 || head.y < 0 || head.x >= rows || head.y >= cols) return endGame();

  // Self collision (ignore tail — it vacates this tick)
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return endGame();
  }

  const ateFood = head.x === food.x && head.y === food.y;

  // Clear old visuals
  snake.forEach(seg => {
    const b = blocks[`${seg.x}-${seg.y}`];
    if (b) { b.classList.remove("fill", "snake-head"); b.style.transform = ""; }
  });
  // Temporarily remove food marker; will re-add if not eaten
  blocks[`${food.x}-${food.y}`].classList.remove("food");

  // Advance snake
  snake.unshift(head);
  if (ateFood) {
    scoreno++;
    scoreEl.textContent = scoreno;
    spawnFood();
  } else {
    snake.pop();
    blocks[`${food.x}-${food.y}`].classList.add("food"); // restore uneaten food
  }

  // Paint snake + rotation
  snake.forEach((seg, i) => {
    const b = blocks[`${seg.x}-${seg.y}`];
    if (!b) return;
    b.classList.add("fill");

    let angle;
    if (i === 0) {
      b.classList.add("snake-head");
      angle = ANGLE_MAP[direction];
    } else {
      const prev = snake[i - 1];
      if      (prev.x > seg.x) angle = 90;
      else if (prev.x < seg.x) angle = 270;
      else if (prev.y < seg.y) angle = 180;
      else                     angle = 0;
    }
    b.style.transform = `rotate(${angle}deg)`;
  });
}

// ─── GAME OVER ─────────────────────────────────────────────────────────────────
function endGame() {
  clearInterval(gameLoopId);
  clearInterval(timerId);
  gameLoopId = null;

  if (scoreno > highScore) {
    highScore = scoreno;
    highScoreEl.textContent = highScore;
  }
  retryHighEl.textContent  = highScore;
  retryScoreEl.textContent = scoreno;
  retryArea.style.display  = "flex";
}

// ─── START / RESTART ───────────────────────────────────────────────────────────
function startGame() {
  clearInterval(gameLoopId);
  resetTimer();
  scoreno   = 0;
  direction = nextDir = "right";
  scoreEl.textContent = 0;

  buildBoard();
  snake = [{ x: Math.floor(rows / 2), y: Math.floor(cols / 2) }];
  spawnFood();
  startTimer();
  gameLoopId = setInterval(render, speed);
}

// ─── KEYBOARD INPUT ────────────────────────────────────────────────────────────
const OPPOSITE = { left: "right", right: "left", up: "down", down: "up" };
const KEY_MAP   = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

document.addEventListener("keydown", e => {
  const d = KEY_MAP[e.key];
  if (!d) return;
  e.preventDefault(); // stop page scrolling with arrow keys
  if (d !== OPPOSITE[direction]) nextDir = d;
});

// ─── D-PAD INPUT (MOBILE BUTTONS) ─────────────────────────────────────────────
dpadBtns.forEach(btn => {
  const handler = () => {
    const d = btn.dataset.dir;
    if (d && d !== OPPOSITE[direction]) nextDir = d;
  };
  btn.addEventListener("touchstart", handler, { passive: true });
  btn.addEventListener("click", handler);
});

// ─── SWIPE INPUT (MOBILE GESTURE) ─────────────────────────────────────────────
let touchStartX = 0, touchStartY = 0;

document.addEventListener("touchstart", e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener("touchend", e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; // tap — ignore

  const d = Math.abs(dx) > Math.abs(dy)
    ? (dx > 0 ? "right" : "left")
    : (dy > 0 ? "down"  : "up");

  if (d !== OPPOSITE[direction]) nextDir = d;
}, { passive: true });

// ─── BUTTON LISTENERS ──────────────────────────────────────────────────────────
startBtn.addEventListener("click", () => {
  modal.style.display = "none";
  startGame();
});

retryBtn.addEventListener("click", () => {
  retryArea.style.display = "none";
  startGame();
});

leaderboardBtn.addEventListener("click", () => {
  diffDropdown.style.display = diffDropdown.style.display === "block" ? "none" : "block";
});