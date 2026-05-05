// ============ 数据存储 ============
const STORE_KEY = 'estp_training_v1';

const defaultState = {
  totalScore: 0,
  totalFocusMin: 0,
  maxNback: 1,
  bestStroopMs: null,
  bestGonogoAcc: null,
  streak: 0,
  lastActiveDate: null,
  history: {},          // { 'YYYY-MM-DD': { score, focusMin, modules: {focus, nback, stroop, gonogo, breath} } }
  todayDone: { focus: false, nback: false, stroop: false, gonogo: false, breath: false },
  todayDate: null
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  } catch {
    return structuredClone(defaultState);
  }
}
function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function ensureToday() {
  const today = todayStr();
  if (state.todayDate !== today) {
    state.todayDate = today;
    state.todayDone = { focus: false, nback: false, stroop: false, gonogo: false, breath: false };
  }
  if (!state.history[today]) {
    state.history[today] = { score: 0, focusMin: 0, modules: {} };
  }
}

function awardPoints(module, points) {
  ensureToday();
  state.totalScore += points;
  state.history[state.todayDate].score += points;
  state.history[state.todayDate].modules[module] =
    (state.history[state.todayDate].modules[module] || 0) + points;
  if (!state.todayDone[module]) {
    state.todayDone[module] = true;
    updateStreak();
  }
  saveState();
  renderDashboard();
}

function updateStreak() {
  const today = todayStr();
  if (state.lastActiveDate === today) return;
  const yesterday = new Date(Date.now() - 86400000);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
  if (state.lastActiveDate === yStr) {
    state.streak += 1;
  } else {
    state.streak = 1;
  }
  state.lastActiveDate = today;
}

function levelFromScore(score) {
  // 升级曲线: Lv.n 需要 n*100 + (n-1)*50 累计分数
  let lv = 1, need = 100;
  while (score >= need) { lv++; need += 100 + (lv-1)*50; }
  return lv;
}

// ============ Tab 切换 ============
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ============ 仪表盘 ============
const TIPS = [
  '冲动来的时候,先做一次 4-7-8 呼吸,再决定要不要做。',
  '把"现在想做的事"写下来。延迟 10 分钟,90% 的冲动会自己消失。',
  '前额叶就像肌肉,练 21 天会有反馈,90 天才看得到结构性改变。',
  '别一次设 60 分钟番茄。从 5 分钟开始,赢的感觉比时长重要。',
  'ESTP 不是注意力差,是被动的注意力差。把任务变成游戏,你能专注 8 小时。',
  '睡眠少于 6 小时,前额叶活性掉一半。先睡好,再谈自控。',
  '运动后 2 小时是前额叶最活跃的时段。把重要任务排在那时候。',
  '每天进步 1%,一年提升 37 倍。今天只做一组,也比放弃强。',
  '吃糖 → 血糖飙升 → 前额叶罢工。少糖,多蛋白质。',
  '冥想 10 分钟,等于给前额叶做一次力量训练。',
  '把手机调成灰度模式,多巴胺刺激降一半,自控力立刻回血。',
  '记录"今天克制了什么冲动"。可见的胜利让大脑愿意重复。'
];

function renderDashboard() {
  ensureToday();
  document.getElementById('level').textContent = 'Lv.' + levelFromScore(state.totalScore);
  document.getElementById('streak').textContent = state.streak + '🔥';
  document.getElementById('totalScore').textContent = state.totalScore;
  document.getElementById('totalFocusMin').textContent = state.totalFocusMin;
  document.getElementById('maxNback').textContent = state.maxNback;
  document.getElementById('bestStroop').textContent = state.bestStroopMs ?? '--';
  document.getElementById('bestGonogo').textContent = state.bestGonogoAcc ?? '--';

  const checks = ['focus','nback','stroop','gonogo','breath'];
  let done = 0;
  checks.forEach(k => {
    const el = document.getElementById('chk' + k.charAt(0).toUpperCase()+k.slice(1));
    if (state.todayDone[k]) { el.textContent = '✅'; done++; }
    else el.textContent = '⬜';
  });
  document.getElementById('dailyProgress').style.width = (done/checks.length*100) + '%';

  // Heatmap 14 天
  const heatmap = document.getElementById('heatmap');
  heatmap.innerHTML = '';
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i*86400000);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const score = state.history[ds]?.score || 0;
    let lvl = 0;
    if (score > 0) lvl = 1;
    if (score >= 20) lvl = 2;
    if (score >= 50) lvl = 3;
    if (score >= 100) lvl = 4;
    if (score >= 200) lvl = 5;
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.dataset.level = lvl;
    cell.dataset.tooltip = `${ds}: ${score} 分`;
    heatmap.appendChild(cell);
  }
}

// 每日提示
function pickTip() {
  const idx = Math.floor(Math.random() * TIPS.length);
  document.getElementById('dailyTip').textContent = TIPS[idx];
}
document.getElementById('newTipBtn').addEventListener('click', pickTip);
pickTip();

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `estp-training-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('确定重置全部进度?此操作不可撤销。')) {
    state = structuredClone(defaultState);
    saveState();
    renderDashboard();
  }
});

// ============ 番茄钟 ============
let focusTimer = null;
let focusEndAt = 0;
let focusDuration = 5*60*1000;
let focusRunning = false;

function fmt(ms) {
  const total = Math.max(0, Math.ceil(ms/1000));
  const m = String(Math.floor(total/60)).padStart(2,'0');
  const s = String(total%60).padStart(2,'0');
  return `${m}:${s}`;
}

document.querySelectorAll('#focus [data-min]').forEach(b => {
  b.addEventListener('click', () => {
    if (focusRunning) return;
    focusDuration = parseInt(b.dataset.min) * 60 * 1000;
    document.getElementById('focusDisplay').textContent = fmt(focusDuration);
  });
});

document.getElementById('focusStart').addEventListener('click', () => {
  if (focusRunning) return;
  focusRunning = true;
  focusEndAt = Date.now() + focusDuration;
  document.getElementById('focusStatus').textContent = '⏱️ 专注中... 别切走。';
  focusTimer = setInterval(() => {
    const left = focusEndAt - Date.now();
    document.getElementById('focusDisplay').textContent = fmt(left);
    if (left <= 0) {
      clearInterval(focusTimer);
      focusRunning = false;
      const min = focusDuration/60000;
      state.totalFocusMin += min;
      const points = Math.round(min * 2);
      ensureToday();
      state.history[state.todayDate].focusMin = (state.history[state.todayDate].focusMin || 0) + min;
      awardPoints('focus', points);
      document.getElementById('focusStatus').textContent = `🎉 完成 ${min} 分钟专注!+${points} 分`;
      try { new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=').play(); } catch {}
    }
  }, 250);
});

document.getElementById('focusReset').addEventListener('click', () => {
  if (focusRunning) {
    clearInterval(focusTimer);
    focusRunning = false;
    document.getElementById('focusStatus').textContent = '❌ 已取消(不计入今日)';
  }
  document.getElementById('focusDisplay').textContent = fmt(focusDuration);
});

// 离开页面警告(只在专注时)
window.addEventListener('beforeunload', e => {
  if (focusRunning) { e.preventDefault(); e.returnValue = ''; }
});

// ============ N-Back ============
const nbackGrid = document.getElementById('nbackGrid');
for (let i = 0; i < 9; i++) {
  const c = document.createElement('div');
  c.className = 'cell';
  nbackGrid.appendChild(c);
}
let nbackSeq = [];
let nbackIdx = 0;
let nbackN = 2;
let nbackRounds = 20;
let nbackInterval = null;
let nbackRespondedThisRound = false;
let nbackHits = 0, nbackMisses = 0, nbackFalse = 0, nbackCorrectReject = 0;
let nbackRunning = false;

document.getElementById('nbackLevel').addEventListener('change', e => {
  document.getElementById('nbackN').textContent = e.target.value;
});

document.getElementById('nbackStart').addEventListener('click', () => {
  if (nbackRunning) return;
  nbackRunning = true;
  nbackN = parseInt(document.getElementById('nbackLevel').value);
  nbackRounds = parseInt(document.getElementById('nbackRounds').value);
  nbackSeq = [];
  nbackIdx = 0;
  nbackHits = nbackMisses = nbackFalse = nbackCorrectReject = 0;
  document.getElementById('nbackStatus').textContent = `🧠 进行中 0/${nbackRounds}`;
  document.getElementById('nbackMatch').disabled = false;
  document.getElementById('nbackStart').disabled = true;

  nbackInterval = setInterval(() => {
    // 评估上一轮
    if (nbackIdx > nbackN && !nbackRespondedThisRound) {
      const isMatch = nbackSeq[nbackIdx-1] === nbackSeq[nbackIdx-1-nbackN];
      if (isMatch) nbackMisses++;
      else nbackCorrectReject++;
    }
    nbackRespondedThisRound = false;

    document.querySelectorAll('#nbackGrid .cell').forEach(c => c.classList.remove('active'));

    if (nbackIdx >= nbackRounds) {
      finishNback();
      return;
    }

    // 30% 概率出 match
    let pos;
    if (nbackIdx >= nbackN && Math.random() < 0.3) {
      pos = nbackSeq[nbackIdx - nbackN];
    } else {
      pos = Math.floor(Math.random() * 9);
    }
    nbackSeq.push(pos);
    document.querySelectorAll('#nbackGrid .cell')[pos].classList.add('active');
    nbackIdx++;
    document.getElementById('nbackStatus').textContent = `🧠 进行中 ${nbackIdx}/${nbackRounds}`;
  }, 2000);
});

document.getElementById('nbackMatch').addEventListener('click', nbackRespond);
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && nbackRunning) {
    e.preventDefault();
    nbackRespond();
  }
});

function nbackRespond() {
  if (!nbackRunning || nbackRespondedThisRound) return;
  if (nbackIdx <= nbackN) return; // 头 N 步无法判断
  nbackRespondedThisRound = true;
  const isMatch = nbackSeq[nbackIdx-1] === nbackSeq[nbackIdx-1-nbackN];
  if (isMatch) nbackHits++;
  else nbackFalse++;
}

function finishNback() {
  clearInterval(nbackInterval);
  nbackRunning = false;
  document.getElementById('nbackMatch').disabled = true;
  document.getElementById('nbackStart').disabled = false;
  document.querySelectorAll('#nbackGrid .cell').forEach(c => c.classList.remove('active'));
  const total = nbackHits + nbackMisses + nbackFalse + nbackCorrectReject;
  const acc = total > 0 ? Math.round((nbackHits + nbackCorrectReject) / total * 100) : 0;
  const points = Math.round(acc / 5) + (nbackN - 1) * 5;
  document.getElementById('nbackStatus').textContent =
    `✅ 命中 ${nbackHits} | 漏报 ${nbackMisses} | 误报 ${nbackFalse} | 正确率 ${acc}%  +${points} 分`;
  if (acc >= 70 && nbackN > state.maxNback) {
    state.maxNback = nbackN;
  }
  awardPoints('nback', points);
}

// ============ Stroop ============
const STROOP_COLORS = [
  { name: '红', value: '#ef4444' },
  { name: '绿', value: '#22c55e' },
  { name: '蓝', value: '#3b82f6' },
  { name: '黄', value: '#eab308' }
];
let stroopRound = 0;
let stroopTotal = 20;
let stroopStartTime = 0;
let stroopRTs = [];
let stroopCorrect = 0;
let stroopCurrent = null;
let stroopRunning = false;

function renderStroopButtons() {
  const div = document.getElementById('stroopButtons');
  div.innerHTML = '';
  STROOP_COLORS.forEach(c => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = c.name;
    b.style.color = c.value;
    b.style.borderColor = c.value;
    b.addEventListener('click', () => stroopAnswer(c.name));
    div.appendChild(b);
  });
}
renderStroopButtons();

document.getElementById('stroopStart').addEventListener('click', () => {
  if (stroopRunning) return;
  stroopRunning = true;
  stroopRound = 0;
  stroopRTs = [];
  stroopCorrect = 0;
  document.getElementById('stroopStart').disabled = true;
  nextStroop();
});

function nextStroop() {
  if (stroopRound >= stroopTotal) {
    finishStroop();
    return;
  }
  stroopRound++;
  const word = STROOP_COLORS[Math.floor(Math.random()*4)];
  let color;
  // 70% 不一致
  if (Math.random() < 0.7) {
    do { color = STROOP_COLORS[Math.floor(Math.random()*4)]; }
    while (color.name === word.name);
  } else {
    color = word;
  }
  stroopCurrent = { word, color };
  const el = document.getElementById('stroopWord');
  el.textContent = word.name;
  el.style.color = color.value;
  document.getElementById('stroopStatus').textContent = `第 ${stroopRound}/${stroopTotal} 题`;
  stroopStartTime = performance.now();
}

function stroopAnswer(answerName) {
  if (!stroopRunning || !stroopCurrent) return;
  const rt = performance.now() - stroopStartTime;
  const correct = answerName === stroopCurrent.color.name;
  if (correct) {
    stroopCorrect++;
    stroopRTs.push(rt);
  }
  setTimeout(nextStroop, 200);
}

function finishStroop() {
  stroopRunning = false;
  document.getElementById('stroopStart').disabled = false;
  document.getElementById('stroopWord').textContent = '完成!';
  document.getElementById('stroopWord').style.color = 'var(--accent)';
  const avgRT = stroopRTs.length > 0 ?
    Math.round(stroopRTs.reduce((a,b)=>a+b,0) / stroopRTs.length) : 0;
  const acc = Math.round(stroopCorrect / stroopTotal * 100);
  const points = Math.max(5, Math.round(acc/4) - Math.round(avgRT/200));
  document.getElementById('stroopStatus').textContent =
    `✅ 正确率 ${acc}% | 平均反应 ${avgRT}ms  +${Math.max(points,5)} 分`;
  if (acc >= 80 && (state.bestStroopMs === null || avgRT < state.bestStroopMs)) {
    state.bestStroopMs = avgRT;
  }
  awardPoints('stroop', Math.max(points, 5));
}

// ============ Go/No-Go ============
let gonogoRunning = false;
let gonogoIdx = 0;
let gonogoTotal = 40;
let gonogoCurrent = null;       // 'go' | 'nogo'
let gonogoStimStartAt = 0;
let gonogoResponded = false;
let gonogoCorrect = 0;
let gonogoRTs = [];
let gonogoTimer = null;

document.getElementById('gonogoStart').addEventListener('click', () => {
  if (gonogoRunning) return;
  gonogoRunning = true;
  gonogoIdx = 0;
  gonogoCorrect = 0;
  gonogoRTs = [];
  document.getElementById('gonogoStart').disabled = true;
  nextGonogo();
});

function nextGonogo() {
  document.getElementById('gonogoStimulus').innerHTML = '';
  if (gonogoIdx >= gonogoTotal) {
    finishGonogo();
    return;
  }
  // ISI 1-2s
  setTimeout(() => {
    if (!gonogoRunning) return;
    gonogoIdx++;
    // 75% Go, 25% No-Go
    gonogoCurrent = Math.random() < 0.25 ? 'nogo' : 'go';
    gonogoResponded = false;
    const stim = document.getElementById('gonogoStimulus');
    if (gonogoCurrent === 'go') {
      stim.innerHTML = '<div class="go-circle"></div>';
    } else {
      stim.innerHTML = '<div class="nogo-square"></div>';
    }
    gonogoStimStartAt = performance.now();
    document.getElementById('gonogoStatus').textContent = `${gonogoIdx}/${gonogoTotal}`;
    gonogoTimer = setTimeout(() => {
      // 反应窗结束
      if (gonogoCurrent === 'nogo' && !gonogoResponded) {
        gonogoCorrect++; // 正确抑制
      }
      // GO 没按到 = 漏
      stim.innerHTML = '';
      nextGonogo();
    }, 800);
  }, 800 + Math.random()*600);
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && gonogoRunning && !gonogoResponded && gonogoCurrent) {
    e.preventDefault();
    gonogoResponded = true;
    const rt = performance.now() - gonogoStimStartAt;
    if (gonogoCurrent === 'go') {
      gonogoCorrect++;
      gonogoRTs.push(rt);
    }
    // No-Go 按了 = 错(不加分)
    clearTimeout(gonogoTimer);
    document.getElementById('gonogoStimulus').innerHTML = '';
    nextGonogo();
  }
});

// 移动端点击响应
document.getElementById('gonogoArea').addEventListener('click', () => {
  if (gonogoRunning && !gonogoResponded && gonogoCurrent) {
    gonogoResponded = true;
    const rt = performance.now() - gonogoStimStartAt;
    if (gonogoCurrent === 'go') {
      gonogoCorrect++;
      gonogoRTs.push(rt);
    }
    clearTimeout(gonogoTimer);
    document.getElementById('gonogoStimulus').innerHTML = '';
    nextGonogo();
  }
});

function finishGonogo() {
  gonogoRunning = false;
  document.getElementById('gonogoStart').disabled = false;
  const acc = Math.round(gonogoCorrect / gonogoTotal * 100);
  const avgRT = gonogoRTs.length > 0 ?
    Math.round(gonogoRTs.reduce((a,b)=>a+b,0) / gonogoRTs.length) : 0;
  const points = Math.max(5, Math.round(acc / 3));
  document.getElementById('gonogoStatus').textContent =
    `✅ 准确率 ${acc}% | GO 平均反应 ${avgRT}ms  +${points} 分`;
  if (state.bestGonogoAcc === null || acc > state.bestGonogoAcc) {
    state.bestGonogoAcc = acc;
  }
  awardPoints('gonogo', points);
}

// ============ 4-7-8 呼吸 ============
let breathRunning = false;
let breathTimeout = null;

document.getElementById('breathStart').addEventListener('click', () => {
  if (breathRunning) return;
  breathRunning = true;
  const rounds = parseInt(document.getElementById('breathRounds').value);
  document.getElementById('breathStart').disabled = true;
  runBreath(rounds, 1);
});

document.getElementById('breathStop').addEventListener('click', () => {
  if (breathRunning) {
    breathRunning = false;
    clearTimeout(breathTimeout);
    document.getElementById('breathStart').disabled = false;
    document.getElementById('breathCircle').className = 'breath-circle';
    document.getElementById('breathText').textContent = '已停止';
    document.getElementById('breathStatus').textContent = '';
  }
});

function runBreath(total, current) {
  if (!breathRunning) return;
  if (current > total) {
    breathRunning = false;
    document.getElementById('breathStart').disabled = false;
    document.getElementById('breathCircle').className = 'breath-circle';
    document.getElementById('breathText').textContent = '完成!';
    document.getElementById('breathStatus').textContent = `🌬️ 完成 ${total} 轮呼吸  +${total*5} 分`;
    awardPoints('breath', total * 5);
    return;
  }
  document.getElementById('breathStatus').textContent = `第 ${current}/${total} 轮`;
  // 吸气 4s
  document.getElementById('breathCircle').className = 'breath-circle inhale';
  document.getElementById('breathText').textContent = '吸气 4s';
  breathTimeout = setTimeout(() => {
    if (!breathRunning) return;
    // 屏息 7s
    document.getElementById('breathCircle').className = 'breath-circle hold';
    document.getElementById('breathText').textContent = '屏息 7s';
    breathTimeout = setTimeout(() => {
      if (!breathRunning) return;
      // 呼气 8s
      document.getElementById('breathCircle').className = 'breath-circle exhale';
      document.getElementById('breathText').textContent = '呼气 8s';
      breathTimeout = setTimeout(() => {
        runBreath(total, current + 1);
      }, 8000);
    }, 7000);
  }, 4000);
}

// ============ 启动 ============
ensureToday();
saveState();
renderDashboard();
