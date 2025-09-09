/* =======================
   Kimlik yönetimi
======================= */
async function fetchIdsFromServer() {
  const res = await fetch("/generate-ids", { method: "GET" });
  if (!res.ok) throw new Error("Kimlik üretim servisi başarısız.");
  return await res.json(); // { user_id, session_id }
}

async function ensureIds({ renewSession = false } = {}) {
  let userId = localStorage.getItem("user_id");
  let sessionId = sessionStorage.getItem("session_id");

  if (renewSession) sessionId = null;

  if (!userId || !sessionId) {
    const data = await fetchIdsFromServer();
    if (!userId && data.user_id) {
      userId = data.user_id;
      localStorage.setItem("user_id", userId);
    }
    if (!sessionId && data.session_id) {
      sessionId = data.session_id;
      sessionStorage.setItem("session_id", sessionId);
    }
  }
  return { userId, sessionId };
}

function getUserId() { return localStorage.getItem("user_id"); }
function getSessionId() { return sessionStorage.getItem("session_id"); }

/* =======================
   Basit durum
======================= */
let policyNumber = null;
let claimNumber = null;
let isPolice = null;

/* =======================
   UI yardımcıları
======================= */
function addMessage(message, sender) {
  const chatBox = document.getElementById("chat-box");
  if (!chatBox) return;

  const messageEl = document.createElement("div");
  messageEl.classList.add("message", sender);
  messageEl.innerText = message;

  messageEl.style.opacity = "0";
  chatBox.appendChild(messageEl);
  setTimeout(() => {
    messageEl.style.transition = "opacity 0.3s ease";
    messageEl.style.opacity = "1";
  }, 10);

  chatBox.scrollTop = chatBox.scrollHeight;
}

/* =======================
   IME / Enter
======================= */
let composing = false;
function handleEnter(event) {
  if (event.type === 'compositionstart') composing = true;
  if (event.type === 'compositionend') composing = false;

  if (event.key === "Enter" && !event.shiftKey && !composing) {
    event.preventDefault();
    sendPrompt();
  }
}

/* =======================
   Mesaj gönderme
======================= */
let sending = false;
async function sendPrompt() {
  if (sending) return;
  sending = true;

  const textarea = document.getElementById("prompt");
  const btn = document.querySelector(".input-area button");
  if (!textarea) { sending = false; return; }

  const prompt = textarea.value.trim();
  if (!prompt) { sending = false; return; }

  try {
    const pn = sessionStorage.getItem("policy_number");
    const cn = sessionStorage.getItem("claim_number");
    const ip = sessionStorage.getItem("is_police");

    if (!pn && !cn) {
      alert("Poliçe veya hasar dosya numarası bulunamadı. Lütfen giriş yapın.");
      sending = false;
      return;
    }

    if (!getSessionId()) {
      await ensureIds({ renewSession: false });
    }
    const sid = getSessionId();
    const uid = getUserId();

    if (!uid || !sid) {
      alert("Oturum bilgileri alınamadı. Sayfayı yenileyip tekrar deneyin.");
      sending = false;
      return;
    }

    addMessage(prompt, "user");
    textarea.value = "";
    if (btn) { btn.disabled = true; btn.innerText = "Gönderiliyor..."; }

    const res = await fetch("/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        user_id: uid,
        session_id: sid,
        is_police: ip === "true",
        policy_number: pn || null,
        claim_number: cn || null
      })
    });

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
      const msg = (data && (data.detail || data.response)) || `Hata kodu: ${res.status}`;
      throw new Error(msg);
    }

    if (data.session_id && !getSessionId()) {
      sessionStorage.setItem("session_id", data.session_id);
    }

    addMessage((data && data.response) || "Cevap alınamadı.", "bot");
  } catch (err) {
    addMessage("Bir hata oluştu: " + (err?.message || err), "bot");
    console.error("sendPrompt err:", err);
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Gönder"; }
    sending = false;
  }
}

/* =======================
   Poliçe / Hasar gönderme
======================= */
async function submitPolicy() {
  const policyInput = document.getElementById("policy-number");
  const claimInput  = document.getElementById("claim-number");
  if (!policyInput || !claimInput) return;

  const policyVal = (policyInput.value || "").trim();
  const claimVal  = (claimInput.value  || "").trim();

  if (!policyVal && !claimVal) {
    alert("❗ Lütfen poliçe numarası veya hasar dosya numarası girin.");
    return;
  }

  isPolice = !!policyVal;
  const value = isPolice ? policyVal : claimVal;

  try {
    await ensureIds({ renewSession: true });
  } catch (e) {
    console.error("Kimlik alma hatası:", e);
    alert("Kimlik alınamadı. Lütfen sayfayı yenileyin.");
    return;
  }

  const uid = getUserId();

  if (isPolice) {
    sessionStorage.setItem("policy_number", value);
    sessionStorage.removeItem("claim_number");
  } else {
    sessionStorage.setItem("claim_number", value);
    sessionStorage.removeItem("policy_number");
  }
  sessionStorage.setItem("is_police", isPolice.toString());

  policyNumber = isPolice ? value : null;
  claimNumber = !isPolice ? value : null;

  // UI loading
  policyInput.style.display = "none";
  claimInput.style.display = "none";
  const pbTitle = document.querySelector("#policy-box h2");
  if (pbTitle) pbTitle.style.display = "none";
  const pbBtn = document.querySelector("#policy-box button");
  if (pbBtn) pbBtn.style.display = "none";
  const loadingEl = document.getElementById("loading");
  if (loadingEl) loadingEl.style.display = "block";

  try {
    const res = await fetch("/submit-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: uid,
        is_police: isPolice,
        policy_number: isPolice ? value : null,
        claim_number: isPolice ? null : value
      })
    });

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
      const msg = (data && (data.detail || data.response)) || `Hata kodu: ${res.status}`;
      throw new Error(msg);
    }

    if (data && data.session_id) {
      sessionStorage.setItem("session_id", data.session_id);
    }

    // Chat arayüzünü aç
    const pb = document.getElementById("policy-box");
    if (pb) pb.style.display = "none";
    const chat = document.getElementById("chat-container");
    if (chat) chat.style.display = "flex";

    const newPolicyBtnEl = document.getElementById("new-policy-btn");
    if (newPolicyBtnEl) newPolicyBtnEl.style.display = "block";

    const ta = document.getElementById("prompt");
    if (ta) { ta.focus(); ta.selectionStart = ta.value.length; }

    addMessage((data && data.response) || "✅ Başarıyla işlendi.", "bot");
  } catch (error) {
    alert("Bir hata: " + (error?.message || error));
    console.error("submitPolicy err:", error);
  } finally {
    const loadingEl = document.getElementById("loading");
    if (loadingEl) loadingEl.style.display = "none";
  }
}

/* =======================
   Yeni poliçe (reset)
======================= */
function resetPolicy() {
  try {
    sessionStorage.removeItem("policy_number");
    sessionStorage.removeItem("claim_number");
    sessionStorage.removeItem("is_police");
    sessionStorage.removeItem("session_id");
  } finally {
    window.location.reload();
  }
}
