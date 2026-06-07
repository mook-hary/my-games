let SIZE = 6; 
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
let highScore = 0; 
let timeLeft = 120;
let timerId = null;
let isGameOver = false;
let isPaused = false; 

let rotX = 60;   
let rotZ = -45;  

// 🌟 【Web Audio API】効果音用の音声回路
let audioCtx = null;

const soundBank = {
    select: null,
    clear: null,
    error: null,
    timeup: null,
    start: null
};

// 🎵 【BGMシステム】
const bgmList = ["sounds/bgm_1.mp3", "sounds/bgm_2.mp3", "sounds/bgm_3.mp3"];
let currentActiveBGM = null; 

function playRandomBGM() {
    try {
        if (currentActiveBGM) {
            currentActiveBGM.pause();
            currentActiveBGM = null;
        }

        let randomTrack = bgmList[Math.floor(Math.random() * bgmList.length)];
        currentActiveBGM = new Audio(randomTrack);
        currentActiveBGM.loop = true;
        currentActiveBGM.volume = 0.20; // BGM音量12%

        currentActiveBGM.play().catch(e => console.log("BGM再生ブロック回避:", e));
    } catch(e) {
        console.log("BGMシャッフルエラー:", e);
    }
}

// 効果音再生関数
function playWebAudio(bufferName) {
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const bufferObj = soundBank[bufferName];
    if (!audioCtx || !bufferObj) return;
    try {
        let bufferSource = audioCtx.createBufferSource();
        bufferSource.buffer = bufferObj;
        bufferSource.connect(audioCtx.destination); 
        bufferSource.start(0);
    } catch (e) {
        console.log("Web Audio再生エラー:", e);
    }
}

// 効果音ダウンロード＆デコード関数
async function loadSoundToBuffer(fileName) {
    if (!audioCtx) return null;
    let soundUrl = "sounds/" + fileName;
    try {
        let response = await fetch(soundUrl);
        let arrayBuffer = await response.arrayBuffer();
        return await audioCtx.decodeAudioData(arrayBuffer);
    } catch (err) {
        console.log(fileName + " のロード失敗:", err);
        return null;
    }
}

// 音声回路初期化
function initAudioSystem() {
    if (audioCtx) return; 
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();

        // 🚀 すべて .mp3 に統一して最速ロード
        loadSoundToBuffer("select_1.mp3").then(buf => { if(buf) soundBank.select = buf; });
        loadSoundToBuffer("clear_1.mp3").then(buf => { if(buf) soundBank.clear = buf; });
        loadSoundToBuffer("error_1.mp3").then(buf => { if(buf) soundBank.error = buf; });
        loadSoundToBuffer("timeup_1.mp3").then(buf => { if(buf) soundBank.timeup = buf; });
        loadSoundToBuffer("start_1.mp3").then(buf => { if(buf) soundBank.start = buf; });
    } catch(e) {
        console.log("Web Audio初期化失敗:", e);
    }
}

function getDynamicSizes() {
    const isPC = window.innerWidth >= 960;
    let dynamicCubeSize = 35;
    if (SIZE === 5) {
        dynamicCubeSize = isPC ? 48 : 40;
    } else {
        dynamicCubeSize = isPC ? 40 : 35;
    }
    const offset = (SIZE - 1) * dynamicCubeSize / 2;
    const halfSize = dynamicCubeSize / 2;
    return { dynamicCubeSize, offset, halfSize };
}

function loadHighScore() {
    const savedScore = localStorage.getItem(`egebro_highscore_sz${SIZE}`);
    if (savedScore !== null) {
        highScore = parseInt(savedScore, 10);
    } else {
        highScore = 0;
    }
    document.getElementById("best-score").innerText = highScore;
}

function updateScoreDisplay(scoreValue) {
    currentScore = scoreValue;
    document.getElementById("score").innerText = currentScore;
    
    if (currentScore > highScore) {
        highScore = currentScore;
        document.getElementById("best-score").innerText = highScore;
        localStorage.setItem(`egebro_highscore_sz${SIZE}`, highScore); 
    }
}

function initGame() {
    const stage = document.getElementById("stage");
    if(!stage) return;
    stage.innerHTML = "";
    blocks = [];
    selected = null;
    isGameOver = false;
    isPaused = false; 
    
    const pauseOverlay = document.getElementById("pause-overlay");
    if(pauseOverlay) { pauseOverlay.style.display = "none"; pauseOverlay.style.opacity = "0"; }

    updateScoreDisplay(0); 
    loadHighScore(); 
    
    rotX = 60;
    rotZ = -45;
    
    document.getElementById("status").innerText = "1つ目のブロックを選んでください";
    document.getElementById("status").style.color = "#38bdf8";

    timeLeft = 120;
    updateTimerUI();
    clearInterval(timerId);
    timerId = setInterval(countdown, 1000);

    let pool = [];
    const totalRequired = SIZE * SIZE * SIZE;
    
    for (let i = 0; i < 10; i++) {
        tileTypes.forEach(t => pool.push({ ...t }));
    }
    pool.sort(() => Math.random() - 0.5);
    pool = pool.slice(0, totalRequired);

    let index = 0;
    const { dynamicCubeSize, offset, halfSize } = getDynamicSizes();

    for (let x = 0; x < SIZE; x++) {
        for (let y = 0; y < SIZE; y++) {
            for (let z = 0; z < SIZE; z++) {
                const tile = pool[index++];
                const cube = document.createElement("div");
                cube.className = "cube";
                
                cube.style.width = dynamicCubeSize + "px";
                cube.style.height = dynamicCubeSize + "px";
                
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
                    createFacesForCube(blockData, halfSize, dynamicCubeSize);
                    stage.appendChild(cube);
                }
                blocks.push(blockData);
            }
        }
    }
    updateCount();
    updateStageRotation();
}

function createFacesForCube(b, halfSize, dynamicCubeSize) {
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
        
        face.style.width = dynamicCubeSize + "px";
        face.style.height = dynamicCubeSize + "px";
        
        face.style.backgroundColor = b.color;
        face.innerText = b.txt;
        
        const windowIsPC = window.innerWidth >= 960;
        face.style.fontSize = windowIsPC ? (SIZE === 5 ? "26px" : "22px") : (SIZE === 5 ? "22px" : "18px");
        
        if (b.txt.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/) || b.txt.length > 2 || b.txt.charCodeAt(0) > 255) {
            face.style.fontSize = windowIsPC ? "16px" : "14px"; 
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
    // 左右回転ボタン
    document.getElementById("rot-z-btn").addEventListener("click", () => {
        initAudioSystem(); 
        if (isGameOver || isPaused) return; 
        playWebAudio("select"); 
        triggerResizeAndRefresh();
    });

    // 上下回転ボタン
    document.getElementById("rot-y-btn").addEventListener("click", () => {
        initAudioSystem();
        if (isGameOver || isPaused) return; 
        playWebAudio("select"); 
        const { dynamicCubeSize, offset, halfSize } = getDynamicSizes();
        blocks.forEach(b => {
            const oldY = b.y;
            b.y = b.z;
            b.z = (SIZE - 1) - oldY;
            updateCubePosition(b.element, b.x, b.y, b.z, offset, dynamicCubeSize);
            refreshFaceSizes(b, halfSize);
        });
    });

    // ポーズボタン
    document.getElementById("pause-btn").addEventListener("click", () => { initAudioSystem(); playWebAudio("select"); togglePause(); });
    
    // ポーズ画面の再開ボタン
    document.getElementById("resume-btn").addEventListener("click", () => { 
        initAudioSystem(); 
        playWebAudio("select"); 
        togglePause(); 
    });

    // 🌟 ポーズ画面内の「タイトルへ」ボタンの処理
    document.getElementById("to-title-btn").addEventListener("click", () => {
        initAudioSystem();
        playWebAudio("select"); // ポチッと音を鳴らす
        
        clearInterval(timerId);
        isGameOver = true;
        isPaused = false;
        
        try {
            if (currentActiveBGM) {
                currentActiveBGM.pause();
                currentActiveBGM = null;
            }
        } catch(e){}
    
        // ポーズ画面を閉じる
        const pauseOverlay = document.getElementById("pause-overlay");
        if(pauseOverlay) { pauseOverlay.style.display = "none"; pauseOverlay.style.opacity = "0"; }
    
        // タイトル画面を表示する
        const overlay = document.getElementById("start-overlay");
        document.body.classList.remove("game-started");
        overlay.style.display = "flex";
        setTimeout(() => {
            overlay.style.opacity = "1";
        }, 10);
    });
    
    // リセットボタン
    document.getElementById("reset-btn").addEventListener("click", () => { 
        initAudioSystem(); 
        playWebAudio("select"); 
        playRandomBGM(); 
        initGame(); 
    });

    // タイトル画面の難易度 Easy ボタン
    document.getElementById("diff-easy-btn").addEventListener("click", () => {
        initAudioSystem();
        playWebAudio("select"); 
        SIZE = 5;
        document.getElementById("diff-easy-btn").classList.add("active");
        document.getElementById("diff-normal-btn").classList.remove("active");
        loadHighScore(); 
    });
    
    // タイトル画面の難易度 Normal ボタン
    document.getElementById("diff-normal-btn").addEventListener("click", () => {
        initAudioSystem();
        playWebAudio("select"); 
        SIZE = 6;
        document.getElementById("diff-normal-btn").classList.add("active");
        document.getElementById("diff-easy-btn").classList.remove("active");
        loadHighScore(); 
    });

    // スタートボタン
    document.getElementById("actual-start-btn").addEventListener("click", async () => {
        initAudioSystem();
        playWebAudio("start"); 
        playRandomBGM(); 

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
        }

        const overlay = document.getElementById("start-overlay");
        document.body.classList.add("game-started");
        overlay.style.opacity = "0";
        setTimeout(() => {
            overlay.style.display = "none";
            initGame();
        }, 500);
    });
}

function togglePause() {
    if (isGameOver) return;
    const pauseOverlay = document.getElementById("pause-overlay");
    if (!pauseOverlay) return;

    if (!isPaused) {
        isPaused = true;
        clearInterval(timerId); 
        pauseOverlay.style.display = "flex";
        setTimeout(() => pauseOverlay.style.opacity = "1", 10);
        try { if(currentActiveBGM) currentActiveBGM.pause(); } catch(e){} 
    } else {
        isPaused = false;
        pauseOverlay.style.opacity = "0";
        setTimeout(() => pauseOverlay.style.display = "none", 400);
        clearInterval(timerId);
        timerId = setInterval(countdown, 1000);
        try { if(currentActiveBGM) currentActiveBGM.play(); } catch(e){} 
    }
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

// ⏱️ タイムアップ処理（BGM停止 ➡️ SE再生の順番に完全制御）
function countdown() {
    if (isGameOver || isPaused) return; 
    timeLeft--;
    updateTimerUI();
    if (timeLeft <= 0) {
        clearInterval(timerId);
        isGameOver = true;
        document.getElementById("status").innerText = "⏱️ タイムアップ！";
        document.getElementById("status").style.color = "#ff4444";
        
        // 🌟 1. 何よりも最優先でBGMを完全に停止＆消去して「静寂」を作る
        try { 
            if(currentActiveBGM) {
                currentActiveBGM.pause(); 
                currentActiveBGM = null;
            }
        } catch(e){} 
        
        // 🌟 2. BGMが消えた完璧な無音空間で、タイムアップ音を炸裂させる！
        playWebAudio("timeup");
    }
}

function updateTimerUI() {
    document.getElementById("timer-text").innerText = `残り時間 ${timeLeft} 秒`;
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
    if (!findBlock(b.x, b.y - 1, b.z)) openSides++; if (!findBlock(b.x, b.y, b.z + 1)) openSides++; 
    return (openSides > 0); 
}

function handleClick(b) {
    if (isGameOver || isPaused || !b.active) return;
    
    if (isSelectable(b)) {
        if (selected !== b) {
            playWebAudio("select"); 
        }
    } else {
        playWebAudio("error"); 
    }

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
            
            updateScoreDisplay(currentScore + 700);
            status.innerText = "消去成功！(+700pt)";
            status.style.color = "#4caf50";
            
            playWebAudio("clear");
            
            const { halfSize, dynamicCubeSize } = getDynamicSizes();
            blocks.forEach(o => {
                if (o.active && o.element.style.display === "none" && isExposed(o)) {
                    createFacesForCube(o, halfSize, dynamicCubeSize); 
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
        const timeBonus = timeLeft * 2000;
        const clearBonus = SIZE === 5 ? 43750 : 75600;
        
        updateScoreDisplay(currentScore + clearBonus + timeBonus);
        document.getElementById("status").innerText = "🎉 全クリア達成!!";
        document.getElementById("status").style.color = "#4caf50";
        try { if(currentActiveBGM) currentActiveBGM.pause(); } catch(e){} 
        playWebAudio("clear");
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        try { if(currentActiveBGM) currentActiveBGM.pause(); } catch(e){}
    } else {
        if (document.body.classList.contains("game-started") && !isPaused && !isGameOver) {
            try { if(currentActiveBGM) currentActiveBGM.play().catch(e => console.log(e)); } catch(e){}
        }
    }
});

loadHighScore();
initAudioSystem(); 
setupEvents();
