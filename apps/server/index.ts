import { resolve } from "node:path";
import express from "express";
import { connect, migrate } from "../../packages/database/client.js";
import { createApp } from "./app.js";
import { seedDemo } from "../../scripts/seed-data.js";
if (process.env.NODE_ENV === "production") {
  if (!process.env.APP_ORIGIN?.startsWith("https://"))
    throw new Error("Production APP_ORIGIN must use HTTPS");
  if (process.env.DEMO_MODE === "true")
    throw new Error("Demo must run separately from production");
}
const db = await connect();
if (process.env.NODE_ENV !== "production") await migrate(db);
const mode = process.env.DEMO_MODE === "true" ? "DEMO" : "PILOT";
const identity = (await db.query("SELECT mode FROM environment_identity"))
  .rows[0];
if (identity && identity.mode !== mode)
  throw new Error(
    "Database mode mismatch. Demo and pilot data must remain separate",
  );
if (!identity)
  await db.query(
    "INSERT INTO environment_identity(singleton,mode) VALUES(true,$1)",
    [mode],
  );
if (process.env.DEMO_MODE === "true") await seedDemo(db);
const app = createApp(db);
if (
  process.env.NODE_ENV === "production" ||
  process.env.SERVE_BUILD === "true"
) {
  app.use(express.static(resolve("dist/web"), { maxAge: "1h" }));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(resolve("dist/web/index.html")),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    configLoader: "native",
    server: { middlewareMode: true },
  });
  app.use(vite.middlewares);
}
const server = app.listen(Number(process.env.PORT || 5173), "0.0.0.0", () =>
  console.log(
    "AquaIntel running at http://localhost:" + (process.env.PORT || 5173),
  ),
);
async function shutdown() {
  server.close();
  await db.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
