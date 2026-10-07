import sharp from "sharp";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { connect, migrate, type DB } from "../packages/database/client";
import { createApp } from "../apps/server/app";
let db: DB,
  app: ReturnType<typeof createApp>,
  owner: ReturnType<typeof request.agent>,
  other: ReturnType<typeof request.agent>,
  farmId: string,
  pondId: string,
  cycleId: string,
  sampleId: string,
  scenarioId: string,
  decisionId: string;
const send = (
  agent: ReturnType<typeof request.agent>,
  url: string,
  body: any,
) => agent.post(url).set("X-Aqua-Request", "1").send(body);
beforeAll(async () => {
  db = await connect(true);
  await migrate(db);
  app = createApp(db);
  owner = request.agent(app);
  other = request.agent(app);
  await send(owner, "/api/auth/register", {
    email: "owner@example.test",
    password: "Correct-horse-1234",
  });
  await send(other, "/api/auth/register", {
    email: "other@example.test",
    password: "Correct-horse-5678",
  });
});
afterAll(async () => db.close());
describe("real database and HTTP workflows", () => {
  it("migrations are repeatable", async () => {
    await migrate(db);
    expect(
      (await db.query("SELECT * FROM aquaintel_migrations")).rows,
    ).toHaveLength(3);
  });
  it("authentication required", async () =>
    expect((await request(app).get("/api/workspace")).status).toBe(401));
  it("rejects CSRF and foreign origin", async () => {
    expect((await owner.post("/api/farms").send({})).status).toBe(403);
    expect(
      (
        await owner
          .post("/api/farms")
          .set("X-Aqua-Request", "1")
          .set("Origin", "https://evil.test")
          .send({})
      ).status,
    ).toBe(403);
  });
  it("creates private farm", async () => {
    const r = await send(owner, "/api/farms", {
      name: "Integration Farm",
      location: "Synthetic",
      areaAcres: 4,
    });
    expect(r.status).toBe(201);
    farmId = r.body.id;
    expect((await other.get("/api/workspace")).body.farms).toHaveLength(0);
  });
  it("blocks unauthorized pond creation", async () =>
    expect(
      (
        await send(other, "/api/ponds", {
          farmId,
          name: "Stolen",
          areaAcres: 1,
        })
      ).status,
    ).toBe(404));
  it("creates pond and existing crop", async () => {
    let r = await send(owner, "/api/ponds", {
      farmId,
      name: "Pond A",
      areaAcres: 4,
    });
    expect(r.status).toBe(201);
    pondId = r.body.id;
    r = await send(owner, "/api/cycles", {
      pondId,
      stockingDate: "2026-01-01",
      stocked: 300000,
      seedCost: 1000,
    });
    expect(r.status).toBe(201);
    cycleId = r.body.id;
    expect(r.body.doc).toBeGreaterThan(0);
    expect(r.body.data.feedComplete).toBe(false);
  });
  it("one active crop per pond", async () =>
    expect(
      (
        await send(owner, "/api/cycles", {
          pondId,
          stockingDate: "2026-01-02",
          stocked: 300000,
        })
      ).status,
    ).toBe(409));
  it("blocks cross-tenant reads writes export", async () => {
    expect((await other.get("/api/cycles/" + cycleId)).status).toBe(404);
    expect(
      (
        await send(other, "/api/cycles/" + cycleId + "/records/event", {
          date: "2026-02-01",
          kind: "Other",
          notes: "No",
        })
      ).status,
    ).toBe(404);
    expect(
      (await other.get("/api/cycles/" + cycleId + "/export.csv")).status,
    ).toBe(404);
  });
  it("rejects pre-stocking log", async () =>
    expect(
      (
        await send(owner, "/api/cycles/" + cycleId + "/records/daily", {
          date: "2025-12-31",
          feedKg: 10,
        })
      ).status,
    ).toBe(422));
  it("unknown feed does not become zero", async () => {
    const r = await send(owner, "/api/cycles/" + cycleId + "/records/daily", {
      date: "2026-01-02",
      feedKg: null,
    });
    expect(r.status).toBe(201);
    const s = (await owner.get("/api/cycles/" + cycleId)).body;
    expect(s.summary.feedKg).toBeNull();
    expect(s.records.feed).toHaveLength(0);
  });
  it("daily feed and expense save atomically without duplicate cost", async () => {
    const url = "/api/cycles/" + cycleId + "/records/daily";
    expect(
      (
        await send(owner, url, {
          date: "2026-02-01",
          feedKg: 25,
          feedCost: 2000,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await send(owner, url, {
          date: "2026-02-01",
          feedKg: 25,
          feedCost: 2000,
        })
      ).status,
    ).toBe(409);
    const r = (await owner.get("/api/cycles/" + cycleId)).body;
    expect(r.records.feed).toHaveLength(1);
    expect(r.summary.costPaise).toBe(300000);
    expect(r.summary.fcr).toBeNull();
  });
  it("backfills samples preserving measured inputs", async () => {
    const path = "/api/cycles/" + cycleId + "/records/sample";
    let r = await send(owner, path, {
      date: "2026-02-11",
      count: 100,
      weightG: 2000,
      method: "Four points",
    });
    expect(r.status).toBe(201);
    sampleId = r.body.id;
    r = await send(owner, path, {
      date: "2026-02-01",
      count: 100,
      weightG: 1800,
      method: "Four points",
    });
    expect(r.status).toBe(201);
    const d = (await owner.get("/api/cycles/" + cycleId)).body;
    expect(d.summary.latest.abw).toBe(20);
    expect(d.summary.growth.daily).toBe(0.2);
    expect(d.records.sample[0].data.weightG).toBe(1800);
  });
  it("stores survival ranges", async () => {
    expect(
      (
        await send(owner, "/api/cycles/" + cycleId + "/records/assumption", {
          date: "2026-02-01",
          low: 70,
          base: 75,
          high: 80,
        })
      ).status,
    ).toBe(201);
    const d = (await owner.get("/api/cycles/" + cycleId)).body;
    expect(d.summary.biomass.base).toBe(4500);
  });
  it("market validates prices and permits sizes on same day", async () => {
    const url = "/api/cycles/" + cycleId + "/records/market";
    expect(
      (
        await send(owner, url, {
          date: "2026-02-11",
          location: "Test",
          countPerKg: 50,
          price: 0,
          source: "Synthetic",
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await send(owner, url, {
          date: "2026-02-11",
          location: "Test",
          countPerKg: 50,
          price: 300,
          source: "Synthetic",
        })
      ).status,
    ).toBe(201);
  });
  it("scenario snapshot remains immutable after later costs", async () => {
    const input = {
      date: "2026-02-11",
      price: 300,
      dailyFeedKg: 100,
      feedPrice: 80,
      dailyOperating: 2000,
    };
    const x = await send(
      owner,
      "/api/cycles/" + cycleId + "/records/scenario",
      input,
    );
    expect(x.status).toBe(201);
    scenarioId = x.body.id;
    const before = x.body.data;
    expect(before.results[2].abw).toBe(21.4);
    expect(before.results[0].bands.base.profitPaise).toBeNull();
    await send(owner, "/api/cycles/" + cycleId + "/records/cost", {
      date: "2026-02-12",
      category: "Labor",
      amount: 500,
    });
    const rows = (await owner.get("/api/cycles/" + cycleId)).body.records
      .scenario;
    expect(rows.find((s: any) => s.id === scenarioId).data).toEqual(before);
  });
  it("historical scenarios do not consume future samples", async () => {
    const r = await send(
      owner,
      "/api/cycles/" + cycleId + "/scenario-preview",
      {
        date: "2026-02-01",
        price: 300,
        dailyFeedKg: 10,
        feedPrice: 80,
        dailyOperating: 0,
      },
    );
    expect(r.status).toBe(200);
    expect(r.body.config.abw).toBe(18);
    expect(r.body.results[1].abw).toBeNull();
  });
  it("decisions link only to crop-owned scenarios and append outcomes", async () => {
    let r = await send(owner, "/api/cycles/" + cycleId + "/records/decision", {
      date: "2026-02-11",
      decision: "Wait seven days",
      reason: "Synthetic test",
      scenarioId: randomUUID(),
    });
    expect(r.status).toBe(422);
    r = await send(owner, "/api/cycles/" + cycleId + "/records/decision", {
      date: "2026-02-11",
      decision: "Wait seven days",
      reason: "Synthetic test",
      scenarioId,
    });
    expect(r.status).toBe(201);
    decisionId = r.body.id;
    expect(
      (
        await send(
          owner,
          "/api/cycles/" + cycleId + "/decisions/" + decisionId + "/outcome",
          { date: "2026-02-18", outcome: "Actual observation, synthetic" },
        )
      ).status,
    ).toBe(200);
  });
  it("rejects disguised uploads and cross-tenant linked images", async () => {
    expect(
      (
        await owner
          .post("/api/cycles/" + cycleId + "/images/sample/" + sampleId)
          .set("X-Aqua-Request", "1")
          .field("consent", "true")
          .attach("image", Buffer.from("<script>bad</script>"), "fake.png")
      ).status,
    ).toBe(422);
    expect(
      (
        await other
          .post("/api/cycles/" + cycleId + "/images/sample/" + sampleId)
          .set("X-Aqua-Request", "1")
          .field("consent", "true")
          .attach("image", Buffer.from("bad"), "x.png")
      ).status,
    ).toBe(404);
  });

  it("stores a decoded original image and protects reads", async () => {
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#087664" },
    })
      .png()
      .toBuffer();
    const r = await owner
      .post("/api/cycles/" + cycleId + "/images/sample/" + sampleId)
      .set("X-Aqua-Request", "1")
      .field("consent", "true")
      .field("category", "Shrimp")
      .attach("image", bytes, "sample.png");
    expect(r.status).toBe(201);
    const own = await owner.get("/api/images/" + r.body.id);
    expect(own.status).toBe(200);
    expect(own.body).toEqual(bytes);
    expect((await other.get("/api/images/" + r.body.id)).status).toBe(404);
    expect((await request(app).get("/api/images/" + r.body.id)).status).toBe(
      401,
    );
  });
  it("rejects truncated signature-only images", async () => {
    const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const r = await owner
      .post("/api/cycles/" + cycleId + "/images/sample/" + sampleId)
      .set("X-Aqua-Request", "1")
      .field("consent", "true")
      .attach("image", bytes, "damaged.png");
    expect(r.status).toBe(422);
  });
  it("corrections retain raw history, void linked costs, and allow replacement", async () => {
    const before = (await owner.get("/api/cycles/" + cycleId)).body;
    const d = before.records.daily.find((x: any) => x.date === "2026-02-01");
    expect(
      (
        await send(
          other,
          "/api/cycles/" + cycleId + "/records/daily/" + d.id + "/void",
          { reason: "No access" },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await send(
          owner,
          "/api/cycles/" + cycleId + "/records/daily/" + d.id + "/void",
          { reason: "Transcription error; replace daily total" },
        )
      ).status,
    ).toBe(200);
    const after = (await owner.get("/api/cycles/" + cycleId)).body;
    expect(after.records.feed).toHaveLength(0);
    expect(after.summary.costPaise).toBe(before.summary.costPaise - 200000);
    const raw = (
      await db.query("SELECT data FROM daily_logs WHERE id=$1", [d.id])
    ).rows[0].data;
    expect(raw.feedKg).toBe(25);
    expect(raw.voidedAt).toBeTruthy();
    expect(
      (
        await send(owner, "/api/cycles/" + cycleId + "/records/daily", {
          date: "2026-02-01",
          feedKg: 30,
        })
      ).status,
    ).toBe(201);
    expect(
      (await owner.get("/api/cycles/" + cycleId + "/export.csv")).text,
    ).toContain("voidedAt");
  });
  it("exports raw values and provenance as CSV", async () => {
    const r = await owner.get("/api/cycles/" + cycleId + "/export.csv");
    expect(r.status).toBe(200);
    expect(r.text).toContain("culture_cycle_id");
    expect(r.text).toContain("MEASURED");
    expect(r.text).toContain("2000");
    expect(r.headers["cache-control"]).toBe("no-store");
  });
  it("records harvest and disables stale biomass scenarios", async () => {
    expect(
      (
        await send(owner, "/api/cycles/" + cycleId + "/records/harvest", {
          date: "2026-03-01",
          weightKg: 4000,
          price: 300,
          final: true,
        })
      ).status,
    ).toBe(201);
    const d = (await owner.get("/api/cycles/" + cycleId)).body;
    expect(d.cycle.status).toBe("CLOSED");
    expect(d.summary.biomass).toBeNull();
    expect(
      (
        await send(owner, "/api/cycles/" + cycleId + "/scenario-preview", {
          date: "2026-03-01",
          price: 300,
          dailyFeedKg: 100,
          feedPrice: 80,
          dailyOperating: 2000,
        })
      ).status,
    ).toBe(422);
  });
  it("new crop preserves old crop and audit history", async () => {
    const r = await send(owner, "/api/cycles", {
      pondId,
      stockingDate: "2026-04-01",
      stocked: 200000,
    });
    expect(r.status).toBe(201);
    expect((await owner.get("/api/workspace")).body.cycles).toHaveLength(2);
    expect(
      (await db.query("SELECT * FROM audit_events")).rows.length,
    ).toBeGreaterThan(12);
  });
  it("signout invalidates server session", async () => {
    await send(other, "/api/auth/logout", {});
    expect((await other.get("/api/me")).status).toBe(401);
    expect(
      (
        await send(other, "/api/auth/login", {
          email: "other@example.test",
          password: "Correct-horse-5678",
        })
      ).status,
    ).toBe(200);
    expect((await other.get("/api/me")).status).toBe(200);
  });
});
