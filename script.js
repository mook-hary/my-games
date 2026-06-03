const SIZE = 6; 
const tileTypes = [
    { txt: "①", color: "#e63946" }, { txt: "②", color: "#3a86ff" }, { txt: "③", color: "#8338ec" },
    { txt: "④", color: "#ff006e" }, { txt: "⑤", color: "#fb5607" }, { txt: "⑥", color: "#ffbe0b" },
    { txt: "⑦", color: "#06d6a0" }, { txt: "⑧", color: "#118ab2" }, { txt: "⑨", color: "#4a5759" },
    { txt: "⑩", color: "#2a9d8f" }, { txt: "⑪", color: "#e76f51" }, { txt: "⑫", color: "#a8dadc" },
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

function getDynamicSizes() {
    const wrapper = document.getElementById("game-aspect-wrapper");
    const wrapperWidth = wrapper ? wrapper.clientWidth : 960;
    const dynamicCubeSize = wrapperWidth * 0.045; 
    const offset = (SIZE - 1) * dynamicCubeSize / 2;
    const halfSize = dynamicCubeSize / 2;
    return { dynamicCubeSize, offset, halfSize };
}

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
    
    // 💡【重要修正】不要だった「STARTボタンを押してね」のテキスト代入を完全に撤廃。
    // タップして始まった瞬間から、プレイヤーが迷わない「1つ目のブロックを選んでください」を直接表示させます。
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
    const { dynamicCubeSize, offset, halfSize } = getDynamicSizes();

    for (let x = 0; x < SIZE; x++) {
        for (let y = 0; y < SIZE; y++) {
            for (let z = 0; z < SIZE; z++) {
                const tile = pool[index++];
                const cube = document.createElement("div");
                cube.className = "cube";
                
                updateCubePosition(cube, x, y, z, offset, dynamicCubeSize);
                const blockData = { txt: tile.txt, color: tile.color, element: cube, active: true, hasFaces: false, x, y, z };
                
                cube.addEventListener("click", (e) => {
                    e.stopPropagation(); 
                    handleClick(blockData);
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
        if (b.txt.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/) || b.txt.length > 2 || b.txt.charCodeAt(0) > 255) {
            face.style.fontSize = "2.0cqw"; 
        }
        b.element.appendChild(face);
    });
    b.hasFaces = true;
}

function updateCubePosition(cube, x, y, z, offset, dynamicCubeSize) {
    cube.style.left = ((x * dynamicCubeSize) - offset) + "px";
    cube.style.top = ((y * dynamicCubeSize) - offset) + "px";
    cube.style.transform = `translateZ(${(z * dynamicCubeSize) - offset}px)`;
}

function setupEvents() {
    document.getElementById("rot-z-btn").addEventListener("click", () => {
        if (isGameOver) return;
        triggerResizeAndRefresh();
    });

    document.getElementById("rot-y-btn").addEventListener("click", () => {
        if (isGameOver) return;
        const { dynamicCubeSize, offset, halfSize } = getDynamicSizes();
        blocks.forEach(b => {
            const oldY = b.y;
            b.y = b.z;
            b.z = (SIZE - 1) - oldY;
            updateCubePosition(b.element, b.x, b.y, b.z, offset, dynamicCubeSize);
            refreshFaceSizes(b, halfSize);
        });
    });

    document.getElementById("reset-btn").addEventListener("click", initGame);
}

function triggerResizeAndRefresh() {
    const { dynamicCubeSize, offset, halfSize } = getDynamicSizes();
    blocks.forEach(b => {
        const oldX = b.x;
        b.x = b.y;
        b.y = (SIZE - 1) - oldX;
        updateCubePosition(b.element, b.x, b.y, b.z, offset, dynamicCubeSize);
        refreshFaceSizes(b, halfSize);
    });
}

function refreshFaceSizes(b, halfSize) {
    if(b.hasFaces) {
        b.element.querySelectorAll('.face.top').forEach(el => el.style.transform = `translateZ(${halfSize}px)`);
        b.element.querySelectorAll('.face.bottom').forEach(el => el.style.transform = `rotateX(180deg) translateZ(${halfSize}px)`);
        b.element.querySelectorAll('.face.front').forEach(el => el.style.transform = `rotateX(-90deg) translateZ(${halfSize}px)`);
        b.element.querySelectorAll('.face.back').forEach(el => el.style.transform = `rotateX(90deg) translateZ(${halfSize}px)`);
        b.element.querySelectorAll('.face.right').forEach(el => el.style.transform = `rotateY(90deg) translateZ(${halfSize}px)`);
        b.element.querySelectorAll('.face.left').forEach(el => el.style.transform = `rotateY(-90deg) translateZ(${halfSize}px)`);
    }
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
    const findBlock = (x, y, z) => blocks.find(o => o.active && o.x === x && o.y === y && o.z === z);
    if (findBlock(b.x - 1, b.y, b.z)) hasLeft = true;
    if (findBlock(b.x + 1, b.y, b.z)) hasRight = true;
    if (findBlock(b.x, b.y - 1, b.z)) hasFront = true;
    if (findBlock(b.x, b.y + 1, b.z)) hasBack = true;
    let openSides = 0;
    if (!hasLeft) openSides++; if (!hasRight) openSides++; if (!hasFront) openSides++; if (!hasBack) openSides++;
    return (openSides >= 2);
}

function isExposed(b) {
    const findBlock = (x, y, z) => blocks.find(o => o.active && o.x === x && o.y === y && o.z === z);
    let openSides = 0;
    if (!findBlock(b.x - 1, b.y, b.z)) openSides++; if (!findBlock(b.x + 1, b.y, b.z)) openSides++;
    if (!findBlock(b.x, b.y - 1, b.z)) openSides++; if (!findBlock(b.x, b.y + 1, b.z)) openSides++;
    if (!findBlock(b.x, b.y, b.z - 1)) openSides++; if (!findBlock(b.x, b.y, b.z + 1)) openSides++; 
    return (openSides > 0); 
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
            selected.active = false; b.active = false;
            selected.element.style.display = "none"; b.element.style.display = "none";
            selected = null;
            currentScore += 700;
            document.getElementById("score").innerText = currentScore;
            status.innerText = "消去成功！(+700pt)";
            status.style.color = "#4caf50";
            
            const { halfSize } = getDynamicSizes();
            blocks.forEach(o => {
                if (o.active && o.element.style.display === "none" && isExposed(o)) {
                    createFacesForCube(o, halfSize); 
                    o.element.style.display = "block"; 
                }
            });
            updateCount();
        } else {
            selected.element.classList.remove("selected");
            selected = b; b.element.classList.add("selected");
            status.innerText = "数字が違います！";
            status.style.color = "#ff5722";
        }
    }
}

function updateCount() {
    let count = blocks.filter(b => b.active).length;
    document.getElementById("count").innerText = count;
    if (count === 0) {
        clearInterval(timerId); isGameOver = true;
        const timeBonus = timeLeft * 2000; const clearBonus = 75600;
        currentScore += (clearBonus + timeBonus);
        document.getElementById("score").innerText = currentScore;
        document.getElementById("status").innerText = "🎉 全クリア達成!!";
        document.getElementById("status").style.color = "#4caf50";
    }
}

document.getElementById("actual-start-btn").addEventListener("click", async () => {
    const docEl = document.documentElement;
    const isMobileSize = window.innerWidth < 960;

    if (isMobileSize) {
        try {
            if (docEl.requestFullscreen) await docEl.requestFullscreen();
            else if (docEl.webkitRequestFullscreen) await docEl.webkitRequestFullscreen();
        } catch (err) { console.log("フルスクリーン拒否"); }
        
        try {
            if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape");
        } catch (err) { console.log("向きロック拒否"); }
    } else {
        console.log("PC環境を確定：フルスクリーンおよび回転をスキップします。");
    }

    const overlay = document.getElementById("start-overlay");
    document.body.classList.add("game-started");
    overlay.style.opacity = "0";
    setTimeout(() => {
        overlay.style.display = "none";
        initGame();
    }, 500);
});

const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
fullscreenEvents.forEach(eventType => {
    document.addEventListener(eventType, () => {
        forceResizeAll();
    });
});

window.addEventListener("resize", () => {
    forceResizeAll();
});

function forceResizeAll() {
    const { dynamicCubeSize, offset, halfSize } = getDynamicSizes();
    blocks.forEach(b => {
        if (b.active) {
            updateCubePosition(b.element, b.x, b.y, b.z, offset, dynamicCubeSize);
            refreshFaceSizes(b, halfSize);
        }
    });
    updateStageRotation();
}

setupEvents();
