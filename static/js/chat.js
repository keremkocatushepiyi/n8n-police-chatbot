/* =======================
   Kimlik yönetimi (backend kaynaklı)
======================= */

// Backend'ten id al
async function fetchIdsFromServer() {
  const res = await fetch("/generate-ids", { method: "GET" });
  if (!res.ok) throw new Error("Kimlik üretim servisi başarısız.");
  return await res.json(); // { user_id, session_id }
}

// user_id ve/veya session_id eksikse backend'ten tamamla
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
    // renewSession true ise sadece yeni session_id kullan
    if (!sessionId && data.session_id) {
      sessionId = data.session_id;
      sessionStorage.setItem("session_id", sessionId);
    }
  }
  return { userId, sessionId };
}

function getUserId() {
  return localStorage.getItem("user_id");
}
function getSessionId() {
  return sessionStorage.getItem("session_id");
}

/* =======================
   Basit durum
======================= */
let policyNumber = null;

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

  // Kimlikleri garanti altına al
  try {
    const pn = sessionStorage.getItem("policy_number");
    if (!pn) {
      alert("Poliçe numarası bulunamadı. Lütfen poliçe girin.");
      sending = false;
      return;
    }

    // session_id yoksa backend'ten tamamlamaya çalış
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
        policy_number: pn
      })
    });

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
      const msg = (data && (data.detail || data.response)) || `Hata kodu: ${res.status}`;
      throw new Error(msg);
    }

    // Sunucu güvenlik ağı olarak session_id üretmiş olabilir
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
   Poliçe gönderme
======================= */
async function submitPolicy() {
  const input = document.getElementById("policy-number");
  if (!input) return;

  const value = (input.value || "").trim();
  if (!value) {
    alert("❗ Lütfen geçerli bir poliçe numarası girin.");
    return;
  }

  // user_id ve (gerekirse) geçici session_id garanti olsun
  try {
    await ensureIds({ renewSession: true }); // poliçe başlangıcında yeni session istiyoruz
  } catch (e) {
    console.error("Kimlik alma hatası:", e);
    alert("Kimlik alınamadı. Lütfen sayfayı yenileyin.");
    return;
  }

  const uid = getUserId();
  sessionStorage.setItem("policy_number", value);
  policyNumber = value;

  // UI loading
  input.style.display = "none";
  const pbTitle = document.querySelector("#policy-box h2");
  if (pbTitle) pbTitle.style.display = "none";
  const pbBtn = document.querySelector("#policy-box button");
  if (pbBtn) pbBtn.style.display = "none";
  const loadingEl = document.getElementById("loading");
  if (loadingEl) loadingEl.style.display = "block";

  try {
    // session_id GÖNDERMİYORUZ → backend üretip döndürecek
    const res = await fetch("/submit-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: uid,
        policy_number: value
      })
    });

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
      const msg = (data && (data.detail || data.response)) || `Hata kodu: ${res.status}`;
      throw new Error(msg);
    }

    // Backend’in ürettiği gerçek session_id’yi kaydet
    if (data && data.session_id) {
      sessionStorage.setItem("session_id", data.session_id);
    }

    // Chat arayüzünü göster
    const pb = document.getElementById("policy-box");
    if (pb) pb.style.display = "none";
    const chat = document.getElementById("chat-container");
    if (chat) chat.style.display = "flex";

    const newPolicyBtnEl = document.getElementById("new-policy-btn");
    if (newPolicyBtnEl) newPolicyBtnEl.style.display = "block";

    const ta = document.getElementById("prompt");
    if (ta) { ta.focus(); ta.selectionStart = ta.value.length; }

    addMessage((data && data.response) || "✅ Poliçen başarıyla işlendi.", "bot");
  } catch (error) {
    alert("Bir hata: " + (error?.message || error));
    console.error("submitPolicy err:", error);
  } finally {
    const loadingEl = document.getElementById("loading");
    if (loadingEl) loadingEl.style.display = "none";
  }
}

/* =======================
   Yeni poliçe (sadece oturum temizle)
======================= */
function resetPolicy() {
  try {
    sessionStorage.removeItem("policy_number");
    sessionStorage.removeItem("session_id");
  } finally {
    window.location.reload();
  }
}

/* =======================
   Sayfa hazır olunca
======================= */
window.addEventListener('load', async () => {
  // Sayfa RELOAD ise, yeni poliçe butonuna basılmış gibi session'ı temizle
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav && nav.type === 'reload') {
    sessionStorage.removeItem("policy_number");
    sessionStorage.removeItem("session_id");
  }

  // Kimlikleri hazırla (ilk girişte)
  try {
    await ensureIds({ renewSession: false });
  } catch (e) {
    console.warn("Başlangıçta kimlikler alınamadı:", e);
  }

  // Yeni poliçe butonu
  const btn = document.getElementById('new-policy-btn');
  if (btn) {
    btn.style.display = "none";
    if (!btn._bound) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        resetPolicy();
      });
      btn._bound = true;
    }
  }

  // Eğer sayfa yenilendiyse ve her iki değer de varsa chat’e geç
  const sid = getSessionId();
  const pn  = sessionStorage.getItem("policy_number");
  if (sid && pn) {
    const pb = document.getElementById("policy-box");
    if (pb) pb.style.display = "none";
    const chat = document.getElementById("chat-container");
    if (chat) chat.style.display = "flex";

    const newPolicyBtnEl = document.getElementById("new-policy-btn");
    if (newPolicyBtnEl) newPolicyBtnEl.style.display = "block";
  }

  // Autosize textarea
  const ta = document.getElementById('prompt');
  if (ta) {
    const fit = () => {
      ta.style.height = 'auto';
      const maxH = 160; // ~5-6 satır
      const h = Math.min(ta.scrollHeight, maxH);
      ta.style.height = h + 'px';
      ta.style.overflowY = (ta.scrollHeight > maxH) ? 'auto' : 'hidden';
    };
    ta.setAttribute('wrap', 'soft');
    ta.addEventListener('input', fit);
    ta.addEventListener('keydown', handleEnter);
    ta.addEventListener('compositionstart', handleEnter);
    ta.addEventListener('compositionend', handleEnter);
    fit();
  }

  // Poliçe numarası girişinde Enter ile gönder (IME uyumlu)
  const policyInput = document.getElementById('policy-number');
  if (policyInput && !policyInput._bound) {
    policyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !composing) {
        e.preventDefault();
        submitPolicy();
      }
    });
    policyInput.addEventListener('compositionstart', () => { composing = true; });
    policyInput.addEventListener('compositionend', () => { composing = false; });
    policyInput._bound = true;
  }
});
