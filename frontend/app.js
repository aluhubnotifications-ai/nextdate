// ALU Match — Cloudflare Pages frontend
// Custom auth (FastAPI backend) + Supabase Realtime/Postgres for data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const { SUPABASE_URL, SUPABASE_ANON_KEY, BACKEND_URL, EMAIL_DOMAINS } = window.APP_CONFIG;

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
let supabase = buildSupabase(tokens.get());

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
};

// ---------- routing ----------
const views = {
  auth: renderAuth,
  onboarding: renderOnboarding,
  discover: renderDiscover,
  chats: renderChats,
  profile: renderProfile,
  logout: doLogout,
};

async function navigate(name) {
  cleanupRealtime();
  const root = $("#view-root");
  root.innerHTML = "";
  $$("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  await views[name](root);
}

$$("#nav button").forEach((b) =>
  b.addEventListener("click", () => navigate(b.dataset.view)),
);

function setNavVisible(visible) {
  $$("#nav button").forEach((b) => b.classList.toggle("hidden", !visible));
}

// ---------- init ----------
(async function init() {
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
  try {
    suggestions = await api(`/suggestions/${state.user.id}`);
  } catch (err) {
    grid.innerHTML = `<div class="empty">Couldn't reach the matching engine.<br/><span class="muted">${err.message}</span></div>`;
    return;
  }

  if (!suggestions.length) {
    grid.innerHTML = `<div class="empty">No matches yet. Tweak your preferences or check back soon.</div>`;
    return;
  }

  grid.innerHTML = "";
  for (const s of suggestions) {
    const card = document.createElement("div");
    card.className = "profile-card";
    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="avatar">${escapeHtml(s.avatar_url || "🦊")}</div>
        <div>
          <div style="font-weight:700">${escapeHtml(s.nickname)}</div>
          <div class="muted" style="font-size:12px;">${escapeHtml(s.gender || "")} ${s.zodiac_sign ? "· " + escapeHtml(s.zodiac_sign) : ""}</div>
        </div>
      </div>
      <div>
        <span class="chip">match score: <span class="score">${s.score ?? 0}</span></span>
      </div>
      <button class="btn" data-uid="${s.user_id}">Say hi</button>
    `;
    card.querySelector("button").onclick = async () => {
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
}

async function loadSessions() {
  const list = $("#session-list");
  list.innerHTML = "";

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .or(`user_a.eq.${state.user.id},user_b.eq.${state.user.id}`)
    .order("created_at", { ascending: false });
  if (error) return toast(error.message);
  if (!data?.length) {
    list.innerHTML = `<div class="muted" style="font-size:13px;">No chats yet.</div>`;
    return;
  }

  const peerIds = data.map((s) => (s.user_a === state.user.id ? s.user_b : s.user_a));
  const { data: peers } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_url")
    .in("id", peerIds);
  const peerMap = Object.fromEntries((peers || []).map((p) => [p.id, p]));

  for (const s of data) {
    const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
    const peer = peerMap[peerId] || { nickname: "Unknown", avatar_url: "🦊" };
    const row = document.createElement("div");
    row.className = "session-item";
    row.dataset.sessionId = s.id;
    row.innerHTML = `
      <div class="avatar">${escapeHtml(peer.avatar_url || "🦊")}</div>
      <div>
        <div style="font-weight:600">${escapeHtml(peer.nickname)}</div>
        <div class="muted" style="font-size:11px;">${s.user_a_approved_reveal && s.user_b_approved_reveal ? "Revealed" : "Anonymous"}</div>
      </div>`;
    row.onclick = () => openSession(s.id);
    list.appendChild(row);
  }
}

async function openSession(sessionId) {
  cleanupRealtime();

  const { data: s, error } = await supabase
    .from("chat_sessions").select("*").eq("id", sessionId).single();
  if (error) return toast(error.message);

  const peerId = s.user_a === state.user.id ? s.user_b : s.user_a;
  const { data: peer } = await supabase
    .from("profiles").select("id, nickname, avatar_url, gender, zodiac_sign")
    .eq("id", peerId).single();

  state.activeSession = { ...s, peer_id: peerId, peer_profile: peer };

  $$(".session-item").forEach((el) => el.classList.toggle("active", el.dataset.sessionId === sessionId));
  $("#chat-empty").classList.add("hidden");
  $("#chat-active").classList.remove("hidden");

  $("#peer-avatar").textContent = peer.avatar_url || "🦊";
  $("#peer-name").textContent = peer.nickname;
  $("#peer-meta").textContent = [peer.gender, peer.zodiac_sign].filter(Boolean).join(" · ");
  $("#peer-session-id").textContent = `#${sessionId.slice(0, 8)}`;

  await loadMessages(sessionId);
  await refreshRevealState();
  subscribeRealtime(sessionId);
}

async function loadMessages(sessionId) {
  const body = $("#chat-body");
  body.innerHTML = "";
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) return toast(error.message);
  for (const m of data || []) appendMessage(m);
  body.scrollTop = body.scrollHeight;
}

function appendMessage(m) {
  const body = $("#chat-body");
  const el = document.createElement("div");
  el.className = "bubble " + (m.sender_id === state.user.id ? "mine" : "");
  el.textContent = m.body;
  body.appendChild(el);
  body.scrollTop = body.scrollHeight;
}

async function sendMessage() {
  const input = $("#msg-input");
  const body = input.value.trim();
  if (!body || !state.activeSession) return;
  input.value = "";
  const { error } = await supabase.from("messages").insert({
    session_id: state.activeSession.id,
    sender_id: state.user.id,
    body,
  });
  if (error) toast(error.message);
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
  const { data, error } = await supabase
    .from("chat_sessions").update(patch).eq("id", s.id).select().single();
  if (error) return toast(error.message);
  state.activeSession = { ...state.activeSession, ...data };
  await refreshRevealState();
  toast("Reveal recorded.");
}

async function hydrateIdentity() {
  const s = state.activeSession;
  const { data, error } = await supabase.rpc("get_revealed_identity", { session: s.id });
  if (error) return toast(error.message);
  const id = (data && data[0]) || null;
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
