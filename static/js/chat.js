function getUserId() {
  let userId = sessionStorage.getItem("user_id");
  if (!userId) {
    // Tarayıcı uyumlu UUID üretimi
    userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    sessionStorage.setItem("user_id", userId);
  }
  return userId;
}

let policyNumber = null;

function addMessage(message, sender) {
  const chatBox = document.getElementById("chat-box");

  const messageEl = document.createElement("div");
  messageEl.classList.add("message", sender);
  messageEl.innerText = message;

  // Yumuşak geçiş animasyonu
  messageEl.style.opacity = "0";
  chatBox.appendChild(messageEl);
  setTimeout(() => {
    messageEl.style.transition = "opacity 0.3s ease";
    messageEl.style.opacity = "1";
  }, 10);

  chatBox.scrollTop = chatBox.scrollHeight;
}

// IME yazım güvenliği için
let composing = false;
function handleEnter(event) {
  if (event.type === 'compositionstart') composing = true;
  if (event.type === 'compositionend') composing = false;

  if (event.key === "Enter" && !event.shiftKey && !composing) {
    event.preventDefault();
    sendPrompt();
  }
}

async function sendPrompt() {
  const textarea = document.getElementById("prompt");
  const prompt = textarea.value.trim();

  if (!prompt) return;

  addMessage(prompt, "user");
  textarea.value = "";

  const button = document.querySelector(".input-area button");
  button.disabled = true;
  button.innerText = "Gönderiliyor...";

  try {
    const res = await fetch("/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        user_id: getUserId(),
        policy_number: sessionStorage.getItem("policy_number")
      })
    });

    const data = await res.json();
    const response = data.response || "Cevap alınamadı.";
    addMessage(response, "bot");
  } catch (err) {
    addMessage("Bir hata oluştu: " + err.message, "bot");
    console.log("err: ", err);
  } finally {
    button.disabled = false;
    button.innerText = "Gönder";
  }
}

async function submitPolicy() {
  const input = document.getElementById("policy-number");
  const value = input.value.trim();

  if (!value) {
    alert("❗ Lütfen geçerli bir poliçe numarası girin.");
    return;
  }

  sessionStorage.setItem("policy_number", value);
  sessionStorage.setItem("user_id", getUserId());

  // Poliçe kutusundaki formu gizle, loading'i göster
  input.style.display = "none";
  document.querySelector("#policy-box h2").style.display = "none";
  document.querySelector("#policy-box button").style.display = "none";
  document.getElementById("loading").style.display = "block";

  try {
    const res = await fetch("/submit-policy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: getUserId(),
        policy_number: value
      })
    });

    const data = await res.json();
    const response = data.response || "✅ Poliçen başarıyla işlendi.";

    // Chat arayüzünü göster
    document.getElementById("policy-box").style.display = "none";
    document.getElementById("chat-container").style.display = "flex";

    // Yeni Poliçe butonunu göster
    const newPolicyBtnEl = document.getElementById("new-policy-btn");
    if (newPolicyBtnEl) newPolicyBtnEl.style.display = "block";

    // odağı prompt'a al
    const ta = document.getElementById("prompt");
    if (ta) { ta.focus(); ta.selectionStart = ta.value.length; }

    addMessage(response, "bot");

  } catch (error) {
    alert("Bir hata: " + error.message);
  }
}

/* --- Yeni Poliçe: tam sayfa yenile --- */
function resetPolicy() {
  try {
    sessionStorage.clear();
  } finally {
    // Tam sayfa yenile (cache’i de tazelemek istersen query ekleyebilirsin)
    // window.location.replace(window.location.pathname + window.location.search + '#');
    window.location.reload(); // hard refresh
  }
}

/* DOM yüklendiğinde: butonu bağla ve başlangıçta gizle */
window.addEventListener('load', () => {
  const btn = document.getElementById('new-policy-btn');
  if (btn) {
    btn.style.display = "none"; // ilk açılışta gizli
    if (!btn._bound) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        resetPolicy();
      });
      btn._bound = true;
    }
  }

  // Autosize textarea – yatay kaydırma yok, dikey sınırı geçerse aç
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
    fit();
  }
});
