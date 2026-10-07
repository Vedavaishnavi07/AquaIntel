import { randomUUID } from "node:crypto";
import type { DB } from "../packages/database/client.js";
import { hashPassword } from "../apps/server/auth.js";
import { insertRecord, audit } from "../apps/server/service.js";
import { today, day } from "../packages/domain/index.js";
export async function seedDemo(db: DB) {
  if (process.env.NODE_ENV === "production" || process.env.DEMO_MODE !== "true")
    throw new Error("Seed requires DEMO_MODE=true outside production");
  const existing = await db.query("SELECT id FROM users LIMIT 1");
  if (existing.rows.length) {
    console.log("Database already has users; seed skipped");
    return;
  }
  const date = (ago: number) =>
    new Date((day(today()) - ago) * 86400000).toISOString().slice(0, 10);
  const u = randomUUID(),
    f = randomUUID(),
    p = randomUUID(),
    c = randomUUID();
  await db.transaction(async (tx) => {
    await tx.query(
      "INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)",
      [u, "demo@aquaintel.local", await hashPassword("Demo-shrimp-2026!")],
    );
    await tx.query("INSERT INTO farms(id,data) VALUES($1,$2)", [
      f,
      JSON.stringify({
        name: "Coastal Demo Farm",
        location: "Synthetic · Andhra Pradesh",
        areaAcres: 4,
        demo: true,
      }),
    ]);
    await tx.query(
      "INSERT INTO farm_members(id,farm_id,user_id,role) VALUES($1,$2,$3,$4)",
      [randomUUID(), f, u, "OWNER"],
    );
    await tx.query("INSERT INTO ponds(id,farm_id,data) VALUES($1,$2,$3)", [
      p,
      f,
      JSON.stringify({ name: "Pond 01", areaAcres: 4 }),
    ]);
    await tx.query(
      "INSERT INTO culture_cycles(id,pond_id,data) VALUES($1,$2,$3)",
      [
        c,
        p,
        JSON.stringify({
          stockingDate: date(72),
          stocked: 300000,
          species: "Litopenaeus vannamei",
          plStage: "PL12",
          source: "Synthetic hatchery",
          initialBiomassKg: null,
          feedComplete: false,
          costsComplete: false,
          notes: "DEMO — all records synthetic",
        }),
      ],
    );
    await insertRecord(tx, "event", c, u, date(72), "USER_REPORTED", {
      kind: "Stocking",
      notes: "300,000 PL stocked. Synthetic demonstration.",
    });
    await insertRecord(tx, "assumption", c, u, date(30), "USER_ASSUMED", {
      low: 70,
      base: 75,
      high: 80,
      notes: "Synthetic scenario assumptions",
    });
    for (const [ago, abw] of [
      [42, 5.8],
      [35, 7.2],
      [28, 9.1],
      [21, 11],
      [14, 13.2],
      [7, 15],
      [1, 16.8],
    ])
      await insertRecord(tx, "sample", c, u, date(ago), "MEASURED", {
        count: 100,
        weightG: abw * 100,
        method: "DEMO: four sampling locations",
        representative: "YES",
        scaleChecked: true,
        notes: "Synthetic measurement, not real ground truth",
      });
    for (let ago = 14; ago >= 1; ago--) {
      const kg = 75 + (14 - ago) * 2;
      const daily = await insertRecord(
        tx,
        "daily",
        c,
        u,
        date(ago),
        "USER_REPORTED",
        {
          feedKg: kg,
          feedings: 4,
          brand: "Demo feed",
          mortality: null,
          behavior: "NORMAL",
          weather: ago === 4 ? "Heavy rain" : "Not recorded",
          notes: "Synthetic record",
        },
      );
      await insertRecord(tx, "feed", c, u, date(ago), "USER_REPORTED", {
        kg,
        brand: "Demo feed",
        dailyLogId: daily,
      });
    }
    for (const [ago, category, amountPaise] of [
      [72, "Seed", 16500000],
      [14, "Feed", 19800000],
      [7, "Electricity", 1850000],
      [3, "Labor", 900000],
    ] as const)
      await insertRecord(tx, "cost", c, u, date(ago), "USER_REPORTED", {
        category,
        amountPaise,
        note: "Synthetic demo expense",
      });
    for (const [count, price] of [
      [60, 280],
      [50, 320],
      [40, 360],
    ])
      await insertRecord(tx, "market", c, u, date(1), "USER_REPORTED", {
        location: "Synthetic local buyer",
        countPerKg: count,
        pricePaise: price * 100,
        source: "DEMO quote — not a market price",
        note: "Do not use for trading decisions",
      });
    await insertRecord(tx, "event", c, u, date(4), "USER_REPORTED", {
      kind: "Heavy rainfall",
      notes:
        "Demo observation: heavy evening rain; no water parameters inferred.",
    });
    await audit(tx, u, f, "DEMO_SEEDED", { synthetic: true });
  });
  console.log("Synthetic demo ready: demo@aquaintel.local / Demo-shrimp-2026!");
}
