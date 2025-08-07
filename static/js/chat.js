// static/js/chat.js
function addMessage(message, sender) {
  const chatBox = document.getElementById("chat-box");

  const messageEl = document.createElement("div");
  messageEl.classList.add("message", sender);
  messageEl.innerText = message;

  chatBox.appendChild(messageEl);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendPrompt() {
  const textarea = document.getElementById("prompt");
  const prompt = textarea.value.trim();

  if (!prompt) return;

  // ✅ Kullanıcı mesajı arayüze yazılıyor
  addMessage(prompt, "user");
  textarea.value = "";

  // ✅ API'ye POST isteği atılıyor
  const res = await fetch("/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      user_id: getUserId()  // 🔥 Doğru: user_id eklenmiş!
    })
  });

  // ✅ Gelen cevap ekranda gösteriliyor
  const data = await res.json();
  const response = data.response || "Cevap alınamadı.";
  addMessage(response, "bot");
}

function handleEnter(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendPrompt();
  }
}

function getUserId() {
  let userId = localStorage.getItem("user_id");
  if (!userId) {
    userId = crypto.randomUUID(); // Her kullanıcıya bir UUID
    localStorage.setItem("user_id", userId);
  }
  return userId;
}
