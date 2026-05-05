/* =========================================================
   Smart Agriculture Student Portal — Vanilla JS
   - Smart Focus Mode (time-aware Bengali messages)
   - Live class progress bar
   - Read-only assignments (loaded from assignments.json)
   - GPA calculator
   ========================================================= */

/* -------------------- 1. DATA: Class Routine -------------------- */
// Day index: 0=Sunday ... 6=Saturday
const DAY_FULL_BN = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

const ROUTINE = {
  0: [ // রবিবার
    { subject: "পদার্থ বিজ্ঞান-২", startTime: "10:20", endTime: "11:05", room: "R-110", type: "theory" },
    { subject: "জীব বিজ্ঞান-২",   startTime: "11:10", endTime: "11:55", room: "R-110", type: "theory" },
    { subject: "রসায়ন-২",         startTime: "12:00", endTime: "12:45", room: "R-110", type: "theory" },
    { subject: "কৃষি তাত্ত্বিক ফসলের উৎপাদন প্রযুক্তি-১", startTime: "12:50", endTime: "13:35", room: "R-110", type: "theory" },
  ],
  1: [ // সোমবার
    { subject: "ইংরেজি-২",         startTime: "10:20", endTime: "11:05", room: "R-110", type: "theory" },
    { subject: "পদার্থ বিজ্ঞান-২", startTime: "11:10", endTime: "11:55", room: "R-110", type: "theory" },
    { subject: "বাংলা-২",          startTime: "12:00", endTime: "12:45", room: "R-110", type: "theory" },
    { subject: "রসায়ন-২",         startTime: "12:50", endTime: "13:35", room: "R-110", type: "theory" },
  ],
  2: [ // মঙ্গলবার
    { subject: "কম্পিউটার অ্যাপ্লিকেশন",       startTime: "09:30", endTime: "10:15", room: "R-110", type: "practical" },
    { subject: "ভূমি আর্দ্রতা সংরক্ষণ (ব্যব)", startTime: "10:20", endTime: "11:05", room: "R-110", type: "practical" },
    { subject: "জীব বিজ্ঞান-২ (ব্যব)",         startTime: "11:10", endTime: "11:55", room: "R-110", type: "practical" },
    { subject: "রসায়ন (ব্যব)",                 startTime: "12:50", endTime: "13:35", room: "R-110", type: "practical" },
  ],
  3: [ // বুধবার
    { subject: "বাংলা-২",                 startTime: "10:20", endTime: "11:05", room: "R-110", type: "theory" },
    { subject: "পদার্থ বিজ্ঞান-২ (ব্যব)", startTime: "11:10", endTime: "11:55", room: "R-110", type: "practical" },
    { subject: "ইংরেজি",                  startTime: "12:00", endTime: "12:45", room: "R-110", type: "theory" },
  ],
  4: [], // বৃহস্পতিবার — ছুটি
  5: [], // শুক্রবার — ছুটি
  6: [], // শনিবার — ছুটি
};

/* -------------------- 2. UTILITIES -------------------- */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const fmt2 = (n) => String(n).padStart(2, "0");
const nowMin = (d) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
// 24-hr "HH:MM" → 12-hr "h:MM AM/PM"
function fmt12(hhmm) {
  if (!hhmm) return "";
  const [H, M] = hhmm.split(":").map(Number);
  const ampm = H >= 12 ? "PM" : "AM";
  const h = H % 12 || 12;
  return `${h}:${fmt2(M)} ${ampm}`;
}

function fmtCountdown(mins) {
  if (mins <= 0) return "এখনই";
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return h > 0 ? `${h} ঘণ্টা ${m} মিনিট` : `${m} মিনিট`;
}

function nextDayWithClasses(from) {
  for (let i = 1; i <= 7; i++) {
    const idx = (from + i) % 7;
    if ((ROUTINE[idx] || []).length > 0) return idx;
  }
  return (from + 1) % 7;
}

/* -------------------- 3. LOGIC ENGINE -------------------- */
function getDynamicState(now = new Date()) {
  const dayIndex = now.getDay();
  const todayClasses = ROUTINE[dayIndex] || [];
  const cur = nowMin(now);
  // Weekend per user spec: Thu(4), Fri(5), Sat(6)
  const isWeekend = dayIndex === 4 || dayIndex === 5 || dayIndex === 6;

  let activeClass = null, activeProgress = 0, activeStart = 0, activeEnd = 0;
  let nextClass = null, minutesToNext = null;
  let prevClass = null;

  for (const c of todayClasses) {
    const s = toMin(c.startTime), e = toMin(c.endTime);
    if (cur >= s && cur < e) {
      activeClass = c; activeProgress = (cur - s) / (e - s);
      activeStart = s; activeEnd = e; break;
    }
  }
  if (!activeClass) {
    for (const c of todayClasses) {
      const s = toMin(c.startTime);
      if (s > cur) { nextClass = c; minutesToNext = s - cur; break; }
      prevClass = c;
    }
  }
  const lastEnd = todayClasses.length ? todayClasses[todayClasses.length - 1].endTime : null;
  const afterHours = lastEnd != null && cur >= toMin(lastEnd);
  const beforeFirst = todayClasses.length && cur < toMin(todayClasses[0].startTime);

  let mode;
  if (isWeekend) mode = "weekend";
  else if (activeClass) mode = "active-class";
  else if (beforeFirst) mode = "before-classes";
  else if (afterHours || todayClasses.length === 0) mode = "after-hours";
  else mode = "between-classes";

  const upcomingDayIndex = (mode === "after-hours" || mode === "weekend")
    ? nextDayWithClasses(dayIndex) : dayIndex;

  return { now, dayIndex, isWeekend, todayClasses,
           activeClass, activeProgress, activeStart, activeEnd,
           nextClass, minutesToNext, prevClass,
           lastEnd, mode, upcomingDayIndex,
           upcomingClasses: ROUTINE[upcomingDayIndex] || [] };
}

/* -------------------- 4. SMART FOCUS MODE (AI-like messages) -------------------- */
function getFocusContext(state) {
  const d = state.now;
  const hour = d.getHours();
  const cur = nowMin(d);

  // 1) Active class — highest priority
  if (state.mode === "active-class") {
    const remaining = Math.max(0, Math.round(state.activeEnd - cur));
    const elapsed   = Math.max(0, Math.round(cur - state.activeStart));
    return {
      icon: "🔴",
      tag: "ক্লাস চলছে",
      message: `${state.activeClass.subject} ক্লাস চলছে`,
      sub: `📍 ${state.activeClass.room || ""} · শেষ হবে ${fmt12(state.activeClass.endTime)}-এ`,
      progress: {
        label: `${elapsed} মিনিট পার · ${remaining} মিনিট বাকি`,
        pct: Math.round(state.activeProgress * 100),
        time: `${fmt12(state.activeClass.startTime)} → ${fmt12(state.activeClass.endTime)}`,
      },
      pulse: true,
    };
  }

  // 2) Weekend (Thu/Fri/Sat)
  if (state.mode === "weekend") {
    return {
      icon: "🌴",
      tag: "ছুটির দিন",
      message: "আজ ছুটি 🌴",
      sub: `বিশ্রাম নাও এবং পেন্ডিং অ্যাসাইনমেন্ট শেষ করো · পরবর্তী ক্লাস: ${DAY_FULL_BN[state.upcomingDayIndex]}`,
    };
  }

  // 3) Between classes (break)
  if (state.mode === "between-classes" && state.nextClass) {
    return {
      icon: "☕",
      tag: "বিরতি",
      message: `বিরতি চলছে ☕`,
      sub: `${fmtCountdown(state.minutesToNext)} পরে ${state.nextClass.subject} ক্লাস শুরু হবে`,
    };
  }

  // 4) Before first class
  if (state.mode === "before-classes" && state.nextClass) {
    return {
      icon: "⏰",
      tag: "ক্লাস শুরুর আগে",
      message: `ক্লাস শুরুর আগে ⏰`,
      sub: `ব্যাগ গুছিয়ে নাও · ${fmtCountdown(state.minutesToNext)} বাকি (${state.nextClass.subject})`,
    };
  }

  // 5) After classes — time-of-day based
  // Early morning 4–7 AM
  if (hour >= 4 && hour < 7) {
    return {
      icon: "🌅",
      tag: "ভোর",
      message: "ভোর হয়েছে 🌅",
      sub: "ফজরের পরে পড়লে বেশি মনে থাকে — মূল টপিকগুলো এখন রিভিশন করো",
    };
  }
  // Late night 10 PM – 12 AM
  if (hour >= 22 && hour < 24) {
    return {
      icon: "😴",
      tag: "বেশি রাত",
      message: "বেশি রাত হয়েছে 😴",
      sub: "ঘুমানোর সময় — সকালে উঠে পড়াশোনা করলে ভালো ফল পাবে",
    };
  }
  // Deep night 12 AM – 4 AM
  if (hour >= 0 && hour < 4) {
    return {
      icon: "🌙",
      tag: "গভীর রাত",
      message: "অনেক রাত হয়ে গেছে 🌙",
      sub: "এখনই ঘুমিয়ে পড়ো — শরীরের বিশ্রাম দরকার",
    };
  }
  // Night 7–10 PM
  if (hour >= 19 && hour < 22) {
    return {
      icon: "🌙",
      tag: "রাত",
      message: "রাত হয়েছে 🌙",
      sub: "গুরুত্বপূর্ণ টপিক রিভিশন করো — আগামীকালের ক্লাসের প্রস্তুতি নাও",
    };
  }
  // Evening 4–7 PM
  if (hour >= 16 && hour < 19) {
    return {
      icon: "📚",
      tag: "সন্ধ্যা",
      message: "সন্ধ্যা হয়েছে 📚",
      sub: "পড়াশোনার সময় — অ্যাসাইনমেন্ট কমপ্লিট করো",
    };
  }
  // After last class 1 PM – 4 PM (relax)
  if (hour >= 13 && hour < 16) {
    return {
      icon: "🎮",
      tag: "রিল্যাক্স",
      message: "ক্লাস শেষ! 🎮",
      sub: "খেলার সময় বা রিল্যাক্স করো — মনটাকে একটু বিশ্রাম দাও",
    };
  }
  // Morning 7 AM – first class (fallback if no class today)
  return {
    icon: "☀️",
    tag: "সকাল",
    message: "শুভ সকাল ☀️",
    sub: "নতুন দিন — পড়াশোনার জন্য নিজেকে প্রস্তুত করো",
  };
}

function renderFocus(state) {
  const ctx = getFocusContext(state);
  const card = $("#focusCard");
  $("#focusIcon").textContent = ctx.icon;
  $("#focusTag").textContent = ctx.tag;
  $("#focusMessage").textContent = ctx.message;
  $("#focusSub").textContent = ctx.sub || "";

  card.classList.toggle("pulse", !!ctx.pulse);

  const wrap = $("#focusProgressWrap");
  if (ctx.progress) {
    wrap.hidden = false;
    $("#focusProgressLabel").textContent = ctx.progress.label;
    $("#focusProgressPct").textContent = `${ctx.progress.pct}%`;
    $("#focusProgressBar").style.width = `${ctx.progress.pct}%`;
    $("#focusProgressTime").textContent = ctx.progress.time;
  } else {
    wrap.hidden = true;
  }

  // Next-day routine preview — shown after hours, weekend, or before classes
  const preview = $("#nextDayPreview");
  const showPreview =
    state.mode === "after-hours" ||
    state.mode === "weekend" ||
    state.mode === "before-classes";
  if (showPreview && state.upcomingClasses && state.upcomingClasses.length) {
    preview.hidden = false;
    const dayLabel = (state.mode === "before-classes")
      ? `আজকের রুটিন · ${DAY_FULL_BN[state.dayIndex]}`
      : `আগামী দিনের রুটিন · ${DAY_FULL_BN[state.upcomingDayIndex]}`;
    $("#nextDayTitle").textContent = dayLabel;
    $("#nextDayList").innerHTML = state.upcomingClasses.map(c => `
      <div class="next-day-row">
        <span class="nd-time">${fmt12(c.startTime)} – ${fmt12(c.endTime)}</span>
        <span class="nd-subject bn">${c.subject}</span>
        <span class="nd-tag ${c.type || "theory"}">${c.type === "practical" ? "ব্যব" : "তত্ত্ব"}</span>
      </div>`).join("");
  } else {
    preview.hidden = true;
  }
}

/* -------------------- 5. RENDER: Hero + Priority -------------------- */
const POETIC_WORDS = ["যে", "সময়", "যাইতেছে", "তাহা", "আর", "ফিরিবিনা", "বৎস", "🙂"];
let poeticIdx = 0;

function renderPoeticTick() {
  const host = $("#poeticWords");
  if (!host) return;
  // Build full sentence with the current "highlighted" word re-animating
  host.innerHTML = POETIC_WORDS.map((w, i) =>
    `<span class="poetic-word" style="animation-delay:${i * 0.08}s">${w}</span>`
  ).join("");
  // Trigger a re-flash on one word every cycle for the "transition slide" feel
  setTimeout(() => {
    const spans = host.querySelectorAll(".poetic-word");
    if (!spans.length) return;
    const flash = spans[poeticIdx % spans.length];
    flash.style.animation = "none";
    // force reflow
    void flash.offsetWidth;
    flash.style.animation = "word-in 0.5s cubic-bezier(0.2,0.9,0.3,1) forwards, word-shine 1.6s ease-in-out forwards";
    poeticIdx++;
  }, POETIC_WORDS.length * 80 + 200);
}

function renderHeroAndPriority(state) {
  const d = state.now;
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  $("#clock").textContent = `${fmt2(h)}:${fmt2(d.getMinutes())}:${fmt2(d.getSeconds())} ${ampm}`;
  $("#dateLine").textContent = `${DAY_FULL_BN[d.getDay()]} · ${d.toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" })}`;

  const card = $("#priorityCard");
  card.classList.remove("active");

  let badge = "Top Priority", subject = "—", meta = "", status = "", progress = 0;

  if (state.mode === "weekend") {
    badge = "🌴 ছুটির দিন"; subject = "সাপ্তাহিক বিশ্রাম";
    meta = `পরবর্তী ক্লাসের দিন: ${DAY_FULL_BN[state.upcomingDayIndex]}`;
    status = "অ্যাসাইনমেন্ট সম্পন্ন করুন এবং বিশ্রাম নিন।";
  } else if (state.mode === "active-class") {
    card.classList.add("active");
    badge = "🔴 চলমান ক্লাস"; subject = state.activeClass.subject;
    meta = `${fmt12(state.activeClass.startTime)} – ${fmt12(state.activeClass.endTime)} · ${state.activeClass.room || ""}`;
    progress = state.activeProgress * 100;
    status = `ক্লাস চলছে — ${Math.round(progress)}% সম্পন্ন`;
  } else if (state.mode === "before-classes" && state.nextClass) {
    badge = "⏳ পরবর্তী ক্লাস"; subject = state.nextClass.subject;
    meta = `${fmt12(state.nextClass.startTime)} – ${fmt12(state.nextClass.endTime)} · ${state.nextClass.room || ""}`;
    status = `শুরু হবে ${fmtCountdown(state.minutesToNext)} পরে`;
    $("#priorityCountdown").textContent = fmtCountdown(state.minutesToNext);
  } else if (state.mode === "between-classes" && state.nextClass) {
    badge = "☕ বিরতি"; subject = state.nextClass.subject;
    meta = `${fmt12(state.nextClass.startTime)} – ${fmt12(state.nextClass.endTime)} · ${state.nextClass.room || ""}`;
    status = `${fmtCountdown(state.minutesToNext)} পরে শুরু`;
    $("#priorityCountdown").textContent = fmtCountdown(state.minutesToNext);
  } else if (state.mode === "after-hours") {
    badge = "🌙 আজকের ক্লাস শেষ"; subject = "আগামীকালের প্রস্তুতি";
    meta = `পরবর্তী দিন: ${DAY_FULL_BN[state.upcomingDayIndex]} · ${state.upcomingClasses.length} টি ক্লাস`;
    status = "নোট রিভিউ ও অ্যাসাইনমেন্ট সম্পন্ন করুন।";
  }

  $("#priorityBadge").textContent = badge;
  $("#prioritySubject").textContent = subject;
  $("#priorityMeta").textContent = meta;
  $("#priorityProgress").style.width = `${progress}%`;
  $("#statusLine").textContent = status;
  if (state.mode !== "before-classes" && state.mode !== "between-classes") {
    $("#priorityCountdown").textContent = "";
  }
}

/* -------------------- 6. RENDER: Schedule -------------------- */
let currentView = "today";
function renderSchedule(state) {
  const body = $("#scheduleBody");
  const cur = nowMin(state.now);

  const renderDayList = (classes, todayDay) => {
    if (!classes.length) return `<p class="empty-day bn">কোনো ক্লাস নেই — বিশ্রামের দিন 🌿</p>`;
    return classes.map(c => {
      const s = toMin(c.startTime), e = toMin(c.endTime);
      const isNow = todayDay && cur >= s && cur < e;
      const isDone = todayDay && cur >= e;
      const cls = ["class-card"]; if (isNow) cls.push("now"); if (isDone) cls.push("done");
      return `<div class="${cls.join(" ")}">
        <div class="class-time mono">${fmt12(c.startTime)}<br/>${fmt12(c.endTime)}</div>
        <div>
          <div class="class-subject">${c.subject}</div>
          <div class="class-room">${c.room || ""}</div>
        </div>
        <span class="class-tag ${c.type || "theory"}">${c.type === "practical" ? "ব্যব" : "তত্ত্ব"}</span>
      </div>`;
    }).join("");
  };

  if (currentView === "today") {
    body.innerHTML = renderDayList(state.todayClasses, true);
  } else if (currentView === "tomorrow") {
    const tIdx = (state.dayIndex + 1) % 7;
    body.innerHTML = `<h4 class="bn">${DAY_FULL_BN[tIdx]}</h4>` + renderDayList(ROUTINE[tIdx] || [], false);
  } else { // week
    body.innerHTML = [0,1,2,3,4,5,6].map(idx =>
      `<div class="day-group">
         <h4 class="bn">${DAY_FULL_BN[idx]}${idx === state.dayIndex ? " · আজ" : ""}</h4>
         ${renderDayList(ROUTINE[idx] || [], idx === state.dayIndex)}
       </div>`
    ).join("");
  }
}

$$(".tab").forEach(btn => btn.addEventListener("click", () => {
  $$(".tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentView = btn.dataset.view;
  renderSchedule(getDynamicState());
}));

/* -------------------- 7. ASSIGNMENTS (live from Lovable Cloud) -------------------- */
let assignments = [];

async function loadAssignments() {
  try {
    const { data, error } = await window.lc
      .from("assignments")
      .select("id,title,subject,due_date,done")
      .order("due_date", { ascending: true });
    if (error) throw error;
    assignments = (data || []).map(a => ({
      id: a.id, title: a.title, subject: a.subject, dueDate: a.due_date, done: a.done
    }));
  } catch (e) {
    console.warn("Failed to load assignments from Cloud", e);
    assignments = [];
  }
  renderAssignments();
}

// Realtime subscription so changes from admin appear instantly
window.lc.channel("assignments-rt")
  .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => loadAssignments())
  .subscribe();

function hoursLeft(due) { return (new Date(due).getTime() - Date.now()) / 36e5; }
function daysLeft(due)  { return Math.ceil(hoursLeft(due) / 24); }

function renderAssignments() {
  const list = $("#assignList");
  const sorted = [...assignments].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
  if (!sorted.length) { list.innerHTML = `<li class="empty-day bn">কোনো অ্যাসাইনমেন্ট নেই 🎉</li>`; return; }
  list.innerHTML = sorted.map(a => {
    const h = hoursLeft(a.dueDate);
    const urgent = !a.done && h <= 48 && h > 0;
    const dl = daysLeft(a.dueDate);
    const dueText = a.done ? "সম্পন্ন" : (h <= 0 ? "মেয়াদোত্তীর্ণ" : (dl <= 1 ? `${Math.max(0, Math.round(h))} ঘণ্টা` : `${dl} দিন`));
    return `<li class="assign-item ${a.done ? "done" : ""} ${urgent ? "urgent" : ""}">
      <span class="assign-check ro">${a.done ? "✓" : ""}</span>
      <div>
        <div class="assign-title bn">${a.title}</div>
        <div class="assign-sub bn">${a.subject}</div>
      </div>
      <span class="assign-due bn">${dueText}</span>
    </li>`;
  }).join("");
}

/* -------------------- 8. GPA CALCULATOR -------------------- */
const GRADE_POINTS = { "A+": 4.0, "A": 3.75, "A-": 3.5, "B+": 3.25, "B": 3.0, "B-": 2.75, "C+": 2.5, "C": 2.25, "D": 2.0, "F": 0 };
let gpaCourses = [{ name: "", credit: 3, grade: "A" }];

function renderGpa() {
  $("#gpaRows").innerHTML = gpaCourses.map((c, i) => `
    <div class="gpa-row">
      <input data-i="${i}" data-k="name" placeholder="কোর্স" value="${c.name}" />
      <input data-i="${i}" data-k="credit" type="number" min="0" step="0.5" value="${c.credit}" />
      <select data-i="${i}" data-k="grade">
        ${Object.keys(GRADE_POINTS).map(g => `<option ${g === c.grade ? "selected" : ""}>${g}</option>`).join("")}
      </select>
      <button class="btn-icon" data-rm="${i}" title="মুছুন">✕</button>
    </div>`).join("");
}
$("#gpaRows").addEventListener("input", (e) => {
  const i = +e.target.dataset.i, k = e.target.dataset.k;
  if (k != null) gpaCourses[i][k] = k === "credit" ? +e.target.value : e.target.value;
});
$("#gpaRows").addEventListener("click", (e) => {
  if (e.target.dataset.rm != null) {
    gpaCourses.splice(+e.target.dataset.rm, 1);
    if (!gpaCourses.length) gpaCourses.push({ name: "", credit: 3, grade: "A" });
    renderGpa();
  }
});
$("#gpaAdd").addEventListener("click", () => { gpaCourses.push({ name: "", credit: 3, grade: "A" }); renderGpa(); });
$("#gpaCalc").addEventListener("click", () => {
  let totalC = 0, totalP = 0;
  gpaCourses.forEach(c => { const cr = +c.credit || 0; totalC += cr; totalP += cr * (GRADE_POINTS[c.grade] || 0); });
  const gpa = totalC ? (totalP / totalC).toFixed(2) : "—";
  $("#gpaResult").textContent = `GPA: ${gpa}  (Credits: ${totalC})`;
});
$("#gpaToggle").addEventListener("click", () => { $("#gpaModal").hidden = false; renderGpa(); });
$("#gpaClose").addEventListener("click", () => { $("#gpaModal").hidden = true; });
$("#gpaModal").addEventListener("click", (e) => { if (e.target.id === "gpaModal") $("#gpaModal").hidden = true; });

/* -------------------- 9. MAIN LOOP -------------------- */
function tick() {
  const state = getDynamicState();
  renderHeroAndPriority(state);
  renderFocus(state);
  renderSchedule(state);
}
tick();
loadAssignments();
renderPoeticTick();
setInterval(tick, 1000);
setInterval(renderAssignments, 60000);
