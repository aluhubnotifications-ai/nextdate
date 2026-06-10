// NextDate — standalone admin portal.
// Lives at /admin.html, separate from the main app.

// Only BACKEND_URL is hardcoded. SUPABASE_URL and SUPABASE_ANON_KEY are
// fetched from the backend /config endpoint (which reads Render env vars).
const BACKEND_URL = "https://nextdate-5may.onrender.com";
let SUPABASE_URL      = "";
let SUPABASE_ANON_KEY = "";

const ADMIN_CONFIG_CACHE_KEY = "nd_admin_config_v1";

async function loadConfig() {
  try {
    const raw = localStorage.getItem(ADMIN_CONFIG_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.supabase_url && cached?.supabase_anon_key) {
        SUPABASE_URL      = cached.supabase_url;
        SUPABASE_ANON_KEY = cached.supabase_anon_key;
        // Refresh cache in background — don't block boot on Render cold start.
        fetch(`${BACKEND_URL}/config`, { method: "GET", mode: "cors" })
          .then((r) => r.ok ? r.json() : null)
          .then((cfg) => {
            if (!cfg?.supabase_url || !cfg?.supabase_anon_key) return;
            const next = { supabase_url: cfg.supabase_url, supabase_anon_key: cfg.supabase_anon_key };
            const prev = localStorage.getItem(ADMIN_CONFIG_CACHE_KEY);
            if (prev !== JSON.stringify(next))
              try { localStorage.setItem(ADMIN_CONFIG_CACHE_KEY, JSON.stringify(next)); } catch {}
          })
          .catch(() => {});
        return;
      }
    }
  } catch { /* corrupted cache, fall through */ }

  try {
    const res = await fetch(`${BACKEND_URL}/config`, { method: "GET", mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cfg = await res.json();
    SUPABASE_URL      = cfg.supabase_url      || "";
    SUPABASE_ANON_KEY = cfg.supabase_anon_key || "";
    try {
      localStorage.setItem(ADMIN_CONFIG_CACHE_KEY, JSON.stringify({
        supabase_url: SUPABASE_URL, supabase_anon_key: SUPABASE_ANON_KEY,
      }));
    } catch {}
  } catch (e) {
    console.warn("[admin] Failed to load /config:", e.message);
  }
}


const ADMIN_TOKEN_KEY = "nd_admin_token";
const ADMIN_USER_KEY  = "nd_admin_user";

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
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)      return "just now";
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)  return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

// Avatar: renders photo (data: URL) or emoji safely.
function adminAvatarHtml(url) {
  if (!url) return "";
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(url)) {
    return `<img class="adm-av-photo" src="${escapeHtml(url)}" alt="" loading="lazy">`;
  }
  return `<span class="adm-av-emoji">${escapeHtml(url)}</span>`;
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

async function fetchSelfProfile(token, userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,email,nickname,is_admin`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] : null;
}

// ---------- views ----------
function revealPortal() {
  $("#admin-loading").classList.add("hidden");
  $("#admin-portal-root").classList.remove("hidden");
}

function showLogin(message = "") {
  revealPortal();
  $("#admin-dash").classList.add("hidden");
  $("#admin-login").classList.remove("hidden");
  const err = $("#admin-login-error");
  err.textContent = message;
  err.classList.toggle("hidden", !message);
}

function showDashboard(user) {
  revealPortal();
  $("#admin-login").classList.add("hidden");
  $("#admin-dash").classList.remove("hidden");
  $("#admin-portal-as").textContent = user.nickname || user.email;
}

// ---------- login ----------
async function doSignin() {
  const email = $("#admin-email").value.trim();
  const password = $("#admin-password").value;
  if (!email || !password) { showLogin("Enter email and password."); return; }
  const btn = $("#admin-signin");
  btn.disabled = true; btn.textContent = "Signing in…";
  try {
    const res = await api("/auth/login", { method: "POST", body: { email, password }, auth: false });
    tokens.set(res.token);
    const profile = await fetchSelfProfile(res.token, res.user_id);
    if (!profile?.is_admin) {
      tokens.clear();
      showLogin("This account doesn't have admin access.");
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

// ---------- data ----------
let allUsers = [];
let allReportsAll = [];   // unfiltered — for stats only

function updateStats() {
  const total    = allUsers.length;
  const withProf = allUsers.filter((u) => u.has_profile).length;
  const admins   = allUsers.filter((u) => u.is_admin).length;
  const openRep  = allReportsAll.filter((r) => r.status === "open").length;
  const pct      = total ? Math.round((withProf / total) * 100) : 0;
  const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s("stat-total",      total);
  s("stat-profiles",   `${withProf} (${pct}%)`);
  s("stat-open",       openRep);
  s("stat-admins-val", admins);
}

// ---------- users pane ----------
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
    const priv  = u.private || {};
    const prefs = u.prefs   || {};

    const initials = (u.nickname || u.email || "?")[0].toUpperCase();
    const avatarHtml = u.avatar_url
      ? adminAvatarHtml(u.avatar_url)
      : `<span class="adm-av-init">${escapeHtml(initials)}</span>`;

    const tags = [
      ...(prefs.interests || []).slice(0, 3),
      ...(prefs.hobbies   || []).slice(0, 2),
    ].map((t) => `<span class="adm-tag">${escapeHtml(t)}</span>`).join("");

    const pills = [
      u.is_admin     ? `<span class="adm-pill adm-pill--admin">ADMIN</span>` : "",
      !u.has_profile ? `<span class="adm-pill adm-pill--muted">NO PROFILE</span>` : "",
      u.ref_campaign ? `<span class="adm-pill adm-pill--ref">via ${escapeHtml(u.ref_campaign)}</span>` : "",
    ].join("");

    const card = document.createElement("div");
    card.className = "adm-user-card";
    card.innerHTML = `
      <div class="adm-user-row">
        <div class="adm-av">${avatarHtml}</div>
        <div class="adm-user-info">
          <div class="adm-user-name">${escapeHtml(u.nickname || u.email.split("@")[0])} ${pills}</div>
          <div class="adm-user-email">${escapeHtml(u.email)}</div>
        </div>
        <div class="adm-user-meta-right">
          <div class="adm-user-joined">${escapeHtml(fmtRelative(u.created_at))}</div>
          <div class="adm-user-gender">${escapeHtml(u.gender || "—")} · ${escapeHtml(u.zodiac_sign || "—")}</div>
        </div>
        <button class="btn danger small adm-delete-btn" type="button"
          data-id="${escapeHtml(u.id)}"
          ${u.is_admin ? "disabled title=\"Remove from admin allowlist first\"" : ""}>
          Delete
        </button>
        <button class="adm-expand-btn" type="button" aria-label="Toggle details">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <div class="adm-user-detail hidden">
        <div class="adm-detail-grid">
          <div class="adm-detail-row"><span class="adm-detail-label">Real name</span><span>${escapeHtml(priv.real_name || "—")}</span></div>
          <div class="adm-detail-row"><span class="adm-detail-label">Age</span><span>${escapeHtml(String(priv.age || "—"))}</span></div>
          <div class="adm-detail-row"><span class="adm-detail-label">Country</span><span>${escapeHtml(priv.country || "—")}</span></div>
          <div class="adm-detail-row"><span class="adm-detail-label">Cohort</span><span>${escapeHtml(priv.cohort || "—")}</span></div>
          <div class="adm-detail-row"><span class="adm-detail-label">Looking for</span><span>${escapeHtml(prefs.target_intent || "—")} · ${escapeHtml(prefs.term_length || "—")}</span></div>
          <div class="adm-detail-row"><span class="adm-detail-label">Campaign</span><span>${escapeHtml(u.ref_campaign || "—")}</span></div>
        </div>
        ${tags ? `<div class="adm-tags">${tags}</div>` : ""}
      </div>`;

    // expand/collapse
    card.querySelector(".adm-expand-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const detail = card.querySelector(".adm-user-detail");
      const btn    = card.querySelector(".adm-expand-btn");
      const open   = !detail.classList.contains("hidden");
      detail.classList.toggle("hidden", open);
      btn.classList.toggle("expanded", !open);
    });

    list.appendChild(card);
  }

  if (!visible.length) {
    list.innerHTML = `<div class="adm-empty">No users match.</div>`;
  }
}

// ---------- reports pane ----------
function paintReports(rows) {
  const list = $("#admin-reports-list");
  $("#admin-reports-count").textContent = rows.length;
  list.innerHTML = "";
  for (const r of rows) {
    const reporter = r.reporter?.nickname || r.reporter?.email || (r.reporter_id || "").slice(0, 8);
    const reported = r.reported?.nickname || r.reported?.email || (r.reported_id || "").slice(0, 8);
    const statusCls = r.status === "open" ? "open" : r.status === "resolved" ? "resolved" : "dismissed";
    const card = document.createElement("div");
    card.className = "adm-report-card";
    card.innerHTML = `
      <div class="adm-report-head">
        <span class="adm-status adm-status--${statusCls}">${escapeHtml(r.status)}</span>
        <span class="adm-report-reason">${escapeHtml(r.reason || "—")}</span>
        <span class="adm-report-time">${escapeHtml(fmtRelative(r.created_at))}</span>
      </div>
      <div class="adm-report-body">
        <b>${escapeHtml(reporter)}</b> reported <b>${escapeHtml(reported)}</b>
        ${r.details ? `<div class="adm-report-quote">"${escapeHtml(r.details)}"</div>` : ""}
      </div>
      <div class="adm-report-actions">
        ${r.status === "open" ? `
          <button class="btn small admin-resolve" data-id="${escapeHtml(r.id)}" data-status="resolved">Resolve</button>
          <button class="btn ghost small admin-resolve" data-id="${escapeHtml(r.id)}" data-status="dismissed">Dismiss</button>` : `
          <button class="btn ghost small admin-resolve" data-id="${escapeHtml(r.id)}" data-status="open">Reopen</button>`}
      </div>`;
    list.appendChild(card);
  }
  if (!rows.length) {
    list.innerHTML = `<div class="adm-empty">Nothing here.</div>`;
  }
}

// ---------- campaigns pane ----------
function paintCampaigns(rows) {
  const cntEl = $("#admin-campaigns-count");
  if (cntEl) cntEl.textContent = rows.length;
  const list = $("#admin-campaigns-list");
  list.innerHTML = "";
  if (!rows.length) {
    list.innerHTML = `<div class="adm-empty">No campaigns yet. Create one above to get a referral link.</div>`;
    return;
  }

  const totalUsers = allUsers.length || 1;

  for (const c of rows) {
    const link    = `${location.origin}/index.html?ref=${encodeURIComponent(c.slug)}`;
    const signups = c.signups || 0;
    const pct     = Math.min(100, Math.round((signups / totalUsers) * 100));

    const card = document.createElement("div");
    card.className = "adm-campaign-card";
    card.innerHTML = `
      <div class="adm-campaign-top">
        <div class="adm-campaign-info">
          <div class="adm-campaign-name">${escapeHtml(c.name)}</div>
          <div class="adm-campaign-slug">
            <code>${escapeHtml(c.slug)}</code>
          </div>
        </div>
        <div class="adm-campaign-count">
          <span class="adm-campaign-num">${signups}</span>
          <span class="adm-campaign-label">sign-up${signups !== 1 ? "s" : ""}</span>
        </div>
        <div class="adm-campaign-btns">
          <button class="btn ghost small campaign-copy" type="button" data-link="${escapeHtml(link)}">Copy link</button>
          <button class="btn danger small campaign-delete" type="button" data-id="${escapeHtml(c.id)}" data-name="${escapeHtml(c.name)}">Delete</button>
        </div>
      </div>
      <div class="adm-campaign-bar-wrap">
        <div class="adm-campaign-bar" style="width:${pct}%"></div>
      </div>
      <div class="adm-campaign-link">
        <span class="adm-campaign-link-text">${escapeHtml(link)}</span>
        <span class="adm-campaign-pct">${pct}% of all users</span>
      </div>`;
    list.appendChild(card);
  }
}

// ---------- admin emails pane ----------
function paintEmails(rows) {
  const list = $("#admin-emails-list");
  $("#admin-admins-count").textContent = rows.length;
  list.innerHTML = "";
  const meEmail = (cachedUser.get()?.email || "").toLowerCase();
  for (const r of rows) {
    const isMe = r.email.toLowerCase() === meEmail;
    const card = document.createElement("div");
    card.className = "adm-email-row";
    card.innerHTML = `
      <div class="adm-email-meta">
        <div class="adm-email-addr">${escapeHtml(r.email)} ${isMe ? '<span class="adm-pill adm-pill--admin">YOU</span>' : ""}</div>
        <div class="adm-email-when">added ${escapeHtml(fmtRelative(r.added_at))}</div>
      </div>
      <button class="btn danger small admin-email-remove" data-email="${escapeHtml(r.email)}" ${isMe ? "disabled title=\"You can't remove your own email\"" : ""}>Remove</button>`;
    list.appendChild(card);
  }
  if (!rows.length) {
    list.innerHTML = `<div class="adm-empty">No admin emails yet.</div>`;
  }
}

// ---------- loaders ----------
async function loadUsers() {
  try {
    allUsers = await api("/admin/users");
    $("#admin-users-count").textContent = allUsers.length;
    paintUsers($("#admin-user-search").value || "");
    updateStats();
  } catch (err) {
    toast(err.message);
    $("#admin-users-list").innerHTML = `<div class="adm-empty">${escapeHtml(err.message)}</div>`;
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
    $("#admin-reports-list").innerHTML = `<div class="adm-empty">${escapeHtml(err.message)}</div>`;
  }
}

async function loadCampaigns() {
  try {
    const rows = await api("/admin/campaigns");
    paintCampaigns(rows);
  } catch (err) {
    toast(err.message);
    $("#admin-campaigns-list").innerHTML = `<div class="adm-empty">${escapeHtml(err.message)}</div>`;
  }
}

async function loadEmails() {
  try {
    const rows = await api("/admin/emails");
    paintEmails(rows);
  } catch (err) {
    toast(err.message);
    $("#admin-emails-list").innerHTML = `<div class="adm-empty">${escapeHtml(err.message)}</div>`;
  }
}

async function renderDashboard() {
  try { allReportsAll = await api("/admin/reports"); } catch { allReportsAll = []; }
  await Promise.all([loadUsers(), loadReports(), loadEmails(), loadCampaigns()]);
}

// ---------- wiring ----------
function wire() {
  $("#admin-signin").addEventListener("click", doSignin);
  $("#admin-password").addEventListener("keydown", (e) => { if (e.key === "Enter") doSignin(); });
  $("#admin-signout").addEventListener("click", doSignout);

  $("#admin-refresh").addEventListener("click", async () => {
    const btn = $("#admin-refresh");
    btn.disabled = true;
    await renderDashboard();
    btn.disabled = false;
    toast("Refreshed.");
  });

  // Sidebar nav + tab switching
  $$(".adm-nav-item").forEach((btn) => btn.addEventListener("click", () => {
    const which = btn.dataset.tab;
    $$(".adm-nav-item").forEach((x) => x.classList.toggle("active", x.dataset.tab === which));
    $$(".adm-pane").forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== which));
  }));

  $("#admin-user-search").addEventListener("input", (e) => paintUsers(e.target.value));
  $("#admin-report-filter").addEventListener("change", loadReports);

  // Delete user
  $("#admin-users-list").addEventListener("click", async (e) => {
    const del = e.target.closest(".adm-delete-btn");
    if (!del) return;
    const id     = del.dataset.id;
    const target = allUsers.find((u) => u.id === id);
    const label  = target?.nickname || target?.email || id.slice(0, 8);
    if (!window.confirm(`Delete ${label}? This wipes their profile, matches, and messages.`)) return;
    del.disabled = true;
    try {
      await api(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      allUsers = allUsers.filter((u) => u.id !== id);
      $("#admin-users-count").textContent = allUsers.length;
      paintUsers($("#admin-user-search").value || "");
      updateStats();
      toast(`Deleted ${label}.`);
    } catch (err) { toast(err.message); del.disabled = false; }
  });

  // Resolve/dismiss report
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

  // Campaign create
  $("#campaign-name").addEventListener("input", () => {
    const slugEl = $("#campaign-slug");
    if (!slugEl.dataset.edited) {
      slugEl.value = $("#campaign-name").value.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }
  });
  $("#campaign-slug").addEventListener("input", (e) => {
    e.target.dataset.edited = e.target.value ? "1" : "";
  });
  $("#btn-campaign-create").addEventListener("click", async () => {
    const name = $("#campaign-name").value.trim();
    const slug = $("#campaign-slug").value.trim().toLowerCase();
    if (!name || !slug) { toast("Enter both a name and a slug."); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { toast("Slug: lowercase letters, numbers, hyphens only."); return; }
    const btn = $("#btn-campaign-create");
    btn.disabled = true;
    try {
      await api("/admin/campaigns", { method: "POST", body: { name, slug } });
      $("#campaign-name").value = "";
      $("#campaign-slug").value = "";
      delete $("#campaign-slug").dataset.edited;
      await loadCampaigns();
      toast(`Campaign "${name}" created.`);
    } catch (err) { toast(err.message); }
    finally { btn.disabled = false; }
  });
  $("#campaign-name").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#btn-campaign-create").click(); });

  // Campaign copy/delete
  $("#admin-campaigns-list").addEventListener("click", async (e) => {
    const copyBtn = e.target.closest(".campaign-copy");
    if (copyBtn) {
      await navigator.clipboard.writeText(copyBtn.dataset.link).catch(() => {});
      toast("Link copied.");
      return;
    }
    const delBtn = e.target.closest(".campaign-delete");
    if (!delBtn) return;
    const name = delBtn.dataset.name;
    if (!window.confirm(`Delete campaign "${name}"? The slug will stop accepting new sign-ups.`)) return;
    delBtn.disabled = true;
    try {
      await api(`/admin/campaigns/${encodeURIComponent(delBtn.dataset.id)}`, { method: "DELETE" });
      await loadCampaigns();
      toast(`Deleted "${name}".`);
    } catch (err) { toast(err.message); delBtn.disabled = false; }
  });

  // Admin emails
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
  $("#admin-new-email").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#admin-add-email").click(); });

  $("#admin-emails-list").addEventListener("click", async (e) => {
    const btn = e.target.closest(".admin-email-remove");
    if (!btn) return;
    const email = btn.dataset.email;
    if (!window.confirm(`Remove ${email} from the admin allowlist?`)) return;
    btn.disabled = true;
    try {
      await api(`/admin/emails/${encodeURIComponent(email)}`, { method: "DELETE" });
      await Promise.all([loadEmails(), loadUsers()]);
      toast(`Removed ${email}.`);
    } catch (err) { toast(err.message); btn.disabled = false; }
  });
}

// ---------- bootstrap ----------
(async function init() {
  await loadConfig();
  wire();
  const token  = tokens.get();
  const cached = cachedUser.get();
  if (token && cached) {
    try {
      const profile = await fetchSelfProfile(token, cached.id);
      if (profile?.is_admin) {
        showDashboard(cached);
        await renderDashboard();
        return;
      }
    } catch { /* fall through */ }
    tokens.clear();
  }
  showLogin("");
})();
