import express from "express";
import { runMigrations } from "./db/migrate";
import { campaignRoutes } from "./http/campaignRoutes";

runMigrations();

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(campaignRoutes);

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});