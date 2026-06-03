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

// 💡【変更】共通のサイズ司令塔の比率を「0.050 ➡️ 0.045 (4.5%)」に変更
function getDynamicSizes() {
    const wrapper = document.getElementById("game-aspect-wrapper");
    const wrapperWidth = wrapper ? wrapper.clientWidth : 960;
    const dynamicCubeSize = wrapperWidth * 0.045; // CSSの 4.5cqw と完全同期
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
        
        // 💡【新設】中身が「絵文字」の場合のみ、CSSで一回り大きくなるようにクラスを付与
        if (b.txt.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/) || b.txt.length > 2 || b.txt.charCodeAt(0) > 255) {
            face.style.fontSize = "2.0cqw"; // 通常の1.4から2.0へ拡大（約1.4倍）
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
        const { dynamicCubeSize, offset, halfSize } = getDynamicSizes();

        blocks.forEach(b => {
            const oldX = b.x;
            b.x = b.y;
            b.y = (SIZE - 1) - oldX;
            updateCubePosition(b.element, b.x, b.y, b.z, offset, dynamicCubeSize);
            
            if(b.hasFaces) {
                b.element.querySelectorAll('.face.top').forEach(el => el.style.transform = `translateZ(${halfSize}px)`);
                b.element.querySelectorAll('.face.bottom').forEach(el => el.style.transform = `rotateX(180deg) translateZ(${halfSize}px)`);
                b.element.querySelectorAll('.face.front').forEach(el => el.style.transform = `rotateX(-90deg) translateZ(${halfSize}px)`);
                b.element.querySelectorAll('.face.back').forEach(el => el.style.transform = `rotateX(90deg) translateZ(${halfSize}px)`);
                b.element.querySelectorAll('.face.right').forEach(el => el.style.transform = `rotateY(90deg) translateZ(${halfSize}px)`);
                b.element.querySelectorAll('.face.left').forEach(el => el.style.transform = `rotateY(-90deg) translateZ(${halfSize}px)`);
            }
        });
    });

    document.getElementById("rot-y-btn").addEventListener("click", () => {
        if (isGameOver) return;
        const { dynamicCubeSize, offset, halfSize } = getDynamicSizes();

        blocks.forEach(b => {
            const oldY = b.y;
            b.y = b.z;
            b.z = (SIZE - 1) - oldY;
            updateCubePosition(b.element, b.x, b.y, b.z, offset, dynamicCubeSize);
            
            if(b.hasFaces) {
                b.element.querySelectorAll('.face.top').forEach(el => el.style.transform = `translateZ(${halfSize}px)`);
                b.element.querySelectorAll('.face.bottom').forEach(el => el.style.transform = `rotateX(180deg) translateZ(${halfSize}px)`);
                b.element.querySelectorAll('.face.front').forEach(el => el.style.transform = `rotateX(-90deg) translateZ(${halfSize}px)`);
                b.element.querySelectorAll('.face.back').forEach(el => el.style.transform = `rotateX(90deg) translateZ(${halfSize}px)`);
                b.element.querySelectorAll('.face.right').forEach(el => el.style.transform = `rotateY(90deg) translateZ(${halfSize}px)`);
                b.element.querySelectorAll('.face.left').forEach(el => el.style.transform = `rotateY(-90deg) translateZ(${halfSize}px)`);
            }
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

function isExposed(b) {
    const findBlock = (x, y, z) => {
        return blocks.find(o => o.active && o.x === x && o.y === y && o.z === z);
    };

    let openSides = 0;
    if (!findBlock(b.x - 1, b.y, b.z)) openSides++;
    if (!findBlock(b.x + 1, b.y, b.z)) openSides++;
    if (!findBlock(b.x, b.y - 1, b.z)) openSides++;
    if (!findBlock(b.x, b.y + 1, b.z)) openSides++;
    if (!findBlock(b.x, b.y, b.z - 1)) openSides++; 
    if (!findBlock(b.x, b.y, b.z + 1)) openSides++; 

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
            selected.active = false;
            b.active = false;
            selected.element.style.display = "none";
            b.element.style.display = "none";
            selected = null;
            
            currentScore += 700;
            document.getElementById("score").innerText = currentScore;
            
            status.innerText = "消去成功！(+700pt)";
            status.style.color = "#4caf50";
            
            const { halfSize } = getDynamicSizes();
            
            blocks.forEach(o => {
                if (o.active && o.element.style.display === "none") {
                    if (isExposed(o)) {
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

// ========================================================
// 💡【最下部に追加】タップ時に完全フルスクリーン＆横向き固定化するプロの処理
// ========================================================
document.getElementById("actual-start-btn").addEventListener("click", async () => {
    const docEl = document.documentElement;
    
    // 1. ブラウザのアドレスバーを完全に消し去る（フルスクリーン化）
    try {
        if (docEl.requestFullscreen) {
            await docEl.requestFullscreen();
        } else if (docEl.mozRequestFullScreen) { /* Firefox */
            await docEl.mozRequestFullScreen();
        } else if (docEl.webkitRequestFullscreen) { /* Chrome, Safari, Opera */
            await docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) { /* IE/Edge */
            await docEl.msRequestFullscreen();
        }
    } catch (err) {
        console.log("フルスクリーン化は拒否されましたが、通常のレスポンシブで続行します");
    }

    // 2. 画面の向きを「横向き（Landscape）」にロック命令を出す
    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock("landscape");
        }
    } catch (err) {
        console.log("OS側の回転ロック、またはiOSの制限により向きの強制固定はスキップされました（CSS側で自動ケアされます）");
    }

    // 3. スタート画面をフワッと消して、ゲーム画面を表に出す
    const overlay = document.getElementById("start-overlay");
    document.body.classList.add("game-started");
    overlay.style.opacity = "0";
    setTimeout(() => {
        overlay.style.display = "none";
        // ゲームのタイマーなどをここから綺麗に再始動
        initGame();
    }, 500);
});

// ========================================================
// 💡【最下部に追加】PCのEscキーや、全画面解除時の崩壊を完全に防ぐプロの処理
// ========================================================
// ブラウザのフルスクリーン状態が「変化した瞬間」（Escキー押下など）を常時監視します
const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];

fullscreenEvents.forEach(eventType => {
    document.addEventListener(eventType, () => {
        // フルスクリーンが開始された、または「解除された」瞬間にここが発動します
        
        // 1. 最新の画面サイズから、正しい dynamicCubeSize と halfSize を逆算
        const { dynamicCubeSize, offset, halfSize } = getDynamicSizes();

        // 2. 画面上にあるすべてのブロックの位置と、立体の厚み（面）を現在の画面サイズに100%強制同期
        blocks.forEach(b => {
            if (b.active) {
                // ブロックの配置座標（left, top, translateZ）を再計算して修正
                updateCubePosition(b.element, b.x, b.y, b.z, offset, dynamicCubeSize);
                
                // すでに組み立てられている3Dの面（厚み）も、新しいサイズ（halfSize）にミリ単位で再修正
                if (b.hasFaces) {
                    b.element.querySelectorAll('.face.top').forEach(el => el.style.transform = `translateZ(${halfSize}px)`);
                    b.element.querySelectorAll('.face.bottom').forEach(el => el.style.transform = `rotateX(180deg) translateZ(${halfSize}px)`);
                    b.element.querySelectorAll('.face.front').forEach(el => el.style.transform = `rotateX(-90deg) translateZ(${halfSize}px)`);
                    b.element.querySelectorAll('.face.back').forEach(el => el.style.transform = `rotateX(90deg) translateZ(${halfSize}px)`);
                    b.element.querySelectorAll('.face.right').forEach(el => el.style.transform = `rotateY(90deg) translateZ(${halfSize}px)`);
                    b.element.querySelectorAll('.face.left').forEach(el => el.style.transform = `rotateY(-90deg) translateZ(${halfSize}px)`);
                }
            }
        });

        // 3. 3Dステージ全体の回転データもリフレッシュして位置ズレを防止
        updateStageRotation();
        
        console.log("🛠️ フルスクリーン状態の変化を検知：画面の3D比率を完全に再適合しました。");
    });
});
