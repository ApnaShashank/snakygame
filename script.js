const board = document.querySelector(".board");
const startbtn = document.querySelector('#start-btn')
const reStartbtn = document.querySelector('#restart-btn')
const pauseBtn = document.querySelector('#pause-btn')
const difficultyInputs = document.querySelectorAll('input[name="difficulty"]')
const settingsBtn = document.querySelector('#settings-btn')
const settingsPanel = document.querySelector('#settings-panel')
const settingsClose = document.querySelector('#settings-close')
const soundToggle = document.querySelector('#sound-toggle')
const gridToggle = document.querySelector('#grid-toggle')
const musicVolumeInput = document.querySelector('#music-volume')
const muteBtn = document.querySelector('#mute-btn')
const themeInputs = document.querySelectorAll('input[name="theme"]')
const modal = document.querySelector('.modal')
const gameOverScreen = document.querySelector("#game-over-screen")
const startScreen = document.querySelector("#start-screen")
const highScoreElem = document.querySelector("#high-score")
const highScoreStart = document.querySelector("#highScoreStart");
const highScoreEnd = document.querySelector("#highScoreEnd");
const ScoreElem = document.querySelector("#score")
const TimerElem = document.querySelector("#timer")
const finalScoreVal = document.querySelector('#finalScoreVal')
function getBlockSize() {
    const w = window.innerWidth;
    if (w <= 420) return 16;
    if (w <= 600) return 20;
    if (w <= 900) return 24;
    return 30;
}

let blockWidth = getBlockSize();
let blockHeight = getBlockSize();

let rows;
let cols;
let food;
let snake
let highScore = localStorage.getItem("highScore") || 0;
let Score = 0;
let minutes = 0;
let seconds = 0;
highScoreElem.innerHTML = highScore;
highScoreEnd.innerHTML = highScore;
highScoreStart.innerHTML = highScore;
const blocks = []
function resetSnake() {
    const cx = Math.floor(rows / 2);
    const cy = Math.floor(cols / 2);

    snake = [
        { x: cx, y: cy },
        { x: cx, y: cy - 1 },
        { x: cx, y: cy - 2 }
    ];
}

let interval = null;
let timerInterval = null;
let direction = 'right';
let paused = false;
let gameSpeed = 200; // will be adjusted by difficulty
// settings state (persisted)
let soundEnabled = JSON.parse(localStorage.getItem('snake_sound')) ?? true;
let showGrid = JSON.parse(localStorage.getItem('snake_grid')) ?? false;
let theme = localStorage.getItem('snake_theme') || 'dark';
let musicVolume = parseFloat(localStorage.getItem('snake_music_volume')) || 0.5; // 0..1

// WebAudio simple effects (no external files)
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioContextClass ? new AudioContextClass() : null;
function playTone(freq, duration = 0.1, type = 'sine') {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
}
function playEatSound(){ if (!soundEnabled) return; playTone(900, 0.08, 'sine'); playTone(1200, 0.06, 'sine'); }
function playCrashSound(){ if (!soundEnabled) return; playTone(160, 0.25, 'sawtooth'); }

// Music loop
let musicInterval = null;
function playMusicNote(freq, dur = 0.25, type = 'triangle'){
    if (!audioCtx) return;
    if (musicVolume <= 0) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    const base = 0.06 * musicVolume;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(base, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now); o.stop(now + dur + 0.02);
}
function startMusic(){
    if (!audioCtx) return;
    if (musicInterval) return;
    if (musicVolume <= 0) return;
    const seq = [440, 660, 880, 660, 523, 659];
    let idx = 0;
    musicInterval = setInterval(() => {
        if (musicVolume <= 0) return;
        const f = seq[idx % seq.length];
        playMusicNote(f, 0.28, 'triangle');
        idx++;
    }, 320);
}
function stopMusic(){ if (musicInterval) { clearInterval(musicInterval); musicInterval = null; } }

function applyDifficulty() {
    const selected = Array.from(difficultyInputs).find(i => i.checked)?.value || 'medium';
    if (selected === 'easy') gameSpeed = 250;
    else if (selected === 'medium') gameSpeed = 180;
    else if (selected === 'hard') gameSpeed = 110;
}

function startIntervals() {
    clearInterval(interval);
    clearInterval(timerInterval);
    updateGameInterval();
    timerInterval = setInterval(() => {
        seconds++;

        if (seconds === 60) {
            minutes++;
            seconds = 0;
        }

        TimerElem.innerHTML =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

// game speed control when holding direction
let holdTimeout = null;
let holdKey = null;
let doubleSpeed = false;
const holdDelay = 600; // ms to trigger 2x speed

function updateGameInterval(){
    // compute effective delay
    const delay = Math.max(20, Math.round(gameSpeed / (doubleSpeed ? 2 : 1)));
    if (interval) clearInterval(interval);
    interval = setInterval(() => { render(); }, delay);
}

// Apply persisted settings to UI and page
function applySettingsToUI() {
    // sound
    if (soundToggle) soundToggle.checked = !!soundEnabled;
    if (musicVolumeInput) musicVolumeInput.value = Math.round((musicVolume || 0.5) * 100);
    if (muteBtn) muteBtn.setAttribute('aria-pressed', soundEnabled ? 'false' : 'true');
    // grid
    if (gridToggle) gridToggle.checked = !!showGrid;
    if (showGrid) board.classList.add('show-grid'); else board.classList.remove('show-grid');
    // theme
    if (themeInputs) {
        themeInputs.forEach(i => i.checked = (i.value === theme));
    }
    if (theme === 'light') document.body.classList.add('light'); else document.body.classList.remove('light');
}

// Save settings helper
function saveSettings() {
    localStorage.setItem('snake_sound', JSON.stringify(!!soundEnabled));
    localStorage.setItem('snake_grid', JSON.stringify(!!showGrid));
    localStorage.setItem('snake_theme', theme);
    localStorage.setItem('snake_music_volume', String(musicVolume));
}

// Toggle settings panel
function openSettings() {
    if (!settingsPanel) return;
    settingsPanel.setAttribute('aria-hidden', 'false');
    settingsBtn?.setAttribute('aria-expanded', 'true');
}
function closeSettings() {
    if (!settingsPanel) return;
    settingsPanel.setAttribute('aria-hidden', 'true');
    settingsBtn?.setAttribute('aria-expanded', 'false');
}

// Wire settings UI actions
settingsBtn?.addEventListener('click', () => {
    const expanded = settingsBtn.getAttribute('aria-expanded') === 'true';
    if (expanded) closeSettings(); else openSettings();
});
settingsClose?.addEventListener('click', closeSettings);
soundToggle?.addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    if (soundEnabled && audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    saveSettings();
});
musicVolumeInput?.addEventListener('input', (e) => {
    const v = Number(e.target.value || 0);
    musicVolume = Math.max(0, Math.min(100, v)) / 100;
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (musicVolume <= 0) stopMusic(); else startMusic();
    saveSettings();
});
gridToggle?.addEventListener('change', (e) => {
    showGrid = e.target.checked;
    if (showGrid) board.classList.add('show-grid'); else board.classList.remove('show-grid');
    saveSettings();
});
themeInputs?.forEach(inp => inp.addEventListener('change', (e) => {
    if (e.target.checked) { theme = e.target.value; applySettingsToUI(); saveSettings(); }
}));

// Initialize settings on load
window.addEventListener('load', () => { applySettingsToUI(); });
// Mute button toggles SFX quickly (mirror soundToggle)
muteBtn?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (soundToggle) soundToggle.checked = !!soundEnabled;
    muteBtn.setAttribute('aria-pressed', soundEnabled ? 'false' : 'true');
    if (soundEnabled && audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    saveSettings();
});
function spawnFood() {
    do {
        food = {
            x: Math.floor(Math.random() * rows),
            y: Math.floor(Math.random() * cols)
        };
    } while (snake.some(s => s.x === food.x && s.y === food.y));

    blocks[`${food.x}-${food.y}`].classList.add("food");
}



function setupBoard() {
    board.innerHTML = "";
    blocks.length = 0;

    cols = Math.floor(board.clientWidth / blockWidth);
    rows = Math.floor(board.clientHeight / blockHeight);

    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const block = document.createElement("div");
            block.classList.add("block");
            board.appendChild(block);
            blocks[`${r}-${c}`] = block;
        }
    }
}
window.addEventListener("load", () => {
    setupBoard();
    resetSnake();
    spawnFood();
});

// Debounced resize: recalculate block size and rebuild board without full reload
let __resizeTimer = null;
window.addEventListener("resize", () => {
    clearTimeout(__resizeTimer);
    __resizeTimer = setTimeout(() => {
        blockWidth = getBlockSize();
        blockHeight = blockWidth;
        // rebuild board and reset snake/food positions
        setupBoard();
        resetSnake();
        spawnFood();
        // if game was running, update interval to match new layout
        if (interval) {
            clearInterval(interval);
            updateGameInterval();
        }
    }, 220);
});


function render() {
    if (!food || !snake || snake.length === 0) return;
    let head;

    if (direction === "right") head = { x: snake[0].x, y: snake[0].y + 1 };
    if (direction === "left") head = { x: snake[0].x, y: snake[0].y - 1 };
    if (direction === "down") head = { x: snake[0].x + 1, y: snake[0].y };
    if (direction === "up") head = { x: snake[0].x - 1, y: snake[0].y };

    // WALL / SELF COLLISION
    if (
        head.x < 0 || head.x >= rows ||
        head.y < 0 || head.y >= cols ||
        snake.some(s => s.x === head.x && s.y === head.y)
    ) {
        // play crash sound and stop
        playCrashSound();
        clearInterval(interval);
        clearInterval(timerInterval);
        interval = null;
        timerInterval = null;
        modal.style.display = "flex";
        gameOverScreen.style.display = "block";
        startScreen.style.display = "none";
        return;
    }

    const ateFood = head.x === food.x && head.y === food.y;

    // MOVE
    snake.unshift(head);
    if (!ateFood) {
    snake.pop();
} else {
    blocks[`${food.x}-${food.y}`]?.classList.remove("food");
    spawnFood();

    Score += 10;
    ScoreElem.textContent = Score;
    finalScoreVal.textContent = Score;

    if (Score > highScore) {
        highScore = Score;
        localStorage.setItem("highScore", highScore);
        highScoreElem.textContent = highScore;
        highScoreStart.textContent = highScore;
        highScoreEnd.textContent = highScore;
    }

    if (ateFood) playEatSound();
}

    // CLEAR BOARD
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            blocks[`${r}-${c}`]?.classList.remove("fill", "head");
        }
    }

    // DRAW SNAKE
    snake.forEach(seg => {
        blocks[`${seg.x}-${seg.y}`]?.classList.add("fill");
    });

    blocks[`${snake[0].x}-${snake[0].y}`]?.classList.add("head");
}



startbtn.addEventListener('click', () => {
    // apply chosen difficulty, then start
    applyDifficulty();
    modal.style.display = 'none'
    paused = false;
    pauseBtn.innerText = 'Pause';
    pauseBtn.setAttribute('aria-pressed', 'false');
    clearInterval(interval);
    clearInterval(timerInterval);
    // resume audio context and start background music if enabled
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (musicVolume > 0) startMusic();
    updateGameInterval();
    timerInterval = setInterval(() => {
        seconds++;

        if (seconds === 60) {
            minutes++;
            seconds = 0;
        }

        TimerElem.innerHTML =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);

})

reStartbtn.addEventListener('click', restartGame);

pauseBtn?.addEventListener('click', () => {
    // Toggle pause/resume
    if (!interval && !timerInterval && !paused) return; // nothing to pause
    if (!paused) {
        // pause
        paused = true;
        clearInterval(interval);
        clearInterval(timerInterval);
        interval = null;
        timerInterval = null;
        pauseBtn.innerText = 'Resume';
        pauseBtn.setAttribute('aria-pressed', 'true');
        // pause music as well
        stopMusic();
    } else {
        // resume
        paused = false;
        applyDifficulty();
        startIntervals();
        pauseBtn.innerText = 'Pause';
        pauseBtn.setAttribute('aria-pressed', 'false');
        if (musicVolume > 0) startMusic();
    }
});
function restartGame() {
    blocks[`${food.x}-${food.y}`]?.classList.remove('food');
    Score = 0;
    Timer = `00-00`;
    minutes = 0;
    seconds = 0;
    ScoreElem.innerHTML = Score;
    finalScoreVal.innerHTML = Score;
    TimerElem.innerHTML = Timer;
    highScoreElem.innerHTML = highScore;

    snake.forEach((segment) => {
        blocks[`${segment.x}-${segment.y}`].classList.remove('fill', 'head')
    })
    direction = 'down';
    gameOverScreen.style.display = 'none';
    startScreen.style.display = 'block';
    modal.style.display = 'none';


    resetSnake();
    spawnFood();
    applyDifficulty();
    paused = false;
    pauseBtn.innerText = 'Pause';
    pauseBtn.setAttribute('aria-pressed', 'false');
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (musicVolume > 0) startMusic();
    updateGameInterval();
    timerInterval = setInterval(() => {
        seconds++;

        if (seconds === 60) {
            minutes++;
            seconds = 0;
        }

        TimerElem.innerHTML =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);


}

addEventListener('keydown', function (event) {

   if (['ArrowUp', 'w', 'W'].includes(event.key) && direction !== 'down') {
    direction = 'up';
}
else if (['ArrowDown', 's', 'S'].includes(event.key) && direction !== 'up') {
    direction = 'down';
}
else if (['ArrowLeft', 'a', 'A'].includes(event.key) && direction !== 'right') {
    direction = 'left';
}
else if (['ArrowRight', 'd', 'D'].includes(event.key) && direction !== 'left') {
    direction = 'right';
}

})

let touchStartX = 0;
let touchStartY = 0;

board.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
});

board.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        
        if (dx > 30 && direction !== "left") {
            direction = "right";
        } else if (dx < -30 && direction !== "right") {
            direction = "left";
        }
    } else {
        // vertical swipe
        if (dy > 30 && direction !== "up") {
            direction = "down";
        } else if (dy < -30 && direction !== "down") {
            direction = "up";
        }
    }
});

// KEY HOLD -> double speed handling
window.addEventListener('keydown', function (event) {
    const key = event.key;
    const dirKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D'];
    if (dirKeys.includes(key)){
        // only start hold timer when first pressed
        if (!holdKey) {
            holdKey = key;
            holdTimeout = setTimeout(() => {
                doubleSpeed = true;
                updateGameInterval();
            }, holdDelay);
        }
    }
});

window.addEventListener('keyup', function(event){
    const key = event.key;
    if (holdKey && holdKey === key){
        if (holdTimeout) { clearTimeout(holdTimeout); holdTimeout = null; }
        if (doubleSpeed){ doubleSpeed = false; updateGameInterval(); }
        holdKey = null;
    }
});


