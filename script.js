// --- GLOBAL STATE & LEADERBOARD ---
let stars = 0;
let completedLevelsSet = new Set();
const starCountEl = document.getElementById('star-count');
const profileText = document.getElementById('player-profile-text');

let currentPlayer = { name: '', school: '' };

let leaderboardData = [];
// Dummy Data untuk Simulasi awal
const dummyData = [
    { name: 'Siti (Dummy)', school: 'SD Cendekia', stars: 28 },
    { name: 'Joko (Dummy)', school: 'SD Bina Nusa', stars: 20 },
    { name: 'Budi (Dummy)', school: 'SD Merdeka', stars: 15 }
];

function initSystem() {
    // Load Leaderboard
    const savedLb = localStorage.getItem('kodekidz_leaderboard');
    if (savedLb) {
        leaderboardData = JSON.parse(savedLb);
    } else {
        leaderboardData = [...dummyData];
        saveLeaderboard();
    }

    // Load Current Session
    const savedName = localStorage.getItem('kodekidz_current_name');
    if (savedName) {
        currentPlayer.name = savedName;
        currentPlayer.school = localStorage.getItem('kodekidz_current_school') || '';
        document.getElementById('welcome-overlay').classList.add('hidden');
        profileText.textContent = `Halo, ${currentPlayer.name} (${currentPlayer.school})!`;
        loadProgress();
    } else {
        document.getElementById('welcome-overlay').classList.remove('hidden');
    }
}

function loadProgress() {
    const savedStars = localStorage.getItem('kodekidz_stars');
    const savedLevels = localStorage.getItem('kodekidz_levels');
    if (savedStars !== null) stars = parseInt(savedStars);
    if (savedLevels !== null) {
        try { completedLevelsSet = new Set(JSON.parse(savedLevels)); } catch(e) {}
    }
    starCountEl.textContent = stars;
}

function saveProgress() {
    localStorage.setItem('kodekidz_stars', stars);
    localStorage.setItem('kodekidz_levels', JSON.stringify(Array.from(completedLevelsSet)));
    
    // Update score in leaderboard array if it exists
    const idx = leaderboardData.findIndex(p => p.name === currentPlayer.name && p.school === currentPlayer.school);
    if (idx >= 0) {
        leaderboardData[idx].stars = Math.max(leaderboardData[idx].stars, stars);
    } else {
        leaderboardData.push({ name: currentPlayer.name, school: currentPlayer.school, stars: stars });
    }
    saveLeaderboard();
}

function saveLeaderboard() {
    localStorage.setItem('kodekidz_leaderboard', JSON.stringify(leaderboardData));
}

// --- WELCOME SCREEN LOGIC ---
document.getElementById('btn-mulai').addEventListener('click', () => {
    const nama = document.getElementById('input-nama').value.trim();
    const sekolah = document.getElementById('input-sekolah').value.trim();
    if (!nama || !sekolah) return alert("Tolong isi Nama dan Asal Sekolah ya!");
    
    currentPlayer.name = nama;
    currentPlayer.school = sekolah;
    localStorage.setItem('kodekidz_current_name', nama);
    localStorage.setItem('kodekidz_current_school', sekolah);
    
    // Check if player already exists in leaderboard, to load their old score? 
    // For now, let's just reset their local score to 0 to simulate fresh start, unless we want to load.
    // If they want to continue, let's load if exists.
    const exist = leaderboardData.find(p => p.name === nama && p.school === sekolah);
    if(exist) {
        // Just continue whatever is in local storage (might be out of sync, but it's simple)
    } else {
        // Fresh start
        stars = 0;
        completedLevelsSet.clear();
        saveProgress();
    }
    
    document.getElementById('welcome-overlay').classList.add('hidden');
    profileText.textContent = `Halo, ${currentPlayer.name} (${currentPlayer.school})!`;
});

// --- GANTI PEMAIN LOGIC ---
document.getElementById('reset-progress-btn').addEventListener('click', () => {
    if (confirm("Ganti Pemain? Skor saat ini akan disimpan ke Papan Peringkat.")) {
        localStorage.removeItem('kodekidz_current_name');
        localStorage.removeItem('kodekidz_current_school');
        localStorage.removeItem('kodekidz_stars');
        localStorage.removeItem('kodekidz_levels');
        location.reload();
    }
});

// --- LEADERBOARD LOGIC ---
document.getElementById('btn-open-leaderboard').addEventListener('click', () => {
    renderLeaderboard();
    document.getElementById('leaderboard-modal').classList.add('active');
});

document.getElementById('close-leaderboard').addEventListener('click', () => {
    document.getElementById('leaderboard-modal').classList.remove('active');
});

function renderLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    const podiumEl = document.getElementById('podium-container');
    listEl.innerHTML = ''; podiumEl.innerHTML = '';
    
    // Sort descending by stars
    const sorted = [...leaderboardData].sort((a, b) => b.stars - a.stars);
    
    // Render Podium (Top 3) - 2nd, 1st, 3rd
    const ranks = [
        { data: sorted[1], rank: 2, class: 'rank-2' },
        { data: sorted[0], rank: 1, class: 'rank-1' },
        { data: sorted[2], rank: 3, class: 'rank-3' }
    ];
    
    ranks.forEach(r => {
        if (!r.data) return;
        const item = document.createElement('div');
        item.className = `podium-item ${r.class}`;
        item.innerHTML = `
            <div class="podium-name">${r.data.name}</div>
            <div class="podium-school">${r.data.school}</div>
            <div class="podium-block">#${r.rank}<br><span style="font-size:1rem;font-weight:normal;">⭐ ${r.data.stars}</span></div>
        `;
        podiumEl.appendChild(item);
    });
    
    // Render the rest (Rank 4+)
    for(let i=3; i<sorted.length; i++) {
        const row = document.createElement('div');
        row.className = 'leader-row';
        row.innerHTML = `
            <div class="rank">#${i+1}</div>
            <div class="info">
                <div class="info-name">${sorted[i].name}</div>
                <div class="info-school">${sorted[i].school}</div>
            </div>
            <div class="score">⭐ ${sorted[i].stars}</div>
        `;
        listEl.appendChild(row);
    }
}

initSystem();

// --- NAVIGATION ---
const lvlBtns = document.querySelectorAll('.lvl-btn');
const gameViews = document.querySelectorAll('.game-view');

lvlBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const gameId = btn.getAttribute('data-game');
        lvlBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameViews.forEach(v => v.classList.remove('active'));
        document.getElementById(`game-${gameId}`).classList.add('active');
    });
});

// --- COMMON MODAL UTILS ---
const successModal = document.getElementById('success-modal');
const failModal = document.getElementById('fail-modal');
const successMsg = document.getElementById('success-msg');
const failMsg = document.getElementById('fail-msg');

let currentSuccessCallback = null;

function showSuccess(gameId, levelIndex, msg, nextLevelCallback) {
    const levelKey = `g${gameId}-l${levelIndex}`;
    if (!completedLevelsSet.has(levelKey)) {
        completedLevelsSet.add(levelKey);
        stars = Math.min(30, stars + 1);
        starCountEl.textContent = stars;
        saveProgress();
    }
    successMsg.textContent = msg;
    currentSuccessCallback = nextLevelCallback;
    successModal.classList.add('active');
}

function showFail(msg) {
    failMsg.textContent = msg;
    failModal.classList.add('active');
}

function closeModals() {
    successModal.classList.remove('active');
    failModal.classList.remove('active');
}

document.getElementById('close-success').onclick = () => {
    closeModals();
    if (currentSuccessCallback) currentSuccessCallback();
};

const delay = ms => new Promise(r => setTimeout(r, ms));


// ==========================================
// GAME 1: ROBOT (SEKUENSIAL)
// ==========================================
const g1Levels = [
    { size: 4, start: {x:0, y:0, dir:1}, goal: {x:3, y:0}, walls: [] }, // L1
    { size: 4, start: {x:0, y:3, dir:0}, goal: {x:3, y:0}, walls: [{x:1,y:3}, {x:1,y:2}] }, // L2
    { size: 5, start: {x:0, y:0, dir:1}, goal: {x:4, y:4}, walls: [{x:2,y:0}, {x:2,y:1}, {x:2,y:2}] }, // L3
    { size: 5, start: {x:0, y:4, dir:1}, goal: {x:4, y:0}, walls: [{x:1,y:4}, {x:1,y:3}, {x:3,y:1}, {x:3,y:0}] }, // L4
    { size: 6, start: {x:0, y:0, dir:1}, goal: {x:2, y:3}, walls: [{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},{x:4,y:2},{x:4,y:3},{x:4,y:4},{x:3,y:4},{x:2,y:4},{x:1,y:4},{x:1,y:3}] }, // L5
    { size: 6, start: {x:0, y:5, dir:1}, goal: {x:5, y:0}, walls: [{x:1,y:5},{x:1,y:4},{x:1,y:2},{x:1,y:1},{x:3,y:4},{x:3,y:3},{x:3,y:1},{x:3,y:0}] } // L6
];
let g1Curr = 0;
let robotCommands = [];
let robotRunning = false;
let robotPos = {x: 0, y: 0, dir: 1};

function initRobot() {
    document.getElementById('g1-lvl').textContent = `Level ${g1Curr + 1} / 6`;
    robotPos = {...g1Levels[g1Curr].start};
    robotCommands = [];
    renderRobotGrid();
    updateRobotQueue();
}

function renderRobotGrid() {
    const grid = document.getElementById('grid');
    const lvl = g1Levels[g1Curr];
    grid.style.gridTemplateColumns = `repeat(${lvl.size}, 1fr)`;
    grid.innerHTML = '';
    
    const svgRobot = document.getElementById('svg-robot').innerHTML;
    const svgHome = document.getElementById('svg-home').innerHTML;

    for(let y=0; y<lvl.size; y++) {
        for(let x=0; x<lvl.size; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if (lvl.walls.some(w => w.x === x && w.y === y)) cell.classList.add('wall');
            if (lvl.goal.x === x && lvl.goal.y === y) cell.innerHTML = svgHome;
            if (robotPos.x === x && robotPos.y === y) {
                const r = document.createElement('div');
                r.className = 'robot';
                r.innerHTML = svgRobot;
                r.style.transform = `rotate(${robotPos.dir * 90}deg)`;
                cell.appendChild(r);
            }
            grid.appendChild(cell);
        }
    }
}

function addRobotCmd(cmd) { if (!robotRunning) { robotCommands.push(cmd); updateRobotQueue(); } }
function clearRobotCmd() { if (!robotRunning) initRobot(); }
function updateRobotQueue() {
    const q = document.getElementById('robot-queue'); q.innerHTML = '';
    robotCommands.forEach((cmd, idx) => {
        const s = document.createElement('span'); s.className = 'queue-item';
        s.textContent = cmd === 'forward' ? 'Maju' : (cmd === 'left' ? 'Kiri' : 'Kanan');
        s.onclick = () => { if (!robotRunning) { robotCommands.splice(idx, 1); updateRobotQueue(); } };
        q.appendChild(s);
    });
}

document.getElementById('run-robot-btn').addEventListener('click', async () => {
    if (robotRunning || robotCommands.length === 0) return;
    robotRunning = true;
    const lvl = g1Levels[g1Curr];
    robotPos = {...lvl.start};
    renderRobotGrid();
    await delay(500);

    for (let cmd of robotCommands) {
        if (cmd === 'forward') {
            let nx = robotPos.x, ny = robotPos.y;
            if (robotPos.dir === 0) ny--; if (robotPos.dir === 1) nx++;
            if (robotPos.dir === 2) ny++; if (robotPos.dir === 3) nx--;
            
            if (nx < 0 || nx >= lvl.size || ny < 0 || ny >= lvl.size || lvl.walls.some(w => w.x===nx && w.y===ny)) {
                robotRunning = false; return showFail('Robot menabrak tembok!');
            }
            robotPos.x = nx; robotPos.y = ny;
        } else if (cmd === 'left') { robotPos.dir = (robotPos.dir - 1 + 4) % 4;
        } else if (cmd === 'right') { robotPos.dir = (robotPos.dir + 1) % 4; }
        renderRobotGrid(); await delay(500);
    }
    
    if (robotPos.x === lvl.goal.x && robotPos.y === lvl.goal.y) {
        showSuccess(1, g1Curr, `Level ${g1Curr+1} Selesai! Horee!`, () => {
            if (g1Curr < 5) g1Curr++; initRobot();
        });
    } else {
        showFail('Robot belum sampai di rumah.');
    }
    robotRunning = false;
});
initRobot();


// ==========================================
// GAME 2: BURGER (STRUKTUR DATA)
// ==========================================
const g2Levels = [
    { target: ['Roti Bawah', 'Daging', 'Roti Atas'] },
    { target: ['Roti Bawah', 'Sayur', 'Daging', 'Roti Atas'] },
    { target: ['Roti Bawah', 'Daging', 'Keju', 'Roti Atas'] },
    { target: ['Roti Bawah', 'Sayur', 'Daging', 'Keju', 'Roti Atas'] },
    { target: ['Roti Bawah', 'Daging', 'Keju', 'Daging', 'Roti Atas'] },
    { target: ['Roti Bawah', 'Sayur', 'Daging', 'Keju', 'Daging', 'Sayur', 'Roti Atas'] }
];
let g2Curr = 0;
let burgerCurrent = [];

const classMap = {
    'Roti Bawah': 'bun-bottom',
    'Daging': 'meat',
    'Keju': 'cheese',
    'Sayur': 'lettuce',
    'Roti Atas': 'bun-top'
};

function initBurger() {
    document.getElementById('g2-lvl').textContent = `Level ${g2Curr + 1} / 6`;
    const tgt = document.getElementById('burger-target-vis');
    tgt.innerHTML = '';
    g2Levels[g2Curr].target.forEach(name => {
        const d = document.createElement('div');
        d.className = `css-ing ${classMap[name]}`;
        d.style.animation = 'none';
        tgt.appendChild(d);
    });
    burgerCurrent = [];
    renderBurger();
}

function addBurger(name, cssClass) { burgerCurrent.push({name, cssClass}); renderBurger(); }
function clearBurger() { burgerCurrent = []; renderBurger(); }
function renderBurger() {
    const plate = document.getElementById('burger-plate');
    const queue = document.getElementById('burger-queue');
    plate.innerHTML = ''; queue.innerHTML = '';
    
    burgerCurrent.forEach((b, idx) => {
        const l = document.createElement('div');
        l.className = `css-ing ${b.cssClass}`;
        plate.appendChild(l);
        
        const q = document.createElement('span'); q.className = 'queue-item'; 
        q.innerHTML = `<div class="css-ing ${b.cssClass}-mini"></div> ${b.name}`;
        q.onclick = () => { burgerCurrent.splice(idx, 1); renderBurger(); };
        queue.appendChild(q);
    });
}

function checkBurger() {
    const target = g2Levels[g2Curr].target;
    if (burgerCurrent.length !== target.length) return showFail('Jumlah bahan tidak sesuai dengan pesanan.');
    for (let i = 0; i < target.length; i++) {
        if (burgerCurrent[i].name !== target[i]) {
            return showFail(`Urutan salah! Harusnya ${target[i]} tapi kamu menaruh ${burgerCurrent[i].name}.`);
        }
    }
    showSuccess(2, g2Curr, `Burger Level ${g2Curr+1} sempurna! Pelanggan sangat senang.`, () => {
        if (g2Curr < 5) g2Curr++; initBurger();
    });
}
initBurger();


// ==========================================
// GAME 3: DOKTER HEWAN (IF/ELSE)
// ==========================================
const g3Levels = [
    { pet: 'Kotor', animal: 'dog', solution: 'mandikan', condClass: 'cond-dirty' },
    { pet: 'Lapar', animal: 'dog', solution: 'makan', condClass: 'cond-hungry' },
    { pet: 'Sakit', animal: 'dog', solution: 'obat', condClass: 'cond-sick' },
    { pet: 'Kotor', animal: 'cat', solution: 'mandikan', condClass: 'cond-dirty' },
    { pet: 'Sakit', animal: 'cat', solution: 'obat', condClass: 'cond-sick' },
    { pet: 'Lapar', animal: 'cat', solution: 'makan', condClass: 'cond-hungry' }
];
let g3Curr = 0;

function initDoctor() {
    document.getElementById('g3-lvl').textContent = `Level ${g3Curr + 1} / 6`;
    const cur = g3Levels[g3Curr];
    document.getElementById('pet-condition-text').textContent = cur.pet;
    document.getElementById('pet-var').textContent = `"${cur.pet}"`;
    document.getElementById('doctor-action').value = '';

    const disp = document.getElementById('pet-display');
    const svgStr = document.getElementById(`svg-${cur.animal}`).innerHTML;
    disp.innerHTML = `${svgStr}<div class="cond-overlay ${cur.condClass}"></div>`;
}

function checkDoctor() {
    const action = document.getElementById('doctor-action').value;
    if (!action) return showFail('Pilih tindakan terlebih dahulu!');
    
    const cur = g3Levels[g3Curr];
    if (action === cur.solution) {
        document.querySelector('.cond-overlay').className = 'cond-overlay cond-happy';
        setTimeout(() => {
            showSuccess(3, g3Curr, `Benar sekali! Hewan yang ${cur.pet} memang harus di-${action}.`, () => {
                if (g3Curr < 5) g3Curr++; initDoctor();
            });
        }, 800);
    } else {
        showFail(`Tindakan kurang tepat untuk hewan yang ${cur.pet}.`);
    }
}
initDoctor();


// ==========================================
// GAME 4: PABRIK (LOOPING)
// ==========================================
const g4Levels = [3, 4, 5, 6, 8, 10];
let g4Curr = 0;

function initFactory() {
    document.getElementById('g4-lvl').textContent = `Level ${g4Curr + 1} / 6`;
    document.getElementById('factory-mission').textContent = `Misi: Isi tepat ${g4Levels[g4Curr]} kotak!`;
    const container = document.getElementById('factory-boxes');
    container.innerHTML = '';
    for(let i=0; i<g4Levels[g4Curr]; i++) {
        const bx = document.createElement('div');
        bx.className = 'box empty';
        container.appendChild(bx);
    }
    document.getElementById('loop-count').value = 1;
}

async function checkFactory() {
    const loopCount = parseInt(document.getElementById('loop-count').value);
    const target = g4Levels[g4Curr];
    const boxes = document.querySelectorAll('#factory-boxes .box:not(.error)');
    
    boxes.forEach(b => { b.className = 'box empty'; });
    
    for (let i = 0; i < loopCount; i++) {
        await delay(200);
        if (i < target) {
            boxes[i].className = 'box filled';
        } else {
            const extra = document.createElement('div');
            extra.className = 'box error'; extra.textContent = '💥';
            document.getElementById('factory-boxes').appendChild(extra);
            return showFail(`Oops! Kepenuhan. Kamu meloop ${loopCount} kali, padahal kotaknya cuma ${target}.`);
        }
    }
    
    await delay(400);
    if (loopCount === target) {
        showSuccess(4, g4Curr, `Sempurna! Semua ${target} kotak berhasil diisi menggunakan Loop.`, () => {
            if (g4Curr < 5) g4Curr++; initFactory();
        });
    } else {
        showFail(`Kotak belum penuh semua! Targetnya adalah mengisi ${target} kotak.`);
    }
}
function clearFactory() { initFactory(); }
initFactory();


// ==========================================
// GAME 5: MEWARNAI (VARIABLES)
// ==========================================
const g5Levels = [
    { roof: '#ff4757', wall: '#ccc', door: '#ccc', text: "Misi: Atap Merah!" },
    { roof: '#ccc', wall: '#1e90ff', door: '#eccc68', text: "Misi: Tembok Biru, Pintu Kuning!" },
    { roof: '#1e90ff', wall: '#ff4757', door: '#eccc68', text: "Misi: Atap Biru, Tembok Merah, Pintu Kuning!" },
    { roof: '#eccc68', wall: '#eccc68', door: '#ff4757', text: "Misi: Atap Kuning, Tembok Kuning, Pintu Merah!" },
    { roof: '#1e90ff', wall: '#1e90ff', door: '#ff4757', text: "Misi: Atap Biru, Tembok Biru, Pintu Merah!" },
    { roof: '#ff4757', wall: '#eccc68', door: '#1e90ff', text: "Misi: Atap Merah, Tembok Kuning, Pintu Biru!" }
];
let g5Curr = 0;

function initColoring() {
    document.getElementById('g5-lvl').textContent = `Level ${g5Curr + 1} / 6`;
    document.querySelector('#game-5 .mission-text').textContent = g5Levels[g5Curr].text;
    document.getElementById('h-roof').style.borderBottomColor = '#ccc';
    document.getElementById('h-wall').style.backgroundColor = '#ccc';
    document.getElementById('h-door').style.backgroundColor = '#ccc';
    document.getElementById('var-roof').value = '#ccc';
    document.getElementById('var-wall').value = '#ccc';
    document.getElementById('var-door').value = '#ccc';
}

function checkColoring() {
    const roofColor = document.getElementById('var-roof').value;
    const wallColor = document.getElementById('var-wall').value;
    const doorColor = document.getElementById('var-door').value;
    
    document.getElementById('h-roof').style.borderBottomColor = roofColor;
    document.getElementById('h-wall').style.backgroundColor = wallColor;
    document.getElementById('h-door').style.backgroundColor = doorColor;
    
    const target = g5Levels[g5Curr];
    if (roofColor === target.roof && wallColor === target.wall && doorColor === target.door) {
        setTimeout(() => {
            showSuccess(5, g5Curr, `Luar biasa! Rumah diwarnai sesuai Misi Level ${g5Curr+1}.`, () => {
                if (g5Curr < 5) g5Curr++; initColoring();
            });
        }, 500);
    } else {
        setTimeout(() => showFail('Warnanya belum sesuai dengan Misi. Cek lagi nilai variabelnya!'), 500);
    }
}
initColoring();
