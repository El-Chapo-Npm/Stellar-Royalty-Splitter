// dotenv is optional - load .env file if needed
// import "dotenv/config";

import express from "express";
import cors from "cors";
import { initializeRouter } from "./routes/initialize.js";
import { distributeRouter } from "./routes/distribute.js";
import { collaboratorsRouter } from "./routes/collaborators.js";
import historyRouter from "./routes/history.js";
import { initializeDatabase } from "./database.js";

// Initialize database on startup
initializeDatabase();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/initialize", initializeRouter);
app.use("/api/distribute", distributeRouter);
app.use("/api/collaborators", collaboratorsRouter);
app.use("/api", historyRouter);

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Central error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () =>
  console.log(`API listening on http://localhost:${PORT}`),
);
