import "dotenv/config";
import express from "express";
import cors from "cors";
import { initializeRouter } from "./routes/initialize.js";
import { distributeRouter } from "./routes/distribute.js";
import { collaboratorsRouter } from "./routes/collaborators.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/initialize", initializeRouter);
app.use("/api/distribute", distributeRouter);
app.use("/api/collaborators", collaboratorsRouter);

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
