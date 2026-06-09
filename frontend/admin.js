// NextDate — standalone admin portal.
// Lives at /admin.html, separate from the main app. Reuses the same
// backend (/auth/login, /admin/*) and the same admin-* CSS classes from
// styles.css. Hard-fails any non-admin signin attempt so the dashboard
// only ever renders to a confirmed admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL      = "https://wkdamyjswlixzkwehxyc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZGFteWpzd2xpeHprd2VoeHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzgyNTksImV4cCI6MjA5NTkxNDI1OX0.8CuPl4ZhLwZ2MPW6DUnuRNcZKQyzpw-SLdg6C8KYxcg";
const BACKEND_URL       = "https://nextdate-5may.onrender.com";

const ADMIN_TOKEN_KEY = "nd_admin_token";
const ADMIN_USER_KEY  = "nd_admin_user";   // { id, email, nickname }

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);

function toast(msg, ms = 2800) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.style.display = "none"), ms);
}

function fmtRelative(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)      return "just now";
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)  return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

// ---------- session ----------
const tokens = {
  get: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  set: (t) => localStorage.setItem(ADMIN_TOKEN_KEY, t),
  clear: () => { localStorage.removeItem(ADMIN_TOKEN_KEY); localStorage.removeItem(ADMIN_USER_KEY); },
};
const cachedUser = {
  get: () => { try { return JSON.parse(localStorage.getItem(ADMIN_USER_KEY) || "null"); } catch { return null; } },
  set: (u) => localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(u)),
};

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = tokens.get();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail = data?.detail || res.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

// We use the supabase client to read the caller's own profile (to check
// is_admin) right after a successful login. Anything beyond that goes
// through /admin/* on the backend, which re-checks is_admin server-side.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchSelfProfile(token, userId) {
  // The supabase client doesn't inherit the bearer header from above, so
  // pipe the admin's token through explicitly for this single call.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,email,nickname,is_admin`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] : null;
}

// ---------- views ----------
function showLogin(message = "") {
  $("#admin-dash").classList.add("hidden");
  $("#admin-login").classList.remove("hidden");
  const err = $("#admin-login-error");
  err.textContent = message;
  err.classList.toggle("hidden", !message);
}

function showDashboard(user) {
  $("#admin-login").classList.add("hidden");
  $("#admin-dash").classList.remove("hidden");
  $("#admin-portal-as").textContent = `· signed in as ${user.nickname || user.email}`;
}

// ---------- login ----------
async function doSignin() {
  const email = $("#admin-email").value.trim();
  const password = $("#admin-password").value;
  if (!email || !password) {
    showLogin("Enter email and password.");
    return;
  }
  const btn = $("#admin-signin");
  btn.disabled = true; btn.textContent = "Signing in…";
  try {
    const res = await api("/auth/login", { method: "POST", body: { email, password }, auth: false });
    tokens.set(res.token);
    const profile = await fetchSelfProfile(res.token, res.user_id);
    if (!profile?.is_admin) {
      tokens.clear();
      showLogin("This account isn't an admin.");
      return;
    }
    const user = { id: res.user_id, email: res.email, nickname: profile.nickname };
    cachedUser.set(user);
    showDashboard(user);
    await renderDashboard();
  } catch (err) {
    tokens.clear();
    showLogin(err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Sign in";
  }
}

function doSignout() {
  tokens.clear();
  showLogin("");
  $("#admin-email").value = "";
  $("#admin-password").value = "";
  $("#admin-portal-as").textContent = "";
}

// ---------- dashboard ----------
let allUsers = [];

function paintUsers(filter = "") {
  const list = $("#admin-users-list");
  const q = filter.trim().toLowerCase();
  const visible = !q ? allUsers : allUsers.filter((u) => {
    const hay = [
      u.nickname, u.email, u.private?.real_name, u.private?.country, u.private?.cohort,
      u.ref_campaign,
      ...(u.prefs?.interests || []), ...(u.prefs?.hobbies || []),
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
  list.innerHTML = "";
  for (const u of visible) {
    const priv = u.private || {};
    const prefs = u.prefs || {};
    const tagBits = [
      ...(prefs.interests || []).slice(0, 4),
      ...(prefs.hobbies || []).slice(0, 3),
    ].map((t) => `<span class="admin-tag">${escapeHtml(t)}</span>`).join("");

    const adminPill    = u.is_admin    ? `<span class="admin-pill">ADMIN</span>` : "";
    const incompletePill = !u.has_profile ? `<span class="admin-pill incomplete">NO PROFILE</span>` : "";
    const refPill      = u.ref_campaign ? `<span class="admin-pill ref">via ${escapeHtml(u.ref_campaign)}</span>` : "";

    // Show first letter of email as avatar fallback when no emoji set
    const avatarContent = u.avatar_url
      ? escapeHtml(u.avatar_url)
      : `<span class="admin-avatar-init">${escapeHtml((u.nickname || u.email || "?")[0].toUpperCase())}</span>`;

    const card = document.createElement("div");
    card.className = "admin-user-card";
    card.innerHTML = `
      <div class="admin-user-head">
        <div class="admin-avatar">${avatarContent}</div>
        <div class="admin-user-meta">
          <div class="admin-user-name">${escapeHtml(u.nickname || u.email.split("@")[0])} ${adminPill}${incompletePill}${refPill}</div>
          <div class="admin-user-sub">${escapeHtml(u.email)} · ${escapeHtml(u.gender || "—")} · ${escapeHtml(u.zodiac_sign || "—")}</div>
        </div>
        <div class="admin-user-actions">
          <button class="btn danger small admin-delete" type="button" data-id="${escapeHtml(u.id)}" ${u.is_admin ? "disabled title=\"Remove from admin allowlist first\"" : ""}>Delete</button>
        </div>
      </div>
      <div class="admin-user-body">
        <div class="admin-info-grid">
          <div class="admin-row"><span class="admin-label">Real name</span><span>${escapeHtml(priv.real_name || "—")}</span></div>
          <div class="admin-row"><span class="admin-label">Age</span><span>${escapeHtml(String(priv.age || "—"))}</span></div>
          <div class="admin-row"><span class="admin-label">Country</span><span>${escapeHtml(priv.country || "—")}</span></div>
          <div class="admin-row"><span class="admin-label">Cohort</span><span>${escapeHtml(priv.cohort || "—")}</span></div>
          <div class="admin-row"><span class="admin-label">Looking for</span><span>${escapeHtml(prefs.target_intent || "—")} · ${escapeHtml(prefs.term_length || "—")}</span></div>
          <div class="admin-row"><span class="admin-label">Joined</span><span>${escapeHtml(fmtRelative(u.created_at))}</span></div>
        </div>
        ${tagBits ? `<div class="admin-tags">${tagBits}</div>` : ""}
      </div>`;
    list.appendChild(card);
  }
  if (!visible.length) {
    list.innerHTML = `<div class="admin-empty">No users match.</div>`;
  }
}

let allReportsAll = [];   // unfiltered — used only for stats

function updateStats() {
  const total    = allUsers.length;
  const withProf = allUsers.filter((u) => u.has_profile).length;
  const admins   = allUsers.filter((u) => u.is_admin).length;
  const openRep  = allReportsAll.filter((r) => r.status === "open").length;
  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s("stat-total",      total);
  s("stat-profiles",   withProf);
  s("stat-open",       openRep);
  s("stat-admins-val", admins);
}

function paintReports(rows) {
  const list = $("#admin-reports-list");
  $("#admin-reports-count").textContent = rows.length;
  list.innerHTML = "";
  for (const r of rows) {
    const reporter = r.reporter?.nickname || r.reporter?.email || (r.reporter_id || "").slice(0, 8);
    const reported = r.reported?.nickname || r.reported?.email || (r.reported_id || "").slice(0, 8);
    const statusClass = r.status === "open" ? "open" : r.status === "resolved" ? "resolved" : "dismissed";
    const card = document.createElement("div");
    card.className = "admin-report-card";
    card.innerHTML = `
      <div class="admin-report-head">
        <span class="admin-report-status ${statusClass}">${escapeHtml(r.status)}</span>
        <span class="admin-report-reason">${escapeHtml(r.reason || "—")}</span>
        <span class="admin-report-time muted">${escapeHtml(fmtRelative(r.created_at))}</span>
      </div>
      <div class="admin-report-body">
        <div><b>${escapeHtml(reporter)}</b> reported <b>${escapeHtml(reported)}</b></div>
        ${r.details ? `<div class="admin-report-details">"${escapeHtml(r.details)}"</div>` : ""}
      </div>
      <div class="admin-report-actions">
        ${r.status === "open" ? `
          <button class="btn small admin-resolve" data-id="${escapeHtml(r.id)}" data-status="resolved">Resolve</button>
          <button class="btn ghost small admin-resolve" data-id="${escapeHtml(r.id)}" data-status="dismissed">Dismiss</button>` : `
          <button class="btn ghost small admin-resolve" data-id="${escapeHtml(r.id)}" data-status="open">Reopen</button>`}
      </div>`;
    list.appendChild(card);
  }
  if (!rows.length) {
    list.innerHTML = `<div class="admin-empty">Nothing here.</div>`;
  }
}

async function loadUsers() {
  try {
    allUsers = await api("/admin/users");
    $("#admin-users-count").textContent = allUsers.length;
    paintUsers($("#admin-user-search").value || "");
    updateStats();
  } catch (err) {
    toast(err.message);
    $("#admin-users-list").innerHTML = `<div class="admin-empty">${escapeHtml(err.message)}</div>`;
  }
}

async function loadReports() {
  try {
    const status = $("#admin-report-filter").value;
    const path = status ? `/admin/reports?status=${encodeURIComponent(status)}` : "/admin/reports";
    const rows = await api(path);
    paintReports(rows);
  } catch (err) {
    toast(err.message);
    $("#admin-reports-list").innerHTML = `<div class="admin-empty">${escapeHtml(err.message)}</div>`;
  }
}

function paintEmails(rows) {
  const list = $("#admin-emails-list");
  $("#admin-admins-count").textContent = rows.length;
  list.innerHTML = "";
  const meEmail = (cachedUser.get()?.email || "").toLowerCase();
  for (const r of rows) {
    const isMe = r.email.toLowerCase() === meEmail;
    const card = document.createElement("div");
    card.className = "admin-email-row";
    card.innerHTML = `
      <div class="admin-email-meta">
        <div class="admin-email-addr">${escapeHtml(r.email)} ${isMe ? '<span class="admin-pill">YOU</span>' : ""}</div>
        <div class="admin-email-sub muted">added ${escapeHtml(fmtRelative(r.added_at))}</div>
      </div>
      <button class="btn danger small admin-email-remove" data-email="${escapeHtml(r.email)}" ${isMe ? "disabled title=\"You can't remove your own email\"" : ""}>Remove</button>`;
    list.appendChild(card);
  }
  if (!rows.length) {
    list.innerHTML = `<div class="admin-empty">No admin emails yet.</div>`;
  }
}

async function loadEmails() {
  try {
    const rows = await api("/admin/emails");
    paintEmails(rows);
  } catch (err) {
    toast(err.message);
    $("#admin-emails-list").innerHTML = `<div class="admin-empty">${escapeHtml(err.message)}</div>`;
  }
}

async function renderDashboard() {
  // Pre-fetch all reports (unfiltered) so the stats bar always shows
  // accurate open-report count regardless of the filter selection.
  try { allReportsAll = await api("/admin/reports"); } catch { allReportsAll = []; }
  await Promise.all([loadUsers(), loadReports(), loadEmails()]);
}

// ---------- wiring ----------
function wire() {
  $("#admin-signin").addEventListener("click", doSignin);
  $("#admin-password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSignin();
  });
  $("#admin-signout").addEventListener("click", doSignout);
  $("#admin-refresh").addEventListener("click", async () => {
    const btn = $("#admin-refresh");
    btn.disabled = true;
    await renderDashboard();
    btn.disabled = false;
    toast("Refreshed.");
  });

  $$(".admin-tab").forEach((t) => t.addEventListener("click", () => {
    const which = t.dataset.tab;
    $$(".admin-tab").forEach((x) => {
      const on = x.dataset.tab === which;
      x.classList.toggle("active", on);
      x.setAttribute("aria-selected", String(on));
    });
    $$(".admin-pane").forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== which));
  }));

  $("#admin-user-search").addEventListener("input", (e) => paintUsers(e.target.value));
  $("#admin-report-filter").addEventListener("change", loadReports);

  $("#admin-add-email").addEventListener("click", async () => {
    const input = $("#admin-new-email");
    const email = (input.value || "").trim().toLowerCase();
    if (!email || !email.includes("@")) { toast("Enter a valid email."); return; }
    const btn = $("#admin-add-email");
    btn.disabled = true;
    try {
      await api("/admin/emails", { method: "POST", body: { email } });
      input.value = "";
      await Promise.all([loadEmails(), loadUsers()]);
      toast(`Added ${email}.`);
    } catch (err) { toast(err.message); }
    finally { btn.disabled = false; }
  });
  $("#admin-new-email").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("#admin-add-email").click();
  });

  $("#admin-emails-list").addEventListener("click", async (e) => {
    const btn = e.target.closest(".admin-email-remove");
    if (!btn) return;
    const email = btn.dataset.email;
    if (!window.confirm(`Remove ${email} from the admin allowlist? If they have an account, their admin access is revoked immediately.`)) return;
    btn.disabled = true;
    try {
      await api(`/admin/emails/${encodeURIComponent(email)}`, { method: "DELETE" });
      await Promise.all([loadEmails(), loadUsers()]);
      toast(`Removed ${email}.`);
    } catch (err) { toast(err.message); btn.disabled = false; }
  });

  $("#admin-users-list").addEventListener("click", async (e) => {
    const del = e.target.closest(".admin-delete");
    if (!del) return;
    const id = del.dataset.id;
    const target = allUsers.find((u) => u.id === id);
    const label = target?.nickname || target?.email || id.slice(0, 8);
    if (!window.confirm(`Delete ${label}? This wipes their profile, matches, and messages. Cannot be undone.`)) return;
    del.disabled = true;
    try {
      await api(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      allUsers = allUsers.filter((u) => u.id !== id);
      $("#admin-users-count").textContent = allUsers.length;
      paintUsers($("#admin-user-search").value || "");
      toast(`Deleted ${label}.`);
    } catch (err) { toast(err.message); del.disabled = false; }
  });

  $("#admin-reports-list").addEventListener("click", async (e) => {
    const btn = e.target.closest(".admin-resolve");
    if (!btn) return;
    btn.disabled = true;
    try {
      await api(`/admin/reports/${encodeURIComponent(btn.dataset.id)}/resolve`, {
        method: "POST", body: { status: btn.dataset.status },
      });
      await loadReports();
    } catch (err) { toast(err.message); }
    finally { btn.disabled = false; }
  });
}

// ---------- bootstrap ----------
(async function init() {
  wire();
  const token = tokens.get();
  const cached = cachedUser.get();
  if (token && cached) {
    // Re-verify the stashed session is still an admin before unlocking
    // the dashboard — token could have been revoked, or admin flag taken
    // away by another admin.
    try {
      const profile = await fetchSelfProfile(token, cached.id);
      if (profile?.is_admin) {
        showDashboard(cached);
        await renderDashboard();
        return;
      }
    } catch { /* fall through to login */ }
    tokens.clear();
  }
  showLogin("");
})();
