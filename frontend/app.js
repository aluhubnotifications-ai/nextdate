// NextDate — frontend
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
    country: "Rwanda",
    cohort: "BSc CS 2026",
    whatsapp_number: "+250700000000",
  },
};

const DEMO_USERS = [
  {
    user_id: "u-aisha", nickname: "NightOwl", avatar_url: "🦄",
    gender: "Woman", zodiac_sign: "Pisces", score: 94,
    private: { real_name: "Aisha M.", age: 20, country: "Rwanda", cohort: "BSc Global Challenges 2026", whatsapp_number: "+250788111222" },
  },
  {
    user_id: "u-kofi", nickname: "JollofKing", avatar_url: "🦁",
    gender: "Man", zodiac_sign: "Leo", score: 88,
    private: { real_name: "Kofi A.", age: 22, country: "Ghana", cohort: "BSc IBT 2025", whatsapp_number: "+233244555666" },
  },
  {
    user_id: "u-thandi", nickname: "Bloom", avatar_url: "🌸",
    gender: "Woman", zodiac_sign: "Libra", score: 82,
    private: { real_name: "Thandi N.", age: 21, country: "South Africa", cohort: "BSc Entrepreneurial Leadership 2026", whatsapp_number: "+27821234567" },
  },
  {
    user_id: "u-david", nickname: "OctoCoder", avatar_url: "🐙",
    gender: "Man", zodiac_sign: "Virgo", score: 79,
    private: { real_name: "David O.", age: 23, country: "Kenya", cohort: "BSc CS 2025", whatsapp_number: "+254700111222" },
  },
  {
    user_id: "u-zara", nickname: "BeeKween", avatar_url: "🐝",
    gender: "Non-binary", zodiac_sign: "Gemini", score: 76,
    private: { real_name: "Zara K.", age: 20, country: "Zambia", cohort: "BSc Global Challenges 2027", whatsapp_number: "+260977333444" },
  },
  {
    user_id: "u-marcus", nickname: "Tortuga", avatar_url: "🐢",
    gender: "Man", zodiac_sign: "Cancer", score: 71,
    private: { real_name: "Marcus B.", age: 24, country: "Tanzania", cohort: "BSc IBT 2024", whatsapp_number: "+255712999888" },
  },
  {
    user_id: "u-lily", nickname: "PandaVibes", avatar_url: "🐼",
    gender: "Woman", zodiac_sign: "Taurus", score: 68,
    private: { real_name: "Lily W.", age: 19, country: "Rwanda", cohort: "BSc CS 2027", whatsapp_number: "+250788777888" },
  },
  {
    user_id: "u-nia", nickname: "MoonChild", avatar_url: "🌙",
    gender: "Woman", zodiac_sign: "Scorpio", score: 91,
    private: { real_name: "Nia O.", age: 22, country: "Kenya", cohort: "BSc Entrepreneurial Leadership 2025", whatsapp_number: "+254712345678" },
  },
  {
    user_id: "u-emeka", nickname: "PixelDealer", avatar_url: "🎮",
    gender: "Man", zodiac_sign: "Aquarius", score: 84,
    private: { real_name: "Emeka I.", age: 21, country: "Nigeria", cohort: "BSc CS 2026", whatsapp_number: "+2348023456789" },
  },
  {
    user_id: "u-sade", nickname: "CoffeeSnob", avatar_url: "☕",
    gender: "Woman", zodiac_sign: "Capricorn", score: 80,
    private: { real_name: "Sade A.", age: 23, country: "Nigeria", cohort: "BSc IBT 2024", whatsapp_number: "+2348134567890" },
  },
  {
    user_id: "u-jamal", nickname: "TrailRunner", avatar_url: "🏃",
    gender: "Man", zodiac_sign: "Sagittarius", score: 77,
    private: { real_name: "Jamal K.", age: 22, country: "Kenya", cohort: "BSc Global Challenges 2025", whatsapp_number: "+254723456789" },
  },
  {
    user_id: "u-amara", nickname: "InkAndChai", avatar_url: "📚",
    gender: "Woman", zodiac_sign: "Aries", score: 73,
    private: { real_name: "Amara D.", age: 20, country: "Rwanda", cohort: "BSc Entrepreneurial Leadership 2027", whatsapp_number: "+250788234567" },
  },
  {
    user_id: "u-leo", nickname: "JazzNerd", avatar_url: "🎷",
    gender: "Man", zodiac_sign: "Pisces", score: 70,
    private: { real_name: "Leo M.", age: 24, country: "Ghana", cohort: "BSc CS 2024", whatsapp_number: "+233503456789" },
  },
  {
    user_id: "u-rita", nickname: "Sunbeam", avatar_url: "🌻",
    gender: "Woman", zodiac_sign: "Leo", score: 66,
    private: { real_name: "Rita W.", age: 19, country: "South Africa", cohort: "BSc Global Challenges 2027", whatsapp_number: "+27834567890" },
  },
  {
    user_id: "u-zane", nickname: "DesertFox", avatar_url: "🌵",
    gender: "Non-binary", zodiac_sign: "Virgo", score: 63,
    private: { real_name: "Zane R.", age: 22, country: "Namibia", cohort: "BSc IBT 2026", whatsapp_number: "+264811234567" },
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
  { id: "n-4", icon: "🌱", kind: "system", title: "Welcome to NextDate",
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
  liked: new Set(),
  passed: new Set(),
  deck: null,
  deckIndex: 0,
  replyTo: null,
};

// In DEMO mode, treat these users as already-liking-you-back, so
// pressing ♥ on them yields an instant mutual match.
const DEMO_MUTUAL_FANS = new Set([
  "u-aisha", "u-thandi", "u-nia", "u-zara", "u-sade",
]);

// ---------- routing ----------
const views = {
  auth: renderAuth,
  onboarding: renderOnboarding,
  discover: renderDiscover,
  chats: renderChats,
  matches: renderMatches,
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
  // Tag the view root with the active view name so each section can
  // own its background, accent color, and ambient glow.
  root.dataset.section = name;
  root.classList.toggle("discover", name === "discover");
  // The chat-open flag (used to hide the bottom nav inside a conversation)
  // is only valid while the chats view is mounted.
  if (name !== "chats") document.documentElement.classList.remove("chat-open");
  document.querySelectorAll("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === name),
  );
  closeDrawer();
  await views[name](root);
}

document.querySelectorAll("[data-view]").forEach((b) =>
  b.addEventListener("click", () => navigate(b.dataset.view)),
);

function setNavVisible(visible) {
  document.querySelectorAll(".nav button[data-view]").forEach((b) =>
    b.classList.toggle("hidden", !visible),
  );
  const tabs = document.getElementById("bottom-tabs");
  if (tabs) tabs.classList.toggle("hidden", !visible);
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

function matchCount() {
  if (DEMO_MODE) return DEMO_SESSIONS.length;
  return 0;
}

function setBadge(id, n, capped = true) {
  const el = document.getElementById(id);
  if (!el) return;
  const label = n > 9 && capped ? "9+" : (n > 99 ? "99+" : String(n));
  el.textContent = label;
  el.classList.toggle("hidden", n === 0);
}

function refreshBadges() {
  const notif  = unreadCount();
  const chats  = unreadChatCount();
  const mutes  = matchCount();
  setBadge("nav-notif-badge",   notif, false);
  setBadge("nav-chats-badge",   chats, false);
  setBadge("nav-matches-badge", mutes, false);
  setBadge("bt-chats-badge",    chats, true);
  setBadge("bt-matches-badge",  mutes, true);
  const dot = document.getElementById("mobile-notif-dot");
  if (dot) {
    dot.textContent = notif > 99 ? "99+" : String(notif);
    dot.classList.toggle("hidden", notif === 0);
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

// Hide the bottom nav while the on-screen keyboard is open. We track the
// keyboard via VisualViewport for older Android, and via focus on text
// inputs as a belt-and-suspenders fallback.
(function trackKeyboard() {
  const root = document.documentElement;
  const setKbOpen = (open) => root.classList.toggle("kb-open", open);

  const vv = window.visualViewport;
  if (vv) {
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--kb-inset", inset + "px");
      setKbOpen(inset > 80);
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();
  }

  const isTextField = (el) =>
    el && (el.tagName === "TEXTAREA" ||
           (el.tagName === "INPUT" && !/^(checkbox|radio|button|submit|file|range)$/i.test(el.type)) ||
           el.isContentEditable);
  document.addEventListener("focusin", (e) => { if (isTextField(e.target)) setKbOpen(true); });
  document.addEventListener("focusout", () => {
    // Defer so a focus jump between two inputs doesn't flash the nav.
    setTimeout(() => { if (!isTextField(document.activeElement)) setKbOpen(false); }, 0);
  });
})();

// ---------- theme ----------
const THEME_KEY = "alu_match_theme";
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  const isLight = theme === "light";
  document.querySelectorAll("#theme-icon-dark, .theme-icon-dark").forEach(el => el.classList.toggle("hidden", isLight));
  document.querySelectorAll("#theme-icon-light, .theme-icon-light").forEach(el => el.classList.toggle("hidden", !isLight));
  const label = document.getElementById("theme-label");
  if (label) label.textContent = isLight ? "Dark mode" : "Light mode";
}
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === "light" ? "light" : "dark");
  const toggle = () => {
    const current = document.documentElement.dataset.theme || "dark";
    applyTheme(current === "light" ? "dark" : "light");
  };
  document.getElementById("theme-toggle")?.addEventListener("click", toggle);
  document.getElementById("mobile-theme-toggle")?.addEventListener("click", toggle);
}

// ---------- init ----------
(async function init() {
  initTheme();
  wireGlobalModals();

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
    $("#country").value          = state.privateIdentity.country || "";
    $("#cohort").value           = state.privateIdentity.cohort || "";
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
      country: $("#country").value || null,
      cohort: $("#cohort").value || null,
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

// ---------- DISCOVER (swipe deck) ----------
async function renderDiscover(root) {
  root.append($("#tpl-discover").content.cloneNode(true));
  $("#refresh-discover").onclick = () => { state.deck = null; state.deckIndex = 0; loadDiscover(); };
  await loadDiscover();
}

function existingSessionPartners() {
  const me = state.user?.id || DEMO_ME.id;
  return new Set(
    DEMO_SESSIONS.map((s) => (s.user_a === me ? s.user_b : s.user_a)),
  );
}

async function loadDiscover() {
  const stack = $("#swipe-stack");
  stack.innerHTML = `<div class="swipe-empty">Finding compatible people…</div>`;

  let suggestions = [];
  if (DEMO_MODE) {
    suggestions = DEMO_USERS;
  } else {
    try {
      suggestions = await api(`/suggestions/${state.user.id}`);
    } catch (err) {
      stack.innerHTML = `<div class="swipe-empty">Couldn't reach the matching engine.<br/><span class="muted">${escapeHtml(err.message)}</span></div>`;
      return;
    }
  }

  if (state.deck === null) {
    const skip = DEMO_MODE ? existingSessionPartners() : new Set();
    state.deck = suggestions.filter((s) => !skip.has(s.user_id));
    state.deckIndex = 0;
  }

  renderDeck();
}

function renderDeck() {
  const stack = $("#swipe-stack");
  if (!stack) return;
  stack.innerHTML = "";

  const total = state.deck?.length || 0;
  if (!total) {
    stack.innerHTML = `
      <div class="swipe-empty">
        <div class="swipe-empty-emoji">🌙</div>
        <h3>No profiles yet</h3>
        <p>Check back soon — fresh picks land regularly.</p>
      </div>`;
    return;
  }

  // Normalize index in case it drifted out of bounds.
  state.deckIndex = ((state.deckIndex % total) + total) % total;

  // Render the next card (behind) and the current one (front) so the
  // deck looks like a stack and the "next" peeks through.
  const layers = [];
  if (total > 1) {
    const nextIdx = (state.deckIndex + 1) % total;
    layers.push({ user: state.deck[nextIdx], front: false, remaining: total - 1 });
  }
  layers.push({ user: state.deck[state.deckIndex], front: true, remaining: total });
  for (const { user, front, remaining } of layers) {
    stack.appendChild(buildSwipeCard(user, front, remaining));
  }
}

function buildSwipeCard(user, isFront, remaining) {
  const card = document.createElement("article");
  card.className = "swipe-card" + (isFront ? " front" : " behind");
  card.dataset.uid = user.user_id;

  const meta = [user.gender, user.zodiac_sign].filter(Boolean).map(escapeHtml).join(" • ");
  const interests = (user.interests || []).slice(0, 4).map(escapeHtml);
  const hasInterests = interests.length > 0;
  const remainingLabel = `${remaining} profile${remaining === 1 ? "" : "s"} remaining`;

  card.innerHTML = `
    <div class="swipe-hero">
      <div class="swipe-avatar">${escapeHtml(user.avatar_url || "🧑")}</div>
    </div>
    <div class="swipe-body">
      <div class="swipe-name-row">
        <div class="swipe-name-block">
          <div class="swipe-name">${escapeHtml(user.nickname)}</div>
          <div class="swipe-meta">${meta || "—"}</div>
        </div>
        <button class="swipe-info" type="button" aria-label="More info" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </button>
      </div>
      <div class="swipe-details" hidden>
        ${hasInterests ? `<div class="swipe-detail-row"><span class="swipe-detail-label">Into</span><div class="swipe-chips">${interests.map((i) => `<span class="swipe-chip">${i}</span>`).join("")}</div></div>` : ""}
        ${user.score != null ? `<div class="swipe-detail-row"><span class="swipe-detail-label">Vibe match</span><span class="swipe-score">${user.score}%</span></div>` : ""}
      </div>
      <div class="swipe-actions">
        <button class="swipe-btn pass" type="button" data-action="pass" aria-label="Pass">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <button class="swipe-btn like" type="button" data-action="like" aria-label="Like">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7-4.35-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.65-7 10-7 10z"/></svg>
        </button>
      </div>
      <div class="swipe-counter">${remainingLabel}</div>
    </div>
    <div class="swipe-overlay like-overlay">LIKE</div>
    <div class="swipe-overlay pass-overlay">NOPE</div>
  `;

  const infoBtn = card.querySelector(".swipe-info");
  const details = card.querySelector(".swipe-details");
  infoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = details.hasAttribute("hidden");
    if (open) details.removeAttribute("hidden"); else details.setAttribute("hidden", "");
    infoBtn.setAttribute("aria-expanded", String(open));
  });

  if (isFront) {
    card.querySelector('[data-action="pass"]').addEventListener("click", (e) => {
      e.stopPropagation();
      passCurrent(card);
    });
    card.querySelector('[data-action="like"]').addEventListener("click", (e) => {
      e.stopPropagation();
      likeCurrent(card);
    });
    attachSwipe(card);
  }
  return card;
}

function attachSwipe(card) {
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, pointerId = null;
  const threshold = 110;

  const onDown = (e) => {
    if (e.target.closest(".swipe-info") || e.target.closest(".swipe-btn")) return;
    dragging = true;
    pointerId = e.pointerId;
    startX = e.clientX; startY = e.clientY; dx = 0; dy = 0;
    card.setPointerCapture?.(pointerId);
    card.classList.add("dragging");
  };
  const onMove = (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    const rot = dx / 18;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    const intent = dx / threshold;
    card.querySelector(".like-overlay").style.opacity = Math.max(0, Math.min(1, intent));
    card.querySelector(".pass-overlay").style.opacity = Math.max(0, Math.min(1, -intent));
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    card.releasePointerCapture?.(pointerId);
    card.classList.remove("dragging");
    if (dx > threshold)      return likeCurrent(card);
    if (dx < -threshold)     return passCurrent(card);
    card.style.transform = "";
    card.querySelector(".like-overlay").style.opacity = 0;
    card.querySelector(".pass-overlay").style.opacity = 0;
  };

  card.addEventListener("pointerdown", onDown);
  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerup", onUp);
  card.addEventListener("pointercancel", onUp);
}

function flyAway(card, direction, after = advance) {
  const sign = direction === "right" ? 1 : -1;
  card.style.transition = "transform .3s ease-out, opacity .3s ease-out";
  card.style.transform = `translate(${sign * 600}px, 60px) rotate(${sign * 22}deg)`;
  card.style.opacity = "0";
  setTimeout(after, 180);
}

function passCurrent(card) {
  const user = state.deck?.[state.deckIndex];
  if (user) state.passed.add(user.user_id);
  if (card) flyAway(card, "left");
  else advance();
}

function likeCurrent(card) {
  const user = state.deck?.[state.deckIndex];
  if (!user) return;
  state.liked.add(user.user_id);
  if (DEMO_MUTUAL_FANS.has(user.user_id)) handleMutualMatch(user);
  if (card) flyAway(card, "right");
  else advance();
}

function advance() {
  if (!state.deck?.length) return;
  state.deck.splice(state.deckIndex, 1);
  if (state.deckIndex >= state.deck.length) state.deckIndex = 0;
  renderDeck();
}

function handleMutualMatch(user) {
  const me = state.user?.id || DEMO_ME.id;
  let sess = DEMO_SESSIONS.find(
    (x) => (x.user_a === user.user_id && x.user_b === me) ||
           (x.user_b === user.user_id && x.user_a === me),
  );
  if (!sess) {
    sess = {
      id: `s-${user.user_id}-${Date.now()}`,
      user_a: me, user_b: user.user_id,
      user_a_approved_reveal: false, user_b_approved_reveal: false,
      created_at: new Date().toISOString(),
    };
    DEMO_SESSIONS.unshift(sess);
    DEMO_MESSAGES[sess.id] = [];
  }
  state.notifications.unshift({
    id: `n-${Date.now()}`,
    icon: "💖", kind: "match",
    title: `It's a match — ${user.nickname}`,
    text: `You both liked each other. Say hi when you're ready.`,
    time: "just now", group: "today", unread: true,
    session_id: sess.id,
  });
  refreshBadges();
  toast(`💖 It's a match with ${user.nickname}!`);
}

// ---------- MATCHES ----------
async function renderMatches(root) {
  root.append($("#tpl-matches").content.cloneNode(true));
  const grid = $("#matches-grid");
  const me = state.user?.id || DEMO_ME.id;
  let sessions = [];
  if (DEMO_MODE) {
    sessions = DEMO_SESSIONS.slice();
  } else {
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      sessions = data || [];
    } catch (err) {
      grid.innerHTML = `<div class="empty">Couldn't load matches.<br/><span class="muted">${escapeHtml(err.message)}</span></div>`;
      return;
    }
  }
  if (!sessions.length) {
    grid.innerHTML = `
      <div class="matches-empty">
        <div class="matches-empty-emoji">💞</div>
        <h3>No matches yet</h3>
        <p>Tap ♥ on profiles in Discover. When they like you back, they'll show up here.</p>
        <button class="btn" id="go-discover">Find people</button>
      </div>`;
    $("#go-discover")?.addEventListener("click", () => navigate("discover"));
    return;
  }
  grid.innerHTML = "";
  for (const s of sessions) {
    const otherId = s.user_a === me ? s.user_b : s.user_a;
    const peer = demoPeer(otherId);
    const tile = document.createElement("button");
    tile.className = "match-tile";
    tile.innerHTML = `
      <div class="match-avatar">${escapeHtml(peer.avatar_url || "🦊")}</div>
      <div class="match-name">${escapeHtml(peer.nickname || "Unknown")}</div>
      <div class="match-meta">${[peer.gender, peer.zodiac_sign].filter(Boolean).map(escapeHtml).join(" • ") || "—"}</div>
    `;
    tile.onclick = async () => {
      await navigate("chats");
      await openSession(s.id);
    };
    grid.appendChild(tile);
  }
}

// ---------- CHATS ----------
const EMOJI_SET = [
  "😀","😁","😂","🤣","😊","😍","🥰","😘","😎","🤩","🥳","🤗","🤔","😴","😅","🙃",
  "😇","🙂","😉","😋","😜","🤪","😝","🤤","😏","😒","😞","😔","😟","😕","🙁","😣",
  "😢","😭","😤","😠","😡","🥺","😬","🤯","🤠","🤡","🥸","😈","💀","👻","👀","👋",
  "👍","👎","🙌","👏","🙏","💪","🫶","🫰","🤝","👌","✌️","🤘","🤙","🫡","🫢","🫣",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💖","💗","💓","💞","💕","💝","💘",
  "✨","🔥","💯","⭐","🌟","💫","🎉","🎊","🎈","🌹","🌸","🌻","🌼","🌷","🌈","☀️",
  "☕","🍵","🍩","🍕","🍔","🍟","🍿","🍪","🍫","🍦","🍰","🎂","🍓","🍇","🍎","🥑",
  "🎵","🎶","🎧","🎸","🎤","🎬","📷","📸","💌","💎","🎁","🪩","🛼","⚽","🏀","🏝️",
];

async function renderChats(root) {
  root.append($("#tpl-chats").content.cloneNode(true));
  await loadSessions();
  buildEmojiPicker();
  $("#send-btn").onclick = sendMessage;
  $("#msg-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  $("#msg-input").addEventListener("input", autoGrowTextarea);
  $("#reveal-btn").onclick = approveReveal;
  $("#reveal-dismiss")?.addEventListener("click", () => {
    if (!state.activeSession) return;
    setRevealDismissed(state.activeSession.id, true);
    refreshRevealState();
  });
  $("#reveal-restore")?.addEventListener("click", () => {
    if (!state.activeSession) return;
    setRevealDismissed(state.activeSession.id, false);
    refreshRevealState();
  });
  $("#back-to-list")?.addEventListener("click", closeActiveChat);
  $("#chat-search-input")?.addEventListener("input", (e) => filterSessions(e.target.value));
  $("#emoji-btn").onclick = openEmojiModal;
  $("#attach-btn").onclick = () => $("#file-input").click();
  $("#file-input").addEventListener("change", onFilesPicked);
  $("#mic-btn")?.addEventListener("click", startRecording);
  $("#recording-cancel")?.addEventListener("click", cancelRecording);
  $("#recording-send")?.addEventListener("click", stopAndSendRecording);

  // Info panel
  $("#info-btn")?.addEventListener("click", openInfoPanel);
  $("#info-close")?.addEventListener("click", closeInfoPanel);
  $$(".info-action").forEach((b) => b.addEventListener("click", () => onInfoAction(b.dataset.act)));

  // One-tap "Report for harassment" — opens the report modal with the
  // harassment reason pre-selected so the user can submit immediately.
  $("#report-harass-btn")?.addEventListener("click", () => {
    if (!state.activeSession) return toast("Open a conversation first.");
    openReportModal({ reason: "harassment" });
  });

  state.pendingAttachments = [];
  state.mutedSessions = state.mutedSessions || new Set();
  state.blockedUsers = state.blockedUsers || new Set();
}

function autoGrowTextarea() {
  const ta = $("#msg-input");
  if (!ta) return;
  ta.style.height = "auto";
  ta.style.height = Math.min(140, Math.max(44, ta.scrollHeight)) + "px";
}

function buildEmojiPicker(filter = "") {
  const grid = $("#emoji-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (const e of EMOJI_SET) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "emoji-cell";
    b.textContent = e;
    b.onclick = () => {
      const ta = $("#msg-input");
      const start = ta.selectionStart, end = ta.selectionEnd;
      ta.value = ta.value.slice(0, start) + e + ta.value.slice(end);
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + e.length;
      autoGrowTextarea();
      closeEmojiModal();
    };
    grid.appendChild(b);
  }
}

function openEmojiModal() {
  const m = $("#emoji-modal");
  if (!m) return;
  m.classList.remove("hidden");
  m.setAttribute("aria-hidden", "false");
  $("#emoji-btn")?.classList.add("active");
  $("#emoji-search")?.focus();
}
function closeEmojiModal() {
  const m = $("#emoji-modal");
  if (!m) return;
  m.classList.add("hidden");
  m.setAttribute("aria-hidden", "true");
  $("#emoji-btn")?.classList.remove("active");
  const s = $("#emoji-search");
  if (s) s.value = "";
}

// ---------- modal wiring (run once at module load) ----------
function wireGlobalModals() {
  $("#emoji-modal-close")?.addEventListener("click", closeEmojiModal);
  $("#emoji-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "emoji-modal") closeEmojiModal();
  });
  $("#emoji-search")?.addEventListener("input", (e) => {
    const q = e.target.value.trim();
    $$("#emoji-grid .emoji-cell").forEach((c) => {
      c.style.display = !q || c.textContent.includes(q) ? "" : "none";
    });
  });
  $("#confirm-cancel")?.addEventListener("click", closeConfirmModal);
  $("#confirm-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "confirm-modal") closeConfirmModal();
  });
  $("#report-modal-close")?.addEventListener("click", closeReportModal);
  $("#report-cancel")?.addEventListener("click", closeReportModal);
  $("#report-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "report-modal") closeReportModal();
  });
  $("#report-submit")?.addEventListener("click", submitReport);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeEmojiModal();
    closeConfirmModal();
    closeReportModal();
    closeInfoPanel();
  });
}

// ---------- confirm modal ----------
function openConfirmModal({ title, text, icon = "⚠️", okLabel = "Confirm", okClass = "danger", onConfirm }) {
  const m = $("#confirm-modal");
  if (!m) return;
  $("#confirm-title").textContent = title;
  $("#confirm-text").textContent = text || "";
  $("#confirm-icon").textContent = icon;
  const ok = $("#confirm-ok");
  ok.textContent = okLabel;
  ok.className = `btn ${okClass}`;
  ok.onclick = () => { closeConfirmModal(); onConfirm?.(); };
  m.classList.remove("hidden");
  m.setAttribute("aria-hidden", "false");
}
function closeConfirmModal() {
  const m = $("#confirm-modal");
  m?.classList.add("hidden");
  m?.setAttribute("aria-hidden", "true");
}

// ---------- info panel ----------
function openInfoPanel() {
  const panel = $("#chat-info-panel");
  if (!panel || !state.activeSession) return;
  paintInfoPanel();
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  $("#chat-shell")?.classList.add("show-info");
}
function closeInfoPanel() {
  const panel = $("#chat-info-panel");
  panel?.classList.remove("open");
  panel?.setAttribute("aria-hidden", "true");
  $("#chat-shell")?.classList.remove("show-info");
}

function paintInfoPanel() {
  const s = state.activeSession;
  if (!s) return;
  const peer = s.peer_profile || {};
  $("#info-avatar").innerHTML = `${escapeHtml(peer.avatar_url || "🦊")}<span class="status-dot"></span>`;
  $("#info-name").textContent = peer.nickname || "Unknown";
  $("#info-meta").textContent = [peer.gender, peer.zodiac_sign].filter(Boolean).join(" · ") || "—";
  const revealed = s.user_a_approved_reveal && s.user_b_approved_reveal;
  const reveal = $("#info-reveal");
  reveal.className = "info-reveal " + (revealed ? "unlocked" : "locked");
  reveal.textContent = revealed ? "✓ Identity revealed" : "🔒 Anonymous";
  // Mute label
  const muted = state.mutedSessions.has(s.id);
  $("#mute-title").textContent = muted ? "Unmute notifications" : "Mute notifications";
  document.querySelector('.info-action[data-act="mute"]')?.classList.toggle("active", muted);
}

function onInfoAction(act) {
  const s = state.activeSession;
  if (!s) return;
  const peerName = s.peer_profile?.nickname || "this person";
  switch (act) {
    case "mute":
      if (state.mutedSessions.has(s.id)) { state.mutedSessions.delete(s.id); toast("Notifications unmuted."); }
      else { state.mutedSessions.add(s.id); toast(`Muted ${peerName}.`); }
      paintInfoPanel();
      break;
    case "clear":
      openConfirmModal({
        title: "Clear this chat?",
        text: "All messages between you two will be removed. The match itself stays.",
        icon: "🧹",
        okLabel: "Clear chat",
        okClass: "warn",
        onConfirm: () => {
          if (DEMO_MODE) DEMO_MESSAGES[s.id] = [];
          loadMessages(s.id);
          toast("Chat cleared.");
        },
      });
      break;
    case "delete":
      openConfirmModal({
        title: "Delete this conversation?",
        text: `This permanently removes your chat with ${peerName}. You can still rematch later.`,
        icon: "🗑️",
        okLabel: "Delete forever",
        okClass: "danger",
        onConfirm: () => {
          if (DEMO_MODE) {
            const i = DEMO_SESSIONS.findIndex((x) => x.id === s.id);
            if (i >= 0) DEMO_SESSIONS.splice(i, 1);
            delete DEMO_MESSAGES[s.id];
          }
          closeInfoPanel();
          closeActiveChat();
          loadSessions();
          toast("Conversation deleted.");
        },
      });
      break;
    case "block":
      openConfirmModal({
        title: `Block ${peerName}?`,
        text: "They won't be able to message or match with you again. This chat will be removed from your list.",
        icon: "🚫",
        okLabel: "Block",
        okClass: "danger",
        onConfirm: () => {
          state.blockedUsers.add(s.peer_id);
          if (DEMO_MODE) {
            const i = DEMO_SESSIONS.findIndex((x) => x.id === s.id);
            if (i >= 0) DEMO_SESSIONS.splice(i, 1);
            delete DEMO_MESSAGES[s.id];
          }
          closeInfoPanel();
          closeActiveChat();
          loadSessions();
          toast(`Blocked ${peerName}.`);
        },
      });
      break;
    case "report":
      openReportModal();
      break;
  }
}

// ---------- report modal ----------
function openReportModal(opts = {}) {
  const m = $("#report-modal");
  if (!m) return;
  $("#report-details").value = "";
  $$("#report-reasons input").forEach((r) => (r.checked = false));
  const preset = opts.reason;
  if (preset) {
    const radio = document.querySelector(`#report-reasons input[value="${preset}"]`);
    if (radio) radio.checked = true;
  }
  m.classList.remove("hidden");
  m.setAttribute("aria-hidden", "false");
}
function closeReportModal() {
  const m = $("#report-modal");
  m?.classList.add("hidden");
  m?.setAttribute("aria-hidden", "true");
}
function submitReport() {
  const reason = document.querySelector('#report-reasons input:checked')?.value;
  if (!reason) { toast("Pick a reason first."); return; }
  closeReportModal();
  toast("Report sent. Our team will review within 24h.");
}

function onFilesPicked(ev) {
  const files = Array.from(ev.target.files || []);
  for (const f of files) addAttachment(f);
  ev.target.value = "";
}

function fileKindIcon(name, type) {
  if ((type || "").startsWith("image/")) return "🖼️";
  if ((type || "").startsWith("video/")) return "🎬";
  if ((type || "").startsWith("audio/")) return "🎵";
  if (/\.pdf$/i.test(name)) return "📄";
  if (/\.(docx?|odt|rtf|txt)$/i.test(name)) return "📝";
  if (/\.(xlsx?|csv)$/i.test(name)) return "📊";
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return "🗜️";
  return "📎";
}

function formatBytes(b) {
  if (!b && b !== 0) return "";
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / 1024 / 1024).toFixed(1) + " MB";
}

function addAttachment(file) {
  const att = {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    type: file.type,
    size: file.size,
    preview: null,
  };
  state.pendingAttachments.push(att);
  if (file.type?.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (e) => { att.preview = e.target.result; renderPendingAttachments(); };
    reader.readAsDataURL(file);
  }
  renderPendingAttachments();
}

function renderPendingAttachments() {
  const wrap = $("#composer-attachments");
  if (!wrap) return;
  if (!state.pendingAttachments.length) { wrap.classList.add("hidden"); wrap.innerHTML = ""; return; }
  wrap.classList.remove("hidden");
  wrap.innerHTML = "";
  for (const a of state.pendingAttachments) {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";
    const thumb = a.preview
      ? `<span class="att-thumb"><img src="${a.preview}" alt=""/></span>`
      : `<span class="att-thumb">${fileKindIcon(a.name, a.type)}</span>`;
    chip.innerHTML = `${thumb}<span class="att-name">${escapeHtml(a.name)}</span><span class="muted" style="font-size:11px;">${formatBytes(a.size)}</span><button class="att-remove" type="button" aria-label="Remove">×</button>`;
    chip.querySelector(".att-remove").onclick = () => {
      state.pendingAttachments = state.pendingAttachments.filter((x) => x.id !== a.id);
      renderPendingAttachments();
    };
    wrap.appendChild(chip);
  }
}

function closeActiveChat() {
  cleanupRealtime();
  state.activeSession = null;
  $("#chat-shell")?.classList.remove("has-active");
  document.documentElement.classList.remove("chat-open");
  $("#chat-empty")?.classList.remove("hidden");
  $("#chat-active")?.classList.add("hidden");
  $$(".session-item").forEach((el) => el.classList.remove("active"));
  closeMessageMenu();
  clearReplyTarget();
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
  document.documentElement.classList.add("chat-open");
  $("#chat-empty").classList.add("hidden");
  $("#chat-active").classList.remove("hidden");

  $("#peer-avatar").innerHTML = `${escapeHtml(peer.avatar_url || "🦊")}<span class="status-dot"></span>`;
  $("#peer-name").textContent = peer.nickname;
  const metaParts = [peer.gender, peer.zodiac_sign].filter(Boolean).map(escapeHtml).join(" · ");
  $("#peer-meta").innerHTML = `<span class="online"></span> Active now${metaParts ? " · " + metaParts : ""}`;
  const sidEl = $("#peer-session-id");
  if (sidEl) sidEl.textContent = `#${sessionId.slice(0, 8)}`;

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

  const row = document.createElement("div");
  const mine = m.sender_id === state.user?.id;
  row.className = "bubble-row" + (mine ? " mine" : "");
  row.dataset.msgId = m.id;
  row.innerHTML = `
    <div class="swipe-reply-hint" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
    </div>
    <div class="bubble-stack">
      <div class="bubble ${mine ? "mine" : ""}">
        ${renderReplyQuote(m)}
        ${renderBubbleAttachments(m.attachments)}
        ${m.body ? `<span class="bubble-text">${escapeHtml(m.body)}</span>` : ""}
        ${formatClock(m.created_at) ? `<span class="bubble-time">${escapeHtml(formatClock(m.created_at))}</span>` : ""}
      </div>
      ${renderReactions(m)}
    </div>
    <button class="bubble-more" type="button" aria-label="Message actions">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
    </button>
  `;
  body.appendChild(row);
  attachBubbleInteractions(row, m);
  body.scrollTop = body.scrollHeight;
}

function findMessage(sessionId, msgId) {
  return (DEMO_MESSAGES[sessionId] || []).find((x) => x.id === msgId);
}

function renderReplyQuote(m) {
  if (!m.reply_to_id) return "";
  const target = findMessage(m.session_id, m.reply_to_id);
  if (!target) {
    return `<div class="bubble-quote bubble-quote-missing">Original message unavailable</div>`;
  }
  const peer = target.sender_id === state.user?.id
    ? "You"
    : (demoPeer(target.sender_id).nickname || "Them");
  const snippet = (target.body || (target.attachments?.length ? "📎 Attachment" : "")).slice(0, 80);
  return `
    <button class="bubble-quote" data-quote-id="${escapeHtml(target.id)}">
      <span class="bubble-quote-author">${escapeHtml(peer)}</span>
      <span class="bubble-quote-text">${escapeHtml(snippet)}</span>
    </button>`;
}

function renderReactions(m) {
  const reactions = m.reactions || {};
  const entries = Object.entries(reactions).filter(([, ids]) => ids?.length);
  if (!entries.length) return "";
  const chips = entries.map(([emoji, ids]) => {
    const mine = ids.includes(state.user?.id);
    return `<button class="reaction-chip ${mine ? "mine" : ""}" data-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)}${ids.length > 1 ? `<span class="reaction-count">${ids.length}</span>` : ""}</button>`;
  }).join("");
  return `<div class="bubble-reactions">${chips}</div>`;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function attachBubbleInteractions(row, msg) {
  const bubble = row.querySelector(".bubble");
  if (!bubble) return;

  // Voice message play/pause + progress
  bubble.querySelectorAll(".bubble-voice").forEach((wrap) => {
    const audio = wrap.querySelector("audio");
    const btn = wrap.querySelector(".bubble-voice-play");
    const timeEl = wrap.querySelector(".bubble-voice-time");
    const iconPlay = btn.querySelector(".icon-play");
    const iconPause = btn.querySelector(".icon-pause");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Pause any other playing voice message first.
      document.querySelectorAll(".bubble-voice audio").forEach((a) => {
        if (a !== audio && !a.paused) a.pause();
      });
      if (audio.paused) audio.play().catch(() => toast("Couldn't play this audio."));
      else audio.pause();
    });
    const sync = () => {
      const playing = !audio.paused && !audio.ended;
      iconPlay.classList.toggle("hidden", playing);
      iconPause.classList.toggle("hidden", !playing);
      wrap.classList.toggle("playing", playing);
      if (audio.currentTime && audio.duration) {
        const pct = Math.min(100, (audio.currentTime / audio.duration) * 100);
        wrap.style.setProperty("--voice-progress", pct + "%");
      } else {
        wrap.style.setProperty("--voice-progress", "0%");
      }
      if (timeEl) {
        const rem = audio.paused || audio.ended
          ? (audio.duration && isFinite(audio.duration) ? audio.duration : 0)
          : audio.currentTime;
        timeEl.textContent = fmtDuration(rem);
      }
    };
    audio.addEventListener("play", sync);
    audio.addEventListener("pause", sync);
    audio.addEventListener("timeupdate", sync);
    audio.addEventListener("ended", () => { audio.currentTime = 0; sync(); });
  });

  // Reaction chip click → toggle that reaction off/on
  row.querySelectorAll(".reaction-chip").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleReaction(msg, chip.dataset.emoji);
    });
  });

  // Reply quote click → scroll the original into view
  row.querySelector(".bubble-quote")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const id = e.currentTarget.dataset.quoteId;
    const target = document.querySelector(`.bubble-row[data-msg-id="${id}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("flash");
      setTimeout(() => target.classList.remove("flash"), 1400);
    }
  });

  // Explicit kebab button → action menu
  row.querySelector(".bubble-more")?.addEventListener("click", (e) => {
    e.stopPropagation();
    openMessageMenu(row, msg);
  });

  // Long-press / right-click → action menu. We also track whether a tap
  // moved (i.e. was actually a swipe) so a plain tap can reveal the kebab
  // on touch devices instead of doing nothing.
  let lpTimer = null;
  let downAt = 0;
  let moved = false;
  const cancelLP = () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } };
  bubble.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    downAt = Date.now();
    moved = false;
    cancelLP();
    lpTimer = setTimeout(() => { lpTimer = null; openMessageMenu(row, msg); }, 420);
  });
  bubble.addEventListener("pointermove", (e) => {
    if (downAt && (Math.abs(e.movementX) > 4 || Math.abs(e.movementY) > 4)) moved = true;
    cancelLP();
  });
  ["pointercancel", "pointerleave"].forEach((ev) =>
    bubble.addEventListener(ev, cancelLP),
  );
  bubble.addEventListener("pointerup", (e) => {
    cancelLP();
    if (e.pointerType === "touch" && !moved && Date.now() - downAt < 380) {
      e.preventDefault();
      selectBubbleRow(row);
    }
    downAt = 0;
  });
  bubble.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openMessageMenu(row, msg);
  });

  // Swipe → set as reply target
  attachSwipeToReply(row, msg);
}

function attachSwipeToReply(row, msg) {
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, locked = null;
  const threshold = 64;
  const bubble = row.querySelector(".bubble");
  const hint = row.querySelector(".swipe-reply-hint");
  // For "mine" we swipe leftward (toward centre); for "theirs" rightward.
  const dir = row.classList.contains("mine") ? -1 : 1;

  const onDown = (e) => {
    if (e.target.closest(".reaction-chip, .bubble-quote")) return;
    dragging = true; locked = null;
    startX = e.clientX; startY = e.clientY; dx = 0; dy = 0;
  };
  const onMove = (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    if (locked === null) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        locked = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      } else return;
    }
    if (locked !== "x") return;
    const along = dx * dir; // positive when moving toward centre
    if (along <= 0) {
      bubble.style.transform = "";
      if (hint) { hint.style.opacity = ""; hint.style.transform = ""; }
      return;
    }
    const offset = Math.min(120, along);
    bubble.style.transform = `translateX(${offset * dir}px)`;
    if (hint) {
      hint.style.opacity = Math.min(1, offset / threshold);
      hint.style.transform = `scale(${0.6 + Math.min(0.4, offset / 200)})`;
    }
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    const along = dx * dir;
    const triggered = locked === "x" && along >= threshold;
    bubble.style.transition = "transform .18s ease-out";
    bubble.style.transform = "";
    if (hint) {
      hint.style.transition = "opacity .18s ease-out, transform .18s ease-out";
      hint.style.opacity = "";
      hint.style.transform = "";
    }
    setTimeout(() => {
      bubble.style.transition = "";
      if (hint) hint.style.transition = "";
    }, 200);
    if (triggered) setReplyTarget(msg);
  };

  bubble.addEventListener("pointerdown", onDown);
  bubble.addEventListener("pointermove", onMove);
  bubble.addEventListener("pointerup", onUp);
  bubble.addEventListener("pointercancel", onUp);
}

function openMessageMenu(row, msg) {
  closeMessageMenu();
  const mine = msg.sender_id === state.user?.id;
  const overlay = document.createElement("div");
  overlay.className = "msg-menu-overlay";
  overlay.innerHTML = `
    <div class="msg-menu-sheet" role="menu">
      <div class="msg-menu-reactions">
        ${QUICK_REACTIONS.map((e) => `<button class="msg-menu-react" data-emoji="${escapeHtml(e)}" aria-label="React with ${escapeHtml(e)}">${escapeHtml(e)}</button>`).join("")}
      </div>
      <div class="msg-menu-actions">
        <button class="msg-menu-action" data-act="reply">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
          <span>Reply</span>
        </button>
        ${msg.body ? `
        <button class="msg-menu-action" data-act="copy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Copy</span>
        </button>` : ""}
        ${mine ? `
        <button class="msg-menu-action danger" data-act="delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          <span>Delete</span>
        </button>` : ""}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => closeMessageMenu();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelectorAll(".msg-menu-react").forEach((b) => {
    b.addEventListener("click", () => { toggleReaction(msg, b.dataset.emoji); close(); });
  });
  overlay.querySelectorAll(".msg-menu-action").forEach((b) => {
    b.addEventListener("click", () => {
      const act = b.dataset.act;
      close();
      if (act === "reply") setReplyTarget(msg);
      else if (act === "copy") copyText(msg.body || "");
      else if (act === "delete") deleteMessage(msg);
    });
  });

  // Briefly highlight the bubble being acted on.
  row.classList.add("active-menu");
  overlay.dataset.activeRow = msg.id;
}

function closeMessageMenu() {
  const open = document.querySelector(".msg-menu-overlay");
  if (!open) return;
  const rowId = open.dataset.activeRow;
  document.querySelector(`.bubble-row[data-msg-id="${rowId}"]`)?.classList.remove("active-menu");
  open.remove();
}

function selectBubbleRow(row) {
  const already = row.classList.contains("selected");
  document.querySelectorAll(".bubble-row.selected").forEach((r) => {
    if (r !== row) r.classList.remove("selected");
  });
  row.classList.toggle("selected", !already);
}

// Tap anywhere that isn't a bubble or its kebab dismisses the selection.
document.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".bubble-row, .msg-menu-overlay")) return;
  document.querySelectorAll(".bubble-row.selected").forEach((r) => r.classList.remove("selected"));
});

function toggleReaction(msg, emoji) {
  if (!msg || !emoji) return;
  msg.reactions = msg.reactions || {};
  const me = state.user?.id;
  const list = msg.reactions[emoji] || [];
  const i = list.indexOf(me);
  if (i >= 0) list.splice(i, 1);
  else list.push(me);
  if (list.length) msg.reactions[emoji] = list;
  else delete msg.reactions[emoji];
  refreshMessage(msg);
}

function deleteMessage(msg) {
  if (!msg || !state.activeSession) return;
  if (msg.sender_id !== state.user?.id) return toast("You can only delete your own messages.");
  const arr = DEMO_MESSAGES[state.activeSession.id];
  if (arr) {
    const i = arr.findIndex((x) => x.id === msg.id);
    if (i >= 0) arr.splice(i, 1);
  }
  // If we were replying to this, clear the reply target.
  if (state.replyTo?.id === msg.id) clearReplyTarget();
  document.querySelector(`.bubble-row[data-msg-id="${msg.id}"]`)?.remove();
  toast("Message deleted");
}

function refreshMessage(msg) {
  const row = document.querySelector(`.bubble-row[data-msg-id="${msg.id}"]`);
  if (!row) return;
  const stack = row.querySelector(".bubble-stack");
  stack.querySelector(":scope > .bubble-reactions")?.remove();
  const next = renderReactions(msg);
  if (next) stack.insertAdjacentHTML("beforeend", next);
  stack.querySelectorAll(".reaction-chip").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleReaction(msg, chip.dataset.emoji);
    });
  });
}

function setReplyTarget(msg) {
  if (!msg) return;
  state.replyTo = msg;
  const peer = msg.sender_id === state.user?.id
    ? "yourself"
    : (demoPeer(msg.sender_id).nickname || "them");
  const snippet = (msg.body || (msg.attachments?.length ? "📎 Attachment" : "")).slice(0, 90);
  let chip = $("#reply-chip");
  if (!chip) {
    chip = document.createElement("div");
    chip.id = "reply-chip";
    chip.className = "reply-chip";
    chip.innerHTML = `
      <div class="reply-chip-bar"></div>
      <div class="reply-chip-body">
        <div class="reply-chip-author"></div>
        <div class="reply-chip-text"></div>
      </div>
      <button class="reply-chip-close" aria-label="Cancel reply" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    $(".composer")?.prepend(chip);
    chip.querySelector(".reply-chip-close").addEventListener("click", clearReplyTarget);
  }
  chip.querySelector(".reply-chip-author").textContent = `Replying to ${peer}`;
  chip.querySelector(".reply-chip-text").textContent = snippet || "(no text)";
  $("#msg-input")?.focus();
}

function clearReplyTarget() {
  state.replyTo = null;
  $("#reply-chip")?.remove();
}

function copyText(text) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => toast("Copied"),
      () => toast("Couldn't copy"),
    );
  } else {
    const t = document.createElement("textarea");
    t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); toast("Copied"); } catch { toast("Couldn't copy"); }
    t.remove();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (document.querySelector(".msg-menu-overlay")) { closeMessageMenu(); return; }
    if (state.replyTo) clearReplyTarget();
  }
});

function renderBubbleAttachments(atts) {
  if (!atts || !atts.length) return "";
  let html = `<div class="bubble-attachments">`;
  for (const a of atts) {
    if (a.kind === "voice" || (a.audio_src && (a.type || "").startsWith("audio/"))) {
      html += `<div class="bubble-voice">
        <audio src="${a.audio_src}" preload="metadata"></audio>
        <button class="bubble-voice-play" type="button" aria-label="Play voice message">
          <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          <svg class="icon-pause hidden" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        </button>
        <span class="bubble-voice-bars" aria-hidden="true">${Array.from({ length: 22 }).map((_, i) => `<i style="height:${20 + Math.abs(Math.sin(i * 1.6)) * 70}%"></i>`).join("")}</span>
        <span class="bubble-voice-time">${fmtDuration(a.duration)}</span>
      </div>`;
    } else if (a.preview && (a.type || "").startsWith("image/")) {
      html += `<div class="bubble-attachment-image"><img src="${a.preview}" alt="${escapeHtml(a.name)}"/></div>`;
    } else {
      html += `<div class="bubble-attachment">
        <span class="att-thumb">${fileKindIcon(a.name, a.type)}</span>
        <span style="min-width:0; flex:1;">
          <span class="att-name" style="display:block;">${escapeHtml(a.name)}</span>
          <span class="att-size">${formatBytes(a.size)}</span>
        </span>
      </div>`;
    }
  }
  html += `</div>`;
  return html;
}

// ---------- voice messages ----------
const recording = { recorder: null, stream: null, chunks: [], startedAt: 0, timer: null };

async function startRecording() {
  if (recording.recorder) return; // already recording
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    return toast("Voice messages aren't supported on this device.");
  }
  try {
    recording.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    return toast(err.name === "NotAllowedError"
      ? "Microphone access denied."
      : "Couldn't start the microphone.");
  }
  const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
    .find((t) => MediaRecorder.isTypeSupported(t)) || "";
  try {
    recording.recorder = new MediaRecorder(recording.stream, mime ? { mimeType: mime } : undefined);
  } catch {
    cleanupRecording();
    return toast("Couldn't start the recorder.");
  }
  recording.chunks = [];
  recording.startedAt = Date.now();
  recording.recorder.ondataavailable = (e) => { if (e.data?.size) recording.chunks.push(e.data); };
  recording.recorder.start();
  showRecordingBar();
}

function showRecordingBar() {
  const bar = $("#recording-bar");
  bar?.classList.remove("hidden");
  $(".composer-row")?.classList.add("recording");
  const timeEl = $("#recording-time");
  recording.timer = setInterval(() => {
    if (!timeEl) return;
    const secs = Math.floor((Date.now() - recording.startedAt) / 1000);
    const mm = Math.floor(secs / 60);
    const ss = String(secs % 60).padStart(2, "0");
    timeEl.textContent = `${mm}:${ss}`;
    // Hard cap at 5 minutes — stop and send.
    if (secs >= 300) stopAndSendRecording();
  }, 200);
}

function hideRecordingBar() {
  $("#recording-bar")?.classList.add("hidden");
  $(".composer-row")?.classList.remove("recording");
  const timeEl = $("#recording-time");
  if (timeEl) timeEl.textContent = "0:00";
  if (recording.timer) { clearInterval(recording.timer); recording.timer = null; }
}

function cleanupRecording() {
  hideRecordingBar();
  recording.stream?.getTracks().forEach((t) => t.stop());
  recording.recorder = null;
  recording.stream = null;
  recording.chunks = [];
  recording.startedAt = 0;
}

function cancelRecording() {
  if (!recording.recorder) return;
  try { recording.recorder.stop(); } catch {}
  // Don't send; just drop the chunks.
  recording.recorder.onstop = () => cleanupRecording();
  // Override stop handler set in start; we still need a small wait so
  // ondataavailable can fire before tracks are torn down.
  setTimeout(cleanupRecording, 50);
}

function stopAndSendRecording() {
  if (!recording.recorder) return;
  const duration = Math.max(1, Math.round((Date.now() - recording.startedAt) / 1000));
  const rec = recording.recorder;
  rec.onstop = async () => {
    const mime = rec.mimeType || "audio/webm";
    const blob = new Blob(recording.chunks, { type: mime });
    cleanupRecording();
    if (!blob.size) return toast("Empty recording, try again.");
    const dataUrl = await blobToDataUrl(blob);
    sendVoiceMessage({ dataUrl, mime, duration, size: blob.size });
  };
  try { rec.stop(); } catch { cleanupRecording(); }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function sendVoiceMessage({ dataUrl, mime, duration, size }) {
  if (!state.activeSession) return;
  const sessionId = state.activeSession.id;
  const replyToId = state.replyTo?.id || null;
  clearReplyTarget();
  const attachment = {
    name: `voice-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.${mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm"}`,
    type: mime,
    size,
    duration,
    audio_src: dataUrl,
    kind: "voice",
  };
  if (DEMO_MODE) {
    const msg = {
      id: `m-${Date.now()}`,
      session_id: sessionId,
      sender_id: state.user.id,
      body: "",
      attachments: [attachment],
      reply_to_id: replyToId,
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
    body: "",
    attachments: [attachment],
    reply_to_id: replyToId,
  });
  if (error) toast(error.message);
}

function fmtDuration(secs) {
  const s = Math.max(0, Math.round(secs || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

async function sendMessage() {
  const input = $("#msg-input");
  const body = input.value.trim();
  const attachments = (state.pendingAttachments || []).slice();
  if ((!body && !attachments.length) || !state.activeSession) return;
  input.value = "";
  state.pendingAttachments = [];
  renderPendingAttachments();
  autoGrowTextarea();
  const sessionId = state.activeSession.id;

  const replyToId = state.replyTo?.id || null;
  clearReplyTarget();

  if (DEMO_MODE) {
    const msg = {
      id: `m-${Date.now()}`,
      session_id: sessionId,
      sender_id: state.user.id,
      body,
      attachments,
      reply_to_id: replyToId,
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
    reply_to_id: replyToId,
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

const REVEAL_DISMISS_PREFIX = "nd_reveal_dismissed:";

function isRevealDismissed(sessionId) {
  try { return localStorage.getItem(REVEAL_DISMISS_PREFIX + sessionId) === "1"; }
  catch { return false; }
}
function setRevealDismissed(sessionId, dismissed) {
  try {
    if (dismissed) localStorage.setItem(REVEAL_DISMISS_PREFIX + sessionId, "1");
    else localStorage.removeItem(REVEAL_DISMISS_PREFIX + sessionId);
  } catch {}
}

async function refreshRevealState() {
  const s = state.activeSession;
  if (!s) return;
  const banner  = $("#reveal-banner");
  const text    = $("#reveal-text");
  const btn     = $("#reveal-btn");
  const panel   = $("#identity-panel");
  const restore = $("#reveal-restore");

  const meIsA = state.user.id === s.user_a;
  const myFlag    = meIsA ? s.user_a_approved_reveal : s.user_b_approved_reveal;
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

  // The user can hide the banner per-chat; show a tiny restore chip in its
  // place. Once their partner approves a reveal we always pop the banner
  // back so the prompt isn't missed.
  const partnerJustRevealed = theirFlag && !myFlag;
  const dismissed = isRevealDismissed(s.id) && !partnerJustRevealed;
  banner.classList.toggle("hidden", dismissed);
  restore?.classList.toggle("hidden", !dismissed);
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
  panel.innerHTML = `
    <div class="identity-row"><span>Real name</span><span>${escapeHtml(id.real_name || "—")}</span></div>
    <div class="identity-row"><span>Age</span><span>${id.age ?? "—"}</span></div>
    <div class="identity-row"><span>Country</span><span>${escapeHtml(id.country || "—")}</span></div>
    <div class="identity-row"><span>Cohort</span><span>${escapeHtml(id.cohort || "—")}</span></div>
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
  const metaBits = [p?.gender, p?.zodiac_sign].filter(Boolean).map(escapeHtml).join(" · ") || "—";
  $("#profile-avatar").textContent = p?.avatar_url || "🦊";
  $("#profile-name").textContent = p?.nickname || "—";
  $("#profile-tagline").textContent = metaBits;
  $("#profile-summary").innerHTML = `
    <div class="profile-section">
      <div class="profile-section-label">Looking for</div>
      <div class="profile-rows">
        <div class="identity-row"><span>Intent</span><span>${escapeHtml(pr?.target_intent || "—")}</span></div>
        <div class="identity-row"><span>Term</span><span>${escapeHtml(pr?.term_length || "—")}</span></div>
        <div class="identity-row"><span>Interests</span><span>${(pr?.interests || []).map(escapeHtml).join(", ") || "—"}</span></div>
        <div class="identity-row"><span>Hobbies</span><span>${(pr?.hobbies || []).map(escapeHtml).join(", ") || "—"}</span></div>
      </div>
    </div>
    <div class="profile-section">
      <div class="profile-section-label">Private <span class="profile-section-sub">— only you can see this</span></div>
      <div class="profile-rows">
        <div class="identity-row"><span>Real name</span><span>${escapeHtml(pi?.real_name || "—")}</span></div>
        <div class="identity-row"><span>Age</span><span>${pi?.age ?? "—"}</span></div>
        <div class="identity-row"><span>Country</span><span>${escapeHtml(pi?.country || "—")}</span></div>
        <div class="identity-row"><span>Cohort</span><span>${escapeHtml(pi?.cohort || "—")}</span></div>
      </div>
    </div>
  `;
  $("#edit-profile").onclick = () => navigate("onboarding");
  $("#profile-logout").onclick = () => doLogout();
  const copy = document.createElement("div");
  copy.className = "profile-copyright";
  copy.innerHTML = `<span class="mark">&copy; 2026 NextDate</span> &middot; All rights reserved.`;
  root.appendChild(copy);
}

// ---------- util ----------
function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
