const API = "/api";

const statusEl = document.getElementById("status");
const notesEl = document.getElementById("notes");
const form = document.getElementById("note-form");

async function checkHealth() {
  try {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.database);
    statusEl.textContent = `Backend OK · DB ${data.database} · container ${data.container}`;
    statusEl.className = "status ok";
  } catch (err) {
    statusEl.textContent = "Backend unreachable";
    statusEl.className = "status err";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function loadNotes() {
  const res = await fetch(`${API}/notes`);
  const notes = await res.json();
  if (!notes.length) {
    notesEl.innerHTML = '<p class="empty">No notes yet.</p>';
    return;
  }
  notesEl.innerHTML = notes
    .map(
      (n) => `
      <article class="note">
        <h3>${escapeHtml(n.title)}</h3>
        <p>${escapeHtml(n.content)}</p>
        ${n.filename ? `<p>📎 <a href="${API}/uploads/${encodeURIComponent(n.filename)}" target="_blank">${escapeHtml(n.filename)}</a></p>` : ""}
        <div class="meta">
          <span>${new Date(n.created_at).toLocaleString()}</span>
          <button class="delete" data-id="${n.id}">Delete</button>
        </div>
      </article>`
    )
    .join("");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const res = await fetch(`${API}/notes`, { method: "POST", body: new FormData(form) });
  if (!res.ok) {
    const data = await res.json();
    alert(data.error || "Failed to save note");
    return;
  }
  form.reset();
  loadNotes();
});

notesEl.addEventListener("click", async (e) => {
  if (!e.target.matches("button.delete")) return;
  await fetch(`${API}/notes/${e.target.dataset.id}`, { method: "DELETE" });
  loadNotes();
});

checkHealth();
loadNotes();
