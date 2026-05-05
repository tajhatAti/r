/* =========================================================
   Admin Panel — Lovable Cloud powered
   - Email/password auth (Supabase)
   - Server-side role check (user_roles + has_role RPC)
   - Direct CRUD on assignments, announcements, notifications
   - Live stats from get_visit_stats RPC
   ========================================================= */

const lc = window.lc;
const $ = (s) => document.querySelector(s);

let isAdmin = false;
let assignments = [];

/* ------------- Auth ------------- */
async function checkAuth() {
  const { data: { session } } = await lc.auth.getSession();
  if (!session) return showLogin();
  const { data: hasRoleData, error } = await lc.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
  isAdmin = !!hasRoleData;
  if (!isAdmin) {
    $("#adminStatus").textContent = `লগইন আছে: ${session.user.email} — তবে অ্যাডমিন রোল নেই। Lovable Cloud → Database → user_roles টেবিলে আপনার ইউজার আইডি যোগ করুন (role='admin').`;
    $("#adminStatus").innerHTML += `<br/><code style="font-size:11px;">user_id: ${session.user.id}</code>`;
    $("#logoutBtn").hidden = false;
    return;
  }
  showPanel(session.user.email);
}

function showLogin() {
  $("#loginCard").hidden = false;
  $("#adminPanel").hidden = true;
  $("#logoutBtn").hidden = true;
  $("#adminStatus").textContent = "অ্যাডমিন প্যানেলে প্রবেশ করতে লগইন করুন।";
}

function showPanel(email) {
  $("#loginCard").hidden = true;
  $("#adminPanel").hidden = false;
  $("#logoutBtn").hidden = false;
  $("#adminStatus").textContent = `স্বাগতম, ${email} (admin)`;
  init();
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#authError").style.display = "none";
  const { error } = await lc.auth.signInWithPassword({
    email: $("#email").value, password: $("#password").value,
  });
  if (error) { $("#authError").textContent = error.message; $("#authError").style.display = "block"; return; }
  checkAuth();
});

$("#signupBtn").addEventListener("click", async () => {
  $("#authError").style.display = "none";
  const email = $("#email").value, password = $("#password").value;
  if (!email || !password) { $("#authError").textContent = "ইমেইল ও পাসওয়ার্ড দিন"; $("#authError").style.display = "block"; return; }
  const { error } = await lc.auth.signUp({
    email, password,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  });
  if (error) { $("#authError").textContent = error.message; $("#authError").style.display = "block"; return; }
  $("#authError").style.color = "var(--success, #4ade80)";
  $("#authError").textContent = "সাইনআপ সফল! এখন Lovable Cloud → user_roles টেবিলে আপনার রোল 'admin' হিসেবে যোগ করুন, তারপর লগইন করুন।";
  $("#authError").style.display = "block";
});

$("#logoutBtn").addEventListener("click", async () => {
  await lc.auth.signOut();
  isAdmin = false;
  showLogin();
});

/* ------------- Stats ------------- */
async function refreshStats() {
  try {
    const { data } = await lc.rpc("get_visit_stats");
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      $("#aLive").textContent = row.live_count ?? "—";
      $("#aToday").textContent = row.today_count ?? "—";
      $("#aTotal").textContent = row.total_count ?? "—";
    }
  } catch {}
}

/* ------------- Assignments ------------- */
function hoursLeft(due) { return (new Date(due).getTime() - Date.now()) / 36e5; }
function daysLeft(due) { return Math.ceil(hoursLeft(due) / 24); }

async function loadAssignments() {
  const { data, error } = await lc.from("assignments").select("*").order("due_date", { ascending: true });
  if (error) { console.warn(error); return; }
  assignments = data || [];
  renderList();
}

function renderList() {
  const sorted = [...assignments].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return new Date(a.due_date) - new Date(b.due_date);
  });
  $("#count").textContent = sorted.length;
  const list = $("#adminList");
  if (!sorted.length) { list.innerHTML = `<li class="empty-day bn">এখনো কোনো অ্যাসাইনমেন্ট নেই</li>`; return; }
  list.innerHTML = sorted.map(a => {
    const h = hoursLeft(a.due_date);
    const urgent = !a.done && h <= 48 && h > 0;
    const dl = daysLeft(a.due_date);
    const dueText = a.done ? "সম্পন্ন" : (h <= 0 ? "মেয়াদোত্তীর্ণ" : (dl <= 1 ? `${Math.max(0, Math.round(h))} ঘণ্টা` : `${dl} দিন`));
    return `<li class="assign-item ${a.done ? "done" : ""} ${urgent ? "urgent" : ""}" data-id="${a.id}">
      <button class="assign-check" data-action="toggle" title="সম্পন্ন">${a.done ? "✓" : ""}</button>
      <div>
        <div class="assign-title bn">${a.title}</div>
        <div class="assign-sub bn">${a.subject} · 📅 ${new Date(a.due_date).toLocaleDateString("bn-BD")}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <span class="assign-due bn">${dueText}</span>
        <button class="assign-del" data-action="del" title="মুছুন">✕</button>
      </div>
    </li>`;
  }).join("");
}

/* ------------- Init ------------- */
function init() {
  loadAssignments();
  refreshStats();
  loadCurrentAnnouncement();
  setInterval(refreshStats, 10_000);

  // Realtime
  lc.channel("admin-assignments")
    .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, loadAssignments).subscribe();

  $("#adminList").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]"); if (!btn) return;
    const id = btn.closest(".assign-item").dataset.id;
    if (btn.dataset.action === "toggle") {
      const a = assignments.find(x => x.id === id);
      await lc.from("assignments").update({ done: !a.done }).eq("id", id);
    } else if (btn.dataset.action === "del") {
      if (!confirm("মুছে ফেলবেন?")) return;
      await lc.from("assignments").delete().eq("id", id);
    }
    loadAssignments();
  });

  $("#addForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#aTitle").value.trim(), subject = $("#aSubject").value.trim(), due = $("#aDue").value;
    if (!title || !subject || !due) return;
    const { error } = await lc.from("assignments").insert({
      title, subject, due_date: new Date(`${due}T23:59:00`).toISOString(), done: false
    });
    if (error) return alert(error.message);
    e.target.reset();
    loadAssignments();
  });

  $("#loadBtn").addEventListener("click", loadAssignments);

  // Announcement
  $("#annForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("#annMsg").value.trim();
    if (!msg) return;
    // Deactivate previous + insert new (only one active at a time)
    await lc.from("announcements").update({ active: false }).eq("active", true);
    const { error } = await lc.from("announcements").insert({ message: msg, active: true });
    if (error) return alert(error.message);
    $("#annMsg").value = "";
    loadCurrentAnnouncement();
  });
  $("#annClear").addEventListener("click", async () => {
    await lc.from("announcements").update({ active: false }).eq("active", true);
    loadCurrentAnnouncement();
  });

  // Notifications
  $("#notifForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = $("#nMessage").value.trim();
    if (!message) return;
    const payload = {
      title: $("#nTitle").value.trim() || null,
      message,
      type: $("#nType").value,
      active: true,
      expires_at: $("#nExpire").value ? new Date($("#nExpire").value).toISOString() : null,
    };
    const { error } = await lc.from("notifications").insert(payload);
    if (error) return alert(error.message);
    e.target.reset();
    alert("✅ নোটিফিকেশন পাঠানো হয়েছে! সকল ব্যবহারকারী এখনই দেখবে।");
  });
}

async function loadCurrentAnnouncement() {
  const { data } = await lc.from("announcements").select("message").eq("active", true)
    .order("created_at", { ascending: false }).limit(1);
  $("#annCurrent").textContent = (data && data[0]) ? `বর্তমান: "${data[0].message}"` : "এখন কোনো ব্যানার সক্রিয় নেই।";
}

checkAuth();
