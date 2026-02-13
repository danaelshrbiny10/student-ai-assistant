// ------------------ CONFIG ------------------
const API_BASE = ""; // empty because FastAPI serves frontend at /

const dom = {
  pages: document.querySelectorAll(".page"),
  navLinks: document.querySelectorAll(".mobile-nav-link, .nav-link"),
  mobileMenuBtn: document.querySelector(".burger-menu"),
  mobileNav: document.getElementById("mobileNav"),
  toast: document.getElementById("toast"),
  loadingOverlay: document.getElementById("loadingOverlay"),

  totalTasks: document.getElementById("totalTasks"),
  completedTasks: document.getElementById("completedTasks"),
  totalDocs: document.getElementById("totalDocs"),
  studyHours: document.getElementById("studyHours"),
  recentTasks: document.getElementById("recentTasks"),

  tasksContainer: document.getElementById("tasksContainer"),
  addTaskBtn: document.getElementById("addTaskBtn"),
  taskModal: document.getElementById("taskModal"),
  taskForm: document.getElementById("taskForm"),

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
function formatDate(dt) {
  return new Date(dt).toLocaleString();
}
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  else return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
function getFileIcon(ext) {
  const map = {
    pdf: "pdf",
    doc: "word",
    docx: "word",
    txt: "file-alt",
    csv: "table",
    json: "file-code",
    ppt: "file-powerpoint",
    pptx: "file-powerpoint",
    jpg: "image",
    png: "image",
  };
  return map[ext.toLowerCase()] || "file";
}

// ------------------ INIT ------------------
async function init() {
  setupListeners();
  await loginGuest();
  await loadDashboard();
  await loadTasks();
  await loadHabits();
  await loadDocuments();
  await loadChatDocs();
}
init();

// ------------------ LISTENERS ------------------
function setupListeners() {
  // Mobile nav
  dom.mobileMenuBtn?.addEventListener("click", () =>
    dom.mobileNav.classList.toggle("active"),
  );
  dom.navLinks.forEach((l) =>
    l.addEventListener("click", (e) => {
      showPage(l.dataset.page);
      dom.mobileNav.classList.remove("active");
    }),
  );

  // Task
  dom.taskForm?.addEventListener("submit", saveTask);
  dom.addTaskBtn?.addEventListener("click", () =>
    dom.taskModal.classList.add("active"),
  );

  // Habit
  dom.habitForm?.addEventListener("submit", saveHabit);
  dom.addHabitBtn?.addEventListener("click", () =>
    dom.habitModal.classList.add("active"),
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
    dom.totalTasks.textContent = data.statistics.tasks.total || 0;
    dom.completedTasks.textContent = data.statistics.tasks.completed || 0;
    dom.totalDocs.textContent = data.statistics.documents.total || 0;
    dom.studyHours.textContent =
      data.statistics.study.total_hours?.toFixed(1) || 0;
    renderRecentTasks(data.recent_activity.tasks || []);
  } catch (err) {
    console.error(err);
    showToast("Error loading dashboard", "error");
  } finally {
    hideLoading();
  }
}
function renderRecentTasks(tasks) {
  if (!dom.recentTasks) return;
  dom.recentTasks.innerHTML = tasks.length
    ? tasks
        .map(
          (t) =>
            `<div class="card mb-2"><div class="card-body"><strong>${t.title}</strong><br><small>${t.status}</small></div></div>`,
        )
        .join("")
    : "<p>No recent tasks</p>";
}

// ------------------ TASKS ------------------
async function loadTasks(status = "") {
  showLoading();
  try {
    const res = await fetch(status ? `/tasks?status=${status}` : "/tasks");
    const data = await res.json();
    if (!data.success) return showToast("Failed to load tasks", "error");
    renderTasks(data.tasks || []);
  } catch (err) {
    console.error(err);
    showToast("Error loading tasks", "error");
  } finally {
    hideLoading();
  }
}
function renderTasks(tasks) {
  if (!dom.tasksContainer) return;
  dom.tasksContainer.innerHTML = tasks.length
    ? tasks
        .map(
          (t) => `
        <div class="card mb-2" data-id="${t.id}">
            <div class="card-body d-flex justify-content-between">
                <div><strong>${t.title}</strong> (${t.status})</div>
                <div>
                    <button onclick="editTask('${t.id}')">Edit</button>
                    <button onclick="deleteTask('${t.id}')">Delete</button>
                </div>
            </div>
        </div>
    `,
        )
        .join("")
    : "<p>No tasks</p>";
}
async function saveTask(e) {
  e.preventDefault();
  const title = document.getElementById("taskTitle").value;
  if (!title) return showToast("Title required", "error");
  showLoading();
  try {
    const res = await fetch("/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    if (data.success) {
      showToast("Task added", "success");
      closeModal("taskModal");
      await loadTasks();
      await loadDashboard();
    }
  } catch (err) {
    console.error(err);
    showToast("Error saving task", "error");
  } finally {
    hideLoading();
  }
}
async function deleteTask(id) {
  if (!confirm("Delete task?")) return;
  showLoading();
  try {
    await fetch(`/tasks/${id}`, { method: "DELETE" });
    showToast("Deleted", "success");
    await loadTasks();
    await loadDashboard();
  } catch (err) {
    console.error(err);
    showToast("Error deleting", "error");
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
              `<div class="card mb-2"><div class="card-body"><strong>${h.name}</strong></div></div>`,
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
  try {
    const res = await fetch("/documents");
    const data = await res.json();
    if (!data.success) return;
    dom.documentsList.innerHTML = data.documents.length
      ? data.documents
          .map(
            (d) => `
            <div class="card mb-2">
                <div class="card-body">
                    <strong>${d.title}</strong> (${d.file_type})
                </div>
            </div>
        `,
          )
          .join("")
      : "<p>No documents</p>";
  } catch (err) {
    console.error(err);
  }
}
async function uploadDocument(e) {
  const file = e.target.files[0];
  if (!file) return;
  showLoading();
  const fd = new FormData();
  fd.append("file", file);
  try {
    const res = await fetch("/documents/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.success) {
      showToast("Uploaded", "success");
      await loadDocuments();
      await loadDashboard();
      await loadChatDocs();
    } else showToast("Upload failed", "error");
  } catch (err) {
    console.error(err);
    showToast("Upload error", "error");
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
          `<div class="card mb-2"><div class="card-body"><strong>${p.activity}</strong> ${p.start} - ${p.end}</div></div>`,
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

// Add a chat message to the container
function addChatMessage(text, type = "ai") {
  const msgContainer = dom.chatMessages;
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${type}-message`;
  msgDiv.innerHTML = `<div class="message-content"><p>${text}</p></div>`;
  msgContainer.appendChild(msgDiv);
  // Scroll to bottom
  msgContainer.scrollTop = msgContainer.scrollHeight;
}

// Initialize chat with clear welcome messages
function initChat() {
  // Clear existing messages first
  if (dom.chatMessages) dom.chatMessages.innerHTML = "";
  addChatMessage(
    "Hello! I'm your AI assistant. How can I help you with your studies today?",
  );
  addChatMessage(
    "I can help you with: 📚 Study tips, 📝 Task management, 🗓️ Planning your day, 📊 Understanding concepts, and more!",
  );
}

// Load documents for chat dropdown
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

// Send user message and fetch AI response
// async function sendChatMessage() {
//     const question = dom.chatInput.value.trim();
//     if (!question) return;

//     const docId = dom.chatDocSelect.value;
//     addChatMessage(question, "user"); // Add user message
//     dom.chatInput.value = "";

//     // Show "thinking" placeholder
//     const thinkingMsg = document.createElement("div");
//     thinkingMsg.className = "message ai-message";
//     thinkingMsg.innerHTML = `<div class="message-content"><p>Thinking...</p></div>`;
//     dom.chatMessages.appendChild(thinkingMsg);
//     dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;

//     try {
//         let url = "/ai/ask";
//         let body = { question };
//         if (docId) {
//             url = `/documents/${docId}/summarize`;
//             body = {};
//         }

//         const res = await fetch(url, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(body)
//         });
//         const data = await res.json();
//         thinkingMsg.querySelector("p").textContent = docId ? data.summary || "No response" : data.answer || "No response";
//     } catch(err) {
//         thinkingMsg.querySelector("p").textContent = "Error: " + err.message;
//         console.error(err);
//     }
// }

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

  // AI message placeholder
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

    // If full answer is longer than shortText, add See more
    if (fullText.length > shortText.length) {
      aiMsg.querySelector("p").innerHTML = `
                ${shortText} 
                <span class="see-more" style="color:blue;cursor:pointer">See more</span>
                <span class="full-text" style="display:none">${fullText}</span>
            `;
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

// Initialize chat on page load
initChat();
loadChatDocs();
