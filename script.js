const SIZE = 6; 
const tileTypes = [
    { txt: "①", color: "#e63946" }, { txt: "②", color: "#3a86ff" }, { txt: "③", color: "#8338ec" },
    { txt: "④", color: "#ff006e" }, { txt: "⑤", color: "#fb5607" }, { txt: "⑥", color: "#ffbe0b" },
    { txt: "⑦", color: "#06d6a0" }, { txt: "⑧", color: "#118ab2" }, { txt: "⑨", color: "#4a5759" },
    { txt: "⑩", color: "#2a9d8f" }, { txt: "⑪", color: "#e76f51" }, { txt: "⑫", color: "#a8dadc" } // ←追加！
];

let blocks = [];
let selected = null;

let currentScore = 0;
let timeLeft = 120;
let timerId = null;
let isGameOver = false;

let rotX = 60;   
let rotZ = -45;  

function initGame() {
    const stage = document.getElementById("stage");
    if(!stage) return;
    stage.innerHTML = "";
    blocks = [];
    selected = null;
    isGameOver = false;
    
    currentScore = 0;
    rotX = 60;
    rotZ = -45;
    document.getElementById("score").innerText = currentScore;
    
    document.getElementById("status").innerText = "1つ目のブロックを選んでください";
    document.getElementById("status").style.color = "#ffeb3b";

    timeLeft = 120;
    updateTimerUI();
    clearInterval(timerId);
    timerId = setInterval(countdown, 1000);

    let pool = [];
    // 修正後（12種類 × 18回 = 216個にする）
    for (let i = 0; i < 18; i++) {
        tileTypes.forEach(t => pool.push({ ...t }));
    }
    pool.sort(() => Math.random() - 0.5);

    let index = 0;
    const offset = (SIZE - 1) * 46 / 2;

    for (let x = 0; x < SIZE; x++) {
        for (let y = 0; y < SIZE; y++) {
            for (let z = 0; z < SIZE; z++) {
                const tile = pool[index++];
                
                const cube = document.createElement("div");
                cube.className = "cube";
                cube.style.left = ((x * 46) - offset - 18) + "px";
                cube.style.top = ((y * 46) - offset - 18) + "px";
                cube.style.transform = `translateZ(${(z * 46) - offset}px)`;

                // 【修正点】『底面(bottom)』と『奥の面(back)』を追加し、完全な6面体にしました
                const faces = [
                    { name: 'top', style: 'transform: translateZ(18px);' },
                    { name: 'bottom', style: 'transform: rotateX(180deg) translateZ(18px); filter: brightness(0.45);' },
                    { name: 'front', style: 'transform: rotateX(-90deg) translateZ(18px); filter: brightness(0.75);' },
                    { name: 'back', style: 'transform: rotateX(90deg) translateZ(18px); filter: brightness(0.5);' },
                    { name: 'right', style: 'transform: rotateY(90deg) translateZ(18px); filter: brightness(0.55);' },
                    { name: 'left', style: 'transform: rotateY(-90deg) translateZ(18px); filter: brightness(0.65);' }
                ];

                faces.forEach(f => {
                    const face = document.createElement("div");
                    face.className = `face ${f.name}`;
                    face.style.cssText = f.style; // 各面固有の回転・位置を適用
                    face.style.backgroundColor = tile.color;
                    face.innerText = tile.txt;
                    cube.appendChild(face);
                });

                const blockData = { x, y, z, txt: tile.txt, element: cube, active: true };
                
                cube.addEventListener("click", (e) => {
                    e.stopPropagation(); 
                    handleClick(blockData);
                });

                stage.appendChild(cube);
                blocks.push(blockData);
            }
        }
    }
    updateCount();
    updateStageRotation();
}

function setupEvents() {
    document.getElementById("rot-z-btn").addEventListener("click", () => {
        rotZ += 180;
        updateStageRotation();
    });

    document.getElementById("rot-y-btn").addEventListener("click", () => {
        rotX = (rotX === 60) ? 240 : 60; 
        updateStageRotation();
    });

    document.getElementById("reset-btn").addEventListener("click", initGame);
}

function updateStageRotation() {
    const stage = document.getElementById("stage");
    if(stage) stage.style.transform = `rotateX(${rotX}deg) rotateZ(${rotZ}deg)`;
}

function countdown() {
    if (isGameOver) return;
    timeLeft--;
    updateTimerUI();

    if (timeLeft <= 0) {
        clearInterval(timerId);
        isGameOver = true;
        document.getElementById("status").innerText = "⏱️ タイムアップ！ゲームオーバー。";
        document.getElementById("status").style.color = "#ff4444";
    }
}

function updateTimerUI() {
    document.getElementById("timer-text").innerText = `残り時間: ${timeLeft} 秒`;
    const percentage = (timeLeft / 120) * 100;
    const bar = document.getElementById("timer-bar");
    if(bar) bar.style.width = `${percentage}%`;
}

function isSelectable(b) {
    let hasLeft = false, hasRight = false, hasFront = false, hasBack = false;

    blocks.forEach(o => {
        if (!o.active || o === b) return;
        if (o.z === b.z) {
            if (o.y === b.y) {
                if (o.x === b.x - 1) hasLeft = true;
                if (o.x === b.x + 1) hasRight = true;
            }
            if (o.x === b.x) {
                if (o.y === b.y - 1) hasFront = true;
                if (o.y === b.y + 1) hasBack = true;
            }
        }
    });

    let openSides = 0;
    if (!hasLeft) openSides++;
    if (!hasRight) openSides++;
    if (!hasFront) openSides++;
    if (!hasBack) openSides++;

    return (openSides >= 2);
}

function handleClick(b) {
    if (isGameOver || !b.active) return;
    const status = document.getElementById("status");

    if (!isSelectable(b)) {
        status.innerText = "周囲に挟まれています（空きが1面以下なので選べません）";
        status.style.color = "#ff5722";
        return;
    }

    if (selected === null) {
        selected = b;
        b.element.classList.add("selected");
        status.innerText = "2つ目の同じ数字を選んでください";
        status.style.color = "#ffeb3b";
    } else {
        if (selected === b) {
            b.element.classList.remove("selected");
            selected = null;
            status.innerText = "選択を解除しました";
            status.style.color = "#ffeb3b";
        } else if (selected.txt === b.txt) {
            selected.active = false;
            b.active = false;
            selected.element.style.display = "none";
            b.element.style.display = "none";
            selected = null;
            
            currentScore += 700;
            document.getElementById("score").innerText = currentScore;
            
            status.innerText = "消去成功！(+700pt)";
            status.style.color = "#4caf50";
            updateCount();
        } else {
            selected.element.classList.remove("selected");
            selected = b;
            b.element.classList.add("selected");
            status.innerText = "数字が違います！";
            status.style.color = "#ff5722";
        }
    }
}

function updateCount() {
    let count = blocks.filter(b => b.active).length;
    document.getElementById("count").innerText = count;
    
    if (count === 0) {
        clearInterval(timerId);
        isGameOver = true;
        
        const timeBonus = timeLeft * 2000;
        const clearBonus = 75600;
        currentScore += (clearBonus + timeBonus);
        
        document.getElementById("score").innerText = currentScore;
        
        const status = document.getElementById("status");
        status.innerText = `🎉 全クリア達成!! 【全消し:+${clearBonus}pt】【タイムボーナス:+${timeBonus}pt】`;
        status.style.color = "#4caf50";
    }
}

setupEvents();
initGame();
