const SIZE = 6; 
const tileTypes = [
    { txt: "①", color: "#e63946" }, { txt: "②", color: "#3a86ff" }, { txt: "③", color: "#8338ec" },
    { txt: "④", color: "#ff006e" }, { txt: "⑤", color: "#fb5607" }, { txt: "⑥", color: "#ffbe0b" },
    { txt: "⑦", color: "#06d6a0" }, { txt: "⑧", color: "#118ab2" }, { txt: "⑨", color: "#4a5759" },
    { txt: "⑩", color: "#2a9d8f" }, { txt: "⑪", color: "#e76f51" }, { txt: "⑫", color: "#a8dadc" },
    // 🍎 13番以降の絵文字バージョン
    { txt: "🍎", color: "#ff4d6d" }, { txt: "💎", color: "#00b4d8" }, { txt: "🌟", color: "#ffb703" },
    { txt: "🍀", color: "#38b000" }, { txt: "🔥", color: "#ff4a00" }, { txt: "👾", color: "#a2d2ff" },
    { txt: "🐱", color: "#ffb5a7" }, { txt: "🐼", color: "#f0f0f0" }, { txt: "🚀", color: "#90e0ef" },
    { txt: "👻", color: "#e0aaff" }, { txt: "🍕", color: "#ffb703" }, { txt: "🍩", color: "#ff85a1" },
    { txt: "🌍", color: "#48cae4" }, { txt: "🏁", color: "#ffffff" }, { txt: "👑", color: "#ffbe0b" }
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
    for (let i = 0; i < 8; i++) {
        tileTypes.forEach(t => pool.push({ ...t }));
    }
    pool.sort(() => Math.random() - 0.5);

    let index = 0;
    
    // 💡【完全比率化】現在の外枠（#game-aspect-wrapper）の実際の横幅から、
    // ブロック1マスと、3Dの厚みのサイズ（半分）を100%正確に逆算します。
    const wrapper = document.getElementById("game-aspect-wrapper");
    const wrapperWidth = wrapper ? wrapper.clientWidth : 960;
    const dynamicCubeSize = wrapperWidth * 0.050; // CSSの 3.6cqw と完全に一致させる
    const offset = (SIZE - 1) * dynamicCubeSize / 2;
    const halfSize = dynamicCubeSize / 2; // 立方体の半分の厚み（translateZ用）

    for (let x = 0; x < SIZE; x++) {
        for (let y = 0; y < SIZE; y++) {
            for (let z = 0; z < SIZE; z++) {
                const tile = pool[index++];
                
                const cube = document.createElement("div");
                cube.className = "cube";
                
                updateCubePosition(cube, x, y, z, offset, dynamicCubeSize);

                const blockData = { x, y, z, txt: tile.txt, color: tile.color, element: cube, active: true, hasFaces: false };
                
                cube.addEventListener("click", (e) => {
                    e.stopPropagation(); 
                    handleClick(blockData, halfSize);
                });

                let hasLeft = x > 0, hasRight = x < SIZE - 1;
                let hasFront = y > 0, hasBack = y < SIZE - 1;
                let hasBottom = z > 0, hasTop = z < SIZE - 1;

                if (hasLeft && hasRight && hasFront && hasBack && hasBottom && hasTop) {
                    cube.style.display = "none"; 
                    stage.appendChild(cube);
                } else {
                    createFacesForCube(blockData, halfSize);
                    stage.appendChild(cube);
                }
                blocks.push(blockData);
            }
        }
    }
    updateCount();
    updateStageRotation();
}

// 💡 3Dの飛び出しの厚み（halfSize）も動的に受け取って、完璧な立方体に組み立てます
function createFacesForCube(b, halfSize) {
    if (b.hasFaces) return; 
    
    const faces = [
        { name: 'top', style: `transform: translateZ(${halfSize}px);` },
        { name: 'bottom', style: `transform: rotateX(180deg) translateZ(${halfSize}px);` },
        { name: 'front', style: `transform: rotateX(-90deg) translateZ(${halfSize}px);` },
        { name: 'back', style: `transform: rotateX(90deg) translateZ(${halfSize}px);` },
        { name: 'right', style: `transform: rotateY(90deg) translateZ(${halfSize}px);` },
        { name: 'left', style: `transform: rotateY(-90deg) translateZ(${halfSize}px);` }
    ];

    faces.forEach(f => {
        const face = document.createElement("div");
        face.className = `face ${f.name}`;
        face.style.cssText = f.style;
        face.style.backgroundColor = b.color;
        face.innerText = b.txt;
        b.element.appendChild(face);
    });
    
    b.hasFaces = true;
}

function updateCubePosition(cube, x, y, z, offset, dynamicCubeSize) {
    // ズレの原因を排除するため、中心点からの正確なピクセル位置を反映
    cube.style.left = ((x * dynamicCubeSize) - offset) + "px";
    cube.style.top = ((y * dynamicCubeSize) - offset) + "px";
    cube.style.transform = `translateZ(${(z * dynamicCubeSize) - offset}px)`;
}

function setupEvents() {
    document.getElementById("rot-z-btn").addEventListener("click", () => {
        if (isGameOver) return;
        const wrapper = document.getElementById("game-aspect-wrapper");
        const wrapperWidth = wrapper ? wrapper.clientWidth : 960;
        const dynamicCubeSize = wrapperWidth * 0.036;
        const offset = (SIZE - 1) * dynamicCubeSize / 2;

        blocks.forEach(b => {
            const oldX = b.x;
            b.x = b.y;
            b.y = (SIZE - 1) - oldX;
            updateCubePosition(b.element, b.x, b.y, b.z, offset, dynamicCubeSize);
        });
    });

    document.getElementById("rot-y-btn").addEventListener("click", () => {
        if (isGameOver) return;
        const wrapper = document.getElementById("game-aspect-wrapper");
        const wrapperWidth = wrapper ? wrapper.clientWidth : 960;
        const dynamicCubeSize = wrapperWidth * 0.036;
        const offset = (SIZE - 1) * dynamicCubeSize / 2;

        blocks.forEach(b => {
            const oldY = b.y;
            b.y = b.z;
            b.z = (SIZE - 1) - oldY;
            updateCubePosition(b.element, b.x, b.y, b.z, offset, dynamicCubeSize);
        });
    });

    document.getElementById("reset-btn").addEventListener("click", initGame);
}

function updateStageRotation() {
    const stage = document.getElementById("stage");
    if(stage) {
        stage.style.transform = `rotateX(${rotX}deg) rotateZ(${rotZ}deg)`;
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

    const findBlock = (x, y, z) => {
        return blocks.find(o => o.active && o.x === x && o.y === y && o.z === z);
    };

    if (findBlock(b.x - 1, b.y, b.z)) hasLeft = true;
    if (findBlock(b.x + 1, b.y, b.z)) hasRight = true;
    if (findBlock(b.x, b.y - 1, b.z)) hasFront = true;
    if (findBlock(b.x, b.y + 1, b.z)) hasBack = true;

    let openSides = 0;
    if (!hasLeft) openSides++;
    if (!hasRight) openSides++;
    if (!hasFront) openSides++;
    if (!hasBack) openSides++;

    return (openSides >= 2);
}

function handleClick(b, halfSize) {
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
            
            blocks.forEach(o => {
                if (o.active && o.element.style.display === "none") {
                    if (isSelectable(o)) {
                        createFacesForCube(o, halfSize); 
                        o.element.style.display = "block"; 
                    }
                }
            });
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
