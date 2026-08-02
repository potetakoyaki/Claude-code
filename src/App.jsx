import { useState, useEffect, useRef, useMemo } from "react";

const STORAGE_KEY = "friendTaskApp.v1";
const DAY_MS = 86400000;
const BASE_URL = import.meta.env.BASE_URL || "/";

const NUDGE_INTERVAL_OPTIONS = [
  { minutes: 30, label: "30分ごと" },
  { minutes: 60, label: "1時間ごと" },
  { minutes: 120, label: "2時間ごと" },
  { minutes: 180, label: "3時間ごと" },
  { minutes: 360, label: "6時間ごと" },
  { minutes: 720, label: "半日ごと" },
  { minutes: 1440, label: "1日1回" },
];

const MOOD_EMOJI = {
  neutral: "😊",
  happy: "🎉",
  caring: "🥰",
  sleepy: "😴",
  surprised: "😳",
};

// ===== small utils =====
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (pool) => pool[Math.floor(Math.random() * pool.length)];
let idCounter = 0;
const makeId = () => `id_${Date.now()}_${idCounter++}_${Math.random().toString(36).slice(2, 7)}`;

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDateLabel(iso) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function fmtElapsed(ms) {
  const days = Math.floor(ms / DAY_MS);
  if (days <= 0) return "今日";
  if (days === 1) return "1日前";
  return `${days}日前`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function isOverdue(task, now) {
  if (!task.deadline) return false;
  return new Date(`${task.deadline}T23:59:59`).getTime() < now;
}

function urgencyScore(task, now) {
  const ageDays = (now - task.createdAt) / DAY_MS;
  const sinceNudgeDays = task.lastNudgedAt ? (now - task.lastNudgedAt) / DAY_MS : ageDays;
  let score = ageDays + sinceNudgeDays * 1.5;
  if (task.deadline) {
    const daysLeft = (new Date(`${task.deadline}T23:59:59`).getTime() - now) / DAY_MS;
    if (daysLeft < 0) score += 10;
    else if (daysLeft <= 1) score += 6;
    else if (daysLeft <= 3) score += 3;
  }
  return Math.max(score, 0.15);
}

function tierFor(task, now) {
  if (isOverdue(task, now)) return "overdue";
  const ageDays = (now - task.createdAt) / DAY_MS;
  const nudges = task.nudgeCount || 0;
  if (ageDays < 1 && nudges === 0) return "fresh";
  if (ageDays < 3 && nudges < 3) return "mid";
  return "long";
}

// ===== phrase pools =====
const POOLS = {
  onboarding: [
    "やっほー!はじめまして👋",
    "私はあなたの『積みタスク』担当だよ。Claude Codeが考えてくれた副業アイデアとか、思いついた時は最高にワクワクするのに、時間が経つとつい後回しになっちゃうよね。",
    "そういうタスクを、私が友達みたいにゆるっと気にかけておくね。忘れた頃にちょこっと声かけるから、気が向いたときにちょっとずつ進めればOK!",
    "早速だけど、今気になってるアイデアとかタスク、なんでもいいから下に打ち込んで教えて📝",
  ],
  dailyGreeting: [
    (n, t) => `おはよう☀️ 積みタスクが${n}個あるよ。とりあえず『${t}』から気にしてみる?`,
    (n, t) => `やっほー、また来たね!放置中のが${n}個あって、中でも『${t}』が気になるかな〜👀`,
    (n, t) => `今日もお疲れさま。ちょっとだけ思い出してほしいんだけど、『${t}』、覚えてる?`,
    (n, t) => `久しぶり!積みタスク${n}個の中で、そろそろ『${t}』が呼んでる気がする😏`,
  ],
  dailyEmpty: [
    "おー、今日は積みタスクゼロ!身軽でいいね〜何か思いついたらいつでも教えて📝",
    "やること全部片付いてる…えらすぎ。新しいアイデアが浮かんだら聞かせてね!",
    "今日はのんびりモードだね。気になることがあったら気軽に話しかけて〜",
  ],
  addAck: [
    (t) => `おっけー、『${t}』覚えたよ!いつまでにやる?`,
    (t) => `メモした!『${t}』ね📌 期限ある?`,
    (t) => `了解、『${t}』追加しておいた。期限決める?`,
    (t) => `いいね、それ聞くとちょっとワクワクする!『${t}』、期限はどうする?`,
  ],
  deadlineSet: [
    (t, d) => `了解、『${t}』は${d}までにしとくね!忘れずに声かけるよ〜`,
    (t, d) => `メモした、${d}までだね。『${t}』、ちゃんと気にかけとく📅`,
  ],
  deadlineNone: [
    "OK、期限は決めないでおくね。気が向いたタイミングでいいよ〜",
    "了解、ゆるっと覚えとくね。急かさない範囲でたまに聞くよ!",
  ],
  fresh: [
    (t) => `ねえ、『${t.text}』ってタスク登録したよね。気が向いたらでいいから、ちょっと覗いてみる?`,
    (t) => `『${t.text}』、忘れないように覚えとくね📌 進んだら教えて!`,
    (t) => `そういえば『${t.text}』ってどんな感じ?まだ全然OK、ゆっくりで〜`,
  ],
  mid: [
    (t, e) => `『${t.text}』、${e}に話してくれてからそのままだね…そろそろ5分だけでも触ってみない?`,
    (t, e) => `ねぇねぇ、『${t.text}』のこと覚えてる?${e}の話なんだけど〜`,
    (t) => `『${t.text}』、地味に気になってるんだよね。少しでも進めたら教えて!`,
    (t) => `『${t.text}』を放置してるの、私は知ってるからね😏 いつでも待ってるよ〜`,
  ],
  long: [
    (t, e) => `正直に言うね、『${t.text}』、${e}からずっと動いてないよ…!せっかくのアイデアなのにもったいない!`,
    (t) => `『${t.text}』、そろそろ本気出さない?私はいつでも応援してるよ💪`,
    (t) => `ねえってば!『${t.text}』、忘れてない…よね…?`,
    (t) => `『${t.text}』のこと、実はずっと気になってたの。5分だけでも手をつけてみよ?`,
  ],
  overdue: [
    (t) => `ちょっと待って、『${t.text}』の期限もう過ぎてるよ!?😳 まだ間に合うかもだから確認して!`,
    (t) => `『${t.text}』の期限切れてるの気づいてた…?怒ってないから、状況だけ教えて〜`,
    (t) => `『${t.text}』、期限過ぎちゃったね。責めないから、続けるか諦めるか教えて!`,
  ],
  done: [
    (t) => `やったー!『${t.text}』完了だね、お疲れさま🎉`,
    (t) => `ナイス!『${t.text}』終わったんだ、えらい!`,
    (t) => `おお、『${t.text}』片付いた!また一歩前進だね✨`,
    (t) => `『${t.text}』完了おめでとう!ちゃんと見てたよ〜👏`,
  ],
  snooze: [
    (t) => `OK、『${t.text}』はまた後で聞くね。無理しないで〜`,
    (t) => `了解!『${t.text}』はちょっと寝かせとこ⏰`,
    (t) => `わかった、また時間おいて声かけるね`,
  ],
  giveup: [
    (t) => `わかった、『${t.text}』は消しておくね。また思いついたらいつでも教えて!`,
    (t) => `了解〜『${t.text}』は一旦なしで。気が向いたらまた教えてね`,
    (t) => `OK、無理に続けなくて大丈夫。『${t.text}』は片付けとくね`,
  ],
};

function trimMessages(msgs) {
  return msgs.length > 200 ? msgs.slice(msgs.length - 200) : msgs;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ===== small presentational components =====
function FriendAvatar({ mood = "neutral", size = 42 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(155deg,#ffd6a5,#ff8c69)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.52,
        flexShrink: 0,
        boxShadow: "0 2px 6px rgba(80,40,10,0.25)",
      }}
    >
      {MOOD_EMOJI[mood] || "😊"}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="msg-row bot">
      <FriendAvatar size={30} />
      <div className="typing-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function MessageBubble({ msg, onChip }) {
  const isBot = msg.from === "bot";
  return (
    <div className={`msg-row ${isBot ? "bot" : "user"}`}>
      {isBot && <FriendAvatar size={30} />}
      <div className="bubble-col">
        <div className={`bubble ${isBot ? "bot" : "user"}`}>{msg.text}</div>
        {msg.chips && msg.chips.length > 0 && (
          <div className="chip-row">
            {msg.chips.map((c, i) => (
              <button key={i} className="chip" onClick={() => onChip(msg.id, c.action)}>
                {c.label}
              </button>
            ))}
          </div>
        )}
        <div className="msg-time">{formatTime(msg.time)}</div>
      </div>
    </div>
  );
}

function TaskListSheet({ tasks, onClose, onDone, onDelete }) {
  const now = Date.now();
  const pending = tasks.filter((t) => !t.done && (!t.snoozedUntil || t.snoozedUntil <= now));
  const snoozed = tasks.filter((t) => !t.done && t.snoozedUntil && t.snoozedUntil > now);
  const done = tasks.filter((t) => t.done);

  const renderCard = (t) => (
    <div className="task-card" key={t.id}>
      <span className={`task-text ${t.done ? "done" : ""}`}>{t.text}</span>
      {t.deadline && (
        <span className={`task-deadline ${!t.done && isOverdue(t, now) ? "overdue" : ""}`}>
          〜{fmtDateLabel(t.deadline)}
        </span>
      )}
      {!t.done && (
        <button title="完了にする" onClick={() => onDone(t.id)}>
          ✅
        </button>
      )}
      <button title="削除" onClick={() => onDelete(t.id)}>
        🗑
      </button>
    </div>
  );

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>📋 タスク一覧</h2>
        <div className="section-label">気になってること ({pending.length})</div>
        {pending.length === 0 && <div className="empty-note">今のところ何もないよ〜</div>}
        {pending.map(renderCard)}
        {snoozed.length > 0 && (
          <>
            <div className="section-label">スヌーズ中 ({snoozed.length})</div>
            {snoozed.map(renderCard)}
          </>
        )}
        {done.length > 0 && (
          <>
            <div className="section-label">完了済み ({done.length})</div>
            {done.map(renderCard)}
          </>
        )}
      </div>
    </div>
  );
}

function SettingsSheet({ settings, setSettings, notifPermission, onRequestNotif, onReset, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ 設定</h2>
        <div className="sheet-row">
          <label>友達の名前</label>
          <input
            type="text"
            value={settings.friendName}
            maxLength={12}
            onChange={(e) => setSettings((s) => ({ ...s, friendName: e.target.value || "ミミ" }))}
          />
        </div>
        <div className="sheet-row">
          <label>声をかけてくれる頻度(アプリを開いている間)</label>
          <select
            value={settings.nudgeIntervalMinutes}
            onChange={(e) => setSettings((s) => ({ ...s, nudgeIntervalMinutes: Number(e.target.value) }))}
          >
            {NUDGE_INTERVAL_OPTIONS.map((o) => (
              <option key={o.minutes} value={o.minutes}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sheet-row">
          <label>通知</label>
          {notifPermission === "granted" ? (
            <div className="empty-note" style={{ padding: 0, textAlign: "left" }}>
              通知オンだよ🔔 タブを見てない時もこっそり教えるね。
            </div>
          ) : (
            <button className="notif-btn" onClick={onRequestNotif}>
              🔔 通知をオンにする
            </button>
          )}
        </div>
        <button className="danger-btn" onClick={onReset}>
          会話とタスクを全部リセットする
        </button>
      </div>
    </div>
  );
}

// ===== Main App =====
export default function App() {
  const initial = useMemo(() => loadState(), []);
  const [tasks, setTasks] = useState(() => initial?.tasks || []);
  const [messages, setMessages] = useState(() => initial?.messages || []);
  const [settings, setSettings] = useState(
    () => initial?.settings || { friendName: "ミミ", nudgeIntervalMinutes: 180 }
  );
  const [meta, setMeta] = useState(() => initial?.meta || { lastOpenDate: null, lastNudgeAt: 0 });

  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [mood, setMood] = useState("neutral");
  const [showSettings, setShowSettings] = useState(false);
  const [showTaskList, setShowTaskList] = useState(false);
  const [pendingDatePick, setPendingDatePick] = useState(null);
  const [datePickValue, setDatePickValue] = useState(toISODate(new Date()));
  const [unread, setUnread] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const bodyRef = useRef(null);
  const endRef = useRef(null);
  const nearBottomRef = useRef(true);
  const speakChainRef = useRef(Promise.resolve());
  const undoStashRef = useRef({});
  const initRef = useRef(false);
  const baseTitleRef = useRef(document.title);
  const moodTimerRef = useRef(null);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, messages, settings, meta }));
    } catch {
      /* storage unavailable, ignore */
    }
  }, [tasks, messages, settings, meta]);

  function flashMood(m, duration = 4000) {
    setMood(m);
    clearTimeout(moodTimerRef.current);
    moodTimerRef.current = setTimeout(() => setMood("neutral"), duration);
  }

  function maybeNotify(text) {
    if (document.hidden) setUnread((u) => u + 1);
    if (!document.hidden) return;
    if (notifPermission !== "granted" || typeof Notification === "undefined") return;
    try {
      new Notification(`${settings.friendName}より`, {
        body: text,
        icon: `${BASE_URL}icon.svg`,
        tag: "friend-task-nudge",
      });
    } catch {
      /* notification failed silently */
    }
  }

  function speak(entries) {
    const arr = Array.isArray(entries) ? entries : [entries];
    speakChainRef.current = speakChainRef.current.then(async () => {
      for (const entry of arr) {
        setTyping(true);
        await sleep(entry.delay ?? 650 + Math.random() * 750);
        setTyping(false);
        const msg = {
          id: makeId(),
          from: "bot",
          text: entry.text,
          time: Date.now(),
          chips: entry.chips || null,
        };
        setMessages((prev) => trimMessages([...prev, msg]));
        if (entry.notify !== false) maybeNotify(entry.text);
        await sleep(200);
      }
    });
    return speakChainRef.current;
  }

  function addTask(text) {
    const now = Date.now();
    const task = {
      id: makeId(),
      text: text.trim(),
      deadline: null,
      createdAt: now,
      lastNudgedAt: null,
      nudgeCount: 0,
      snoozedUntil: null,
      done: false,
      doneAt: null,
    };
    setTasks((prev) => [...prev, task]);
    return task;
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const userMsg = { id: makeId(), from: "user", text, time: Date.now() };
    setMessages((prev) => trimMessages([...prev, userMsg]));
    const task = addTask(text);
    speak({
      text: pick(POOLS.addAck)(text),
      notify: false,
      chips: [
        { label: "今日中", action: `deadline:${task.id}:0` },
        { label: "3日以内", action: `deadline:${task.id}:3` },
        { label: "1週間以内", action: `deadline:${task.id}:7` },
        { label: "期限は決めない", action: `deadline:${task.id}:none` },
        { label: "日付を選ぶ📅", action: `deadline:${task.id}:pick` },
      ],
    });
  }

  function completeTask(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, done: true, doneAt: Date.now() } : x)));
    speak({ text: pick(POOLS.done)(t), notify: false });
    flashMood("happy");
  }

  function snoozeTask(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    const until = Date.now() + 3 * 60 * 60 * 1000;
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, snoozedUntil: until } : x)));
    speak({ text: pick(POOLS.snooze)(t), notify: false });
  }

  function removeTask(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    undoStashRef.current[id] = t;
    setTasks((prev) => prev.filter((x) => x.id !== id));
    speak({
      text: pick(POOLS.giveup)(t),
      notify: false,
      chips: [{ label: "やっぱり戻す", action: `undo:${id}:_` }],
    });
  }

  function applyDeadline(id, iso) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, deadline: iso } : x)));
    speak({ text: pick(POOLS.deadlineSet)(t.text, fmtDateLabel(iso)), notify: false });
  }

  function setDeadlineFromChip(id, extra) {
    if (extra === "pick") {
      setDatePickValue(toISODate(new Date()));
      setPendingDatePick(id);
      return;
    }
    if (extra === "none") {
      setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, deadline: null } : x)));
      speak({ text: pick(POOLS.deadlineNone), notify: false });
      return;
    }
    const days = Number(extra);
    const d = new Date(Date.now() + days * DAY_MS);
    applyDeadline(id, toISODate(d));
  }

  function confirmDatePick() {
    if (pendingDatePick && datePickValue) applyDeadline(pendingDatePick, datePickValue);
    setPendingDatePick(null);
  }

  function handleChip(msgId, action) {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, chips: null } : m)));
    const [kind, id, extra] = action.split(":");
    if (kind === "done") completeTask(id);
    else if (kind === "snooze") snoozeTask(id);
    else if (kind === "giveup") removeTask(id);
    else if (kind === "deadline") setDeadlineFromChip(id, extra);
    else if (kind === "undo") {
      const snap = undoStashRef.current[id];
      if (snap) {
        setTasks((prev) => [...prev, snap]);
        delete undoStashRef.current[id];
        speak({ text: "よかった、元に戻しておいたよ!", notify: false });
      }
    } else if (kind === "enable-notif") {
      requestNotif();
    }
  }

  function maybeNudge(force = false) {
    const now = Date.now();
    const intervalMs = settings.nudgeIntervalMinutes * 60000;
    if (!force && now - (meta.lastNudgeAt || 0) < intervalMs) return;
    const eligible = tasks.filter((t) => !t.done && (!t.snoozedUntil || t.snoozedUntil <= now));
    if (eligible.length === 0) return;
    const weights = eligible.map((t) => urgencyScore(t, now));
    const chosen = weightedPick(eligible, weights);
    const tier = tierFor(chosen, now);
    const elapsedStr = fmtElapsed(now - (chosen.lastNudgedAt || chosen.createdAt));
    const text = pick(POOLS[tier])(chosen, elapsedStr);

    setTasks((prev) =>
      prev.map((t) => (t.id === chosen.id ? { ...t, lastNudgedAt: now, nudgeCount: (t.nudgeCount || 0) + 1 } : t))
    );
    setMeta((prev) => ({ ...prev, lastNudgeAt: now }));
    if (tier === "overdue") flashMood("surprised");
    else flashMood("caring", 3000);
    speak({
      text,
      chips: [
        { label: "やった!✅", action: `done:${chosen.id}:_` },
        { label: "あとで⏰", action: `snooze:${chosen.id}:_` },
        { label: "もうやらない🗑", action: `giveup:${chosen.id}:_` },
      ],
    });
  }

  async function requestNotif() {
    if (typeof Notification === "undefined") {
      speak({ text: "あれ、このブラウザは通知に対応してないみたい…ごめんね!", notify: false });
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      speak({ text: "やった、通知オンにできたよ🔔 タブを見てない時もこっそり教えるね!", notify: false });
    } else if (perm === "denied") {
      speak({ text: "通知はオフのままにしておくね。気が向いたらブラウザの設定からいつでもオンにできるよ。", notify: false });
    }
  }

  function handleReset() {
    if (!window.confirm("会話とタスクを全部リセットする?元には戻せないよ!")) return;
    setTasks([]);
    setMessages([]);
    setMeta({ lastOpenDate: toISODate(new Date()), lastNudgeAt: 0 });
    setShowSettings(false);
    speak(POOLS.onboarding.map((text) => ({ text, notify: false })));
  }

  // one-time init: onboarding or daily greeting
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const today = toISODate(new Date());

    if (tasks.length === 0 && messages.length === 0) {
      const entries = POOLS.onboarding.map((text) => ({ text, notify: false }));
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        entries.push({
          text: "あ、もしよかったら通知もオンにしとく?アプリを見てない時もこっそり教えられるよ。",
          notify: false,
          chips: [{ label: "通知をオンにする🔔", action: "enable-notif:_:_" }],
        });
      }
      speak(entries);
    } else if (meta.lastOpenDate !== today) {
      const now = Date.now();
      const pending = tasks.filter((t) => !t.done);
      if (pending.length === 0) {
        speak({ text: pick(POOLS.dailyEmpty), notify: false });
      } else {
        const weights = pending.map((t) => urgencyScore(t, now));
        const chosen = weightedPick(pending, weights);
        speak({ text: pick(POOLS.dailyGreeting)(pending.length, chosen.text), notify: false });
      }
    }
    setMeta((prev) => ({ ...prev, lastOpenDate: today }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // periodic nudge tick while app is open
  useEffect(() => {
    const id = setInterval(() => maybeNudge(false), 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, settings.nudgeIntervalMinutes, meta.lastNudgeAt]);

  // catch up when the tab becomes visible again
  useEffect(() => {
    function onVisible() {
      if (!document.hidden) {
        setUnread(0);
        maybeNudge(false);
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, settings.nudgeIntervalMinutes, meta.lastNudgeAt]);

  // flash the tab title while there are unread nudges and the tab is hidden
  useEffect(() => {
    if (unread <= 0) {
      document.title = baseTitleRef.current;
      return;
    }
    let on = false;
    const id = setInterval(() => {
      document.title = on ? baseTitleRef.current : `(${unread}) 新着だよ!`;
      on = !on;
    }, 1200);
    return () => clearInterval(id);
  }, [unread]);

  // autoscroll
  useEffect(() => {
    if (nearBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      setShowJump(false);
    } else {
      setShowJump(true);
    }
  }, [messages, typing]);

  function handleScroll() {
    const el = bodyRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = distanceFromBottom < 60;
    if (nearBottomRef.current) setShowJump(false);
  }

  function scrollToBottom() {
    nearBottomRef.current = true;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    setShowJump(false);
  }

  const now = Date.now();
  const pendingCount = tasks.filter((t) => !t.done).length;
  const overdueCount = tasks.filter((t) => !t.done && isOverdue(t, now)).length;

  return (
    <div className="app-shell">
      <div className="chat-header">
        <FriendAvatar mood={mood} />
        <div className="header-info">
          <div className="friend-name">{settings.friendName}</div>
          <div className={`friend-sub ${overdueCount > 0 ? "overdue" : ""}`}>
            {pendingCount === 0
              ? "のんびり中〜"
              : overdueCount > 0
              ? `気になるタスク${pendingCount}件(期限切れ${overdueCount}件)`
              : `気になるタスク${pendingCount}件`}
          </div>
        </div>
        <div className="header-actions">
          <button title="通知" onClick={() => (notifPermission === "granted" ? setShowSettings(true) : requestNotif())}>
            {notifPermission === "granted" ? "🔔" : "🔕"}
          </button>
          <button title="タスク一覧" onClick={() => setShowTaskList(true)}>
            📋
          </button>
          <button title="設定" onClick={() => setShowSettings(true)}>
            ⚙️
          </button>
        </div>
      </div>

      <div className="chat-body" ref={bodyRef} onScroll={handleScroll}>
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} onChip={handleChip} />
        ))}
        {typing && <TypingBubble />}
        <div ref={endRef} />
      </div>

      {showJump && (
        <button className="jump-btn" onClick={scrollToBottom}>
          ↓ 新着メッセージ
        </button>
      )}

      {pendingDatePick && (
        <div className="date-pick-bar">
          <input
            type="date"
            min={toISODate(new Date())}
            value={datePickValue}
            onChange={(e) => setDatePickValue(e.target.value)}
          />
          <button onClick={confirmDatePick}>決定</button>
          <button onClick={() => setPendingDatePick(null)}>やめる</button>
        </div>
      )}

      <div className="composer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="気になってるタスクを教えて..."
        />
        <button onClick={handleSend} disabled={!input.trim()}>
          ➤
        </button>
      </div>

      {showTaskList && (
        <TaskListSheet
          tasks={tasks}
          onClose={() => setShowTaskList(false)}
          onDone={completeTask}
          onDelete={removeTask}
        />
      )}
      {showSettings && (
        <SettingsSheet
          settings={settings}
          setSettings={setSettings}
          notifPermission={notifPermission}
          onRequestNotif={requestNotif}
          onReset={handleReset}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
