const board = document.querySelector(".board");
const startbtn = document.querySelector('#start-btn')
const reStartbtn = document.querySelector('#restart-btn')
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
    return window.innerWidth <= 600 ? 20 : 30;
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

window.addEventListener("resize", () => location.reload());


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
        clearInterval(interval);
        clearInterval(timerInterval);
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
    modal.style.display = 'none'
    interval = setInterval(() => {
        render();
    }, 200);
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
    interval = setInterval(() => { render() }, 200);
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


