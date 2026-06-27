// --- SUPABASE INIT ---
const SUPABASE_URL = 'https://pabzyjwbeqzxajksbvzf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NecoOmdj4Z4XZD0wxPx3Xw_0kDfmOR1';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GLOBAL STATE & LEADERBOARD ---
let stars = 0;
let completedLevelsSet = new Set();
const starCountEl = document.getElementById('star-count');
const profileText = document.getElementById('player-profile-text');

let currentPlayer = { id: '', name: '', school: '' };
let leaderboardData = [];

async function initSystem() {
    // Subscribe to Auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            await handleUserLogin(session.user);
        } else if (event === 'SIGNED_OUT') {
            document.getElementById('welcome-overlay').classList.remove('hidden');
            document.getElementById('school-overlay').classList.add('hidden');
            currentPlayer = { id: '', name: '', school: '' };
            stars = 0;
            completedLevelsSet.clear();
            starCountEl.textContent = stars;
            profileText.textContent = 'Halo, Pemain!';
        }
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        document.getElementById('welcome-overlay').classList.remove('hidden');
    }
    
    // Subscribe to leaderboard real-time changes
    fetchLeaderboard();
    supabase.channel('public:leaderboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, payload => {
            fetchLeaderboard();
        })
        .subscribe();
}

async function handleUserLogin(user) {
    document.getElementById('welcome-overlay').classList.add('hidden');
    currentPlayer.id = user.id;
    currentPlayer.name = user.user_metadata.full_name || 'Koder';
    
    // Cek database
    const { data, error } = await supabase.from('leaderboard').select('*').eq('id', user.id).maybeSingle();
    
    if (data) {
        currentPlayer.school = data.school;
        stars = data.stars;
        loadLocalLevels(user.id);
        profileText.textContent = `Halo, ${currentPlayer.name} (${currentPlayer.school})!`;
        starCountEl.textContent = stars;
    } else {
        // User baru, minta sekolah
        document.getElementById('school-overlay').classList.remove('hidden');
    }
}

// Tombol Login
document.getElementById('btn-login-google').addEventListener('click', async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
});

// Tombol Simpan Sekolah (User Baru)
document.getElementById('btn-save-school').addEventListener('click', async () => {
    const sekolah = document.getElementById('input-sekolah').value.trim();
    if (!sekolah) return alert("Tolong isi Asal Sekolah ya!");
    
    currentPlayer.school = sekolah;
    stars = 0;
    
    // Insert ke Supabase
    await supabase.from('leaderboard').upsert({
        id: currentPlayer.id,
        name: currentPlayer.name,
        school: currentPlayer.school,
        stars: stars
    });
    
    document.getElementById('school-overlay').classList.add('hidden');
    profileText.textContent = `Halo, ${currentPlayer.name} (${currentPlayer.school})!`;
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    if(confirm("Yakin ingin keluar?")) {
        await supabase.auth.signOut();
    }
});

// Local Progress untuk State Level
function loadLocalLevels(userId) {
    const savedLevels = localStorage.getItem(`kodekidz_levels_${userId}`);
    if (savedLevels) {
        try { completedLevelsSet = new Set(JSON.parse(savedLevels)); } catch(e) {}
    } else {
        completedLevelsSet.clear();
    }
}

async function saveProgress() {
    if (currentPlayer.id) {
        // Simpan local state
        localStorage.setItem(`kodekidz_levels_${currentPlayer.id}`, JSON.stringify(Array.from(completedLevelsSet)));
        // Update ke Supabase
        await supabase.from('leaderboard').update({ stars: stars }).eq('id', currentPlayer.id);
    }
}

async function fetchLeaderboard() {
    const { data, error } = await supabase.from('leaderboard').select('*').order('stars', { ascending: false });
    if (data) {
        leaderboardData = data;
        if(document.getElementById('leaderboard-modal').classList.contains('active')) {
            renderLeaderboard();
        }
    }
}

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
    
    const sorted = leaderboardData;
    if (!sorted || sorted.length === 0) return;
    
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

function showSuccess(gameId, levelIndex, msg, nextLevelCallback, starReward = 1) {
    const levelKey = `g${gameId}-l${levelIndex}`;
    if (!completedLevelsSet.has(levelKey)) {
        completedLevelsSet.add(levelKey);
        stars = Math.min(100, stars + starReward);
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


// ==========================================
// GAME 6: PETA (ALGORITMA)
// ==========================================
const g6Levels = [
    { targetX: 2, targetY: 0, blocks: [{x:1,y:0}], star: 3 },
    { targetX: 3, targetY: 2, blocks: [{x:1,y:1}, {x:2,y:1}], star: 3 },
    { targetX: 0, targetY: 3, blocks: [{x:0,y:2}, {x:1,y:2}], star: 3 },
    { targetX: 3, targetY: 3, blocks: [{x:1,y:0}, {x:1,y:2}, {x:2,y:2}, {x:3,y:2}], star: 3 }
];
let g6Curr = 0;
let mapCommands = [];
let mapRunning = false;

function initMap() {
    document.getElementById('g6-lvl').textContent = `Level ${g6Curr + 1} / 4`;
    mapCommands = [];
    renderMapQueue();
    renderMapGrid();
}

function renderMapGrid(currentX = 0, currentY = 0) {
    const grid = document.getElementById('pirate-map');
    grid.innerHTML = '';
    const lvl = g6Levels[g6Curr];
    for(let y=0; y<4; y++) {
        for(let x=0; x<4; x++) {
            const cell = document.createElement('div');
            cell.className = 'map-cell';
            if (lvl.blocks.some(b => b.x === x && b.y === y)) {
                cell.classList.add('water');
                cell.textContent = '🌊';
            } else if (lvl.targetX === x && lvl.targetY === y) {
                cell.classList.add('treasure');
                cell.textContent = '💎';
            }
            if (x === currentX && y === currentY) {
                cell.textContent = '🏴‍☠️';
            }
            grid.appendChild(cell);
        }
    }
}

function addMapCmd(cmd) { if(!mapRunning) { mapCommands.push(cmd); renderMapQueue(); } }
function clearMap() { if(!mapRunning) initMap(); }
function renderMapQueue() {
    const q = document.getElementById('map-queue'); q.innerHTML = '';
    mapCommands.forEach((cmd, idx) => {
        const s = document.createElement('span'); s.className = 'queue-item';
        s.textContent = cmd;
        s.onclick = () => { if(!mapRunning) { mapCommands.splice(idx,1); renderMapQueue(); } };
        q.appendChild(s);
    });
}

async function checkMap() {
    if(mapRunning || mapCommands.length === 0) return;
    mapRunning = true;
    let cx = 0, cy = 0;
    const lvl = g6Levels[g6Curr];
    
    renderMapGrid(cx, cy);
    await delay(500);
    
    for(let cmd of mapCommands) {
        if(cmd === 'Atas') cy--;
        if(cmd === 'Bawah') cy++;
        if(cmd === 'Kiri') cx--;
        if(cmd === 'Kanan') cx++;
        
        if(cx < 0 || cx > 3 || cy < 0 || cy > 3 || lvl.blocks.some(b => b.x===cx && b.y===cy)) {
            mapRunning = false; return showFail('Bajak laut menabrak rintangan atau keluar peta!');
        }
        renderMapGrid(cx, cy);
        await delay(500);
    }
    
    if(cx === lvl.targetX && cy === lvl.targetY) {
        showSuccess(6, g6Curr, `Harta Karun Ditemukan! (+${lvl.star} Bintang)`, () => {
            if(g6Curr < 3) g6Curr++; initMap();
        }, lvl.star);
    } else {
        showFail('Bajak laut belum sampai di lokasi harta karun.');
    }
    mapRunning = false;
}
initMap();

// ==========================================
// GAME 7: RESEP KUE (FUNGSI)
// ==========================================
const g7Levels = [
    { target: 2, star: 3 },
    { target: 4, star: 3 },
    { target: 5, star: 3 },
    { target: 7, star: 3 }
];
let g7Curr = 0;
let bakeCalls = 0;
let bakingRunning = false;

function initBake() {
    document.getElementById('g7-lvl').textContent = `Level ${g7Curr + 1} / 4`;
    document.getElementById('g7-desc').textContent = `Pesanan: ${g7Levels[g7Curr].target} Kue. Panggil fungsi buatKue()!`;
    bakeCalls = 0;
    renderBakeCalls();
    document.getElementById('cakes-produced').innerHTML = '';
}

function addFunctionCall() {
    if(bakingRunning) return;
    bakeCalls++;
    renderBakeCalls();
}

function renderBakeCalls() {
    const fc = document.getElementById('function-calls');
    fc.innerHTML = '';
    for(let i=0; i<bakeCalls; i++) {
        const div = document.createElement('div');
        div.className = 'code-line';
        div.innerHTML = `<span style="color:#fbc531; cursor:pointer;" onclick="if(!bakingRunning){bakeCalls--;renderBakeCalls();}">buatKue(); ❌</span>`;
        fc.appendChild(div);
    }
}

function clearBake() { if(!bakingRunning) initBake(); }

async function checkBake() {
    if(bakingRunning) return;
    bakingRunning = true;
    const tgt = g7Levels[g7Curr].target;
    const container = document.getElementById('cakes-produced');
    container.innerHTML = '';
    const oven = document.getElementById('oven');
    
    for(let i=0; i<bakeCalls; i++) {
        oven.classList.add('baking');
        oven.textContent = 'Memanggang...';
        await delay(600);
        oven.classList.remove('baking');
        oven.textContent = 'Oven';
        const cake = document.createElement('div');
        cake.className = 'cake-item';
        cake.textContent = '🎂';
        container.appendChild(cake);
        await delay(200);
    }
    
    if(bakeCalls === tgt) {
        showSuccess(7, g7Curr, `Kerja bagus! Pesanan ${tgt} kue selesai. (+${g7Levels[g7Curr].star} Bintang)`, () => {
            if(g7Curr < 3) g7Curr++; initBake();
        }, g7Levels[g7Curr].star);
    } else {
        showFail(`Pesanan adalah ${tgt} kue, tapi kamu membuat ${bakeCalls} kue.`);
    }
    bakingRunning = false;
}
initBake();

// ==========================================
// GAME 8: DETEKTIF (DEBUGGING)
// ==========================================
const g8Levels = [
    {
        code: [
            { text: 'robot.maju();', bug: false },
            { text: 'robot.mundur(); // SEHARUSNYA MAJU', bug: true, fix: 'robot.maju();' },
            { text: 'robot.belokKanan();', bug: false }
        ], star: 3
    },
    {
        code: [
            { text: 'if (adaTembok) {', bug: false },
            { text: '  robot.maju(); // NABRAK TEMBOK!', bug: true, fix: '  robot.belok();' },
            { text: '}', bug: false }
        ], star: 3
    },
    {
        code: [
            { text: 'for(let i=0; i<3; i++) {', bug: false },
            { text: '  robot.diam(); // HARUSNYA JALAN', bug: true, fix: '  robot.maju();' },
            { text: '}', bug: false }
        ], star: 3
    },
    {
        code: [
            { text: 'let kecepatan = 0;', bug: false },
            { text: 'robot.lari(kecepatan); // KOK 0?', bug: true, fix: 'let kecepatan = 10;' },
            { text: 'robot.lompat();', bug: false }
        ], star: 3
    },
    {
        code: [
            { text: 'while (belumSampai) {', bug: false },
            { text: '  robot.tidur(); // JANGAN TIDUR', bug: true, fix: '  robot.maju();' },
            { text: '}', bug: false }
        ], star: 3
    }
];
let g8Curr = 0;

function initDebug() {
    document.getElementById('g8-lvl').textContent = `Level ${g8Curr + 1} / 5`;
    const container = document.getElementById('debug-code-lines');
    container.innerHTML = '';
    const lvl = g8Levels[g8Curr];
    
    lvl.code.forEach((line, idx) => {
        const div = document.createElement('div');
        div.className = 'bug-line code-line';
        div.textContent = line.text;
        div.dataset.idx = idx;
        div.onclick = () => {
            document.querySelectorAll('.bug-line').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
        };
        container.appendChild(div);
    });
}

function checkDebug() {
    const selected = document.querySelector('.bug-line.selected');
    if(!selected) return showFail('Pilih salah satu baris kode yang menurutmu SALAH (mengandung bug).');
    
    const idx = parseInt(selected.dataset.idx);
    const lvl = g8Levels[g8Curr];
    if(lvl.code[idx].bug) {
        selected.textContent = lvl.code[idx].fix;
        selected.style.color = '#2ed573';
        document.getElementById('buggy-animation').textContent = '🤖⚡';
        setTimeout(() => {
            showSuccess(8, g8Curr, `Bug diperbaiki! Robot berhasil jalan. (+${lvl.star} Bintang)`, () => {
                document.getElementById('buggy-animation').textContent = '🤖';
                if(g8Curr < 4) g8Curr++; initDebug();
            }, lvl.star);
        }, 1000);
    } else {
        showFail('Baris itu sudah benar, bukan di situ bug-nya!');
    }
}
initDebug();

// ==========================================
// GAME 9: LACI (ARRAY)
// ==========================================
const g9Levels = [
    { items: ['🍎', '🍌', '🍉', '🍇'], target: '🍎', targetIdx: 0, star: 3 },
    { items: ['🍎', '🍌', '🍉', '🍇'], target: '🍉', targetIdx: 2, star: 3 },
    { items: ['🚗', '🚌', '🚓', '🚑', '🚒'], target: '🚑', targetIdx: 3, star: 3 },
    { items: ['⚽', '🏀', '🏈', '⚾', '🎾'], target: '🎾', targetIdx: 4, star: 3 },
    { items: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊'], target: '🐭', targetIdx: 2, star: 3 }
];
let g9Curr = 0;

function initArray() {
    document.getElementById('g9-lvl').textContent = `Level ${g9Curr + 1} / 5`;
    const lvl = g9Levels[g9Curr];
    document.getElementById('array-mission').textContent = `Misi: Ambil ${lvl.target}!`;
    document.getElementById('array-index').value = 0;
    
    // Update code line display to show current array
    const logicBlock = document.querySelector('#game-9 .logic-block .code-line');
    logicBlock.innerHTML = `<span class="keyword">let</span> laci = [${lvl.items.join(', ')}];`;
    
    const container = document.getElementById('array-slots');
    container.innerHTML = '';
    lvl.items.forEach((item, idx) => {
        const slot = document.createElement('div');
        slot.className = 'array-slot';
        slot.textContent = item;
        const label = document.createElement('div');
        label.className = 'array-index-label';
        label.textContent = idx;
        slot.appendChild(label);
        container.appendChild(slot);
    });
}

function checkArray() {
    const idx = parseInt(document.getElementById('array-index').value);
    const lvl = g9Levels[g9Curr];
    if(idx === lvl.targetIdx) {
        showSuccess(9, g9Curr, `Benar! Indeks ke-${idx} adalah ${lvl.target}. (+${lvl.star} Bintang)`, () => {
            if(g9Curr < 4) g9Curr++; initArray();
        }, lvl.star);
    } else {
        const wrongItem = lvl.items[idx] || 'Kosong';
        showFail(`Salah! Indeks ke-${idx} itu isinya ${wrongItem}, bukan ${lvl.target}. Ingat, Array dimulai dari 0!`);
    }
}
initArray();

// ==========================================
// GAME 10: BEL (EVENT)
// ==========================================
const g10Levels = [
    { type: 'click', action: 'masuk', text: 'Misi: Jika bel diklik, murid harus masuk kelas.', star: 4 },
    { type: 'hover', action: 'tidur', text: 'Misi: Jika kursor diarahkan (hover) ke bel, murid malah tidur.', star: 4 },
    { type: 'click', action: 'pulang', text: 'Misi: Jika bel diklik, murid pulang sekolah.', star: 4 },
    { type: 'drag', action: 'masuk', text: 'Misi: Jika bel ditarik (drag), murid masuk kelas.', star: 4 }
];
let g10Curr = 0;

function initEventGame() {
    document.getElementById('g10-lvl').textContent = `Level ${g10Curr + 1} / 4`;
    document.getElementById('g10-desc').textContent = g10Levels[g10Curr].text;
    document.getElementById('event-type').value = '';
    document.getElementById('event-action').value = '';
    document.getElementById('student').textContent = '👨‍🎓';
}

function triggerBell() {
    // Only used for visual click effect, real validation is in simulateEventGame
    const bell = document.getElementById('school-bell');
    bell.classList.add('ringing');
    setTimeout(() => bell.classList.remove('ringing'), 200);
}

function simulateEventGame() {
    const selType = document.getElementById('event-type').value;
    const selAction = document.getElementById('event-action').value;
    
    if(!selType || !selAction) return showFail('Pilih Event dan Aksi terlebih dahulu!');
    
    const lvl = g10Levels[g10Curr];
    const stu = document.getElementById('student');
    
    if(selType === lvl.type && selAction === lvl.action) {
        if(selAction === 'masuk') stu.textContent = '🏃‍♂️ (Masuk Kelas)';
        if(selAction === 'tidur') stu.textContent = '😴 (Tidur)';
        if(selAction === 'pulang') stu.textContent = '🚶‍♂️ (Pulang)';
        
        if(selType === 'click') triggerBell();
        
        setTimeout(() => {
            showSuccess(10, g10Curr, `Event berhasil dipicu! (+${lvl.star} Bintang)`, () => {
                if(g10Curr < 3) g10Curr++; initEventGame();
            }, lvl.star);
        }, 1000);
    } else {
        showFail('Event atau Aksi tidak sesuai dengan Misi.');
    }
}
initEventGame();

