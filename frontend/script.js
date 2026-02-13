// ------------------ CONFIG ------------------
const API_BASE = ""; // empty because FastAPI serves frontend at /

const dom = {
  pages: document.querySelectorAll(".page"),
  navLinks: document.querySelectorAll(".mobile-nav-link, .nav-link"),
  mobileMenuBtn: document.querySelector(".burger-menu"),
  mobileNav: document.getElementById("mobileNav"),
  toast: document.getElementById("toast"),
  loadingOverlay: document.getElementById("loadingOverlay"),

  habitsContainer: document.getElementById("habitsContainer"),
  addHabitBtn: document.getElementById("addHabitBtn"),
  habitModal: document.getElementById("habitModal"),
  habitForm: document.getElementById("habitForm"),

  fileInput: document.getElementById("fileInput"),
  documentsList: document.getElementById("documentsList"),

  scheduleContainer: document.getElementById("scheduleContainer"),
  wakeTime: document.getElementById("wakeTime"),
  sleepTime: document.getElementById("sleepTime"),
  energyPattern: document.getElementById("energyPattern"),

  chatInput: document.getElementById("chatInput"),
  chatMessages: document.getElementById("chatMessages"),
  sendChatBtn: document.getElementById("sendChatBtn"),
  chatDocSelect: document.getElementById("chatDocSelect"),

  totalDocs: document.getElementById("totalDocs"),
  studyHours: document.getElementById("studyHours"),
};

// ------------------ UTILITIES ------------------
function showToast(msg, type = "info") {
  if (!dom.toast) return;
  dom.toast.textContent = msg;
  dom.toast.className = `toast toast-${type} show`;
  setTimeout(() => dom.toast.classList.remove("show"), 3000);
}
function showLoading() {
  dom.loadingOverlay?.classList.add("active");
}
function hideLoading() {
  dom.loadingOverlay?.classList.remove("active");
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove("active");
}
function showPage(name) {
  dom.pages.forEach((p) => p.classList.remove("active"));
  document.getElementById(`${name}Page`)?.classList.add("active");
}

// ------------------ INIT ------------------
async function init() {
  setupListeners();
  await loginGuest();
  await loadDashboard();
  await loadHabits();
  await loadDocuments();
  await loadChatDocs();
  initChat();
}
init();

// ------------------ LISTENERS ------------------
function setupListeners() {
  // Mobile nav
  dom.mobileMenuBtn?.addEventListener("click", () =>
    dom.mobileNav.classList.toggle("active")
  );
  dom.navLinks.forEach((l) =>
    l.addEventListener("click", () => {
      showPage(l.dataset.page);
      dom.mobileNav.classList.remove("active");
    })
  );

  // Habit
  dom.habitForm?.addEventListener("submit", saveHabit);
  dom.addHabitBtn?.addEventListener("click", () =>
    dom.habitModal.classList.add("active")
  );

  // File upload
  dom.fileInput?.addEventListener("change", uploadDocument);

  // Chat
  dom.sendChatBtn?.addEventListener("click", sendChatMessage);
  dom.chatInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendChatMessage();
  });
}

// ------------------ AUTH ------------------
async function loginGuest() {
  try {
    const res = await fetch("/auth/login", { method: "POST" });
    const data = await res.json();
    if (!data.success) showToast("Guest login failed", "error");
  } catch {
    showToast("Guest login failed", "error");
  }
}

// ------------------ DASHBOARD ------------------
async function loadDashboard() {
  showLoading();
  try {
    const res = await fetch("/stats/dashboard");
    const data = await res.json();
    if (!data.success) return showToast("Failed to load dashboard", "error");
    dom.totalDocs.textContent = data.statistics.documents.total || 0;
    dom.studyHours.textContent =
      data.statistics.study.total_hours?.toFixed(1) || 0;
  } catch (err) {
    console.error(err);
    showToast("Error loading dashboard", "error");
  } finally {
    hideLoading();
  }
}

// ------------------ HABITS ------------------
async function loadHabits() {
  try {
    const res = await fetch("/habits");
    const data = await res.json();
    if (!data.success) return;
    dom.habitsContainer.innerHTML = data.habits.length
      ? data.habits
          .map(
            (h) =>
              `<div class="card mb-2"><div class="card-body"><strong>${h.name}</strong></div></div>`
          )
          .join("")
      : "<p>No habits</p>";
  } catch (err) {
    console.error(err);
  }
}
async function saveHabit(e) {
  e.preventDefault();
  const name = document.getElementById("habitName").value;
  if (!name) return showToast("Name required", "error");
  showLoading();
  try {
    const res = await fetch("/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.success) {
      showToast("Habit added", "success");
      closeModal("habitModal");
      await loadHabits();
    }
  } catch (err) {
    console.error(err);
    showToast("Error saving habit", "error");
  } finally {
    hideLoading();
  }
}

// ------------------ DOCUMENTS ------------------
async function loadDocuments() {
  if (!dom.documentsList) return;
  showLoading();
  try {
    const res = await fetch("/documents");
    const data = await res.json();
    if (!data.success) return showToast("Failed to load documents", "error");

    dom.documentsList.innerHTML = data.documents.length
      ? data.documents
          .map(
            (d) => `
      <div class="card mb-2">
        <div class="card-body">
          <strong>${d.title}</strong> (${d.file_type})
        </div>
      </div>`
          )
          .join("")
      : "<p>No documents uploaded yet</p>";
  } catch (err) {
    console.error(err);
    showToast("Error loading documents", "error");
  } finally {
    hideLoading();
  }
}
async function uploadDocument(e) {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  showLoading();
  try {
    const res = await fetch("/documents/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (res.ok && data.success) {
      showToast("Document uploaded", "success");
      await loadDocuments();
      await loadDashboard();
      await loadChatDocs();
    } else {
      console.error("Upload failed:", data);
      showToast("Failed to upload document", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Error uploading document", "error");
  } finally {
    hideLoading();
    e.target.value = "";
  }
}

// ------------------ DAY PLANNER ------------------
async function generateDayPlan() {
  const prefs = {
    preferences: {
      wake_up_time: dom.wakeTime.value,
      sleep_time: dom.sleepTime.value,
      energy_pattern: dom.energyPattern.value,
    },
  };
  showLoading();
  try {
    const res = await fetch("/planner/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    const data = await res.json();
    if (!data.success) return showToast("Failed to generate plan", "error");

    dom.scheduleContainer.innerHTML = data.plan.schedule
      .map(
        (p) =>
          `<div class="card mb-2"><div class="card-body"><strong>${p.activity}</strong> ${p.start} - ${p.end}</div></div>`
      )
      .join("");
  } catch (err) {
    console.error(err);
    showToast("Error generating plan", "error");
  } finally {
    hideLoading();
  }
}

// ------------------ AI CHAT ------------------
function addChatMessage(text, type = "ai") {
  const msgContainer = dom.chatMessages;
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${type}-message`;
  msgDiv.innerHTML = `<div class="message-content"><p>${text}</p></div>`;
  msgContainer.appendChild(msgDiv);
  msgContainer.scrollTop = msgContainer.scrollHeight;
}
function initChat() {
  if (dom.chatMessages) dom.chatMessages.innerHTML = "";
  addChatMessage(
    "Hello! I'm your AI assistant. How can I help you with your studies today?"
  );
}
async function loadChatDocs() {
  try {
    const res = await fetch("/documents");
    const data = await res.json();
    if (!data.success) return;
    dom.chatDocSelect.innerHTML = "<option value=''>No Document</option>";
    data.documents.forEach((d) => {
      const option = document.createElement("option");
      option.value = d.id;
      option.textContent = d.title;
      dom.chatDocSelect.appendChild(option);
    });
  } catch (err) {
    console.error(err);
  }
}
async function sendChatMessage() {
  const question = dom.chatInput.value.trim();
  if (!question) return;
  const docId = dom.chatDocSelect.value;
  const msgContainer = dom.chatMessages;

  // User message
  const userMsg = document.createElement("div");
  userMsg.className = "message user-message";
  userMsg.innerHTML = `<div class="message-content"><p>${question}</p></div>`;
  msgContainer.appendChild(userMsg);

  dom.chatInput.value = "";

  // AI placeholder
  const aiMsg = document.createElement("div");
  aiMsg.className = "message ai-message";
  aiMsg.innerHTML = `<div class="message-content"><p>Thinking...</p></div>`;
  msgContainer.appendChild(aiMsg);
  msgContainer.scrollTop = msgContainer.scrollHeight;

  try {
    const res = await fetch("/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, document_id: docId || undefined }),
    });
    const data = await res.json();
    const shortText = data.answer || "No response";
    const fullText = data.full_answer || shortText;

    if (fullText.length > shortText.length) {
      aiMsg.querySelector("p").innerHTML = `
        ${shortText} 
        <span class="see-more" style="color:blue;cursor:pointer">See more</span>
        <span class="full-text" style="display:none">${fullText}</span>`;
      aiMsg.querySelector(".see-more").addEventListener("click", (e) => {
        const fullSpan = e.target.nextElementSibling;
        e.target.style.display = "none";
        fullSpan.style.display = "inline";
      });
    } else {
      aiMsg.querySelector("p").textContent = shortText;
    }
    msgContainer.scrollTop = msgContainer.scrollHeight;
  } catch (err) {
    aiMsg.querySelector("p").textContent = "Error: " + err.message;
    console.error(err);
  }
}
