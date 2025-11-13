// assets/app.js
// Static client-only Tài Xỉu game for GitHub Pages / local static hosting.
// Uses crypto.getRandomValues for RNG when available.
// Note: Running purely client-side means results are not authoritative for real-money use.

(() => {
  'use strict';

  // Config
  const CONFIG = {
    bettingTime: 30,
    payouts: { tai: 1, xiu: 1 },
    diceFaces: ['⚀','⚁','⚂','⚃','⚄','⚅'],
    maxHistory: 200,
  };

  // State
  const State = {
    balance: 10000000,
    selectedChip: 10000,
    isAllInMode: false,
    currentBets: {},
    history: [],
    timeLeft: CONFIG.bettingTime,
    gameState: 'idle', // betting, rolling, results
    sessionId: null,
    manualOpenMode: false,
    lastResult: null
  };

  // Elements
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const els = {
    playerBalance: $('#player-balance'),
    chips: $$('.chip'),
    betOptions: $$('.bet-option'),
    timeText: $('#time-text'),
    timerRing: $('#timer-ring'),
    dice: [$('#dice1'), $('#dice2'), $('#dice3')],
    diceBowl: $('#dice-bowl'),
    notification: $('#notification'),
    historyContainer: $('#history'),
    allInBtn: $('#all-in-btn'),
    historyBtn: $('#history-btn'),
    historyModal: $('#history-modal'),
    modalCloseBtn: $('#modal-close-btn'),
    sessionId: $('#session-id'),
    toggleOpenModeBtn: $('#toggle-open-mode'),
    manualOpenBtn: $('#manual-open-btn'),
    barTai: $('#bar-tai'),
    barXiu: $('#bar-xiu'),
    countTai: $('#count-tai'),
    countXiu: $('#count-xiu'),
    historyList: $('#history-list'),
  };

  // Sounds (may fail if browser blocks autoplay)
  const sounds = {
    chip: $('#chip-sound'),
    win: $('#win-sound'),
    lose: $('#lose-sound'),
    shake: $('#dice-shake-sound')
  };

  // Utilities
  function fmt(v){
    return `${v.toLocaleString('vi-VN')} VND`;
  }

  function secureRandomInt(min, max){
    // inclusive
    if (window.crypto && crypto.getRandomValues) {
      const range = max - min + 1;
      const maxRange = 4294967295;
      const u32 = new Uint32Array(1);
      crypto.getRandomValues(u32);
      return min + Math.floor((u32[0] / (maxRange + 1)) * range);
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function genSessionId(){
    return Date.now().toString(36) + '-' + secureRandomInt(1000,9999);
  }

  // UI
  function updateBalanceDisplay(animate=false){
    els.playerBalance.textContent = fmt(State.balance);
    // potential animation placeholder
  }

  function showNotification(msg, type=''){ 
    const n = els.notification;
    n.textContent = msg;
    n.className = 'show ' + type;
    // ensure screen readers notify
    n.setAttribute('aria-live','assertive');
    setTimeout(()=> n.classList.remove('show'), 2500);
  }

  function updateBetBadge(type){
    const el = document.querySelector(`.bet-option[data-bet="${type}"]`);
    if(!el) return;
    let badge = el.querySelector('.placed-bet-amount');
    const amount = State.currentBets[type] || 0;
    if(amount > 0){
      if(!badge){
        badge = document.createElement('div');
        badge.className = 'placed-bet-amount';
        badge.style.position = 'absolute';
        badge.style.top = '12px';
        badge.style.right = '12px';
        badge.style.background = 'rgba(0,0,0,0.6)';
        badge.style.padding = '6px 12px';
        badge.style.borderRadius = '999px';
        badge.style.fontWeight = '700';
        badge.style.border = '2px solid rgba(255,215,0,0.85)';
        el.appendChild(badge);
      }
      badge.textContent = amount >= 1000000 ? `${(amount/1000000).toFixed(1)}M` : `${amount/1000}K`;
    } else if(badge){
      badge.remove();
    }
  }

  function updateHistoryDots(){
    els.historyContainer.innerHTML = '';
    State.history.slice(0, 12).forEach(item=>{
      const dot = document.createElement('div');
      dot.className = `history-dot ${item.result}`;
      dot.textContent = item.sum;
      dot.style.display = 'inline-flex';
      dot.style.width = '28px';
      dot.style.height = '28px';
      dot.style.borderRadius = '50%';
      dot.style.marginRight = '6px';
      dot.style.justifyContent = 'center';
      dot.style.alignItems = 'center';
      dot.style.fontSize = '0.9rem';
      dot.style.color = '#fff';
      dot.style.border = '2px solid #fff';
      dot.style.background = item.result === 'tai' ? '#b8222d' : '#008A5E';
      els.historyContainer.appendChild(dot);
    });
  }

  function populateHistoryModal(){
    els.historyList.innerHTML = '';
    State.history.forEach(it => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.padding = '6px 0';
      li.style.borderBottom = '1px solid rgba(255,255,255,0.04)';
      li.innerHTML = `<span class="session">#${String(it.sessionId).slice(-6)}</span>
        <span class="result ${it.result}">${(it.result||'—').toUpperCase()} ${it.sum||''}</span>
        <span class="dice-result">${CONFIG.diceFaces[it.dice[0]-1]} ${CONFIG.diceFaces[it.dice[1]-1]} ${CONFIG.diceFaces[it.dice[2]-1]}</span>`;
      els.historyList.appendChild(li);
    });

    const taiCount = State.history.filter(h=>h.result==='tai').length;
    const xiuCount = State.history.filter(h=>h.result==='xiu').length;
    const total = Math.max(1, taiCount + xiuCount);
    els.countTai.textContent = taiCount;
    els.countXiu.textContent = xiuCount;
    els.barTai.style.height = `${(taiCount/total)*100}%`;
    els.barXiu.style.height = `${(xiuCount/total)*100}%`;
  }

  // Game flow
  let timerInterval = null;

  function startNewRound(){
    State.gameState = 'betting';
    State.currentBets = {};
    State.sessionId = genSessionId();
    els.sessionId.textContent = `Phiên: #${State.sessionId}`;
    resetBoard();
    startTimer(CONFIG.bettingTime);
  }

  function resetBoard(){
    els.dice.forEach(d => { d.style.visibility = 'hidden'; d.setAttribute('aria-hidden','true'); });
    if(els.diceBowl) { els.diceBowl.classList.remove('hidden'); els.diceBowl.classList.remove('shaking'); }
    document.querySelectorAll('.bet-option').forEach(b => b.classList.remove('locked','win-glow'));
    els.manualOpenBtn.style.display = 'none';
    updateHistoryDots();
  }

  function startTimer(seconds){
    clearInterval(timerInterval);
    State.timeLeft = seconds || CONFIG.bettingTime;
    els.timeText.textContent = State.timeLeft;
    updateTimerRing();
    timerInterval = setInterval(()=>{
      State.timeLeft--;
      els.timeText.textContent = State.timeLeft;
      if(State.timeLeft <= 5) els.timeText.classList.add('ending');
      updateTimerRing();
      if(State.timeLeft <= 0){
        clearInterval(timerInterval);
        endBettingPhase();
      }
    }, 1000);
  }

  function updateTimerRing(){
    const circumference = 2 * Math.PI * 135;
    const offset = circumference - (State.timeLeft / CONFIG.bettingTime) * circumference;
    if(els.timerRing){
      els.timerRing.style.strokeDasharray = `${circumference} ${circumference}`;
      els.timerRing.style.strokeDashoffset = offset;
    }
  }

  function endBettingPhase(){
    State.gameState = 'rolling';
    document.querySelectorAll('.bet-option').forEach(opt => opt.classList.add('locked'));
    rollDice();
  }

  function rollDice(){
    if(els.diceBowl) els.diceBowl.classList.add('shaking');
    try { sounds.shake && sounds.shake.play().catch(()=>{}); } catch(e){}
    setTimeout(()=>{
      if(els.diceBowl) els.diceBowl.classList.remove('shaking');
      const results = [secureRandomInt(1,6), secureRandomInt(1,6), secureRandomInt(1,6)];
      revealResult(results);
    }, 1300);
  }

  function revealResult(dice){
    State.lastResult = { dice };
    State.gameState = 'results';
    els.dice.forEach((d,i)=>{
      d.textContent = CONFIG.diceFaces[dice[i]-1];
      d.style.visibility = 'visible';
      d.setAttribute('aria-hidden','false');
    });

    if(!State.manualOpenMode){
      if(els.diceBowl) setTimeout(()=> els.diceBowl.classList.add('hidden'), 300);
      setTimeout(()=> processWinnings(dice), 900);
    } else {
      els.manualOpenBtn.style.display = 'inline-block';
    }
  }

  function processWinnings(dice){
    const sum = dice.reduce((a,b)=>a+b,0);
    const isTriple = (dice[0]===dice[1] && dice[1]===dice[2]);
    let roundResult = null;
    if(sum >= 11 && sum <=17 && !isTriple) roundResult = 'tai';
    else if(sum >=4 && sum <=10 && !isTriple) roundResult = 'xiu';
    // highlight
    if(roundResult){
      const winEl = document.getElementById(`bet-${roundResult}`);
      if(winEl) winEl.classList.add('win-glow');
    }
    // payouts
    let totalWinnings = 0;
    if(roundResult){
      const betAmount = State.currentBets[roundResult] || 0;
      if(betAmount > 0){
        totalWinnings = betAmount + betAmount * CONFIG.payouts[roundResult];
      }
    }
    if(totalWinnings > 0){
      State.balance += totalWinnings;
      showNotification(`Thắng ${totalWinnings.toLocaleString('vi-VN')}!`, 'win');
      try { sounds.win && sounds.win.play().catch(()=>{}); } catch(e){}
    } else if(Object.keys(State.currentBets).length > 0){
      showNotification('Thua!', 'lose');
      try { sounds.lose && sounds.lose.play().catch(()=>{}); } catch(e){}
    }

    updateBalanceDisplay(true);
    // save history
    if(roundResult){
      State.history.unshift({ sessionId: State.sessionId, result: roundResult, sum, dice });
      if(State.history.length > CONFIG.maxHistory) State.history.pop();
    }

    // update history UI
    populateHistoryModal();
    updateHistoryDots();

    // schedule next round
    setTimeout(() => startNewRound(), 2400);
  }

  // Events
  function addEventListeners(){
    // chips
    els.chips.forEach(chip => {
      chip.addEventListener('click', () => {
        State.isAllInMode = false;
        State.selectedChip = Number(chip.dataset.value);
        els.chips.forEach(c=>c.classList.remove('selected'));
        chip.classList.add('selected');
        els.chips.forEach(c=>c.setAttribute('aria-checked','false'));
        chip.setAttribute('aria-checked','true');
      });
    });

    els.allInBtn.addEventListener('click', () => {
      State.isAllInMode = true;
      State.selectedChip = State.balance;
      showNotification('All-in đặt cược', 'info');
    });

    // bet options
    document.querySelectorAll('.bet-option').forEach(opt => {
      opt.addEventListener('click', () => {
        placeBet(opt.dataset.bet);
      });
      opt.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); placeBet(opt.dataset.bet); }
      });
    });

    els.toggleOpenModeBtn.addEventListener('click', () => {
      State.manualOpenMode = !State.manualOpenMode;
      els.toggleOpenModeBtn.textContent = `Chế độ: ${State.manualOpenMode ? 'Tự Mở' : 'Tự Động'}`;
    });

    els.manualOpenBtn.addEventListener('click', () => {
      if(State.lastResult){
        els.diceBowl.classList.add('hidden');
        els.manualOpenBtn.style.display = 'none';
        processWinnings(State.lastResult.dice);
      }
    });

    els.historyBtn.addEventListener('click', () => {
      populateHistoryModal();
      els.historyModal.classList.add('show');
    });
    els.modalCloseBtn.addEventListener('click', () => {
      els.historyModal.classList.remove('show');
    });

    // keyboard: space to toggle betting (for demo)
    document.addEventListener('keydown', (e) => {
      if(e.key === 'h') els.historyModal.classList.toggle('show');
    });
  }

  function placeBet(type){
    if(State.gameState !== 'betting') {
      showNotification('Đã hết thời gian đặt cược', 'error');
      return;
    }
    const amount = State.isAllInMode ? State.balance : State.selectedChip;
    if(amount <= 0 || State.balance < amount){
      showNotification('Không đủ số dư!', 'error');
      State.isAllInMode = false;
      return;
    }
    try { sounds.chip && sounds.chip.play().catch(()=>{}); } catch(e){}
    State.balance -= amount;
    if(State.isAllInMode){
      // cancel other side if had
      const other = type === 'tai' ? 'xiu' : 'tai';
      if(State.currentBets[other]){
        State.balance += State.currentBets[other];
        delete State.currentBets[other];
        updateBetBadge(other);
      }
    }
    State.currentBets[type] = (State.currentBets[type] || 0) + amount;
    updateBalanceDisplay();
    updateBetBadge(type);
    State.isAllInMode = false;
  }

  // Init
  function init(){
    updateBalanceDisplay();
    addEventListeners();
    // default chip selected
    if(els.chips[0]) { els.chips[0].classList.add('selected'); els.chips[0].setAttribute('aria-checked','true'); }
    startNewRound();
  }

  // Start
  document.addEventListener('DOMContentLoaded', init);

})();
