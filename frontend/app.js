// NextDate — frontend
// Custom auth (FastAPI backend) + Supabase Realtime/Postgres for data.
//
// ───── HARDCODED CONFIG ─────
// Edit the four constants below for your deployment.
// Matching is intentionally left to be swapped with an AI-driven engine later.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL      = "https://wkdamyjswlixzkwehxyc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZGFteWpzd2xpeHprd2VoeHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzgyNTksImV4cCI6MjA5NTkxNDI1OX0.8CuPl4ZhLwZ2MPW6DUnuRNcZKQyzpw-SLdg6C8KYxcg";
const BACKEND_URL       = "https://nextdate-5may.onrender.com";

// ───── DEMO MODE ─────
// When true, the app runs entirely on hardcoded users / sessions / messages
// below. No Supabase, no backend. Flip to false once your AI matching engine
// + Supabase tables are wired up.
const DEMO_MODE = false;

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
  },
};

const DEMO_USERS = [
  {
    user_id: "u-aisha", nickname: "NightOwl", avatar_url: "🦄",
    gender: "Woman", zodiac_sign: "Pisces", score: 94,
    private: { real_name: "Aisha M.", age: 20, country: "Rwanda", cohort: "BSc Global Challenges 2026" },
  },
  {
    user_id: "u-kofi", nickname: "JollofKing", avatar_url: "🦁",
    gender: "Man", zodiac_sign: "Leo", score: 88,
    private: { real_name: "Kofi A.", age: 22, country: "Ghana", cohort: "BSc IBT 2025" },
  },
  {
    user_id: "u-thandi", nickname: "Bloom", avatar_url: "🌸",
    gender: "Woman", zodiac_sign: "Libra", score: 82,
    private: { real_name: "Thandi N.", age: 21, country: "South Africa", cohort: "BSc Entrepreneurial Leadership 2026" },
  },
  {
    user_id: "u-david", nickname: "OctoCoder", avatar_url: "🐙",
    gender: "Man", zodiac_sign: "Virgo", score: 79,
    private: { real_name: "David O.", age: 23, country: "Kenya", cohort: "BSc CS 2025" },
  },
  {
    user_id: "u-zara", nickname: "BeeKween", avatar_url: "🐝",
    gender: "Non-binary", zodiac_sign: "Gemini", score: 76,
    private: { real_name: "Zara K.", age: 20, country: "Zambia", cohort: "BSc Global Challenges 2027" },
  },
  {
    user_id: "u-marcus", nickname: "Tortuga", avatar_url: "🐢",
    gender: "Man", zodiac_sign: "Cancer", score: 71,
    private: { real_name: "Marcus B.", age: 24, country: "Tanzania", cohort: "BSc IBT 2024" },
  },
  {
    user_id: "u-lily", nickname: "PandaVibes", avatar_url: "🐼",
    gender: "Woman", zodiac_sign: "Taurus", score: 68,
    private: { real_name: "Lily W.", age: 19, country: "Rwanda", cohort: "BSc CS 2027" },
  },
  {
    user_id: "u-nia", nickname: "MoonChild", avatar_url: "🌙",
    gender: "Woman", zodiac_sign: "Scorpio", score: 91,
    private: { real_name: "Nia O.", age: 22, country: "Kenya", cohort: "BSc Entrepreneurial Leadership 2025" },
  },
  {
    user_id: "u-emeka", nickname: "PixelDealer", avatar_url: "🎮",
    gender: "Man", zodiac_sign: "Aquarius", score: 84,
    private: { real_name: "Emeka I.", age: 21, country: "Nigeria", cohort: "BSc CS 2026" },
  },
  {
    user_id: "u-sade", nickname: "CoffeeSnob", avatar_url: "☕",
    gender: "Woman", zodiac_sign: "Capricorn", score: 80,
    private: { real_name: "Sade A.", age: 23, country: "Nigeria", cohort: "BSc IBT 2024" },
  },
  {
    user_id: "u-jamal", nickname: "TrailRunner", avatar_url: "🏃",
    gender: "Man", zodiac_sign: "Sagittarius", score: 77,
    private: { real_name: "Jamal K.", age: 22, country: "Kenya", cohort: "BSc Global Challenges 2025" },
  },
  {
    user_id: "u-amara", nickname: "InkAndChai", avatar_url: "📚",
    gender: "Woman", zodiac_sign: "Aries", score: 73,
    private: { real_name: "Amara D.", age: 20, country: "Rwanda", cohort: "BSc Entrepreneurial Leadership 2027" },
  },
  {
    user_id: "u-leo", nickname: "JazzNerd", avatar_url: "🎷",
    gender: "Man", zodiac_sign: "Pisces", score: 70,
    private: { real_name: "Leo M.", age: 24, country: "Ghana", cohort: "BSc CS 2024" },
  },
  {
    user_id: "u-rita", nickname: "Sunbeam", avatar_url: "🌻",
    gender: "Woman", zodiac_sign: "Leo", score: 66,
    private: { real_name: "Rita W.", age: 19, country: "South Africa", cohort: "BSc Global Challenges 2027" },
  },
  {
    user_id: "u-zane", nickname: "DesertFox", avatar_url: "🌵",
    gender: "Non-binary", zodiac_sign: "Virgo", score: 63,
    private: { real_name: "Zane R.", age: 22, country: "Namibia", cohort: "BSc IBT 2026" },
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

const DEMO_NOTIFICATIONS = [];

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
// Created in init() once we have config. We memoize by token so signing
// in / signing out doesn't spawn extra GoTrueClient instances bound to
// the same localStorage key (which produces a console warning and can
// cause undefined behavior under concurrent auth events). When a
// rebuild is genuinely needed (token changed), we tear the previous
// client's local auth state down first.
let supabase = null;
let _currentSupabaseToken = undefined; // sentinel — null is a valid value

async function disposeSupabase(client) {
  if (!client) return;
  try { await client.auth?.signOut({ scope: "local" }); } catch { /* noop */ }
  try { client.removeAllChannels?.(); } catch { /* noop */ }
}

function buildSupabase(token) {
  if (supabase && _currentSupabaseToken === token) return supabase;
  const prev = supabase;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });
  _currentSupabaseToken = token;
  if (token) supabase.realtime.setAuth(token);
  // Fire-and-forget — disposing the previous client releases its
  // internal subscriptions so the new one is the only active instance.
  disposeSupabase(prev);
  return supabase;
}

function setSession(token, user) {
  tokens.set(token);
  if (user) cachedUser.set(user);
  cleanupRealtime();
  buildSupabase(token);
}
function clearSession() {
  tokens.clear();
  cleanupRealtime();
  // No client until the next sign-in. Anything that touches supabase
  // before then guards on truthiness already.
  if (supabase) { disposeSupabase(supabase); supabase = null; _currentSupabaseToken = undefined; }
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
  el.classList.remove("with-action");
  el.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.style.display = "none"), ms);
};

// Rich, animated notification banner that slides in from the top so a
// new message / match / reveal actually feels like a push, not a tiny
// bubble at the bottom. Auto-dismisses after `ms`, or sooner if the
// user clicks. If `onClick` is provided, clicking the body invokes it
// (and then dismisses); the close button always just dismisses.
function pushToast({ icon = "🔔", title, text = "", ms = 6000, onClick } = {}) {
  let host = document.getElementById("nd-push-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "nd-push-host";
    document.body.appendChild(host);
  }
  const card = document.createElement("div");
  card.className = "nd-push";
  card.innerHTML = `
    <div class="nd-push-icon" aria-hidden="true"></div>
    <div class="nd-push-body">
      <div class="nd-push-title"></div>
      <div class="nd-push-text"></div>
    </div>
    <button class="nd-push-close" aria-label="Dismiss">×</button>`;
  card.querySelector(".nd-push-icon").textContent = icon;
  card.querySelector(".nd-push-title").textContent = title || "";
  card.querySelector(".nd-push-text").textContent = text || "";
  host.appendChild(card);
  requestAnimationFrame(() => card.classList.add("show"));
  let timer = setTimeout(dismiss, ms);
  function dismiss() {
    clearTimeout(timer);
    card.classList.remove("show");
    card.addEventListener("transitionend", () => card.remove(), { once: true });
    setTimeout(() => card.remove(), 400);
  }
  card.querySelector(".nd-push-close").onclick = (e) => { e.stopPropagation(); dismiss(); };
  if (onClick) {
    card.classList.add("clickable");
    card.onclick = () => { try { onClick(); } finally { dismiss(); } };
  }
  card.addEventListener("mouseenter", () => clearTimeout(timer));
  card.addEventListener("mouseleave", () => { timer = setTimeout(dismiss, ms); });
}

// Toast with a single inline action button (e.g. Undo). Resolves to
// true if the user clicks the action before `ms` expires, false if it
// times out. Auto-dismiss is paused while the toast is hovered so the
// user has time to react.
const actionToast = ({ msg, actionLabel = "Undo", ms = 5000 }) => {
  const el = $("#toast");
  clearTimeout(toast._t);
  return new Promise((resolve) => {
    el.classList.add("with-action");
    el.innerHTML = "";
    const text = document.createElement("span");
    text.className = "toast-text";
    text.textContent = msg;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toast-action";
    btn.textContent = actionLabel;
    el.append(text, btn);
    el.style.display = "inline-flex";
    let timer = setTimeout(done, ms);
    function done(actioned = false) {
      clearTimeout(timer);
      el.style.display = "none";
      el.classList.remove("with-action");
      el.innerHTML = "";
      resolve(actioned);
    }
    btn.onclick = () => done(true);
    el.onmouseenter = () => clearTimeout(timer);
    el.onmouseleave = () => { timer = setTimeout(done, ms); };
  });
};

// ---------- loading affordances ----------
// Top progress bar (Facebook/YouTube/GitHub style). Stacks calls so
// nested loads don't blink — we only hide once everything wraps up.
let _progressDepth = 0;
let _progressTimer = null;
function ensureProgressEl() {
  let el = document.getElementById("nd-progress");
  if (!el) {
    el = document.createElement("div");
    el.id = "nd-progress";
    document.body.appendChild(el);
  }
  return el;
}
function progressStart() {
  _progressDepth++;
  const el = ensureProgressEl();
  el.classList.remove("done");
  requestAnimationFrame(() => {
    el.classList.add("show");
    setTimeout(() => el.classList.add("mid"), 200);
    setTimeout(() => el.classList.add("almost"), 900);
  });
}
function progressEnd() {
  _progressDepth = Math.max(0, _progressDepth - 1);
  if (_progressDepth > 0) return;
  clearTimeout(_progressTimer);
  const el = document.getElementById("nd-progress");
  if (!el) return;
  el.classList.add("done");
  _progressTimer = setTimeout(() => {
    el.classList.remove("show", "mid", "almost", "done");
  }, 400);
}
async function withProgress(promise) {
  progressStart();
  try { return await promise; }
  finally { progressEnd(); }
}

// Toggle a button's "loading" state — disables it and overlays a
// spinner so users see that their click registered.
function buttonLoading(btn, on) {
  if (!btn) return;
  if (on) {
    btn.dataset._wasDisabled = btn.disabled ? "1" : "0";
    btn.disabled = true;
    btn.classList.add("loading");
  } else {
    btn.classList.remove("loading");
    btn.disabled = btn.dataset._wasDisabled === "1";
    delete btn.dataset._wasDisabled;
  }
}

// Skeleton fillers for each list/grid we hydrate from the network.
function skelDeck(stack) {
  if (!stack) return;
  stack.innerHTML = `
    <article class="skeleton-card front">
      <div class="skeleton sk-avatar"></div>
      <div class="skeleton sk-line"></div>
      <div class="skeleton sk-line short"></div>
      <div class="skeleton sk-line tag"></div>
    </article>`;
}
function skelMatches(grid, n = 6) {
  if (!grid) return;
  grid.innerHTML = Array.from({ length: n }).map(() => `
    <div class="skeleton-tile">
      <div class="skeleton sk-avatar"></div>
      <div class="skeleton sk-line"></div>
      <div class="skeleton sk-line short"></div>
    </div>`).join("");
}
function skelSessionList(list, n = 5) {
  if (!list) return;
  list.innerHTML = Array.from({ length: n }).map(() => `
    <div class="skeleton-row">
      <div class="skeleton sk-avatar"></div>
      <div class="sk-stack">
        <div class="skeleton sk-line"></div>
        <div class="skeleton sk-line short"></div>
      </div>
    </div>`).join("");
}
function skelMessages(body, n = 5) {
  if (!body) return;
  body.innerHTML = Array.from({ length: n }).map((_, i) => `
    <div class="skeleton-bubble ${i % 2 ? "mine" : ""}">
      <div class="skeleton sk-bubble" style="width:${120 + Math.round(Math.random() * 140)}px"></div>
    </div>`).join("");
}

// Per-conversation unread counter, persisted across reloads. Driven by
// the global realtime subscription on `public.messages` so the chat
// sidebar shows a live badge when someone messages you in a conversation
// that isn't currently open.
// Persisted set of users the caller has passed on. Forwarded to
// /suggestions so the backend demotes them in the ranking; never used
// to hard-filter the deck — the user wanted previously-passed people
// to keep showing up, just ranked under everyone else.
const PASSED_KEY = "nd_passed_v1";
function loadPassedFromStorage() {
  try {
    const raw = localStorage.getItem(PASSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}
function persistPassed() {
  try { localStorage.setItem(PASSED_KEY, JSON.stringify([...state.passed])); }
  catch { /* noop */ }
}

const UNREAD_KEY = "nd_unread_by_session_v1";
function loadUnreadFromStorage() {
  try {
    const raw = localStorage.getItem(UNREAD_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw);
    return new Map(Object.entries(obj).map(([k, v]) => [k, Number(v) || 0]));
  } catch { return new Map(); }
}
function persistUnread() {
  try {
    const obj = {};
    for (const [k, v] of state.unreadBySession) if (v > 0) obj[k] = v;
    localStorage.setItem(UNREAD_KEY, JSON.stringify(obj));
  } catch { /* noop */ }
}
function bumpUnread(sessionId) {
  const n = (state.unreadBySession.get(sessionId) || 0) + 1;
  state.unreadBySession.set(sessionId, n);
  persistUnread();
}
function clearUnread(sessionId) {
  if (state.unreadBySession.has(sessionId)) {
    state.unreadBySession.delete(sessionId);
    persistUnread();
  }
}

// Polling fallbacks for chat + sidebar — declared up here so
// cleanupRealtime(), which can run during the init IIFE below, reads
// them without tripping the let-binding TDZ.
let _chatPollTimer = null;
let _sessionsPollTimer = null;

const state = {
  user: null,
  profile: null,
  prefs: null,
  privateIdentity: null,
  activeSession: null,
  messagesChannel: null,
  sessionChannel: null,
  notifications: DEMO_NOTIFICATIONS.slice(),
  unreadBySession: loadUnreadFromStorage(),
  lastMessageBySession: new Map(),
  knownSessionIds: new Set(),
  liked: new Set(),
  passed: loadPassedFromStorage(),
  deck: null,
  deckIndex: 0,
  replyTo: null,
  pendingUnmatch: new Set(),
  onlineUsers: new Set(),
  peerLastSeen: new Map(),
  currentView: null,
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
  admin: renderAdmin,
  logout: doLogout,
};

async function navigate(name, opts = {}) {
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
  // On auth/onboarding screens we hide the whole chrome (sidebar,
  // mobile top bar, bottom tabs) so the only thing visible is the form.
  document.documentElement.classList.toggle("auth-view", name === "auth" || name === "onboarding");
  document.querySelectorAll("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === name),
  );
  closeDrawer();
  // Wire browser history so the back button returns to the previous
  // view inside the app instead of leaving the SPA. The very first
  // navigate after page load replaces the empty initial entry rather
  // than pushing on top of it; popstate-driven navigates don't touch
  // history at all.
  const isFirstNav = state.currentView === null;
  state.currentView = name;
  if (!opts.fromHistory) {
    const url = `#${name}`;
    if (isFirstNav || opts.replace) history.replaceState({ view: name }, "", url);
    else history.pushState({ view: name }, "", url);
  }
  await views[name](root);
}

window.addEventListener("popstate", (ev) => {
  const view = ev.state?.view;
  if (!view || !views[view]) return;
  navigate(view, { fromHistory: true });
});

document.querySelectorAll("[data-view]").forEach((b) =>
  b.addEventListener("click", () => navigate(b.dataset.view)),
);

function setNavVisible(visible) {
  document.querySelectorAll(".nav button[data-view]").forEach((b) =>
    b.classList.toggle("hidden", !visible),
  );
  const tabs = document.getElementById("bottom-tabs");
  if (tabs) tabs.classList.toggle("hidden", !visible);
  // Admin entries stay hidden unless the signed-in profile is an admin —
  // even when the rest of the nav becomes visible after sign-in.
  const isAdmin = !!state.profile?.is_admin;
  document.querySelectorAll(".admin-only").forEach((b) =>
    b.classList.toggle("hidden", !(visible && isAdmin)),
  );
  refreshBadges();
}

function unreadCount() {
  return state.notifications.filter((n) => n.unread).length;
}

function unreadChatCount() {
  let n = 0;
  for (const v of state.unreadBySession.values()) if (v > 0) n++;
  return n;
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
    subscribePresence();
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

  const initialToken = tokens.get();
  if (!initialToken) {
    // Defer client construction until sign-in so we don't spawn an
    // anonymous GoTrue instance that the login flow then has to replace.
    setNavVisible(false);
    return navigate("auth");
  }
  buildSupabase(initialToken);
  progressStart();
  try {
    const me = await api("/auth/me");
    await onSignedIn({ id: me.id, email: me.email });
  } catch (err) {
    console.warn("Session invalid:", err.message);
    clearSession();
    setNavVisible(false);
    navigate("auth");
  } finally {
    progressEnd();
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
  // Re-evaluate nav visibility now that we know whether this account
  // carries the admin flag.
  setNavVisible(true);

  if (!state.profile || !state.prefs) {
    return navigate("onboarding");
  }
  await loadBlockedUsers();
  await loadNotifications();
  subscribeNotifications();
  subscribeGlobalMessages();
  subscribeDeckInvalidation();
  subscribePresence();
  startHeartbeat();
  navigate("discover");
  try { window.maybePromptForNotifications?.(); } catch {}
}



// ---------- Discover freshness ----------
// Listen for INSERT / UPDATE on public.profiles (other users joining
// or editing). We don't react in real time mid-swipe — that would
// reshuffle the cards under the user. We just flag state.deckStale
// so the next visit to Discover (or the next deck exhaustion) pulls
// a fresh /suggestions response that includes the new people and
// their updated scores.
let profilesChannel = null;
function subscribeDeckInvalidation() {
  if (DEMO_MODE || !supabase || !state.user) return;
  if (profilesChannel) { supabase.removeChannel(profilesChannel); profilesChannel = null; }
  profilesChannel = supabase
    .channel(`profiles-feed:${state.user.id}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "profiles" },
      onProfileChange,
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles" },
      onProfileChange,
    )
    .subscribe();
}

function onProfileChange(payload) {
  const row = payload.new || payload.old;
  if (!row || !state.user) return;
  if (row.id === state.user.id) return;
  state.deckStale = true;
}

// ---------- notifications (DB-backed in real mode) ----------
// Server-side triggers in migration 20260603000004 create a row in
// `public.notifications` whenever something happens that the user
// should know about (new message, mutual match, reveal). We hydrate
// from that table on sign-in and stream new rows via Postgres realtime
// so badges + toasts + the Notifications view always reflect the DB.
const NOTIF_ICON = { message: "💬", match: "💖", like: "💛", reveal: "🔓", system: "🌱" };

function isTodayIso(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate();
}

function mapDbNotif(row) {
  return {
    id: row.id,
    kind: row.kind,
    icon: NOTIF_ICON[row.kind] || "🔔",
    title: row.title,
    text: row.body || "",
    time: formatRelativeTime(row.created_at),
    group: isTodayIso(row.created_at) ? "today" : "earlier",
    unread: row.unread,
    session_id: row.session_id,
    actor_id: row.actor_id || null,
    created_at: row.created_at,
  };
}

async function loadNotifications() {
  if (DEMO_MODE) return; // demo seeds state.notifications from DEMO_NOTIFICATIONS
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) { console.warn("notifications load:", error.message); return; }
  state.notifications = (data || []).map(mapDbNotif);
  refreshBadges();
}

// Demo-mode push notification simulator. The realtime channel only
// fires when DEMO_MODE is false, so without this the user can never
// actually see a "push" arrive in a local demo. Every 25–35 seconds we
// pick a random demo user + kind and synthesize one push. The timer
// id lives on the function itself to dodge any TDZ ordering with the
// init() IIFE that calls us.
function startDemoNotificationSimulator() {
  if (!DEMO_MODE) return;
  if (startDemoNotificationSimulator._timer) clearTimeout(startDemoNotificationSimulator._timer);
  const tick = () => {
    const pool = DEMO_USERS;
    if (pool.length) {
      const peer = pool[Math.floor(Math.random() * pool.length)];
      const kinds = [
        { icon: "💬", title: `New message from ${peer.nickname}`, text: '"hey, you around?"', kind: "message" },
        { icon: "💖", title: `It's a match — ${peer.nickname}`, text: `${peer.score || 80}% compatibility`, kind: "match" },
        { icon: "🔓", title: `${peer.nickname} approved reveal`, text: "Tap to see who they are.", kind: "reveal" },
      ];
      const n = kinds[Math.floor(Math.random() * kinds.length)];
      pushToast({ icon: n.icon, title: n.title, text: n.text });
      // Also add to the in-app notifications list so the badge counter ticks up.
      state.notifications.unshift({
        id: `demo-${Date.now()}`,
        kind: n.kind,
        icon: n.icon,
        title: n.title,
        text: n.text,
        time: "just now",
        group: "today",
        unread: true,
        session_id: null,
      });
      refreshBadges();
      if (document.getElementById("notifications-list")) paintNotifications();
    }
    startDemoNotificationSimulator._timer = setTimeout(tick, 25_000 + Math.random() * 10_000);
  };
  startDemoNotificationSimulator._timer = setTimeout(tick, 8000);
}

// ---------- presence (real online status) ----------
// Supabase Presence channel keyed by user_id. Every signed-in client
// tracks itself on join; we keep state.onlineUsers in sync from the
// channel's sync/join/leave events and repaint dots/labels whenever
// the set changes. In demo mode there's no realtime, so we seed a
// random subset of DEMO_USERS as online once at startup.
let presenceChannel = null;
function subscribePresence() {
  if (DEMO_MODE) {
    // Pick ~50% of demo users as "online" so the dot variation is
    // visible. Always include at least one chat-session peer so the
    // user can actually see an "online" indicator in their chat list.
    const pool = DEMO_USERS.map((u) => u.user_id);
    for (const id of pool) if (Math.random() < 0.5) state.onlineUsers.add(id);
    const sessionPeers = DEMO_SESSIONS
      .map((s) => (s.user_a === DEMO_ME.id ? s.user_b : s.user_a))
      .filter(Boolean);
    if (sessionPeers.length && !sessionPeers.some((id) => state.onlineUsers.has(id))) {
      state.onlineUsers.add(sessionPeers[0]);
    }
    paintPresence();
    return;
  }
  if (!supabase || !state.user) return;
  if (presenceChannel) { supabase.removeChannel(presenceChannel); presenceChannel = null; }
  presenceChannel = supabase.channel("presence:nextdate", {
    config: { presence: { key: state.user.id } },
  });
  const syncFromChannel = () => {
    const next = new Set();
    const stateObj = presenceChannel.presenceState() || {};
    for (const key of Object.keys(stateObj)) next.add(key);
    state.onlineUsers = next;
    paintPresence();
  };
  presenceChannel
    .on("presence", { event: "sync" }, syncFromChannel)
    .on("presence", { event: "join" }, syncFromChannel)
    .on("presence", { event: "leave" }, syncFromChannel)
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({ user_id: state.user.id, at: Date.now() });
      }
    });
}

// Repaint every avatar status dot and chat-header presence pill based
// on state.onlineUsers. Each renderer stamps the peer id onto the dot
// container via data-presence-user so we can flip classes without
// re-rendering the whole view.
function paintPresence() {
  document.querySelectorAll("[data-presence-user]").forEach((el) => {
    const id = el.dataset.presenceUser;
    const active = id && isActiveOrRecent(id);
    el.classList.toggle("is-online", !!active);
    const label = el.querySelector("[data-presence-label]");
    if (label) label.textContent = id ? presenceLabel(id) : "Offline";
  });
}

// Global subscription to every INSERT on public.messages. RLS already
// filters delivery to rooms the user is in, so we just react to each
// row: increment unread for inactive sessions, and trigger a sidebar
// repaint so the latest-message preview + badge update live.
let globalMessagesChannel = null;
function subscribeGlobalMessages() {
  if (DEMO_MODE || !supabase || !state.user) return;
  if (globalMessagesChannel) { supabase.removeChannel(globalMessagesChannel); globalMessagesChannel = null; }
  globalMessagesChannel = supabase
    .channel(`messages-global:${state.user.id}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      onAnyMessageInsert,
    )
    .subscribe();
}

let _sessionRepaintTimer = null;
function scheduleSidebarRepaint() {
  if (!document.getElementById("session-list")) return;
  if (_sessionRepaintTimer) return;
  _sessionRepaintTimer = setTimeout(() => {
    _sessionRepaintTimer = null;
    loadSessions();
  }, 250);
}

// In-place sidebar update for a single session: updates preview/time/unread
// and moves the row to the top, without rebuilding the whole list (which
// causes a visible flicker on every send).
function patchSidebarRow(sessionId) {
  const list = document.getElementById("session-list");
  if (!list) return;
  const row = list.querySelector(`.session-item[data-session-id="${sessionId}"]`);
  if (!row) { scheduleSidebarRepaint(); return; }

  const last = state.lastMessageBySession?.get(sessionId);
  if (last) {
    const fromMe = last.sender_id === state.user?.id;
    const previewText = (fromMe ? "You: " : "") + (last.body || "");
    const previewEl = row.querySelector(".session-preview");
    if (previewEl) previewEl.textContent = previewText;
    const timeEl = row.querySelector(".session-time");
    if (timeEl) timeEl.textContent = formatRelativeTime(last.created_at);
  }

  const unread = state.unreadBySession?.get(sessionId) || 0;
  row.classList.toggle("has-unread", !!unread);
  const metaRow = row.querySelector(".session-meta-row");
  if (metaRow) {
    let badge = metaRow.querySelector(".session-unread");
    if (unread) {
      if (!badge) {
        badge = document.createElement("div");
        badge.className = "session-unread";
        metaRow.appendChild(badge);
      }
      badge.textContent = String(unread);
    } else if (badge) {
      badge.remove();
    }
  }

  if (list.firstElementChild !== row) list.prepend(row);
}

async function onAnyMessageInsert(payload) {
  const m = payload.new;
  if (!m || m.sender_id === state.user?.id) return;
  // Unread bumping + system push happen from onNotificationInsert,
  // which is driven by the DB trigger on public.notifications and is
  // more reliable than the messages realtime channel. We just refresh
  // the cached preview so the sidebar shows the new copy ASAP when
  // realtime *does* deliver — onNotificationInsert will also do a
  // full loadSessions() pass right after.
  if (m.body) m.body = sanitizeMessageBody(m.body);
  state.lastMessageBySession.set(m.session_id, m);
  patchSidebarRow(m.session_id);
}

let notifChannel = null;
function subscribeNotifications() {
  if (DEMO_MODE || !supabase || !state.user) return;
  if (notifChannel) { supabase.removeChannel(notifChannel); notifChannel = null; }
  notifChannel = supabase
    .channel(`notifs:${state.user.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${state.user.id}`,
      },
      onNotificationInsert,
    )
    .subscribe();
}

function onNotificationInsert(payload) {
  const n = mapDbNotif(payload.new);
  // Mark as read immediately if the user already has this conversation open.
  if (n.kind === "message" && state.activeSession?.id === n.session_id) {
    n.unread = false;
    supabase.from("notifications").update({ unread: false }).eq("id", n.id).then(() => {});
  }

  // Notifications are the canonical "new message arrived" signal —
  // bump the per-conversation unread count from here instead of
  // relying on the global messages realtime subscription, which has
  // proven unreliable. The DB trigger creates exactly one
  // notifications row per message, so this won't double-count.
  if (n.kind === "message" && n.session_id && state.activeSession?.id !== n.session_id) {
    bumpUnread(n.session_id);
  }

  // Match notification → show overlay for the first liker (who was waiting).
  // The person who completed the match already sees the overlay via the RPC.
  if (n.kind === "match" && n.session_id && n.actor_id) {
    supabase.from("profiles").select("nickname,avatar_url").eq("id", n.actor_id).maybeSingle()
      .then(({ data: peer }) => {
        showMatchOverlay(
          { user_id: n.actor_id, nickname: peer?.nickname || "them", avatar_url: peer?.avatar_url || "🌸" },
          n.session_id,
        );
      });
  } else if (n.kind !== "message") {
    // Likes, reveals, system → push toast.
    pushToast({
      icon: n.icon,
      title: n.title,
      text: n.text,
      onClick: n.session_id ? () => openSession(n.session_id) : undefined,
    });
  }

  state.notifications.unshift(n);
  refreshBadges();
  if (document.getElementById("notifications-list")) paintNotifications();

  // Refresh the chat sidebar so the latest-message preview, ordering,
  // and unread badge come straight from the database — no need to
  // wait for (or trust) the messages realtime channel. For 'message'
  // we patch the affected row in place to avoid flickering the whole
  // list; match/like may need to add a brand-new row, so full reload.
  if (document.getElementById("session-list")) {
    if (n.kind === "message" && n.session_id) {
      patchSidebarRow(n.session_id);
    } else if (n.kind === "match" || n.kind === "like") {
      loadSessions();
    }
  }

  // System-level notification on phone/desktop. Every notification kind
  // — including 'message' — fires one here. Suppressed automatically
  // when the user is already looking at the relevant chat
  // (showSystemNotification checks document focus).
  try { window.notifyForGeneric?.(n); } catch (e) { console.warn("[notif gen]", e); }
}

// ---------- AUTH ----------
function renderAuth(root) {
  root.append($("#tpl-auth").content.cloneNode(true));

  // Tabs: Sign in / Create account. Each has its own pane so email +
  // password autofill don't collide between the two flows and so the
  // visual context (heading, button label, copy) reads correctly.
  const showPane = (which) => {
    $$(".auth-tab").forEach((t) => {
      const on = t.dataset.pane === which;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    });
    $$(".auth-pane").forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== which));
    const focusEl = which === "login" ? $("#email_login") : $("#email_signup");
    setTimeout(() => focusEl?.focus(), 0);
  };
  $$(".auth-tab").forEach((t) => t.addEventListener("click", () => showPane(t.dataset.pane)));
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => showPane(b.dataset.go)));

  $("#btn-login").onclick = async () => {
    const email = $("#email_login").value.trim();
    const password = $("#password_login").value;
    if (!email || !password) return toast("Enter email and password.");
    const btn = $("#btn-login");
    buttonLoading(btn, true);
    progressStart();
    try {
      const res = await api("/auth/login", { method: "POST", body: { email, password }, auth: false });
      setSession(res.token, { id: res.user_id, email: res.email });
      await onSignedIn({ id: res.user_id, email: res.email });
    } catch (err) { toast(err.message); }
    finally { buttonLoading(btn, false); progressEnd(); }
  };

  // Terms gate — the Create account button stays disabled until the
  // checkbox is ticked. Existing accounts hit /auth/login, which is not
  // affected, so we don't lock anyone who's already signed up out of
  // the app retroactively.
  const agreeCb = $("#agree-terms");
  const signupBtn = $("#btn-signup");
  const syncAgree = () => { signupBtn.disabled = !agreeCb.checked; };
  agreeCb?.addEventListener("change", syncAgree);
  syncAgree();
  $("#open-terms")?.addEventListener("click", openTermsModal);

  signupBtn.onclick = async () => {
    const email = $("#email_signup").value.trim();
    const password = $("#password_signup").value;
    if (!email || !password) return toast("Enter email and password.");
    if (password.length < 6) return toast("Password must be at least 6 characters.");
    if (!agreeCb?.checked) return toast("Please agree to the Terms first.");
    buttonLoading(signupBtn, true);
    progressStart();
    try {
      const res = await api("/auth/signup", { method: "POST", body: { email, password }, auth: false });
      setSession(res.token, { id: res.user_id, email: res.email });
      await onSignedIn({ id: res.user_id, email: res.email });
    } catch (err) { toast(err.message); }
    finally { buttonLoading(signupBtn, false); progressEnd(); }
  };
}

async function doLogout() {
  if (DEMO_MODE) { toast("Demo mode — no real session to sign out of."); return; }
  if (notifChannel)          { supabase.removeChannel(notifChannel);          notifChannel = null; }
  if (globalMessagesChannel) { supabase.removeChannel(globalMessagesChannel); globalMessagesChannel = null; }
  if (profilesChannel)       { supabase.removeChannel(profilesChannel);       profilesChannel = null; }
  if (presenceChannel)       { supabase.removeChannel(presenceChannel);       presenceChannel = null; }
  state.onlineUsers.clear();
  state.peerLastSeen.clear();
  if (startHeartbeat._timer) { clearInterval(startHeartbeat._timer); startHeartbeat._timer = null; }
  state.deck = null;
  state.deckIndex = 0;
  state.deckStale = false;
  state.deckLoadedAt = 0;
  state.passed.clear();
  try { localStorage.removeItem(PASSED_KEY); } catch {}
  clearSession();
  state.user = null;
  setNavVisible(false);
  navigate("auth");
}

async function deleteAccount() {
  if (DEMO_MODE) { toast("Demo mode — nothing to delete."); return; }
  const ok = window.confirm(
    "Delete your account?\n\nThis permanently removes your profile, matches, " +
    "and messages. This action cannot be undone."
  );
  if (!ok) return;
  const btn = document.getElementById("delete-account");
  buttonLoading(btn, true);
  progressStart();
  try {
    await api("/auth/me", { method: "DELETE" });
    toast("Account deleted.");
    await doLogout();
  } catch (err) {
    toast(`Couldn't delete account: ${err.message}`);
  } finally {
    buttonLoading(btn, false);
    progressEnd();
  }
}

// ---------- ONBOARDING ----------
function renderOnboarding(root) {
  root.append($("#tpl-onboarding").content.cloneNode(true));

  // Step navigation: only one pane is visible at a time. The Continue
  // / Back buttons carry data-next / data-back. Step 1 also validates
  // nickname before letting the user progress.
  const goToStep = (step) => {
    $$(".onb-pane").forEach((p) => p.classList.toggle("hidden", Number(p.dataset.step) !== step));
    $$(".onb-step").forEach((s) => {
      const n = Number(s.dataset.step);
      s.classList.toggle("active", n === step);
      s.classList.toggle("done", n < step);
    });
    const bar = root.querySelector(".onb-progress");
    if (bar) bar.setAttribute("aria-valuenow", String(step));
    root.scrollTo?.({ top: 0, behavior: "instant" });
    window.scrollTo?.({ top: 0, behavior: "instant" });
  };
  const flushTagInputs = () => {
    $("#interests-input")?.querySelector("input")?.dispatchEvent(new Event("blur"));
    $("#hobbies-input")?.querySelector("input")?.dispatchEvent(new Event("blur"));
  };
  // Matching needs these to produce a meaningful score (interests + hobbies
  // overlap, plus the two free-text fields for embedding-based scoring).
  // Without them the suggestions endpoint has nothing to rank against, so
  // we block step 2 → 3 and the final save until they're filled in.
  const validateMatchingFields = () => {
    flushTagInputs();
    if (interests.values().length < 3) {
      toast("Add at least 3 interests so we can find your people.");
      return false;
    }
    if (hobbies.values().length < 2) {
      toast("Add at least 2 hobbies so we can find your people.");
      return false;
    }
    if (!$("#leisure_time").value.trim()) {
      toast("Tell us how you spend your leisure time.");
      return false;
    }
    if (!$("#wants_in_relationship").value.trim()) {
      toast("Tell us what you want in a connection.");
      return false;
    }
    return true;
  };
  root.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => {
    const target = Number(b.dataset.next);
    if (target === 2) {
      const nickname = $("#nickname").value.trim();
      if (!nickname) return toast("Pick a nickname so people can say hi.");
    }
    if (target === 3) {
      if (!validateMatchingFields()) return;
    }
    goToStep(target);
  }));
  root.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => {
    goToStep(Number(b.dataset.back));
  }));

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

  // Profile picture: dataURL stored in private_identities.profile_picture.
  // Editable via the file picker; cleared via the trash button. The
  // picker state lives in `state.profilePictureData` (string | null)
  // until save, which folds it into privPayload.
  state.profilePictureData = state.privateIdentity?.profile_picture || null;
  const pickPreview = $("#profile_picture_preview");
  const pickBtn     = $("#profile_picture_btn");
  const pickClear   = $("#profile_picture_clear");
  const pickInput   = $("#profile_picture_file");
  function paintPicturePreview() {
    if (setAvatarImage(pickPreview, state.profilePictureData)) {
      pickClear.hidden = false;
      pickBtn.textContent = "Change photo";
    } else {
      state.profilePictureData = null;
      pickPreview.textContent = "🖼️";
      pickClear.hidden = true;
      pickBtn.textContent = "Upload photo";
    }
  }
  paintPicturePreview();
  pickBtn.onclick = () => pickInput.click();
  pickClear.onclick = () => { state.profilePictureData = null; paintPicturePreview(); };
  pickInput.onchange = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Please pick an image."); return; }
    if (file.size > 2 * 1024 * 1024)   { toast("Image is larger than 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const safe = safeImageDataURL(reader.result);
      if (!safe) { toast("That image format isn't supported. Try PNG, JPG, WebP, or GIF."); return; }
      state.profilePictureData = safe;
      paintPicturePreview();
    };
    reader.onerror = () => toast("Couldn't read that file.");
    reader.readAsDataURL(file);
    ev.target.value = "";
  };

  const interests = makeTagInput($("#interests-input"), state.prefs?.interests || []);
  const hobbies   = makeTagInput($("#hobbies-input"),   state.prefs?.hobbies   || []);

  $("#save-profile").onclick = async () => {
    const nickname = $("#nickname").value.trim();
    if (!nickname) return toast("Pick a nickname.");
    if (!validateMatchingFields()) return;

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
      profile_picture: state.profilePictureData || null,
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

    const btn = $("#save-profile");
    buttonLoading(btn, true);
    progressStart();
    try {
      // public.match_preferences.user_id and public.private_identities.user_id
      // are foreign keys to public.profiles(id). On first-save the profiles
      // row doesn't exist yet, so we must upsert it BEFORE the other two —
      // otherwise the FK fires before the profile lands and Postgres rejects
      // the dependent inserts with a 400.
      const showPgError = (label, err) => {
        console.error(`[${label}] PostgREST error`, err);
        const parts = [err.message];
        if (err.code) parts.push(`code ${err.code}`);
        if (err.details) parts.push(err.details);
        if (err.hint) parts.push(`hint: ${err.hint}`);
        toast(parts.join(" — "));
      };

      const p1 = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" })
        .select()
        .single();
      if (p1.error) { showPgError("profiles", p1.error); return; }

      const [p2, p3] = await Promise.all([
        supabase.from("match_preferences").upsert(prefsPayload, { onConflict: "user_id" }).select().single(),
        supabase.from("private_identities").upsert(privPayload, { onConflict: "user_id" }).select().single(),
      ]);
      if (p2.error) { showPgError("match_preferences", p2.error); return; }
      if (p3.error) { showPgError("private_identities", p3.error); return; }

      state.profile = p1.data;
      state.prefs = p2.data;
      state.privateIdentity = p3.data;
      toast("Saved.");
      navigate("discover");
    } finally {
      buttonLoading(btn, false);
      progressEnd();
    }
  };
}

function makeTagInput(container, initial) {
  const tags = new Set(initial);
  const input = container.querySelector("input");
  const addBtn = container.querySelector(".tag-add");
  // Suggestion chips live in a sibling under the same .field — find by
  // explicit data-suggest-for so we never accidentally bind the wrong row.
  const suggestHost = container.parentElement?.querySelector(
    `.tag-suggestions[data-suggest-for="${container.id}"]`,
  );

  function syncSuggestions() {
    if (!suggestHost) return;
    suggestHost.querySelectorAll(".tag-suggest").forEach((b) => {
      const used = tags.has(b.textContent.trim().toLowerCase());
      b.classList.toggle("used", used);
      b.setAttribute("aria-pressed", used ? "true" : "false");
      // Keep clickable — used chips toggle the value back off so the
      // suggestion row behaves like a multi-select picker.
      b.disabled = false;
    });
  }

  function repaint() {
    container.querySelectorAll(".tag").forEach((t) => t.remove());
    for (const v of tags) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.innerHTML = `${escapeHtml(v)} <button aria-label="remove" type="button">×</button>`;
      tag.querySelector("button").onclick = () => { tags.delete(v); repaint(); };
      container.insertBefore(tag, input);
    }
    syncSuggestions();
  }
  function addTag(raw) {
    const v = String(raw || "").trim().toLowerCase();
    if (!v) return;
    tags.add(v);
    repaint();
  }
  function commit() {
    if (!input.value.trim()) return;
    addTag(input.value);
    input.value = "";
  }
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
    if (e.key === "Backspace" && !input.value && tags.size) {
      const last = [...tags].pop();
      tags.delete(last); repaint();
    }
  });
  input.addEventListener("blur", commit);

  if (addBtn) {
    // mousedown fires before the input blurs, so trapping it keeps focus
    // on the input and prevents the blur->commit + click->commit double.
    addBtn.addEventListener("mousedown", (e) => e.preventDefault());
    addBtn.addEventListener("click", () => {
      commit();
      input.focus();
    });
  }

  if (suggestHost) {
    suggestHost.addEventListener("click", (e) => {
      const b = e.target.closest(".tag-suggest");
      if (!b) return;
      const v = b.textContent.trim().toLowerCase();
      if (!v) return;
      if (tags.has(v)) { tags.delete(v); repaint(); }
      else addTag(v);
    });
  }

  repaint();
  return { values: () => [...tags] };
}

// ---------- DISCOVER (swipe deck) ----------
async function renderDiscover(root) {
  root.append($("#tpl-discover").content.cloneNode(true));
  $("#refresh-discover").onclick = () => { state.deck = null; state.deckIndex = 0; loadDiscover(); };
  // Fresh-enough check: if the realtime profiles subscription flagged
  // the deck stale, or it's older than ~2 min, drop it so loadDiscover
  // refetches. Mid-swipe sessions (deck still populated and recent)
  // keep the user's position.
  const TWO_MIN = 2 * 60 * 1000;
  const stale = state.deckStale === true
    || (state.deckLoadedAt && Date.now() - state.deckLoadedAt > TWO_MIN);
  if (stale) {
    state.deck = null;
    state.deckIndex = 0;
    state.deckStale = false;
  }
  await loadDiscover();
}

function existingSessionPartners() {
  const me = state.user?.id || DEMO_ME.id;
  return new Set(
    DEMO_SESSIONS.map((s) => (s.user_a === me ? s.user_b : s.user_a)),
  );
}

// Fallback when the matching backend returns no suggestions (e.g. a brand-
// new user has no features yet). Pulls every other profile straight from
// Supabase so the deck is never empty just because the engine is cold.
// interests/hobbies live on match_preferences, not profiles — fetched
// separately and joined in JS.
async function loadProfilesFallback() {
  if (!supabase || !state.user) return [];
  const [{ data: profs, error: pErr }, { data: prefs, error: prErr }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nickname, avatar_url, gender, zodiac_sign")
      .neq("id", state.user.id),
    supabase
      .from("match_preferences")
      .select("user_id, interests, hobbies"),
  ]);
  if (pErr) {
    console.warn("[discover] profiles fallback failed:", pErr.message);
    return [];
  }
  if (prErr) {
    console.warn("[discover] match_preferences fetch failed:", prErr.message);
  }
  const tagsById = new Map((prefs || []).map((p) => [p.user_id, p]));
  return (profs || []).map((p) => {
    const t = tagsById.get(p.id) || {};
    return {
      user_id: p.id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      gender: p.gender,
      zodiac_sign: p.zodiac_sign,
      interests: t.interests || [],
      hobbies: t.hobbies || [],
    };
  });
}

async function loadDiscover() {
  const stack = $("#swipe-stack");
  skelDeck(stack);
  progressStart();

  let suggestions = [];
  if (DEMO_MODE) {
    suggestions = DEMO_USERS;
  } else {
    try {
      // The deployed backend exposes /suggestions/{user_id} as a GET.
      // We append the requester's matching context as query parameters
      // so the engine *can* filter by intent/term and score against the
      // user's interest/hobby vectors when it's updated to read them;
      // older deployments that ignore the params still return their
      // previous behavior, just without context-aware scoring.
      const params = new URLSearchParams();
      const prefs = state.prefs || {};
      if (prefs.target_intent) params.set("intent", prefs.target_intent);
      if (prefs.term_length)   params.set("term_length", prefs.term_length);
      for (const tag of prefs.interests || []) params.append("interests", tag);
      for (const tag of prefs.hobbies   || []) params.append("hobbies", tag);
      // Forward the persisted pass list so the backend can demote those
      // users to the bottom of the ranking instead of skipping them.
      for (const uid of state.passed || []) params.append("passed", uid);
      const qs = params.toString();
      const path = `/suggestions/${state.user.id}${qs ? `?${qs}` : ""}`;
      suggestions = await api(path);
    } catch (err) {
      console.warn("[discover] /suggestions failed, falling back to profiles:", err.message);
      suggestions = [];
    }
    if (!suggestions || suggestions.length === 0) {
      suggestions = await loadProfilesFallback();
    }
  }
  progressEnd();

  if (state.deck === null) {
    state.deckLoadedAt = Date.now();
    let skip;
    if (DEMO_MODE) {
      skip = existingSessionPartners();
    } else {
      // Drop everyone you've already matched with, plus anyone you've
      // already liked (they'll either come back as a match notification
      // or stay queued until they like you).
      skip = new Set();
      const me = state.user.id;
      const [sessRes, likeRes] = await Promise.all([
        supabase
          .from("chat_sessions")
          .select("user_a, user_b")
          .or(`user_a.eq.${me},user_b.eq.${me}`),
        supabase.from("likes").select("likee").eq("liker", me),
      ]);
      for (const s of sessRes.data || []) {
        skip.add(s.user_a === me ? s.user_b : s.user_a);
      }
      for (const l of likeRes.data || []) skip.add(l.likee);
    }
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

  // Backend now hands us a 0-100 percentage in `score`. Show it as
  // an always-visible chip on the card head so users can see the
  // match strength at a glance instead of digging into "More info".
  const scoreNum = typeof user.score === "number" ? Math.round(user.score) : null;
  const scoreTone = scoreNum == null ? "" : scoreNum >= 70 ? "hot" : scoreNum >= 40 ? "warm" : "mild";
  const scoreChip = scoreNum != null
    ? `<span class="swipe-score-chip ${scoreTone}" title="Match score based on shared interests + hobbies">${scoreNum}% match</span>`
    : "";

  card.innerHTML = `
    <div class="swipe-hero">
      <div class="swipe-avatar">${escapeHtml(user.avatar_url || "🧑")}</div>
      ${scoreChip}
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
        ${scoreNum != null ? `<div class="swipe-detail-row"><span class="swipe-detail-label">Vibe match</span><span class="swipe-score">${scoreNum}%</span></div>` : ""}
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

  // Keyboard support: ArrowRight to like, ArrowLeft to pass.
  card.setAttribute("tabindex", "0");
  card.setAttribute("role", "button");
  card.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); likeCurrent(card); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); passCurrent(card); }
  });
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
  if (user) { state.passed.add(user.user_id); persistPassed(); }
  if (card) flyAway(card, "left");
  else advance();
}

function likeCurrent(card) {
  const user = state.deck?.[state.deckIndex];
  if (!user) return;
  state.liked.add(user.user_id);

  if (DEMO_MODE) {
    if (DEMO_MUTUAL_FANS.has(user.user_id)) handleMutualMatch(user);
  } else {
    // like_user returns the chat_sessions id when both sides have liked
    // (mutual match), otherwise null. Card flies away immediately for
    // snappy UX; overlay only appears on a genuine mutual match.
    supabase.rpc("like_user", { target: user.user_id }).then(({ data, error }) => {
      if (error) return toast(error.message);
      if (data) showMatchOverlay(user, data);
    });
  }

  if (card) flyAway(card, "right");
  else advance();
}

function advance() {
  if (!state.deck?.length) return;
  state.deck.splice(state.deckIndex, 1);
  if (state.deckIndex >= state.deck.length) state.deckIndex = 0;
  if (state.deck.length === 0) {
    // Exhausted the current deck — fetch a fresh batch so people
    // who joined or edited their profile since we loaded show up,
    // without making the user press ↻.
    state.deck = null;
    loadDiscover();
    return;
  }
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
  showMatchOverlay(user, sess.id);
}

function showMatchOverlay(user, sessionId) {
  // Remove any existing overlay first
  document.getElementById("match-overlay")?.remove();

  const frag = document.getElementById("tpl-match-overlay").content.cloneNode(true);
  const overlay = frag.querySelector(".match-overlay");

  // Populate avatars
  const meProfile = state.profile;
  overlay.querySelector(".match-av-me").textContent = meProfile?.avatar_url || "🦊";
  overlay.querySelector(".match-av-them").textContent = user.avatar_url || "🌸";

  // Subline
  overlay.querySelector(".match-subline").textContent =
    `${escapeHtml(user.nickname)} liked you and wants to start a conversation.`;

  // Buttons
  overlay.querySelector("#match-msg-btn").onclick = () => {
    overlay.classList.add("match-overlay-out");
    setTimeout(() => overlay.remove(), 350);
    navigate("chats").then(() => {
      if (sessionId) openSession(sessionId);
    });
  };
  overlay.querySelector("#match-keep-btn").onclick = () => {
    overlay.classList.add("match-overlay-out");
    setTimeout(() => overlay.remove(), 350);
  };

  document.body.appendChild(overlay);
  // Trigger entrance animation next frame
  requestAnimationFrame(() => overlay.classList.add("match-overlay-in"));
}

// ---------- MATCHES ----------
async function renderMatches(root) {
  root.append($("#tpl-matches").content.cloneNode(true));
  const grid = $("#matches-grid");
  skelMatches(grid);
  const me = state.user?.id || DEMO_ME.id;
  let sessions = [];
  if (DEMO_MODE) {
    sessions = DEMO_SESSIONS.slice();
  } else {
    progressStart();
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
    } finally { progressEnd(); }
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
  // Resolve every peer's profile up front. In real mode we hit
  // public.profiles once with a batched .in() so the tiles render
  // with real nicknames + avatars instead of falling back to
  // "Unknown" (which is what demoPeer returns when the id isn't
  // in DEMO_USERS).
  const peerIds = sessions.map((s) => (s.user_a === me ? s.user_b : s.user_a));
  let peerMap = {};
  if (DEMO_MODE) {
    peerMap = Object.fromEntries(peerIds.map((id) => [id, demoPeer(id)]));
  } else {
    const { data: peers } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url, gender, zodiac_sign")
      .in("id", peerIds);
    peerMap = Object.fromEntries((peers || []).map((p) => [p.id, p]));
  }

  grid.innerHTML = "";
  for (const s of sessions) {
    const otherId = s.user_a === me ? s.user_b : s.user_a;
    const peer = peerMap[otherId] || { nickname: "Unknown", avatar_url: "🦊" };
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
  startSessionsPolling();
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
  $("#terms-modal-close")?.addEventListener("click", closeTermsModal);
  $("#terms-modal-ok")?.addEventListener("click", closeTermsModal);
  $("#terms-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "terms-modal") closeTermsModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeEmojiModal();
    closeConfirmModal();
    closeReportModal();
    closeTermsModal();
    closeInfoPanel();
  });
}

function openTermsModal() {
  const m = $("#terms-modal");
  if (!m) return;
  m.classList.remove("hidden");
  m.setAttribute("aria-hidden", "false");
  m.querySelector(".terms-modal-body")?.scrollTo?.({ top: 0 });
}
function closeTermsModal() {
  const m = $("#terms-modal");
  m?.classList.add("hidden");
  m?.setAttribute("aria-hidden", "true");
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
  const infoAv = $("#info-avatar");
  infoAv.innerHTML = `${escapeHtml(peer.avatar_url || "🦊")}<span class="status-dot"></span>`;
  infoAv.dataset.presenceUser = s.peer_id || peer.id || "";
  paintPresence();
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
        onConfirm: async () => {
          if (DEMO_MODE) {
            DEMO_MESSAGES[s.id] = [];
          } else {
            const { error } = await supabase.from("messages").delete().eq("session_id", s.id);
            if (error) return toast(error.message);
          }
          loadMessages(s.id);
          toast("Chat cleared.");
        },
      });
      break;
    case "unmatch":
      openConfirmModal({
        title: `Unmatch ${peerName}?`,
        text: "Your chat and the match itself will be removed. You'll both be able to rediscover each other in Discover.",
        icon: "💔",
        okLabel: "Unmatch",
        okClass: "danger",
        onConfirm: async () => {
          // Optimistic: hide the chat from the UI immediately, then
          // give the user a 5s Undo window before the destructive
          // call goes through. On Undo we just drop the pending flag
          // and reload; on timeout we commit the unmatch.
          const sessionId = s.id;
          state.pendingUnmatch.add(sessionId);
          closeInfoPanel();
          closeActiveChat();
          loadSessions();
          const undone = await actionToast({
            msg: `Unmatched ${peerName}.`,
            actionLabel: "Undo",
            ms: 5000,
          });
          if (undone) {
            state.pendingUnmatch.delete(sessionId);
            loadSessions();
            toast("Match restored.");
            return;
          }
          // Window expired — commit the destructive change.
          if (DEMO_MODE) {
            const i = DEMO_SESSIONS.findIndex((x) => x.id === sessionId);
            if (i >= 0) DEMO_SESSIONS.splice(i, 1);
            delete DEMO_MESSAGES[sessionId];
            state.deck = null;
            state.deckIndex = 0;
          } else {
            // unmatch_session deletes the chat_sessions row (cascade
            // takes messages + notifications) AND the two likes rows
            // for the pair, so both of you can rediscover each other
            // in Discover instead of being permanently skip-filtered.
            const { error } = await supabase.rpc("unmatch_session", { session: sessionId });
            if (error) {
              state.pendingUnmatch.delete(sessionId);
              loadSessions();
              return toast(error.message);
            }
            state.deck = null;
            state.deckIndex = 0;
          }
          state.pendingUnmatch.delete(sessionId);
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
        onConfirm: async () => {
          state.blockedUsers.add(s.peer_id);
          if (DEMO_MODE) {
            const i = DEMO_SESSIONS.findIndex((x) => x.id === s.id);
            if (i >= 0) DEMO_SESSIONS.splice(i, 1);
            delete DEMO_MESSAGES[s.id];
          } else {
            await supabase.from("blocked_users").upsert(
              { blocker_id: state.user.id, blocked_id: s.peer_id },
              { onConflict: "blocker_id,blocked_id" }
            );
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

async function loadBlockedUsers() {
  if (DEMO_MODE || !supabase || !state.user) return;
  state.blockedUsers = state.blockedUsers || new Set();
  const { data } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", state.user.id);
  for (const row of data || []) state.blockedUsers.add(row.blocked_id);
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
async function submitReport() {
  const reason = document.querySelector('#report-reasons input:checked')?.value;
  if (!reason) { toast("Pick a reason first."); return; }
  const details = ($("#report-details")?.value || "").trim();
  closeReportModal();
  if (!DEMO_MODE && supabase && state.activeSession) {
    const peerId = state.activeSession.user_a === state.user.id
      ? state.activeSession.user_b
      : state.activeSession.user_a;
    await supabase.from("reports").insert({
      reporter_id: state.user.id,
      reported_id: peerId,
      session_id: state.activeSession.id,
      reason,
      details: details || null,
    });
  }
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
  skelSessionList(list);

  let data;
  if (DEMO_MODE) {
    data = [...DEMO_SESSIONS].filter(
      (s) => s.user_a === state.user.id || s.user_b === state.user.id,
    );
  } else {
    progressStart();
    const res = await supabase
      .from("chat_sessions")
      .select("*")
      .or(`user_a.eq.${state.user.id},user_b.eq.${state.user.id}`)
      .order("created_at", { ascending: false });
    progressEnd();
    if (res.error) { list.innerHTML = ""; return toast(res.error.message); }
    data = res.data;
  }
  // Hide sessions the user has just unmatched but where the Undo
  // window hasn't closed yet — they get rehydrated if Undo is tapped.
  if (state.pendingUnmatch.size) {
    data = data.filter((s) => !state.pendingUnmatch.has(s.id));
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
      .select("id, nickname, avatar_url, last_seen")
      .in("id", peerIds);
    peerMap = Object.fromEntries((peers || []).map((p) => [p.id, p]));
    for (const p of peers || []) {
      if (p.last_seen) state.peerLastSeen.set(p.id, p.last_seen);
    }
    // Track the peer for each session so realtime-driven system
    // notifications can show "New message from <nickname>" without
    // having to round-trip Supabase every time a message lands.
    state.peerBySession = state.peerBySession || new Map();
    for (const s of data) {
      const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
      if (peerMap[peerId]) state.peerBySession.set(s.id, peerMap[peerId]);
    }
    // Pull the most recent message per session for the sidebar preview +
    // timestamp. One query, then bucket client-side by session_id.
    const sessionIds = data.map((s) => s.id);
    if (sessionIds.length) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("session_id, sender_id, body, created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
        .limit(sessionIds.length * 5);
      const lastBySession = new Map();
      for (const m of msgs || []) {
        if (!lastBySession.has(m.session_id)) lastBySession.set(m.session_id, m);
      }
      for (const m of lastBySession.values()) await decryptMessageInPlace(m);
      state.lastMessageBySession = lastBySession;
    }
  }
  // Remember which sessions belong to me so the global message
  // subscription can ignore inserts on rooms I'm not in (defensive —
  // RLS already filters realtime delivery).
  state.knownSessionIds = new Set(data.map((s) => s.id));

  // Sort by most recent message, falling back to session created_at so
  // conversations with no messages yet still appear in a sensible order.
  data.sort((a, b) => {
    const ta = state.lastMessageBySession.get(a.id)?.created_at || a.created_at || "";
    const tb = state.lastMessageBySession.get(b.id)?.created_at || b.created_at || "";
    return tb.localeCompare(ta);
  });

  // Drop the skeleton rows before painting the real list — otherwise
  // skelSessionList's placeholders sit at the top of #session-list
  // and the user thinks the page is still loading.
  list.innerHTML = "";

  for (const s of data) {
    const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
    const peer = peerMap[peerId] || { nickname: "Unknown", avatar_url: "🦊" };

    // Last message preview + time
    let preview = "Say hi 👋", lastTime = "";
    let last;
    if (DEMO_MODE) {
      const msgs = DEMO_MESSAGES[s.id] || [];
      last = msgs[msgs.length - 1];
    } else {
      last = state.lastMessageBySession.get(s.id);
    }
    if (last && last.body !== null) {
      preview = (last.sender_id === state.user.id ? "You: " : "") + (last.body || "");
      lastTime = formatRelativeTime(last.created_at);
    }
    const unread = state.unreadBySession.get(s.id) || 0;
    const revealed = s.user_a_approved_reveal && s.user_b_approved_reveal;

    const row = document.createElement("div");
    row.className = "session-item" + (unread ? " has-unread" : "");
    row.dataset.sessionId = s.id;
    row.dataset.peerName = peer.nickname || "";
    row.innerHTML = `
      <div class="avatar" data-presence-user="${escapeHtml(peerId)}">${escapeHtml(peer.avatar_url || "🦊")}<span class="status-dot"></span></div>
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
  // Keep the active-session highlight after a repaint (e.g. when the
  // global message subscription triggers loadSessions while a chat is open).
  if (state.activeSession?.id) {
    list.querySelector(`.session-item[data-session-id="${state.activeSession.id}"]`)
      ?.classList.add("active");
  }
  paintPresence();
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
    const res = await supabase.from("chat_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (res.error) return toast(res.error.message);
    if (!res.data) {
      // The conversation no longer exists (deleted on the other side or
      // notification points to a stale id). Drop the stale notification
      // and refresh the list instead of leaving the user staring at a
      // half-loaded chat.
      state.notifications = state.notifications.filter((n) => n.session_id !== sessionId);
      refreshBadges();
      await loadSessions();
      return toast("That conversation isn't available anymore.");
    }
    s = res.data;
    const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
    const pRes = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url, gender, zodiac_sign, last_seen")
      .eq("id", peerId)
      .maybeSingle();
    if (pRes.error) return toast(pRes.error.message);
    peer = pRes.data || { id: peerId, nickname: "Unknown", avatar_url: "🦊", gender: "", zodiac_sign: "" };
    if (peer.last_seen) state.peerLastSeen.set(peer.id, peer.last_seen);
  }

  const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
  state.activeSession = { ...s, peer_id: peerId, peer_profile: peer };

  $$(".session-item").forEach((el) => el.classList.toggle("active", el.dataset.sessionId === sessionId));
  $("#chat-shell")?.classList.add("has-active");
  document.documentElement.classList.add("chat-open");
  $("#chat-empty").classList.add("hidden");
  $("#chat-active").classList.remove("hidden");

  const peerAv = $("#peer-avatar");
  peerAv.innerHTML = `${escapeHtml(peer.avatar_url || "🦊")}<span class="status-dot"></span>`;
  peerAv.dataset.presenceUser = peer.id || "";
  $("#peer-name").textContent = peer.nickname;
  const metaParts = [peer.gender, peer.zodiac_sign].filter(Boolean).map(escapeHtml).join(" · ");
  const peerMeta = $("#peer-meta");
  peerMeta.innerHTML = `<span class="online"></span> <span data-presence-label>Offline</span>${metaParts ? " · " + metaParts : ""}`;
  peerMeta.dataset.presenceUser = peer.id || "";
  paintPresence();
  const sidEl = $("#peer-session-id");
  if (sidEl) sidEl.textContent = `#${sessionId.slice(0, 8)}`;

  // Opening a conversation clears its unread badge + notification count.
  clearUnread(sessionId);
  // Mark in-memory notifications read
  let notifTouched = false;
  for (const n of state.notifications) {
    if (n.unread && n.kind === "message" && n.session_id === sessionId) {
      n.unread = false; notifTouched = true;
    }
  }
  refreshBadges();
  if (notifTouched && !DEMO_MODE) {
    supabase.from("notifications")
      .update({ unread: false })
      .eq("user_id", state.user.id)
      .eq("session_id", sessionId)
      .eq("kind", "message")
      .eq("unread", true)
      .then(() => {});
  }
  if (document.getElementById("notifications-list")) paintNotifications();
  document.querySelector(`.session-item[data-session-id="${sessionId}"]`)
    ?.classList.remove("has-unread");

  await loadMessages(sessionId);
  await refreshRevealState();
  if (!DEMO_MODE) subscribeRealtime(sessionId);
}

async function loadMessages(sessionId) {
  const body = $("#chat-body");
  skelMessages(body);
  body.dataset.lastDay = "";
  let data;
  if (DEMO_MODE) {
    data = (DEMO_MESSAGES[sessionId] || []).slice().sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
  } else {
    progressStart();
    const res = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    progressEnd();
    if (res.error) { body.innerHTML = ""; return toast(res.error.message); }
    data = res.data;
  }
  body.innerHTML = "";
  // Decrypt each message body in place before caching/rendering so
  // findMessage(), reply-quote previews, and appendMessage all see
  // the plaintext. Legacy plaintext rows pass through untouched.
  if (!DEMO_MODE && (data || []).length) {
    await Promise.all((data || []).map(decryptMessageInPlace));
  }
  // Cache the loaded messages so reply-quotes can resolve their
  // target without another DB round trip. findMessage() reads from
  // this map in real mode (DEMO_MODE still uses DEMO_MESSAGES).
  if (!DEMO_MODE) {
    state.sessionMessages = state.sessionMessages || {};
    state.sessionMessages[sessionId] = (data || []).slice();
  }
  for (const m of data || []) appendMessage(m);
  body.scrollTop = body.scrollHeight;
}

function appendMessage(m) {
  if (!m || m.body === null) return;
  const body = $("#chat-body");
  if (!body) return;

  // Idempotent — we may receive the same row from the optimistic send
  // path, the per-session realtime channel, and the polling fallback.
  // Render only once.
  if (m.id && body.querySelector(`[data-msg-id="${CSS.escape(m.id)}"]`)) return;

  // Keep the lookup cache in sync so newly-arrived realtime messages
  // are reachable from findMessage() (used by reply-quote rendering).
  if (!DEMO_MODE) {
    const cache = (state.sessionMessages = state.sessionMessages || {});
    const arr = (cache[m.session_id] = cache[m.session_id] || []);
    if (!arr.some((x) => x.id === m.id)) arr.push(m);
  }

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
  if (DEMO_MODE) {
    return (DEMO_MESSAGES[sessionId] || []).find((x) => x.id === msgId);
  }
  return (state.sessionMessages?.[sessionId] || []).find((x) => x.id === msgId);
}

function renderReplyQuote(m) {
  if (!m.reply_to_id) return "";
  const target = findMessage(m.session_id, m.reply_to_id);
  if (!target) {
    return `<div class="bubble-quote bubble-quote-missing">Original message unavailable</div>`;
  }
  // In real mode the chat only ever has two participants, so the
  // sender of the quoted message is either me or the active peer.
  // demoPeer() would have returned "Unknown" here.
  const peerName = DEMO_MODE
    ? (demoPeer(target.sender_id).nickname || "Them")
    : (state.activeSession?.peer_profile?.nickname || "Them");
  const peer = target.sender_id === state.user?.id ? "You" : peerName;
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
  if (!DEMO_MODE) {
    supabase.from("messages")
      .update({ reactions: msg.reactions })
      .eq("id", msg.id)
      .then(({ error }) => { if (error) toast(error.message); });
  }
}

function deleteMessage(msg) {
  if (!msg || !state.activeSession) return;
  if (msg.sender_id !== state.user?.id) return toast("You can only delete your own messages.");
  if (DEMO_MODE) {
    const arr = DEMO_MESSAGES[state.activeSession.id];
    if (arr) {
      const i = arr.findIndex((x) => x.id === msg.id);
      if (i >= 0) arr.splice(i, 1);
    }
  } else {
    // Drop from the lookup cache so a later reply that quoted this
    // message renders "Original message unavailable" instead of
    // pointing at a deleted row.
    const arr = state.sessionMessages?.[state.activeSession.id];
    if (arr) {
      const i = arr.findIndex((x) => x.id === msg.id);
      if (i >= 0) arr.splice(i, 1);
    }
    supabase.from("messages").delete().eq("id", msg.id)
      .then(({ error }) => { if (error) toast(error.message); });
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
function showMicHelp(reason) {
  // Build (or reuse) a small modal that explains how to re-enable the
  // microphone, since once the browser has stored a "Block" decision
  // we can't re-prompt from JS.
  let modal = document.getElementById("mic-help-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "mic-help-modal";
    modal.className = "modal-backdrop";
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-head">
          <h3>Allow microphone access</h3>
          <button class="icon-btn" data-act="close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body mic-help-body">
          <p class="mic-help-reason"></p>
          <ol>
            <li>Tap the <b>lock / info icon</b> in your browser's address bar.</li>
            <li>Find <b>Microphone</b> and switch it to <b>Allow</b>.</li>
            <li>Come back to this tab and try recording again.</li>
          </ol>
          <p class="muted" style="font-size:12.5px;">
            On Android Chrome you can also go to <b>Settings → Site settings → Microphone</b>
            and remove the block for this site.
          </p>
        </div>
        <div class="modal-foot">
          <button class="btn ghost" data-act="close">Close</button>
          <button class="btn" data-act="retry">Try again</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.classList.add("hidden");
    modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
    modal.querySelectorAll("[data-act=close]").forEach((b) => b.addEventListener("click", close));
    modal.querySelector("[data-act=retry]").addEventListener("click", () => {
      close();
      startRecording();
    });
  }
  modal.querySelector(".mic-help-reason").textContent =
    reason || "We can't hear you yet — the browser is blocking microphone access for this site.";
  modal.classList.remove("hidden");
}

const recording = { recorder: null, stream: null, chunks: [], startedAt: 0, timer: null };

async function startRecording() {
  if (recording.recorder) return; // already recording
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    return toast("Voice messages aren't supported on this device.");
  }
  if (!window.isSecureContext) {
    return showMicHelp("This page must be loaded over HTTPS for the microphone to work.");
  }

  // If we already know permission was blocked, jump straight to the
  // help dialog — the browser won't show the prompt again on its own.
  try {
    const status = await navigator.permissions?.query?.({ name: "microphone" });
    if (status?.state === "denied") return showMicHelp();
  } catch { /* permissions API is optional */ }

  try {
    recording.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      return showMicHelp();
    }
    if (err.name === "NotFoundError" || err.name === "OverconstrainedError") {
      return toast("No microphone found on this device.");
    }
    return toast("Couldn't start the microphone — try again.");
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
  const { data: inserted, error } = await supabase.from("messages").insert({
    session_id: sessionId,
    sender_id: state.user.id,
    body: "",
    attachments: [attachment],
    reply_to_id: replyToId,
  }).select().single();
  if (error) { toast(error.message); return; }
  if (inserted && state.activeSession?.id === sessionId) appendMessage(inserted);
  state.lastMessageBySession.set(sessionId, {
    session_id: sessionId,
    sender_id: state.user.id,
    body: "",
    attachments: [attachment],
    created_at: inserted?.created_at || new Date().toISOString(),
  });
  patchSidebarRow(sessionId);
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

  const wireBody = body ? await encryptBodyForSession(sessionId, body) : body;
  const { data: inserted, error } = await supabase.from("messages").insert({
    session_id: sessionId,
    sender_id: state.user.id,
    body: wireBody,
    reply_to_id: replyToId,
  }).select().single();
  if (error) { toast(error.message); return; }
  // Append straight away so the sender sees their message land without
  // waiting on the per-session realtime echo (which can be delayed or
  // dropped under flaky network). appendMessage dedupes by msg id, so
  // the realtime echo that arrives later won't double-render.
  if (inserted && state.activeSession?.id === sessionId) {
    const local = { ...inserted, body };
    appendMessage(local);
  }
  // Refresh the sidebar preview + ordering for this session immediately.
  // The global INSERT handler skips messages we sent, so without this
  // the sidebar keeps showing the previous preview until the next reload.
  state.lastMessageBySession.set(sessionId, {
    session_id: sessionId,
    sender_id: state.user.id,
    body,
    created_at: inserted?.created_at || new Date().toISOString(),
  });
  patchSidebarRow(sessionId);
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
      async (payload) => {
        await decryptMessageInPlace(payload.new);
        appendMessage(payload.new);
      },
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

  startChatPolling(sessionId);
}

// Backstop for when Postgres realtime fails to deliver an INSERT — polls
// for any messages newer than what we've cached and feeds them through
// appendMessage (which dedupes, so a doubled realtime + poll delivery is
// harmless). Pauses while the tab is hidden so we're not hammering the
// API on a backgrounded conversation.
function startChatPolling(sessionId) {
  stopChatPolling();
  _chatPollTimer = setInterval(async () => {
    if (document.hidden) return;
    if (!state.activeSession || state.activeSession.id !== sessionId) return;
    const cache = state.sessionMessages?.[sessionId] || [];
    const lastIso = cache.length ? cache[cache.length - 1].created_at : null;
    let q = supabase.from("messages").select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (lastIso) q = q.gt("created_at", lastIso);
    else q = q.limit(50);
    const { data, error } = await q;
    if (error || !data?.length) return;
    for (const m of data) {
      await decryptMessageInPlace(m);
      appendMessage(m);
    }
  }, 4000);
}
function stopChatPolling() {
  if (_chatPollTimer) { clearInterval(_chatPollTimer); _chatPollTimer = null; }
}

// Periodic sidebar refresh while the chats view is open — same idea as
// chat polling but covers the OTHER conversations (unread bumps, new
// previews, ordering) so the sidebar stays current even when the
// notifications realtime channel is silent.
function startSessionsPolling() {
  stopSessionsPolling();
  _sessionsPollTimer = setInterval(() => {
    if (document.hidden) return;
    if (!document.getElementById("session-list")) return;
    loadSessions();
  }, 10000);
}
function stopSessionsPolling() {
  if (_sessionsPollTimer) { clearInterval(_sessionsPollTimer); _sessionsPollTimer = null; }
}

function cleanupRealtime() {
  stopChatPolling();
  stopSessionsPolling();
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
    text.textContent = "Waiting for them to reveal their identity.";
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
  // Replace the emoji avatar in the chat header and the info panel
  // with the revealed photo if the user uploaded one. setAvatarImage
  // validates the dataURL prefix so a malicious profile_picture column
  // can't smuggle <script>/<svg onload> via innerHTML.
  const safePicture = safeImageDataURL(id.profile_picture);
  if (safePicture) {
    setAvatarImage($("#peer-avatar"), safePicture, { withStatusDot: true });
    setAvatarImage($("#info-avatar"), safePicture, { withStatusDot: true });
  }
  panel.innerHTML = `
    <div class="identity-row"><span>Real name</span><span>${escapeHtml(id.real_name || "—")}</span></div>
    <div class="identity-row"><span>Age</span><span>${id.age ?? "—"}</span></div>
    <div class="identity-row"><span>Country</span><span>${escapeHtml(id.country || "—")}</span></div>
    <div class="identity-row"><span>Cohort</span><span>${escapeHtml(id.cohort || "—")}</span></div>
  `;
  if (safePicture) {
    const wrap = document.createElement("div");
    wrap.className = "identity-picture";
    const img = document.createElement("img");
    img.setAttribute("src", safePicture);
    img.setAttribute("alt", "");
    wrap.appendChild(img);
    panel.insertBefore(wrap, panel.firstChild);
  }
}

// ---------- NOTIFICATIONS ----------
const NOTIF_KIND_LABEL = { all: "All", message: "Messages", like: "Likes", match: "Matches", reveal: "Reveals", system: "System" };

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

  $("#mark-all-read").onclick = async () => {
    state.notifications.forEach((n) => (n.unread = false));
    refreshBadges();
    paintNotifications();
    if (!DEMO_MODE && state.user) {
      const { error } = await supabase
        .from("notifications")
        .update({ unread: false })
        .eq("user_id", state.user.id)
        .eq("unread", true);
      if (error) return toast(error.message);
    }
    toast("All caught up.");
  };

  paintNotifications();
}

function paintNotifications() {
  const list = $("#notifications-list");
  if (!list) return;

  // Update counts
  const counts = { all: 0, message: 0, like: 0, match: 0, reveal: 0, system: 0 };
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

  let actions;
  if (n.session_id) {
    actions = `<div class="notif-actions"><button class="btn sm" data-act="open">Open chat</button><button class="btn ghost sm" data-act="dismiss">Dismiss</button></div>`;
  } else if (n.kind === "like" && n.actor_id) {
    actions = `<div class="notif-actions"><button class="btn sm" data-act="like-back">Like back</button><button class="btn ghost sm" data-act="dismiss">Dismiss</button></div>`;
  } else {
    actions = `<div class="notif-actions"><button class="btn ghost sm" data-act="dismiss">Dismiss</button></div>`;
  }

  el.innerHTML = `
    <div class="notif-icon ${n.unread ? "" : "muted"}">${escapeHtml(n.icon || "🔔")}</div>
    <div class="notif-body">
      <div class="notif-title">${escapeHtml(n.title)}</div>
      <div class="notif-text">${escapeHtml(n.text || "")}</div>
      <div class="notif-time">${escapeHtml(n.time || "")}</div>
      ${actions}
    </div>
  `;

  const markRead = () => {
    if (!n.unread) return;
    n.unread = false;
    refreshBadges();
    if (!DEMO_MODE) supabase.from("notifications").update({ unread: false }).eq("id", n.id).then(() => {});
  };

  el.querySelector("[data-act='dismiss']")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const idx = state.notifications.indexOf(n);
    if (idx >= 0) state.notifications.splice(idx, 1);
    refreshBadges();
    paintNotifications();
    if (!DEMO_MODE) {
      supabase.from("notifications").delete().eq("id", n.id)
        .then(({ error }) => { if (error) toast(error.message); });
    }
  });

  el.querySelector("[data-act='open']")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    markRead();
    await navigate("chats");
    await openSession(n.session_id);
  });

  el.querySelector("[data-act='like-back']")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    markRead();
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Liking…";
    const { data, error } = await supabase.rpc("like_user", { target: n.actor_id });
    if (error) { toast(error.message); btn.disabled = false; btn.textContent = "Like back"; return; }
    // Remove this notification — it's been acted on
    const idx = state.notifications.indexOf(n);
    if (idx >= 0) state.notifications.splice(idx, 1);
    if (!DEMO_MODE) supabase.from("notifications").delete().eq("id", n.id).then(() => {});
    if (data) {
      // Mutual match — show the overlay. We need the peer's profile for the avatar.
      const { data: peer } = await supabase.from("profiles").select("nickname,avatar_url").eq("id", n.actor_id).maybeSingle();
      showMatchOverlay({ user_id: n.actor_id, nickname: peer?.nickname || "them", avatar_url: peer?.avatar_url || "🌸" }, data);
    } else {
      toast("Liked! Waiting for them to like you back.");
    }
    paintNotifications();
  });

  el.onclick = async () => {
    markRead();
    if (n.session_id) {
      await navigate("chats");
      await openSession(n.session_id);
    } else {
      paintNotifications();
    }
  };
  return el;
}

// ---------- ADMIN ----------
// Dashboard for the designated admin account (is_admin=true on the
// profiles row, granted automatically to admin@nextdate.app via DB
// trigger). Two tabs: every user (with delete) and every report (with
// resolve / dismiss). All calls go through the backend's /admin/* API
// which re-checks is_admin server-side — the nav visibility is just UX
// polish, never the only line of defense.
async function renderAdmin(root) {
  if (!state.profile?.is_admin) {
    root.innerHTML = `<section class="center-wrap"><div class="card"><h1>Admins only</h1><p class="muted">This account doesn't have admin access.</p></div></section>`;
    return;
  }
  root.append($("#tpl-admin").content.cloneNode(true));

  const usersList   = $("#admin-users-list");
  const reportsList = $("#admin-reports-list");
  const usersCount  = $("#admin-users-count");
  const reportsCount = $("#admin-reports-count");
  const searchInput  = $("#admin-user-search");
  const reportFilter = $("#admin-report-filter");

  let allUsers = [];

  // Tab switching
  $$(".admin-tab").forEach((t) => t.addEventListener("click", () => {
    const which = t.dataset.tab;
    $$(".admin-tab").forEach((x) => {
      const on = x.dataset.tab === which;
      x.classList.toggle("active", on);
      x.setAttribute("aria-selected", String(on));
    });
    $$(".admin-pane").forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== which));
  }));

  function paintUsers(filter = "") {
    const q = filter.trim().toLowerCase();
    const visible = !q ? allUsers : allUsers.filter((u) => {
      const hay = [
        u.nickname, u.email, u.private?.real_name, u.private?.country, u.private?.cohort,
        ...(u.prefs?.interests || []), ...(u.prefs?.hobbies || []),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    usersList.innerHTML = "";
    for (const u of visible) {
      const priv = u.private || {};
      const prefs = u.prefs || {};
      const tagBits = [
        ...(prefs.interests || []).slice(0, 4),
        ...(prefs.hobbies || []).slice(0, 3),
      ].map((t) => `<span class="admin-tag">${escapeHtml(t)}</span>`).join("");
      const adminPill = u.is_admin ? `<span class="admin-pill">ADMIN</span>` : "";
      const card = document.createElement("div");
      card.className = "admin-user-card";
      card.innerHTML = `
        <div class="admin-user-head">
          <div class="admin-avatar">${escapeHtml(u.avatar_url || "🦊")}</div>
          <div class="admin-user-meta">
            <div class="admin-user-name">${escapeHtml(u.nickname || "—")} ${adminPill}</div>
            <div class="admin-user-sub">${escapeHtml(u.email || "—")} · ${escapeHtml(u.gender || "—")} · ${escapeHtml(u.zodiac_sign || "—")}</div>
          </div>
          <div class="admin-user-actions">
            <button class="btn danger small admin-delete" type="button" data-id="${escapeHtml(u.id)}" ${u.is_admin ? "disabled title=\"Admin accounts can't be deleted here\"" : ""}>Delete</button>
          </div>
        </div>
        <div class="admin-user-body">
          <div class="admin-row"><span class="admin-label">Real name</span><span>${escapeHtml(priv.real_name || "—")}</span></div>
          <div class="admin-row"><span class="admin-label">Age</span><span>${escapeHtml(String(priv.age || "—"))}</span></div>
          <div class="admin-row"><span class="admin-label">Country</span><span>${escapeHtml(priv.country || "—")}</span></div>
          <div class="admin-row"><span class="admin-label">Cohort</span><span>${escapeHtml(priv.cohort || "—")}</span></div>
          <div class="admin-row"><span class="admin-label">Looking for</span><span>${escapeHtml(prefs.target_intent || "—")} · ${escapeHtml(prefs.term_length || "—")}</span></div>
          ${tagBits ? `<div class="admin-tags">${tagBits}</div>` : ""}
        </div>`;
      usersList.appendChild(card);
    }
    if (!visible.length) {
      usersList.innerHTML = `<div class="admin-empty">No users match.</div>`;
    }
  }

  function paintReports(rows) {
    reportsCount.textContent = rows.length;
    reportsList.innerHTML = "";
    for (const r of rows) {
      const reporter = r.reporter?.nickname || r.reporter?.email || r.reporter_id.slice(0, 8);
      const reported = r.reported?.nickname || r.reported?.email || r.reported_id.slice(0, 8);
      const statusClass = r.status === "open" ? "open" : r.status === "resolved" ? "resolved" : "dismissed";
      const card = document.createElement("div");
      card.className = "admin-report-card";
      card.innerHTML = `
        <div class="admin-report-head">
          <span class="admin-report-status ${statusClass}">${escapeHtml(r.status)}</span>
          <span class="admin-report-reason">${escapeHtml(r.reason || "—")}</span>
          <span class="admin-report-time muted">${escapeHtml(formatRelativeTime(r.created_at))}</span>
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
      reportsList.appendChild(card);
    }
    if (!rows.length) {
      reportsList.innerHTML = `<div class="admin-empty">Nothing here.</div>`;
    }
  }

  async function loadUsers() {
    try {
      allUsers = await api("/admin/users");
      usersCount.textContent = allUsers.length;
      paintUsers(searchInput.value || "");
    } catch (err) {
      toast(err.message);
      usersList.innerHTML = `<div class="admin-empty">${escapeHtml(err.message)}</div>`;
    }
  }
  async function loadReports() {
    try {
      const status = reportFilter.value;
      const path = status ? `/admin/reports?status=${encodeURIComponent(status)}` : "/admin/reports";
      const rows = await api(path);
      paintReports(rows);
    } catch (err) {
      toast(err.message);
      reportsList.innerHTML = `<div class="admin-empty">${escapeHtml(err.message)}</div>`;
    }
  }

  searchInput.addEventListener("input", () => paintUsers(searchInput.value || ""));
  reportFilter.addEventListener("change", loadReports);

  usersList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".admin-delete");
    if (!btn) return;
    const id = btn.dataset.id;
    const target = allUsers.find((u) => u.id === id);
    const label = target?.nickname || target?.email || id.slice(0, 8);
    openConfirmModal({
      title: `Delete ${label}?`,
      text: "This wipes their profile, matches, and messages. Cannot be undone.",
      okLabel: "Delete",
      onConfirm: async () => {
        buttonLoading(btn, true);
        try {
          await api(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
          allUsers = allUsers.filter((u) => u.id !== id);
          usersCount.textContent = allUsers.length;
          paintUsers(searchInput.value || "");
          toast(`Deleted ${label}.`);
        } catch (err) { toast(err.message); }
        finally { buttonLoading(btn, false); }
      },
    });
  });

  reportsList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".admin-resolve");
    if (!btn) return;
    const id = btn.dataset.id;
    const status = btn.dataset.status;
    buttonLoading(btn, true);
    try {
      await api(`/admin/reports/${encodeURIComponent(id)}/resolve`, {
        method: "POST", body: { status },
      });
      await loadReports();
    } catch (err) { toast(err.message); }
    finally { buttonLoading(btn, false); }
  });

  await Promise.all([loadUsers(), loadReports()]);
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
      <div class="profile-section-label">Notifications</div>
      <div class="profile-rows">
        <div class="identity-row notif-toggle-row">
          <span>
            Push notifications
            <span class="muted" id="notif-toggle-sub" style="display:block; font-weight:400; font-size:12px;">—</span>
          </span>
          <button class="nd-switch" id="notif-toggle" type="button" role="switch" aria-checked="false">
            <span class="nd-switch-track"><span class="nd-switch-thumb"></span></span>
          </button>
        </div>
        <div class="identity-row notif-toggle-row">
          <span>
            Notification sound
            <span class="muted" id="sound-toggle-sub" style="display:block; font-weight:400; font-size:12px;">—</span>
          </span>
          <button class="nd-switch" id="sound-toggle" type="button" role="switch" aria-checked="false">
            <span class="nd-switch-track"><span class="nd-switch-thumb"></span></span>
          </button>
        </div>
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
  wireNotifToggle();
  $("#edit-profile").onclick = () => navigate("onboarding");
  $("#profile-logout").onclick = () => doLogout();
  $("#delete-account").onclick = () => deleteAccount();
  const copy = document.createElement("div");
  copy.className = "profile-copyright";
  copy.innerHTML = `<span class="mark">&copy; 2026 NextDate</span> &middot; All rights reserved.`;
  root.appendChild(copy);
}

function wireNotifToggle() {
  const sw  = document.getElementById("notif-toggle");
  const sub = document.getElementById("notif-toggle-sub");
  if (!sw || !sub) return;
  const nd = window.__nd;

  function paint() {
    if (!nd?.supported) {
      sw.classList.remove("on");
      sw.setAttribute("aria-checked", "false");
      sw.disabled = true;
      sub.textContent = "Not supported on this browser.";
      return;
    }
    if (Notification.permission === "denied") {
      sw.classList.remove("on");
      sw.setAttribute("aria-checked", "false");
      sub.textContent = "Blocked by your browser — re-enable in site settings.";
      return;
    }
    const on = nd.enabled;
    sw.classList.toggle("on", on);
    sw.setAttribute("aria-checked", on ? "true" : "false");
    sub.textContent = on
      ? "On — you'll get pings for new matches, likes and messages."
      : "Off — turn on to get pings on your phone or computer.";
  }

  sw.onclick = async () => {
    if (!nd?.supported || Notification.permission === "denied") {
      paint(); return;
    }
    const currentlyOn = nd.enabled;
    if (currentlyOn) {
      localStorage.setItem("nd_notifs_off", "1");
      toast("Notifications off.");
    } else {
      const res = await window.requestNotificationPermission?.();
      if (res !== "granted") { paint(); return; }
      localStorage.removeItem("nd_notifs_off");
    }
    paint();
  };

  paint();
  wireSoundToggle();
}

function wireSoundToggle() {
  const sw  = document.getElementById("sound-toggle");
  const sub = document.getElementById("sound-toggle-sub");
  if (!sw || !sub) return;
  const nd = window.__nd;

  function paint() {
    const on = nd?.soundEnabled;
    sw.classList.toggle("on", !!on);
    sw.setAttribute("aria-checked", on ? "true" : "false");
    sub.textContent = on
      ? "On — a phone-style ding plays when something arrives."
      : "Off — notifications stay silent.";
  }

  sw.onclick = () => {
    const on = nd?.soundEnabled;
    if (on) {
      localStorage.setItem("nd_sound_off", "1");
      toast("Notification sound off.");
    } else {
      localStorage.removeItem("nd_sound_off");
      try { window.playChime?.(); } catch {}
      toast("Notification sound on.");
    }
    paint();
  };

  paint();
}

// ---------- util ----------
function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Only allow base64 image dataURLs we actually generate from the file
// picker. Anything else (svg, javascript:, html:, raw text) is rejected
// so a malicious profile_picture column can't smuggle script into the
// avatar renderers via innerHTML.
const _SAFE_IMG_DATAURL = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
function safeImageDataURL(s) {
  if (typeof s !== "string" || s.length > 3_000_000) return null;
  return _SAFE_IMG_DATAURL.test(s) ? s : null;
}

// Render an avatar container as an <img> built with createElement +
// setAttribute, never innerHTML. Optionally appends the presence dot.
// Returns true if the image was rendered.
function setAvatarImage(container, src, { withStatusDot = false } = {}) {
  if (!container) return false;
  const safe = safeImageDataURL(src);
  if (!safe) return false;
  container.textContent = "";
  const img = document.createElement("img");
  img.setAttribute("src", safe);
  img.setAttribute("alt", "");
  container.appendChild(img);
  if (withStatusDot) {
    const dot = document.createElement("span");
    dot.className = "status-dot";
    container.appendChild(dot);
  }
  return true;
}

// E2E encryption removed — messages are stored as plaintext.
// Supabase encrypts data at rest. These stubs keep all callers working.
// sanitizeMessageBody strips legacy encrypted envelopes so they never
// surface as raw JSON to users.
function sanitizeMessageBody(body) {
  if (typeof body !== "string") return body;
  if (body.startsWith('{"v":1,') && body.includes('"iv"') && body.includes('"ct"')) {
    return null;
  }
  return body;
}
async function ensureSessionKey() { return null; }
async function encryptBodyForSession(_sessionId, plaintext) { return plaintext; }
async function decryptMessageInPlace(m) {
  if (m && m.body) m.body = sanitizeMessageBody(m.body);
  return m;
}

// ============================================================
// Last-seen heartbeat — fallback for the presence indicator so dots
// reflect "Active 5m ago" when the realtime channel hasn't delivered
// a sync for the peer (or they're not currently connected).
//
// Requires a one-time SQL change on Supabase:
//   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
// ============================================================
function startHeartbeat() {
  if (DEMO_MODE) return;
  if (startHeartbeat._timer) clearInterval(startHeartbeat._timer);
  const beat = async () => {
    if (!supabase || !state.user) return;
    try {
      await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", state.user.id);
    } catch (e) { console.warn("[heartbeat] last_seen update failed:", e?.message ?? e); }
  };
  beat();
  startHeartbeat._timer = setInterval(beat, 60_000);
  // Final beat when the tab closes so peers see "Active just now" right
  // after a clean exit. keepalive lets the request finish in flight.
  if (!startHeartbeat._unloadBound) {
    window.addEventListener("beforeunload", () => {
      try {
        navigator.sendBeacon?.(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${state.user?.id}`,
          new Blob([JSON.stringify({ last_seen: new Date().toISOString() })], { type: "application/json" }),
        );
      } catch { /* best effort */ }
    });
    startHeartbeat._unloadBound = true;
  }
}

// Combines realtime presence with the last_seen fallback to decide if
// a peer's dot should be green and what label to show.
const PRESENCE_ACTIVE_MS = 5 * 60 * 1000;
const PRESENCE_RECENT_MS = 60 * 60 * 1000;
function presenceLabel(peerId) {
  if (state.onlineUsers.has(peerId)) return "Active now";
  const last = state.peerLastSeen?.get(peerId);
  if (!last) return "Offline";
  const ms = Date.now() - new Date(last).getTime();
  if (ms < PRESENCE_ACTIVE_MS) return "Active just now";
  if (ms < PRESENCE_RECENT_MS) return `Active ${Math.max(1, Math.floor(ms / 60_000))}m ago`;
  return "Offline";
}
function isActiveOrRecent(peerId) {
  if (state.onlineUsers.has(peerId)) return true;
  const last = state.peerLastSeen?.get(peerId);
  if (!last) return false;
  return Date.now() - new Date(last).getTime() < PRESENCE_ACTIVE_MS;
}

// ─── PWA install ─────────────────────────────────────────────
// Register the service worker so the app qualifies as installable,
// and wire up the mobile "Install app" pill. On Android Chrome we use
// the deferred beforeinstallprompt event; on iOS Safari (which has no
// programmatic install API) and other browsers we open a modal with
// per-platform "Add to Home Screen" instructions.
(function setupInstall() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("[pwa] service worker registration failed:", err);
      });
    });
    // When a new SW takes control after a deploy, do one silent reload
    // so the freshly-deployed CSS/JS show up without the user needing to
    // hit refresh twice. We guard with a flag so we never loop.
    let _swReloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (_swReloading) return;
      _swReloading = true;
      window.location.reload();
    });
  }

  const btn    = document.getElementById("mobile-install-btn");
  const modal  = document.getElementById("install-modal");
  const mClose = document.getElementById("install-modal-close");
  const mOk    = document.getElementById("install-modal-ok");
  if (!btn || !modal) return;

  // Already installed — don't nag.
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  let deferredPrompt = null;

  function showBtn() { btn.classList.remove("hidden"); }
  function hideBtn() { btn.classList.add("hidden"); }

  function openModal() {
    // Highlight the platform that matches this device.
    const ua = navigator.userAgent || "";
    const isIOS = /iPhone|iPad|iPod/i.test(ua) ||
      (ua.includes("Mac") && "ontouchend" in document);
    const isAndroid = /Android/i.test(ua);
    const platform = isIOS ? "ios" : isAndroid ? "android" : "desktop";
    modal.querySelectorAll(".install-howto").forEach((el) => {
      el.style.order = el.dataset.platform === platform ? "0" : "1";
      el.style.borderColor =
        el.dataset.platform === platform ? "var(--border-hi)" : "";
    });
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
  }
  function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }

  // Capture the native prompt so we can fire it from our button.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!isStandalone) showBtn();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hideBtn();
    try { toast?.("NextDate installed — open it from your home screen any time."); } catch {}
  });

  btn.addEventListener("click", async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch { /* user dismissed */ }
      deferredPrompt = null;
      hideBtn();
      return;
    }
    // No native prompt available (iOS Safari, in-app browser, already
    // dismissed) — fall back to instructions.
    openModal();
  });

  mClose?.addEventListener("click", closeModal);
  mOk?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  // If beforeinstallprompt never fires (iOS, Firefox mobile, etc.), still
  // show the button so users have a way to discover the install flow.
  if (!isStandalone) {
    setTimeout(() => {
      if (!deferredPrompt && btn.classList.contains("hidden")) showBtn();
    }, 1500);
  }
})();

// ─── System (push) notifications ─────────────────────────────
// Drives OS-level notifications on phone and desktop. Triggered by the
// same Supabase Realtime events that already populate the in-app
// notification banner and badges — see onAnyMessageInsert and
// onNotificationInsert. We only fire when the window is hidden /
// unfocused so the user doesn't get a system popup for events they're
// already looking at in-app.
//
// A registered service worker is what makes these notifications survive
// when the tab is backgrounded (and what would let a future Web Push
// backend deliver notifications while the tab is closed entirely).
const nd = {
  supported: "Notification" in window && "serviceWorker" in navigator,
  get permission() { return this.supported ? Notification.permission : "denied"; },
  get enabled() {
    // The user explicitly turning it off (Profile toggle) takes
    // priority over the browser permission grant.
    if (localStorage.getItem("nd_notifs_off") === "1") return false;
    return this.permission === "granted";
  },
  get soundEnabled() {
    // Sound is on by default — only off if the user explicitly muted it
    // in Profile. Decoupled from system notifications so users still get
    // an audible cue when the browser blocks notifications or when the
    // app is in the foreground (when no system popup fires).
    return localStorage.getItem("nd_sound_off") !== "1";
  },
};
window.__nd = nd; // exposed for the profile toggle handler

// ── Chime synth ──
// Phone-style "ding-ding" generated on demand with WebAudio so it works
// offline, costs no extra request, and never blocks shipping on a
// missing audio file. The AudioContext can't make sound until a user
// gesture happens, so we lazily unlock it on the first interaction.
let _ndAudio = null;
function _unlockAudio() {
  if (_ndAudio) return;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) _ndAudio = new Ctor();
  } catch {}
}
["pointerdown", "keydown", "touchstart"].forEach((evt) => {
  window.addEventListener(evt, _unlockAudio, { once: true, passive: true });
});

function playChime() {
  if (!nd.soundEnabled) return;
  if (!_ndAudio) return; // no user gesture yet — silent
  const ctx = _ndAudio;
  if (ctx.state === "suspended") { try { ctx.resume(); } catch {} }
  const now = ctx.currentTime;

  // Two short bell-ish tones: 880 Hz (A5) → 1320 Hz (E6). Sine carrier
  // shaped by a fast attack + exponential decay so it sounds like a
  // soft notification bell, not a beep.
  function tone(freq, startOffset, dur, peak = 0.16) {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t0 = now + startOffset;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  tone(880,  0,    0.22);
  tone(1320, 0.09, 0.28);
}
window.playChime = playChime;

async function requestNotificationPermission() {
  if (!nd.supported) {
    toast("This browser doesn't support notifications.");
    return "denied";
  }
  if (Notification.permission === "denied") {
    toast("Notifications are blocked. Re-enable in your browser site settings.");
    return "denied";
  }
  let result = Notification.permission;
  if (result === "default") {
    try { result = await Notification.requestPermission(); } catch { result = "denied"; }
  }
  if (result === "granted") {
    localStorage.removeItem("nd_notifs_off");
    toast("Notifications on — we'll ping you for matches and messages.");
  } else if (result === "denied") {
    toast("No worries — you'll still see everything in-app.");
  }
  return result;
}

async function showSystemNotification({ title, body = "", icon, tag, data = {} } = {}) {
  if (!nd.enabled) return;
  // Suppress when the user is actively looking at the app — the in-app
  // banner is enough and a duplicate system popup feels spammy.
  if (document.visibilityState === "visible" && document.hasFocus()) return;
  const opts = {
    body,
    icon: icon || "./icon.svg",
    badge: "./icon.svg",
    tag: tag || undefined,
    data,
    vibrate: [80, 40, 80, 40, 120], // phone-style buzz pattern
    silent: false,                   // let the OS play its notification sound
    renotify: !!tag,
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title || "NextDate", opts);
      return;
    }
  } catch (e) { /* fall through to constructor */ }
  try { new Notification(title || "NextDate", opts); } catch (e) {}
}

// SW posts a message here when the user taps a notification — route
// them to the right place in the app.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (ev) => {
    const msg = ev.data || {};
    if (msg.type !== "nd-notif-click") return;
    const d = msg.data || {};
    window.focus?.();
    try {
      if (d.sessionId) openSession(d.sessionId);
      else if (d.view) navigate(d.view);
    } catch (e) { console.warn("[notif click]", e); }
  });
}

// Bridge for the in-app message stream → system notifications + chime.
function notifyForMessage(m) {
  if (!m || m.sender_id === state.user?.id) return;
  // Skip everything when the user is actively typing in this chat — a
  // ding for a message they just watched land would be jarring.
  const inActiveChat = state.activeSession?.id === m.session_id &&
    document.visibilityState === "visible" && document.hasFocus();
  if (inActiveChat) return;
  const peer = state.peerBySession?.get(m.session_id) || {};
  const title = peer.nickname ? `New message from ${peer.nickname}` : "New message";
  const preview = (typeof m.body === "string" && m.body.trim())
    ? m.body.slice(0, 140)
    : (m.attachments?.length ? "Sent an attachment" : "");
  showSystemNotification({
    title,
    body: preview,
    tag: `msg:${m.session_id}`,
    data: { sessionId: m.session_id, view: "chats", url: "./" },
  });
  // Always ding in-app too. When the system notification fires the OS
  // also plays its own sound — that's expected phone-like behavior;
  // both go off briefly but feel like one event.
  try { playChime(); } catch {}
}

function notifyForGeneric(n) {
  if (!n) return;
  // For chat messages collapse repeated pings from the same room into
  // a single notification (per-session tag) so a chatty match doesn't
  // spam the notification shade. Other kinds keep a unique tag.
  const tag = n.kind === "message" && n.session_id
    ? `msg:${n.session_id}`
    : `notif:${n.id}`;
  showSystemNotification({
    title: n.title || "NextDate",
    body: n.text || "",
    icon: "./icon.svg",
    tag,
    data: {
      sessionId: n.session_id || null,
      view: n.session_id ? "chats" : "notifications",
      url: "./",
    },
  });
  try { playChime(); } catch {}
}
// Both bridges are read by app code via the global so they're easy to stub.
window.notifyForMessage = notifyForMessage;
window.notifyForGeneric = notifyForGeneric;

// Big "Turn on notifications" banner at the top of the app. Re-shown
// on every login / refresh whenever notifications aren't enabled, so
// users who skipped it on first visit are reminded each session.
// Dismissing it hides the banner for the current page load only — the
// next refresh brings it back.
let _ndDismissed = false;
function maybePromptForNotifications() {
  const banner  = document.getElementById("notif-prompt");
  const enable  = document.getElementById("notif-prompt-enable");
  const dismiss = document.getElementById("notif-prompt-dismiss");
  if (!banner) return;
  if (!nd.supported) return;
  // Already enabled — nothing to do.
  if (nd.enabled) { banner.classList.add("hidden"); return; }
  // Browser hard-blocked us — no programmatic way to re-prompt, so
  // don't shove a useless banner in the user's face.
  if (Notification.permission === "denied") { banner.classList.add("hidden"); return; }
  if (_ndDismissed) return;

  function hide() { banner.classList.add("hidden"); }
  function show() { banner.classList.remove("hidden"); }

  enable.onclick = async () => {
    const res = await requestNotificationPermission();
    if (res === "granted") hide();
  };
  dismiss.onclick = () => { _ndDismissed = true; hide(); };

  // Tiny delay so the banner doesn't fight with the initial paint.
  setTimeout(show, 400);
}
window.maybePromptForNotifications = maybePromptForNotifications;
window.requestNotificationPermission = requestNotificationPermission;
