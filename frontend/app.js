// ALU Match — frontend
// Custom auth (FastAPI backend) + Supabase Realtime/Postgres for data.
//
// ───── HARDCODED CONFIG ─────
// Edit the four constants below for your deployment.
// Matching is intentionally left to be swapped with an AI-driven engine later.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL      = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-KEY";
const BACKEND_URL       = "https://alu-match-engine.onrender.com";
const EMAIL_DOMAINS     = ["alustudent.com", "aluedu.org"];

// ───── DEMO MODE ─────
// When true, the app runs entirely on hardcoded users / sessions / messages
// below. No Supabase, no backend. Flip to false once your AI matching engine
// + Supabase tables are wired up.
const DEMO_MODE = true;

const DEMO_ME = {
  id: "u-me",
  email: "you@alustudent.com",
  profile: {
    id: "u-me",
    nickname: "You",
    avatar_url: "🦊",
    gender: "Prefer not to say",
    zodiac_sign: "Leo",
  },
  prefs: {
    user_id: "u-me",
    target_intent: "Friendships",
    term_length: "Long-term",
    interests: ["afrobeats", "climate-tech", "design"],
    hobbies: ["chess", "running"],
    leisure_time: "Long walks, good coffee, weekend hikes around Kigali.",
    wants_in_relationship: "Curious mind, kind heart, makes me laugh.",
  },
  private: {
    user_id: "u-me",
    real_name: "Your Real Name",
    age: 21,
    cohort: "BSc CS 2026",
    whatsapp_number: "+250700000000",
  },
};

const DEMO_USERS = [
  {
    user_id: "u-aisha", nickname: "NightOwl", avatar_url: "🦄",
    gender: "Woman", zodiac_sign: "Pisces", score: 94,
    private: { real_name: "Aisha M.", age: 20, cohort: "BSc Global Challenges 2026", whatsapp_number: "+250788111222" },
  },
  {
    user_id: "u-kofi", nickname: "JollofKing", avatar_url: "🦁",
    gender: "Man", zodiac_sign: "Leo", score: 88,
    private: { real_name: "Kofi A.", age: 22, cohort: "BSc IBT 2025", whatsapp_number: "+233244555666" },
  },
  {
    user_id: "u-thandi", nickname: "Bloom", avatar_url: "🌸",
    gender: "Woman", zodiac_sign: "Libra", score: 82,
    private: { real_name: "Thandi N.", age: 21, cohort: "BSc Entrepreneurial Leadership 2026", whatsapp_number: "+27821234567" },
  },
  {
    user_id: "u-david", nickname: "OctoCoder", avatar_url: "🐙",
    gender: "Man", zodiac_sign: "Virgo", score: 79,
    private: { real_name: "David O.", age: 23, cohort: "BSc CS 2025", whatsapp_number: "+254700111222" },
  },
  {
    user_id: "u-zara", nickname: "BeeKween", avatar_url: "🐝",
    gender: "Non-binary", zodiac_sign: "Gemini", score: 76,
    private: { real_name: "Zara K.", age: 20, cohort: "BSc Global Challenges 2027", whatsapp_number: "+260977333444" },
  },
  {
    user_id: "u-marcus", nickname: "Tortuga", avatar_url: "🐢",
    gender: "Man", zodiac_sign: "Cancer", score: 71,
    private: { real_name: "Marcus B.", age: 24, cohort: "BSc IBT 2024", whatsapp_number: "+255712999888" },
  },
  {
    user_id: "u-lily", nickname: "PandaVibes", avatar_url: "🐼",
    gender: "Woman", zodiac_sign: "Taurus", score: 68,
    private: { real_name: "Lily W.", age: 19, cohort: "BSc CS 2027", whatsapp_number: "+250788777888" },
  },
];

const DEMO_SESSIONS = [
  {
    id: "s-aisha", user_a: "u-me", user_b: "u-aisha",
    user_a_approved_reveal: false, user_b_approved_reveal: false,
    created_at: "2026-05-30T10:00:00Z",
  },
  {
    id: "s-kofi", user_a: "u-kofi", user_b: "u-me",
    user_a_approved_reveal: true, user_b_approved_reveal: false,
    created_at: "2026-05-28T16:20:00Z",
  },
  {
    id: "s-thandi", user_a: "u-me", user_b: "u-thandi",
    user_a_approved_reveal: true, user_b_approved_reveal: true,
    created_at: "2026-05-25T09:00:00Z",
  },
];

const DEMO_NOTIFICATIONS = [
  { id: "n-1", icon: "💬", kind: "message", title: "New message from NightOwl",
    text: "\"coffee at Java House this weekend?\"",
    time: "2m ago", group: "today", unread: true, session_id: "s-aisha" },
  { id: "n-2", icon: "✨", kind: "match", title: "It's a match — JollofKing",
    text: "88% compatibility based on your vibe.",
    time: "1h ago", group: "today", unread: true, session_id: "s-kofi" },
  { id: "n-3", icon: "🔓", kind: "reveal", title: "JollofKing revealed their identity",
    text: "Reveal yours to unlock theirs.",
    time: "2h ago", group: "today", unread: true, session_id: "s-kofi" },
  { id: "n-6", icon: "✨", kind: "match", title: "New match — OctoCoder",
    text: "79% compatibility — you both like climate-tech.",
    time: "5h ago", group: "today", unread: true },
  { id: "n-5", icon: "💬", kind: "message", title: "New message from Bloom",
    text: "\"perfect — see you there 🌱\"",
    time: "yesterday", group: "earlier", unread: false, session_id: "s-thandi" },
  { id: "n-4", icon: "🌱", kind: "system", title: "Welcome to ALU Match",
    text: "Be kind, be real — campus community guidelines apply.",
    time: "3 days ago", group: "earlier", unread: false },
];

const DEMO_MESSAGES = {
  "s-aisha": [
    { id: "m-1", session_id: "s-aisha", sender_id: "u-aisha", body: "hey! saw we matched 👀 how's your week going?", created_at: "2026-05-30T10:01:00Z" },
    { id: "m-2", session_id: "s-aisha", sender_id: "u-me",    body: "honestly chaotic, three group projects 😅 you?", created_at: "2026-05-30T10:02:30Z" },
    { id: "m-3", session_id: "s-aisha", sender_id: "u-aisha", body: "same lol. coffee at Java House this weekend?", created_at: "2026-05-30T10:04:00Z" },
  ],
  "s-kofi": [
    { id: "m-4", session_id: "s-kofi", sender_id: "u-kofi", body: "yo, you're into afrobeats too?", created_at: "2026-05-28T16:21:00Z" },
    { id: "m-5", session_id: "s-kofi", sender_id: "u-me",   body: "obviously. Rema or Asake?", created_at: "2026-05-28T16:22:00Z" },
    { id: "m-6", session_id: "s-kofi", sender_id: "u-kofi", body: "Asake every day. revealed my identity btw, no pressure on yours", created_at: "2026-05-28T16:25:00Z" },
  ],
  "s-thandi": [
    { id: "m-7", session_id: "s-thandi", sender_id: "u-thandi", body: "the climate-tech club meets Thursdays if you wanna pull up", created_at: "2026-05-25T09:05:00Z" },
    { id: "m-8", session_id: "s-thandi", sender_id: "u-me",     body: "I'll be there!", created_at: "2026-05-25T09:06:00Z" },
    { id: "m-9", session_id: "s-thandi", sender_id: "u-thandi", body: "perfect — see you there 🌱", created_at: "2026-05-25T09:07:00Z" },
  ],
};

function demoPeer(id) {
  if (id === DEMO_ME.id) return DEMO_ME.profile;
  return DEMO_USERS.find((u) => u.user_id === id) || { nickname: "Unknown", avatar_url: "🦊" };
}

// ---------- token storage ----------
const TOKEN_KEY = "alu_match_token";
const USER_KEY  = "alu_match_user";   // {id, email}

const tokens = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
};
const cachedUser = {
  get: () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; } },
  set: (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
};

// ---------- Supabase client (rebuilt whenever the token changes) ----------
// Created in init() once we have config.
let supabase = null;

function buildSupabase(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });
  if (token) client.realtime.setAuth(token);
  return client;
}

function setSession(token, user) {
  tokens.set(token);
  if (user) cachedUser.set(user);
  cleanupRealtime();
  supabase = buildSupabase(token);
}
function clearSession() {
  tokens.clear();
  cleanupRealtime();
  supabase = buildSupabase(null);
}

// ---------- backend API ----------
async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = tokens.get();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers,
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

// ---------- DOM helpers ----------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const toast = (msg, ms = 2400) => {
  const el = $("#toast");
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.style.display = "none"), ms);
};

const state = {
  user: null,
  profile: null,
  prefs: null,
  privateIdentity: null,
  activeSession: null,
  messagesChannel: null,
  sessionChannel: null,
  notifications: DEMO_NOTIFICATIONS.slice(),
};

// ---------- routing ----------
const views = {
  auth: renderAuth,
  onboarding: renderOnboarding,
  discover: renderDiscover,
  chats: renderChats,
  notifications: renderNotifications,
  profile: renderProfile,
  logout: doLogout,
};

async function navigate(name) {
  cleanupRealtime();
  const root = $("#view-root");
  root.innerHTML = "";
  // Chat view should fill the entire panel; other views get padded scroll area
  root.classList.toggle("flush", name === "chats");
  document.querySelectorAll(".nav button[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === name),
  );
  closeDrawer();
  await views[name](root);
}

document.querySelectorAll(".nav button[data-view]").forEach((b) =>
  b.addEventListener("click", () => navigate(b.dataset.view)),
);

function setNavVisible(visible) {
  document.querySelectorAll(".nav button[data-view]").forEach((b) =>
    b.classList.toggle("hidden", !visible),
  );
  refreshBadges();
}

function unreadCount() {
  return state.notifications.filter((n) => n.unread).length;
}

function unreadChatCount() {
  // Demo: count distinct sessions referenced by unread message notifications
  const ids = new Set();
  for (const n of state.notifications) {
    if (n.unread && n.kind === "message" && n.session_id) ids.add(n.session_id);
  }
  return ids.size;
}

function refreshBadges() {
  const notifBadge = document.getElementById("nav-notif-badge");
  if (notifBadge) {
    const n = unreadCount();
    notifBadge.textContent = n > 99 ? "99+" : String(n);
    notifBadge.classList.toggle("hidden", n === 0);
  }
  const chatBadge = document.getElementById("nav-chats-badge");
  if (chatBadge) {
    const n = unreadChatCount();
    chatBadge.textContent = n > 99 ? "99+" : String(n);
    chatBadge.classList.toggle("hidden", n === 0);
  }
  const dot = document.getElementById("mobile-notif-dot");
  if (dot) {
    const n = unreadCount();
    dot.textContent = n > 99 ? "99+" : String(n);
    dot.classList.toggle("hidden", n === 0);
  }
}
const refreshNotifBadge = refreshBadges;

// ---------- mobile drawer ----------
function openDrawer() {
  document.getElementById("app-sidebar")?.classList.add("open");
  document.getElementById("sidebar-backdrop")?.classList.add("open");
}
function closeDrawer() {
  document.getElementById("app-sidebar")?.classList.remove("open");
  document.getElementById("sidebar-backdrop")?.classList.remove("open");
}
document.getElementById("open-drawer")?.addEventListener("click", openDrawer);
document.getElementById("sidebar-backdrop")?.addEventListener("click", closeDrawer);
document.getElementById("mobile-notif-btn")?.addEventListener("click", () => navigate("notifications"));

// ---------- theme ----------
const THEME_KEY = "alu_match_theme";
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const isLight = theme === "light";
  const iconDark  = document.getElementById("theme-icon-dark");
  const iconLight = document.getElementById("theme-icon-light");
  const label     = document.getElementById("theme-label");
  if (iconDark)  iconDark.classList.toggle("hidden", isLight);
  if (iconLight) iconLight.classList.toggle("hidden", !isLight);
  if (label)     label.textContent = isLight ? "Dark mode" : "Light mode";
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === "light" ? "light" : "dark");
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.onclick = () => {
      const current = document.documentElement.dataset.theme || "dark";
      applyTheme(current === "light" ? "dark" : "light");
    };
  }
}

// ---------- init ----------
(async function init() {
  initTheme();

  if (DEMO_MODE) {
    state.user            = { id: DEMO_ME.id, email: DEMO_ME.email };
    state.profile         = DEMO_ME.profile;
    state.prefs           = DEMO_ME.prefs;
    state.privateIdentity = DEMO_ME.private;
    setNavVisible(true);
    return navigate("discover");
  }

  if (SUPABASE_URL.includes("YOUR-PROJECT") || SUPABASE_ANON_KEY.includes("YOUR-")) {
    $("#view-root").innerHTML = `
      <section class="center-wrap"><div class="card auth-card">
        <h1>Setup needed</h1>
        <p class="muted">Open <b>frontend/app.js</b> and replace the hardcoded
          <b>SUPABASE_URL</b>, <b>SUPABASE_ANON_KEY</b>, and <b>BACKEND_URL</b>
          constants at the top of the file with your project's values.</p>
      </div></section>`;
    return;
  }

  supabase = buildSupabase(tokens.get());

  if (!tokens.get()) {
    setNavVisible(false);
    return navigate("auth");
  }
  try {
    const me = await api("/auth/me");
    await onSignedIn({ id: me.id, email: me.email });
  } catch (err) {
    console.warn("Session invalid:", err.message);
    clearSession();
    setNavVisible(false);
    navigate("auth");
  }
})();

async function onSignedIn(user) {
  state.user = user;
  cachedUser.set(user);
  setNavVisible(true);

  const [profileRes, prefsRes, privRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("match_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("private_identities").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  state.profile = profileRes.data;
  state.prefs = prefsRes.data;
  state.privateIdentity = privRes.data;

  if (!state.profile || !state.prefs) {
    return navigate("onboarding");
  }
  navigate("discover");
}

// ---------- AUTH ----------
function renderAuth(root) {
  root.append($("#tpl-auth").content.cloneNode(true));

  const isAluEmail = (email) =>
    EMAIL_DOMAINS.some((d) => email.toLowerCase().endsWith("@" + d));

  $("#btn-login").onclick = async () => {
    const email = $("#email").value.trim();
    const password = $("#password").value;
    if (!email || !password) return toast("Enter email and password.");
    try {
      const res = await api("/auth/login", { method: "POST", body: { email, password }, auth: false });
      setSession(res.token, { id: res.user_id, email: res.email });
      onSignedIn({ id: res.user_id, email: res.email });
    } catch (err) { toast(err.message); }
  };

  $("#btn-signup").onclick = async () => {
    const email = $("#email").value.trim();
    const password = $("#password").value;
    if (!email || !password) return toast("Enter email and password.");
    if (!isAluEmail(email)) return toast(`Email must end in ${EMAIL_DOMAINS.map((d) => "@" + d).join(" or ")}.`);
    if (password.length < 6) return toast("Password must be at least 6 characters.");
    try {
      const res = await api("/auth/signup", { method: "POST", body: { email, password }, auth: false });
      setSession(res.token, { id: res.user_id, email: res.email });
      onSignedIn({ id: res.user_id, email: res.email });
    } catch (err) { toast(err.message); }
  };
}

async function doLogout() {
  if (DEMO_MODE) { toast("Demo mode — no real session to sign out of."); return; }
  clearSession();
  state.user = null;
  setNavVisible(false);
  navigate("auth");
}

// ---------- ONBOARDING ----------
function renderOnboarding(root) {
  root.append($("#tpl-onboarding").content.cloneNode(true));

  if (state.profile) {
    $("#nickname").value     = state.profile.nickname || "";
    $("#avatar_url").value   = state.profile.avatar_url || "🦊";
    $("#gender").value       = state.profile.gender || "";
    $("#zodiac_sign").value  = state.profile.zodiac_sign || "";
  }
  if (state.prefs) {
    $("#target_intent").value        = state.prefs.target_intent || "Friendships";
    $("#term_length").value          = state.prefs.term_length || "Short-term";
    $("#leisure_time").value         = state.prefs.leisure_time || "";
    $("#wants_in_relationship").value = state.prefs.wants_in_relationship || "";
  }
  if (state.privateIdentity) {
    $("#real_name").value        = state.privateIdentity.real_name || "";
    $("#age").value              = state.privateIdentity.age || "";
    $("#cohort").value           = state.privateIdentity.cohort || "";
    $("#whatsapp_number").value  = state.privateIdentity.whatsapp_number || "";
  }

  const interests = makeTagInput($("#interests-input"), state.prefs?.interests || []);
  const hobbies   = makeTagInput($("#hobbies-input"),   state.prefs?.hobbies   || []);

  $("#save-profile").onclick = async () => {
    const nickname = $("#nickname").value.trim();
    if (!nickname) return toast("Pick a nickname.");

    const profilePayload = {
      id: state.user.id,
      email: state.user.email,
      nickname,
      avatar_url: $("#avatar_url").value,
      gender: $("#gender").value || null,
      zodiac_sign: $("#zodiac_sign").value || null,
    };
    const prefsPayload = {
      user_id: state.user.id,
      target_intent: $("#target_intent").value,
      term_length: $("#term_length").value,
      interests: interests.values(),
      hobbies:   hobbies.values(),
      leisure_time: $("#leisure_time").value || null,
      wants_in_relationship: $("#wants_in_relationship").value || null,
    };
    const privPayload = {
      user_id: state.user.id,
      real_name: $("#real_name").value || null,
      age: $("#age").value ? Number($("#age").value) : null,
      cohort: $("#cohort").value || null,
      whatsapp_number: $("#whatsapp_number").value || null,
    };

    if (DEMO_MODE) {
      state.profile         = profilePayload;
      state.prefs           = prefsPayload;
      state.privateIdentity = privPayload;
      DEMO_ME.profile       = profilePayload;
      DEMO_ME.prefs         = prefsPayload;
      DEMO_ME.private       = privPayload;
      toast("Saved (demo).");
      navigate("discover");
      return;
    }

    const [p1, p2, p3] = await Promise.all([
      supabase.from("profiles").upsert(profilePayload, { onConflict: "id" }).select().single(),
      supabase.from("match_preferences").upsert(prefsPayload, { onConflict: "user_id" }).select().single(),
      supabase.from("private_identities").upsert(privPayload, { onConflict: "user_id" }).select().single(),
    ]);
    const err = p1.error || p2.error || p3.error;
    if (err) return toast(err.message);

    state.profile = p1.data;
    state.prefs = p2.data;
    state.privateIdentity = p3.data;
    toast("Saved.");
    navigate("discover");
  };
}

function makeTagInput(container, initial) {
  const tags = new Set(initial);
  const input = container.querySelector("input");

  function repaint() {
    container.querySelectorAll(".tag").forEach((t) => t.remove());
    for (const v of tags) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.innerHTML = `${v} <button aria-label="remove">×</button>`;
      tag.querySelector("button").onclick = () => { tags.delete(v); repaint(); };
      container.insertBefore(tag, input);
    }
  }
  function commit() {
    const v = input.value.trim().toLowerCase();
    if (!v) return;
    tags.add(v);
    input.value = "";
    repaint();
  }
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
    if (e.key === "Backspace" && !input.value && tags.size) {
      const last = [...tags].pop();
      tags.delete(last); repaint();
    }
  });
  input.addEventListener("blur", commit);
  repaint();
  return { values: () => [...tags] };
}

// ---------- DISCOVER ----------
async function renderDiscover(root) {
  root.append($("#tpl-discover").content.cloneNode(true));
  $("#refresh-discover").onclick = loadDiscover;
  await loadDiscover();
}

async function loadDiscover() {
  const grid = $("#discover-grid");
  grid.innerHTML = `<div class="empty">Finding compatible people…</div>`;

  let suggestions = [];
  if (DEMO_MODE) {
    suggestions = DEMO_USERS;
  } else {
    try {
      suggestions = await api(`/suggestions/${state.user.id}`);
    } catch (err) {
      grid.innerHTML = `<div class="empty">Couldn't reach the matching engine.<br/><span class="muted">${err.message}</span></div>`;
      return;
    }
  }

  if (!suggestions.length) {
    grid.innerHTML = `<div class="empty">No matches yet. Tweak your preferences or check back soon.</div>`;
    return;
  }

  grid.innerHTML = "";
  for (const s of suggestions) {
    const card = document.createElement("div");
    card.className = "profile-card";
    const meta = [s.gender, s.zodiac_sign].filter(Boolean).map(escapeHtml).join(" · ");
    card.innerHTML = `
      <div style="display:flex; align-items:flex-start; gap:14px;">
        <div class="avatar">${escapeHtml(s.avatar_url || "🦊")}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:800; font-size:17px; color:var(--text); letter-spacing:-0.2px;">${escapeHtml(s.nickname)}</div>
          <div class="muted" style="font-size:12.5px; margin-top:3px; font-weight:500;">${meta || "—"}</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <span class="chip">✨ <span class="score">${s.score ?? 0}% match</span></span>
      </div>
      <button class="btn full" data-uid="${s.user_id}">Say hi 👋</button>
    `;
    card.querySelector("button").onclick = async () => {
      if (DEMO_MODE) {
        let sess = DEMO_SESSIONS.find(
          (x) => (x.user_a === s.user_id && x.user_b === DEMO_ME.id) ||
                 (x.user_b === s.user_id && x.user_a === DEMO_ME.id),
        );
        if (!sess) {
          sess = {
            id: `s-${s.user_id}-${Date.now()}`,
            user_a: DEMO_ME.id, user_b: s.user_id,
            user_a_approved_reveal: false, user_b_approved_reveal: false,
            created_at: new Date().toISOString(),
          };
          DEMO_SESSIONS.unshift(sess);
          DEMO_MESSAGES[sess.id] = [];
        }
        await navigate("chats");
        await openSession(sess.id);
        return;
      }
      const { data, error } = await supabase.rpc("open_chat_session", { other: s.user_id });
      if (error) return toast(error.message);
      await navigate("chats");
      await openSession(data);
    };
    grid.appendChild(card);
  }
}

// ---------- CHATS ----------
async function renderChats(root) {
  root.append($("#tpl-chats").content.cloneNode(true));
  await loadSessions();
  $("#send-btn").onclick = sendMessage;
  $("#msg-input").addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
  $("#reveal-btn").onclick = approveReveal;
  $("#back-to-list")?.addEventListener("click", closeActiveChat);
  $("#chat-search-input")?.addEventListener("input", (e) => filterSessions(e.target.value));
}

function closeActiveChat() {
  cleanupRealtime();
  state.activeSession = null;
  $("#chat-shell")?.classList.remove("has-active");
  $("#chat-empty")?.classList.remove("hidden");
  $("#chat-active")?.classList.add("hidden");
  $$(".session-item").forEach((el) => el.classList.remove("active"));
}

function filterSessions(query) {
  const q = (query || "").trim().toLowerCase();
  $$(".session-item").forEach((el) => {
    const name = el.dataset.peerName || "";
    el.style.display = !q || name.toLowerCase().includes(q) ? "" : "none";
  });
}

async function loadSessions() {
  const list = $("#session-list");
  list.innerHTML = "";

  let data;
  if (DEMO_MODE) {
    data = [...DEMO_SESSIONS].filter(
      (s) => s.user_a === state.user.id || s.user_b === state.user.id,
    );
  } else {
    const res = await supabase
      .from("chat_sessions")
      .select("*")
      .or(`user_a.eq.${state.user.id},user_b.eq.${state.user.id}`)
      .order("created_at", { ascending: false });
    if (res.error) return toast(res.error.message);
    data = res.data;
  }
  if (!data?.length) {
    list.innerHTML = `<div class="muted" style="font-size:13px;">No chats yet.</div>`;
    return;
  }

  let peerMap;
  if (DEMO_MODE) {
    peerMap = Object.fromEntries(DEMO_USERS.map((u) => [u.user_id, { id: u.user_id, nickname: u.nickname, avatar_url: u.avatar_url }]));
  } else {
    const peerIds = data.map((s) => (s.user_a === state.user.id ? s.user_b : s.user_a));
    const { data: peers } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .in("id", peerIds);
    peerMap = Object.fromEntries((peers || []).map((p) => [p.id, p]));
  }

  for (const s of data) {
    const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
    const peer = peerMap[peerId] || { nickname: "Unknown", avatar_url: "🦊" };

    // Last message preview + time (demo-mode only, real mode would query)
    let preview = "Say hi 👋", lastTime = "";
    if (DEMO_MODE) {
      const msgs = DEMO_MESSAGES[s.id] || [];
      const last = msgs[msgs.length - 1];
      if (last) {
        preview = (last.sender_id === state.user.id ? "You: " : "") + last.body;
        lastTime = formatRelativeTime(last.created_at);
      }
    }
    const unread = state.notifications.filter(
      (n) => n.unread && n.kind === "message" && n.session_id === s.id,
    ).length;
    const revealed = s.user_a_approved_reveal && s.user_b_approved_reveal;

    const row = document.createElement("div");
    row.className = "session-item";
    row.dataset.sessionId = s.id;
    row.dataset.peerName = peer.nickname || "";
    row.innerHTML = `
      <div class="avatar">${escapeHtml(peer.avatar_url || "🦊")}<span class="status-dot"></span></div>
      <div class="session-body">
        <div class="session-top">
          <div class="session-name">${escapeHtml(peer.nickname)}</div>
          <div class="session-time">${escapeHtml(lastTime)}</div>
        </div>
        <div class="session-preview">${escapeHtml(preview)}</div>
        <div class="session-meta-row">
          <div class="session-state">${revealed ? "✓ Revealed" : "🔒 Anonymous"}</div>
          ${unread ? `<div class="session-unread">${unread}</div>` : ""}
        </div>
      </div>`;
    row.onclick = () => openSession(s.id);
    list.appendChild(row);
  }
}

function formatRelativeTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const now = new Date();
  const diffMs = now - d;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return mins + "m";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "d";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatClock(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function openSession(sessionId) {
  cleanupRealtime();

  let s, peer;
  if (DEMO_MODE) {
    s = DEMO_SESSIONS.find((x) => x.id === sessionId);
    if (!s) return toast("Session not found");
    const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
    const u = DEMO_USERS.find((x) => x.user_id === peerId);
    peer = u
      ? { id: u.user_id, nickname: u.nickname, avatar_url: u.avatar_url, gender: u.gender, zodiac_sign: u.zodiac_sign }
      : { id: peerId, nickname: "Unknown", avatar_url: "🦊", gender: "", zodiac_sign: "" };
  } else {
    const res = await supabase.from("chat_sessions").select("*").eq("id", sessionId).single();
    if (res.error) return toast(res.error.message);
    s = res.data;
    const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
    const pRes = await supabase.from("profiles").select("id, nickname, avatar_url, gender, zodiac_sign").eq("id", peerId).single();
    peer = pRes.data;
  }

  const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
  state.activeSession = { ...s, peer_id: peerId, peer_profile: peer };

  $$(".session-item").forEach((el) => el.classList.toggle("active", el.dataset.sessionId === sessionId));
  $("#chat-shell")?.classList.add("has-active");
  $("#chat-empty").classList.add("hidden");
  $("#chat-active").classList.remove("hidden");

  $("#peer-avatar").innerHTML = `${escapeHtml(peer.avatar_url || "🦊")}<span class="status-dot"></span>`;
  $("#peer-name").textContent = peer.nickname;
  const metaParts = [peer.gender, peer.zodiac_sign].filter(Boolean).map(escapeHtml).join(" · ");
  $("#peer-meta").innerHTML = `<span class="online"></span> Active now${metaParts ? " · " + metaParts : ""}`;
  $("#peer-session-id").textContent = `#${sessionId.slice(0, 8)}`;

  // Mark associated unread message notifications as read
  let touched = false;
  for (const n of state.notifications) {
    if (n.unread && n.kind === "message" && n.session_id === sessionId) {
      n.unread = false; touched = true;
    }
  }
  if (touched) refreshBadges();

  await loadMessages(sessionId);
  await refreshRevealState();
  if (!DEMO_MODE) subscribeRealtime(sessionId);
}

async function loadMessages(sessionId) {
  const body = $("#chat-body");
  body.innerHTML = "";
  body.dataset.lastDay = "";
  let data;
  if (DEMO_MODE) {
    data = (DEMO_MESSAGES[sessionId] || []).slice().sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  } else {
    const res = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (res.error) return toast(res.error.message);
    data = res.data;
  }
  for (const m of data || []) appendMessage(m);
  body.scrollTop = body.scrollHeight;
}

function appendMessage(m) {
  const body = $("#chat-body");
  if (!body) return;

  // Day separator
  const dayLabel = formatDayLabel(m.created_at);
  if (dayLabel && body.dataset.lastDay !== dayLabel) {
    const sep = document.createElement("div");
    sep.className = "day-sep";
    sep.textContent = dayLabel;
    body.appendChild(sep);
    body.dataset.lastDay = dayLabel;
  }

  const el = document.createElement("div");
  el.className = "bubble " + (m.sender_id === state.user.id ? "mine" : "");
  const time = formatClock(m.created_at);
  el.innerHTML = `${escapeHtml(m.body)}${time ? `<span class="bubble-time">${escapeHtml(time)}</span>` : ""}`;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

async function sendMessage() {
  const input = $("#msg-input");
  const body = input.value.trim();
  if (!body || !state.activeSession) return;
  input.value = "";
  const sessionId = state.activeSession.id;

  if (DEMO_MODE) {
    const msg = {
      id: `m-${Date.now()}`,
      session_id: sessionId,
      sender_id: state.user.id,
      body,
      created_at: new Date().toISOString(),
    };
    (DEMO_MESSAGES[sessionId] ||= []).push(msg);
    appendMessage(msg);
    showTyping();
    setTimeout(() => { hideTyping(); simulateDemoReply(sessionId); }, 1100 + Math.random() * 900);
    return;
  }

  const { error } = await supabase.from("messages").insert({
    session_id: sessionId,
    sender_id: state.user.id,
    body,
  });
  if (error) toast(error.message);
}

const DEMO_REPLIES = [
  "haha for real",
  "totally agree",
  "wait say more",
  "okay you're funny",
  "hmm interesting take",
  "lol no way",
  "alright I'm down",
  "let's plan it",
];
function showTyping() {
  const body = $("#chat-body");
  if (!body) return;
  hideTyping();
  const el = document.createElement("div");
  el.className = "typing";
  el.id = "typing-indicator";
  el.innerHTML = `<span></span><span></span><span></span>`;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}
function hideTyping() {
  document.getElementById("typing-indicator")?.remove();
}

function simulateDemoReply(sessionId) {
  if (!state.activeSession || state.activeSession.id !== sessionId) return;
  const s = state.activeSession;
  const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
  const reply = {
    id: `m-${Date.now()}`,
    session_id: sessionId,
    sender_id: peerId,
    body: DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)],
    created_at: new Date().toISOString(),
  };
  (DEMO_MESSAGES[sessionId] ||= []).push(reply);
  appendMessage(reply);
}

function subscribeRealtime(sessionId) {
  state.messagesChannel = supabase
    .channel(`messages:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `session_id=eq.${sessionId}` },
      (payload) => appendMessage(payload.new),
    )
    .subscribe();

  state.sessionChannel = supabase
    .channel(`session:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "chat_sessions", filter: `id=eq.${sessionId}` },
      async (payload) => {
        state.activeSession = { ...state.activeSession, ...payload.new };
        await refreshRevealState();
      },
    )
    .subscribe();
}

function cleanupRealtime() {
  if (!supabase) { state.messagesChannel = null; state.sessionChannel = null; return; }
  if (state.messagesChannel) { supabase.removeChannel(state.messagesChannel); state.messagesChannel = null; }
  if (state.sessionChannel)  { supabase.removeChannel(state.sessionChannel);  state.sessionChannel  = null; }
}

async function refreshRevealState() {
  const s = state.activeSession;
  if (!s) return;
  const banner = $("#reveal-banner");
  const text   = $("#reveal-text");
  const btn    = $("#reveal-btn");
  const panel  = $("#identity-panel");

  const meIsA = state.user.id === s.user_a;
  const myFlag   = meIsA ? s.user_a_approved_reveal : s.user_b_approved_reveal;
  const theirFlag = meIsA ? s.user_b_approved_reveal : s.user_a_approved_reveal;

  banner.classList.remove("locked", "unlocked");

  if (myFlag && theirFlag) {
    banner.classList.add("unlocked");
    text.textContent = "Both of you approved the reveal.";
    btn.classList.add("hidden");
    await hydrateIdentity();
    panel.classList.remove("hidden");
  } else if (myFlag && !theirFlag) {
    banner.classList.add("locked");
    text.textContent = "Waiting for match… they haven't revealed yet.";
    btn.classList.add("hidden");
    panel.classList.add("hidden");
  } else if (!myFlag && theirFlag) {
    banner.classList.add("locked");
    text.textContent = "They revealed their identity. Reveal yours to unlock theirs.";
    btn.classList.remove("hidden");
    btn.textContent = "Reveal mine to unlock theirs";
    panel.classList.add("hidden");
  } else {
    banner.classList.add("locked");
    text.textContent = "Identities are hidden. Tap reveal when you both feel ready.";
    btn.classList.remove("hidden");
    btn.textContent = "Reveal my identity";
    panel.classList.add("hidden");
  }
}

async function approveReveal() {
  const s = state.activeSession;
  if (!s) return;
  const meIsA = state.user.id === s.user_a;
  const patch = meIsA ? { user_a_approved_reveal: true } : { user_b_approved_reveal: true };

  if (DEMO_MODE) {
    const stored = DEMO_SESSIONS.find((x) => x.id === s.id);
    if (stored) Object.assign(stored, patch);
    state.activeSession = { ...state.activeSession, ...patch };
    await refreshRevealState();
    toast("Reveal recorded.");
    return;
  }

  const { data, error } = await supabase
    .from("chat_sessions").update(patch).eq("id", s.id).select().single();
  if (error) return toast(error.message);
  state.activeSession = { ...state.activeSession, ...data };
  await refreshRevealState();
  toast("Reveal recorded.");
}

async function hydrateIdentity() {
  const s = state.activeSession;
  let id;
  if (DEMO_MODE) {
    const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
    const peer = DEMO_USERS.find((u) => u.user_id === peerId);
    id = peer ? peer.private : null;
  } else {
    const { data, error } = await supabase.rpc("get_revealed_identity", { session: s.id });
    if (error) return toast(error.message);
    id = (data && data[0]) || null;
  }
  const panel = $("#identity-panel");
  if (!id) {
    panel.innerHTML = `<div class="muted">No private identity on file for this user yet.</div>`;
    return;
  }
  const wa = id.whatsapp_number
    ? `<a href="https://wa.me/${encodeURIComponent(String(id.whatsapp_number).replace(/[^\d+]/g, ""))}" target="_blank" rel="noopener">${escapeHtml(id.whatsapp_number)}</a>`
    : `<span class="muted">—</span>`;
  panel.innerHTML = `
    <div class="identity-row"><span>Real name</span><span>${escapeHtml(id.real_name || "—")}</span></div>
    <div class="identity-row"><span>Age</span><span>${id.age ?? "—"}</span></div>
    <div class="identity-row"><span>Cohort</span><span>${escapeHtml(id.cohort || "—")}</span></div>
    <div class="identity-row"><span>WhatsApp</span><span>${wa}</span></div>
  `;
}

// ---------- NOTIFICATIONS ----------
const NOTIF_KIND_LABEL = { all: "All", message: "Messages", match: "Matches", reveal: "Reveals", system: "System" };

function renderNotifications(root) {
  root.append($("#tpl-notifications").content.cloneNode(true));
  state.notifFilter = state.notifFilter || "all";

  // Wire filter buttons
  $$(".notif-filter").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === state.notifFilter);
    b.onclick = () => {
      state.notifFilter = b.dataset.filter;
      $$(".notif-filter").forEach((x) => x.classList.toggle("active", x.dataset.filter === state.notifFilter));
      paintNotifications();
    };
  });

  $("#mark-all-read").onclick = () => {
    state.notifications.forEach((n) => (n.unread = false));
    refreshBadges();
    paintNotifications();
    toast("All caught up.");
  };

  paintNotifications();
}

function paintNotifications() {
  const list = $("#notifications-list");
  if (!list) return;

  // Update counts
  const counts = { all: 0, message: 0, match: 0, reveal: 0, system: 0 };
  for (const n of state.notifications) {
    counts.all++;
    if (counts[n.kind] !== undefined) counts[n.kind]++;
  }
  for (const k of Object.keys(counts)) {
    const el = document.getElementById(`cnt-${k}`);
    if (el) el.textContent = counts[k];
  }

  const filter = state.notifFilter || "all";
  const items = state.notifications.filter((n) => filter === "all" || n.kind === filter);

  if (!items.length) {
    list.innerHTML = `<div class="empty">No ${NOTIF_KIND_LABEL[filter].toLowerCase()} yet.</div>`;
    return;
  }

  // Group by .group (today / earlier) with stable order
  const groups = [
    { key: "today", label: "Today" },
    { key: "earlier", label: "Earlier" },
  ];
  list.innerHTML = "";
  for (const g of groups) {
    const groupItems = items.filter((n) => (n.group || "earlier") === g.key);
    if (!groupItems.length) continue;
    const label = document.createElement("div");
    label.className = "notif-group-label";
    label.textContent = g.label;
    list.appendChild(label);
    for (const n of groupItems) list.appendChild(buildNotifNode(n));
  }
}

function buildNotifNode(n) {
  const el = document.createElement("div");
  el.className = "notif-item" + (n.unread ? " unread" : "");
  const actions = n.session_id
    ? `<div class="notif-actions"><button class="btn sm">Open chat</button><button class="btn ghost sm" data-act="dismiss">Dismiss</button></div>`
    : `<div class="notif-actions"><button class="btn ghost sm" data-act="dismiss">Dismiss</button></div>`;
  el.innerHTML = `
    <div class="notif-icon ${n.unread ? "" : "muted"}">${escapeHtml(n.icon || "🔔")}</div>
    <div class="notif-body">
      <div class="notif-title">${escapeHtml(n.title)}</div>
      <div class="notif-text">${escapeHtml(n.text || "")}</div>
      <div class="notif-time">${escapeHtml(n.time || "")}</div>
      ${actions}
    </div>
  `;
  el.querySelector("[data-act='dismiss']")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const idx = state.notifications.indexOf(n);
    if (idx >= 0) state.notifications.splice(idx, 1);
    refreshBadges();
    paintNotifications();
  });
  el.onclick = async () => {
    n.unread = false;
    refreshBadges();
    if (n.session_id) {
      await navigate("chats");
      await openSession(n.session_id);
    } else {
      paintNotifications();
    }
  };
  return el;
}

// ---------- PROFILE ----------
function renderProfile(root) {
  root.append($("#tpl-profile").content.cloneNode(true));
  const p = state.profile, pr = state.prefs, pi = state.privateIdentity;
  $("#profile-summary").innerHTML = `
    <div style="display:flex; align-items:center; gap:14px; margin-bottom:14px;">
      <div class="avatar" style="width:64px; height:64px; font-size:26px;">${escapeHtml(p?.avatar_url || "🦊")}</div>
      <div>
        <div style="font-weight:700; font-size:18px;">${escapeHtml(p?.nickname || "—")}</div>
        <div class="muted" style="font-size:13px;">${escapeHtml(p?.gender || "—")} · ${escapeHtml(p?.zodiac_sign || "—")}</div>
      </div>
    </div>
    <div class="identity-row"><span>Looking for</span><span>${escapeHtml(pr?.target_intent || "—")} · ${escapeHtml(pr?.term_length || "—")}</span></div>
    <div class="identity-row"><span>Interests</span><span>${(pr?.interests || []).map(escapeHtml).join(", ") || "—"}</span></div>
    <div class="identity-row"><span>Hobbies</span><span>${(pr?.hobbies || []).map(escapeHtml).join(", ") || "—"}</span></div>
    <div class="hr"></div>
    <div class="muted" style="font-size:12px;">Private (only you can see this)</div>
    <div class="identity-row"><span>Real name</span><span>${escapeHtml(pi?.real_name || "—")}</span></div>
    <div class="identity-row"><span>Age</span><span>${pi?.age ?? "—"}</span></div>
    <div class="identity-row"><span>Cohort</span><span>${escapeHtml(pi?.cohort || "—")}</span></div>
    <div class="identity-row"><span>WhatsApp</span><span>${escapeHtml(pi?.whatsapp_number || "—")}</span></div>
  `;
  $("#edit-profile").onclick = () => navigate("onboarding");
}

// ---------- util ----------
function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
