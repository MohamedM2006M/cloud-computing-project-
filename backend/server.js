const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");

const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || "/app/uploads";

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Connection settings come from environment variables set in docker-compose.yml.
// "db" is the service name, resolved by Docker's internal DNS on the shared network.
const pool = new Pool({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "notesdb",
});

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const app = express();
app.use(express.json());

// Uploaded files are served from the Docker volume mounted at UPLOAD_DIR.
app.use("/api/uploads", express.static(UPLOAD_DIR));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected", container: process.env.HOSTNAME });
  } catch (err) {
    res.status(500).json({ status: "error", database: err.message });
  }
});

app.get("/api/notes", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM notes ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notes", upload.single("file"), async (req, res) => {
  const { title, content } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO notes (title, content, filename) VALUES ($1, $2, $3) RETURNING *",
      [title.trim(), content || "", req.file ? req.file.filename : null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("DELETE FROM notes WHERE id = $1 RETURNING *", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Note not found" });
    if (rows[0].filename) {
      fs.rm(path.join(UPLOAD_DIR, rows[0].filename), { force: true }, () => {});
    }
    res.json({ deleted: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
