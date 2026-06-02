const SIZE = 6; 
const tileTypes = [
    { txt: "①", color: "#e63946" }, { txt: "②", color: "#3a86ff" }, { txt: "③", color: "#8338ec" },
    { txt: "④", color: "#ff006e" }, { txt: "⑤", color: "#fb5607" }, { txt: "⑥", color: "#ffbe0b" },
    { txt: "⑦", color: "#06d6a0" }, { txt: "⑧", color: "#118ab2" }, { txt: "⑨", color: "#4a5759" },
    { txt: "⑩", color: "#2a9d8f" }, { txt: "⑪", color: "#e76f51" }, { txt: "⑫", color: "#a8dadc" },
    { txt: "⑬", color: "#9b5de5" }, { txt: "⑭", color: "#f15bb5" }, { txt: "⑮", color: "#00f5d4" },
    { txt: "⑯", color: "#00bbf9" }, { txt: "⑰", color: "#fee440" }, { txt: "⑱", color: "#31572c" },
    { txt: "⑲", color: "#90e0ef" }, { txt: "⑳", color: "#0096c7" }, { txt: "㉑", color: "#f77f00" },
    { txt: "㉒", color: "#fcbf49" }, { txt: "㉓", color: "#eae2b7" }, { txt: "㉔", color: "#d62828" },
    { txt: "㉕", color: "#003049" }, { txt: "㉖", color: "#ffcdb2" }, { txt: "㉗", color: "#b5e2fa" }
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
    // 27種類 × 8回 = 216個のブロックを生成
    for (let i = 0; i < 8; i++) {
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

               const faces = [
                    { name: 'top', style: 'transform: translateZ(18px);' },
                    { name: 'bottom', style: 'transform: rotateX(180deg) translateZ(18px);' },
                    { name: 'front', style: 'transform: rotateX(-90deg) translateZ(18px);' },
                    { name: 'back', style: 'transform: rotateX(90deg) translateZ(18px);' },
                    { name: 'right', style: 'transform: rotateY(90deg) translateZ(18px);' },
                    { name: 'left', style: 'transform: rotateY(-90deg) translateZ(18px);' }
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
    // 【修正】横回転：オブジェクト自体をその場でゴロンと横に回す
    document.getElementById("rot-z-btn").addEventListener("click", () => {
        if (isGameOver) return;
        rotZ += 180;
        updateStageRotation();
    });

    // 【修正】縦回転：オブジェクト自体をその場でゴロンと縦にひっくり返す
    document.getElementById("rot-y-btn").addEventListener("click", () => {
        if (isGameOver) return;
        // 60度と240度を切り替えるのではなく、現在の角度に180度足してひっくり返します
        rotX += 180; 
        updateStageRotation();
    });

    document.getElementById("reset-btn").addEventListener("click", initGame);
}

ffunction updateStageRotation() {
    const stage = document.getElementById("stage");
    if(stage) {
        // 【最重要】塊そのものを回転させてから、最初に見やすい角度（X軸に60度）傾ける計算にします
        stage.style.transform = `rotateY(${rotZ}deg) rotateX(${rotX}deg)`;
    }
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
