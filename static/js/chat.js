function getUserId() {
  let userId = sessionStorage.getItem("user_id");
  if (!userId) {
    userId = crypto.randomUUID();
    sessionStorage.setItem("user_id", userId);
  }
  return userId;
}

let policyNumber = null;

function submitPolicy() {
  const input = document.getElementById("policy-number");
  const value = input.value.trim();

  if (!value) {
    alert("Lütfen geçerli bir poliçe numarası girin.");
    return;
  }

  policyNumber = value;
  sessionStorage.setItem("policy_number", policyNumber);
  document.getElementById("policy-box").style.display = "none";
}

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

  addMessage(prompt, "user");
  textarea.value = "";

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
}

function handleEnter(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendPrompt();
  }
}

async function submitPolicy() {
  const input = document.getElementById("policy-number");
  const value = input.value.trim();

  if (!value) {
    alert("Lütfen geçerli bir poliçe numarası girin.");
    return;
  }

  sessionStorage.setItem("policy_number", value);
  sessionStorage.setItem("user_id", getUserId());
  document.getElementById("policy-box").style.display = "none";

  // Poliçeyi backend'e gönder
  const res = await fetch("/submit-policy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: getUserId(),
      policy_number: value
    })
  });

  const data = await res.json();
  const response = data.response || "Poliçen işleniyor...";
  addMessage(response, "bot");
}
