/* やること — シンプルなタスク管理PWA
 * データは localStorage に保存（端末内のみ）。サーバー通信なし。
 */
(() => {
  'use strict';

  const STORE_KEY = 'yarukoto.tasks.v1';
  const PREF_KEY = 'yarukoto.prefs.v1';
  const $ = (id) => document.getElementById(id);

  // ---- 状態 ----
  let tasks = load(STORE_KEY, []);
  let prefs = load(PREF_KEY, { sort: 'smart', view: 'today', category: null, bannerDismissed: false });
  let editingId = null;
  const notified = new Set(); // この起動中に通知済みのタスクID

  // ===================================================================
  // ストレージ
  // ===================================================================
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  function saveTasks() { localStorage.setItem(STORE_KEY, JSON.stringify(tasks)); }
  function savePrefs() { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ===================================================================
  // 日付ユーティリティ
  // ===================================================================
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function isSameDay(a, b) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }

  function formatDue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
    const time = d.getHours() || d.getMinutes()
      ? ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      : '';
    let day;
    if (diffDays === 0) day = '今日';
    else if (diffDays === 1) day = '明日';
    else if (diffDays === -1) day = '昨日';
    else if (diffDays > 1 && diffDays <= 7) day = `${diffDays}日後`;
    else if (diffDays < -1) day = `${Math.abs(diffDays)}日前`;
    else day = `${d.getMonth() + 1}/${d.getDate()}`;
    return day + time;
  }

  function dueState(t) {
    if (!t.due || t.done) return 'none';
    const now = Date.now();
    const due = new Date(t.due).getTime();
    if (due < now) return 'overdue';
    if (due - now < 24 * 3600 * 1000) return 'soon';
    return 'future';
  }

  // ===================================================================
  // 並び替え・フィルタ
  // ===================================================================
  const PRIORITY_RANK = { high: 0, mid: 1, low: 2 };

  function sortTasks(list) {
    const s = prefs.sort;
    const byCreated = (a, b) => (a.createdAt || 0) - (b.createdAt || 0);
    const byDue = (a, b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    };
    const byPriority = (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

    const arr = [...list];
    if (s === 'due') arr.sort((a, b) => byDue(a, b) || byPriority(a, b));
    else if (s === 'priority') arr.sort((a, b) => byPriority(a, b) || byDue(a, b));
    else if (s === 'created') arr.sort(byCreated);
    else {
      // smart: 期限切れ→今日→期限あり（近い順）→期限なし、同条件は優先度
      arr.sort((a, b) => {
        const score = (t) => {
          const st = dueState(t);
          if (st === 'overdue') return 0;
          if (t.due && isSameDay(t.due, new Date())) return 1;
          if (t.due) return 2;
          return 3;
        };
        return (score(a) - score(b)) || byDue(a, b) || byPriority(a, b);
      });
    }
    return arr;
  }

  function viewFilter(t) {
    const v = prefs.view;
    if (v === 'done') return t.done;
    if (t.done) return false;
    if (v === 'all') return true;
    if (v === 'today') {
      return dueState(t) === 'overdue' || (t.due && isSameDay(t.due, new Date())) || !t.due;
    }
    if (v === 'upcoming') return !!t.due && new Date(t.due) > new Date() && !isSameDay(t.due, new Date());
    return true;
  }

  function categoryFilter(t) {
    return !prefs.category || t.category === prefs.category;
  }

  function visibleTasks() {
    return sortTasks(tasks.filter((t) => viewFilter(t) && categoryFilter(t)));
  }

  function allCategories() {
    return [...new Set(tasks.map((t) => t.category).filter(Boolean))].sort();
  }

  // ===================================================================
  // タスク操作
  // ===================================================================
  function addTask(data) {
    tasks.push({
      id: uid(),
      title: data.title.trim(),
      notes: data.notes || '',
      due: data.due || null,
      priority: data.priority || 'mid',
      category: (data.category || '').trim(),
      subtasks: [],
      done: false,
      createdAt: Date.now(),
      completedAt: null,
    });
    saveTasks();
    render();
  }

  function toggleDone(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    t.completedAt = t.done ? Date.now() : null;
    if (t.done) notified.add(id);
    saveTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((x) => x.id !== id);
    saveTasks();
    render();
  }

  // ===================================================================
  // 描画
  // ===================================================================
  function render() {
    renderCounts();
    renderTabs();
    renderFilters();
    renderFocus();
    renderList();
    renderCategoryDatalist();
    renderFooter();
    renderNotifyUI();
  }

  function renderCounts() {
    const active = tasks.filter((t) => !t.done);
    const today = active.filter((t) => dueState(t) === 'overdue' || (t.due && isSameDay(t.due, new Date())) || !t.due);
    const upcoming = active.filter((t) => t.due && new Date(t.due) > new Date() && !isSameDay(t.due, new Date()));
    setCount('cntToday', today.length);
    setCount('cntUpcoming', upcoming.length);
    setCount('cntAll', active.length);
    setCount('cntDone', tasks.filter((t) => t.done).length);
  }
  function setCount(id, n) { $(id).textContent = n > 0 ? n : ''; }

  function renderTabs() {
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.view === prefs.view);
    });
  }

  function renderFilters() {
    const bar = $('filterBar');
    const cats = allCategories();
    if (cats.length === 0 || prefs.view === 'done') { bar.innerHTML = ''; return; }
    bar.innerHTML = '';
    const all = chip('すべて', prefs.category === null, () => { prefs.category = null; savePrefs(); render(); });
    bar.appendChild(all);
    cats.forEach((c) => {
      bar.appendChild(chip(c, prefs.category === c, () => {
        prefs.category = prefs.category === c ? null : c;
        savePrefs(); render();
      }));
    });
  }
  function chip(label, active, onClick) {
    const b = document.createElement('button');
    b.className = 'chip' + (active ? ' active' : '');
    b.textContent = label;
    b.onclick = onClick;
    return b;
  }

  function renderFocus() {
    const card = $('focusCard');
    if (prefs.view !== 'today') { card.classList.add('hidden'); return; }
    const candidates = sortTasks(tasks.filter((t) => !t.done && categoryFilter(t) &&
      (dueState(t) === 'overdue' || (t.due && isSameDay(t.due, new Date())) || !t.due)));
    if (candidates.length === 0) { card.classList.add('hidden'); return; }
    const t = candidates[0];
    card.dataset.id = t.id;
    $('focusTitle').textContent = t.title;
    const bits = [];
    if (t.due) bits.push((dueState(t) === 'overdue' ? '⚠ 期限切れ ' : '⏰ ') + formatDue(t.due));
    if (t.category) bits.push('🏷 ' + t.category);
    bits.push({ high: '🔴 優先度:高', mid: '🟡 優先度:中', low: '🟢 優先度:低' }[t.priority]);
    $('focusMeta').textContent = bits.join('　');
    card.classList.remove('hidden');
  }

  function renderList() {
    const list = $('taskList');
    const empty = $('emptyState');
    const items = visibleTasks();
    list.innerHTML = '';

    if (items.length === 0) {
      empty.classList.remove('hidden');
      empty.innerHTML = emptyMessage();
      return;
    }
    empty.classList.add('hidden');

    items.forEach((t) => list.appendChild(taskRow(t)));
  }

  function emptyMessage() {
    const map = {
      today: ['🌱', '今日やることはありません。<br>下の入力欄から最初の一歩を追加しましょう。'],
      upcoming: ['📅', '予定のタスクはありません。'],
      all: ['📝', 'タスクがまだありません。<br>「やること」を入力して追加してみましょう。'],
      done: ['🎉', 'まだ完了したタスクはありません。<br>1つ片付けるとここに表示されます。'],
    };
    const [icon, msg] = map[prefs.view] || map.all;
    return `<div class="big">${icon}</div><div class="msg">${msg}</div>`;
  }

  function taskRow(t) {
    const el = document.createElement('div');
    const ds = dueState(t);
    el.className = `task p-${t.priority}` + (t.done ? ' done' : '') + (ds === 'overdue' ? ' overdue' : '');

    // チェック
    const check = document.createElement('button');
    check.className = 'check';
    check.textContent = '✓';
    check.title = t.done ? '未完了に戻す' : '完了にする';
    check.onclick = () => toggleDone(t.id);

    // 本体
    const main = document.createElement('div');
    main.className = 'task-main';

    const title = document.createElement('div');
    title.className = 'task-title';
    title.textContent = t.title;
    main.appendChild(title);

    const badges = document.createElement('div');
    badges.className = 'task-badges';
    if (t.due) {
      const b = document.createElement('span');
      b.className = 'badge due' + (ds === 'overdue' ? ' overdue' : ds === 'soon' ? ' soon' : '');
      b.textContent = (ds === 'overdue' ? '⚠ ' : '⏰ ') + formatDue(t.due);
      badges.appendChild(b);
    }
    if (t.priority === 'high') {
      const b = document.createElement('span');
      b.className = 'badge pri-high';
      b.textContent = '優先度:高';
      badges.appendChild(b);
    }
    if (t.category) {
      const b = document.createElement('span');
      b.className = 'badge cat';
      b.textContent = t.category;
      badges.appendChild(b);
    }
    if (t.subtasks && t.subtasks.length) {
      const done = t.subtasks.filter((s) => s.done).length;
      const b = document.createElement('span');
      b.className = 'badge sub';
      b.textContent = `☑ ${done}/${t.subtasks.length}`;
      badges.appendChild(b);
    }
    if (badges.children.length) main.appendChild(badges);

    if (t.notes) {
      const n = document.createElement('div');
      n.className = 'task-notes';
      n.textContent = t.notes;
      main.appendChild(n);
    }

    if (t.subtasks && t.subtasks.length) {
      const done = t.subtasks.filter((s) => s.done).length;
      const prog = document.createElement('div');
      prog.className = 'subprog';
      const bar = document.createElement('i');
      bar.style.width = `${(done / t.subtasks.length) * 100}%`;
      prog.appendChild(bar);
      main.appendChild(prog);
    }

    // 編集ボタン
    const edit = document.createElement('button');
    edit.className = 'task-edit';
    edit.textContent = '✎';
    edit.title = '編集';
    edit.onclick = () => openEdit(t.id);

    el.append(check, main, edit);
    return el;
  }

  function renderCategoryDatalist() {
    const dl = $('categoryList');
    dl.innerHTML = '';
    allCategories().forEach((c) => {
      const o = document.createElement('option');
      o.value = c;
      dl.appendChild(o);
    });
  }

  function renderFooter() {
    const active = tasks.filter((t) => !t.done).length;
    const doneToday = tasks.filter((t) => t.done && t.completedAt && isSameDay(t.completedAt, new Date())).length;
    $('footStat').textContent = `未完了 ${active} 件　/　今日の完了 ${doneToday} 件`;
  }

  // ===================================================================
  // クイック追加 & 詳細パネル
  // ===================================================================
  $('quickAdd').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('quickTitle').value.trim();
    if (!title) return;
    addTask({
      title,
      due: $('detailDue').value ? new Date($('detailDue').value).toISOString() : null,
      priority: $('detailPriority').value,
      category: $('detailCategory').value,
      notes: $('detailNotes').value,
    });
    $('quickTitle').value = '';
    $('detailNotes').value = '';
    $('detailDue').value = '';
    // カテゴリと優先度は連続入力のため保持
    $('quickTitle').focus();
  });

  $('detailToggle').addEventListener('click', () => {
    $('detailPanel').classList.toggle('hidden');
  });

  // ===================================================================
  // タブ
  // ===================================================================
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      prefs.view = tab.dataset.view;
      prefs.category = null;
      savePrefs();
      render();
    });
  });

  // ===================================================================
  // フォーカスカード
  // ===================================================================
  $('focusDoneBtn').addEventListener('click', () => {
    const id = $('focusCard').dataset.id;
    if (id) toggleDone(id);
  });
  $('focusSkipBtn').addEventListener('click', () => {
    // 「後で」= 一覧の次の候補へ。簡易的に末尾へ回す（createdAtを更新）
    const id = $('focusCard').dataset.id;
    const t = tasks.find((x) => x.id === id);
    if (t) { t.createdAt = Date.now(); saveTasks(); render(); }
  });

  // ===================================================================
  // 編集モーダル
  // ===================================================================
  function openEdit(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    editingId = id;
    $('editTitle').value = t.title;
    $('editDue').value = t.due ? toLocalInput(t.due) : '';
    $('editPriority').value = t.priority;
    $('editCategory').value = t.category || '';
    $('editNotes').value = t.notes || '';
    renderSubtasks(t);
    $('editModal').classList.remove('hidden');
  }

  function toLocalInput(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function renderSubtasks(t) {
    const wrap = $('subtaskList');
    wrap.innerHTML = '';
    (t.subtasks || []).forEach((s) => {
      const row = document.createElement('div');
      row.className = 'subtask-row' + (s.done ? ' done' : '');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = s.done;
      cb.onchange = () => { s.done = cb.checked; saveTasks(); renderSubtasks(t); };
      const span = document.createElement('span');
      span.textContent = s.title;
      const del = document.createElement('button');
      del.className = 'del';
      del.textContent = '✕';
      del.onclick = () => { t.subtasks = t.subtasks.filter((x) => x.id !== s.id); saveTasks(); renderSubtasks(t); };
      row.append(cb, span, del);
      wrap.appendChild(row);
    });
  }

  $('subtaskAdd').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = tasks.find((x) => x.id === editingId);
    const val = $('subtaskInput').value.trim();
    if (!t || !val) return;
    t.subtasks = t.subtasks || [];
    t.subtasks.push({ id: uid(), title: val, done: false });
    $('subtaskInput').value = '';
    saveTasks();
    renderSubtasks(t);
  });

  $('saveEditBtn').addEventListener('click', () => {
    const t = tasks.find((x) => x.id === editingId);
    if (!t) return;
    const title = $('editTitle').value.trim();
    if (!title) { $('editTitle').focus(); return; }
    t.title = title;
    t.due = $('editDue').value ? new Date($('editDue').value).toISOString() : null;
    t.priority = $('editPriority').value;
    t.category = $('editCategory').value.trim();
    t.notes = $('editNotes').value;
    notified.delete(t.id); // 期限を変えたら再通知できるように
    saveTasks();
    closeModal();
    render();
  });

  $('deleteTaskBtn').addEventListener('click', () => {
    if (editingId && confirm('このタスクを削除しますか？')) {
      deleteTask(editingId);
      closeModal();
    }
  });

  function closeModal() { $('editModal').classList.add('hidden'); editingId = null; }
  document.querySelectorAll('[data-close-modal]').forEach((el) => el.addEventListener('click', closeModal));

  // ===================================================================
  // メニューシート
  // ===================================================================
  function openSheet() { $('sortSelect').value = prefs.sort; $('sheet').classList.remove('hidden'); }
  function closeSheet() { $('sheet').classList.add('hidden'); }
  $('menuBtn').addEventListener('click', openSheet);
  document.querySelectorAll('[data-close-sheet]').forEach((el) => el.addEventListener('click', closeSheet));

  $('sortSelect').addEventListener('change', () => {
    prefs.sort = $('sortSelect').value;
    savePrefs();
    render();
  });

  $('clearDoneBtn').addEventListener('click', () => {
    const n = tasks.filter((t) => t.done).length;
    if (n === 0) { alert('完了タスクはありません。'); return; }
    if (confirm(`完了した ${n} 件を削除しますか？`)) {
      tasks = tasks.filter((t) => !t.done);
      saveTasks();
      closeSheet();
      render();
    }
  });

  // バックアップ
  $('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yarukoto-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('形式が違います');
        if (confirm(`${data.length} 件を読み込みます。現在のデータは置き換わります。よろしいですか？`)) {
          tasks = data;
          saveTasks();
          closeSheet();
          render();
        }
      } catch {
        alert('読み込めませんでした。正しいバックアップファイルを選んでください。');
      }
      $('importFile').value = '';
    };
    reader.readAsText(file);
  });

  // ===================================================================
  // 通知
  // ===================================================================
  function renderNotifyUI() {
    const banner = $('notifyBanner');
    const supported = 'Notification' in window;
    const needAsk = supported && Notification.permission === 'default' && !prefs.bannerDismissed;
    banner.classList.toggle('hidden', !needAsk);
    const btn = $('notifyBtn');
    if (!supported) { btn.textContent = '🔕'; btn.title = 'この環境では通知に対応していません'; }
    else if (Notification.permission === 'granted') { btn.textContent = '🔔'; btn.title = '通知はオンです'; }
    else { btn.textContent = '🔕'; btn.title = '通知はオフです（タップでオン）'; }
  }

  async function requestNotify() {
    if (!('Notification' in window)) {
      alert('お使いのブラウザは通知に対応していません。');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      showNotification('通知をオンにしました', '期限が来たタスクをここでお知らせします。', 'welcome');
    }
    render();
  }

  $('notifyBtn').addEventListener('click', requestNotify);
  $('enableNotifyBtn').addEventListener('click', requestNotify);
  $('dismissBannerBtn').addEventListener('click', () => {
    prefs.bannerDismissed = true;
    savePrefs();
    renderNotifyUI();
  });

  async function showNotification(title, body, tag) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const opts = { body, tag, icon: 'icon.svg', badge: 'icon.svg', renotify: true };
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (reg) reg.showNotification(title, opts);
      else new Notification(title, opts);
    } catch {
      try { new Notification(title, opts); } catch { /* noop */ }
    }
  }

  // 期限が来たタスクをチェックして通知（アプリが開いている間）
  function checkDueTasks() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = Date.now();
    tasks.forEach((t) => {
      if (t.done || !t.due || notified.has(t.id)) return;
      if (new Date(t.due).getTime() <= now) {
        notified.add(t.id);
        showNotification('⏰ ' + t.title, t.category ? `[${t.category}] そろそろ取りかかりましょう` : 'そろそろ取りかかりましょう', t.id);
      }
    });
  }

  // ===================================================================
  // 起動
  // ===================================================================
  function init() {
    // 詳細パネルの優先度デフォルト
    $('detailPriority').value = 'mid';
    render();

    // 通知チェック（30秒ごと＋復帰時）
    checkDueTasks();
    setInterval(checkDueTasks, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); checkDueTasks(); } });

    // Service Worker 登録（オフライン対応 & 通知）
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* ローカルfile://では失敗するが無視 */ });
    }
  }

  init();
})();
