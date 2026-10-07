import sharp from "sharp";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ZodError } from "zod";
import * as v from "../../packages/validation/index.js";
import {
  DomainError,
  doc,
  today,
  money,
  csv,
} from "../../packages/domain/index.js";
import type { DB } from "../../packages/database/client.js";
import {
  hashPassword,
  verifyPassword,
  token,
  digest,
  sessionToken,
} from "./auth.js";
import {
  authorize,
  farmAccess,
  audit,
  insertRecord,
  records,
  summary,
  computeScenario,
  tables,
  HttpError,
  type TableKind,
} from "./service.js";
type AuthRequest = Request & { userId: string };
export function createApp(db: DB) {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "production"
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:"],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
              },
            }
          : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "128kb" }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 240,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("X-Aqua-Request") !== "1")
        return res
          .status(403)
          .json({ error: "Missing request protection header" });
      const origin = req.get("origin");
      if (
        origin &&
        origin !== (process.env.APP_ORIGIN || "http://localhost:5173")
      )
        return res.status(403).json({ error: "Untrusted origin" });
    }
    next();
  });
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 86400000,
  };
  const signIn = async (res: Response, userId: string) => {
    const t = token();
    await db.query(
      "INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,$3)",
      [digest(t), userId, new Date(Date.now() + 7 * 86400000)],
    );
    res.cookie("aqua_session", t, cookieOptions);
  };
  app.get("/api/health", async (_req, res) => {
    await db.query("SELECT 1");
    res.json({ status: "ok", version: "0.1.0" });
  });
  app.post("/api/auth/register", authLimit, async (req, res) => {
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.REGISTRATION_CODE ||
        req.body.registrationCode !== process.env.REGISTRATION_CODE)
    )
      throw new HttpError(
        403,
        "A pilot registration code is required. Contact the farm administrator.",
      );
    const input = v.credentials.parse(req.body),
      id = randomUUID(),
      hash = await hashPassword(input.password);
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)",
        [id, input.email, hash],
      );
      await audit(tx, id, null, "ACCOUNT_CREATED", {});
    });
    await signIn(res, id);
    res.status(201).json({ id, email: input.email });
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const input = v.credentials.parse(req.body),
      row = (
        await db.query("SELECT * FROM users WHERE email=$1", [input.email])
      ).rows[0];
    const fallback = "a1b2c3d4e5f678901234567890abcdef:" + "00".repeat(64);
    const valid = await verifyPassword(
      input.password,
      row?.password_hash || fallback,
    );
    if (!row || !valid)
      throw new HttpError(401, "Email or password is incorrect");
    await signIn(res, row.id);
    res.json({ id: row.id, email: row.email });
  });
  app.post("/api/auth/logout", async (req, res) => {
    await db.query("DELETE FROM sessions WHERE id=$1", [
      digest(sessionToken(req)),
    ]);
    res.clearCookie("aqua_session", cookieOptions);
    res.json({ ok: true });
  });
  app.use("/api", async (req, _res, next) => {
    const row = (
      await db.query(
        "SELECT u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=$1 AND s.expires_at>now()",
        [digest(sessionToken(req))],
      )
    ).rows[0];
    if (!row) throw new HttpError(401, "Please sign in");
    (req as AuthRequest).userId = row.id;
    next();
  });
  const uid = (req: Request) => (req as AuthRequest).userId;
  app.get("/api/me", async (req, res) => {
    const user = (
      await db.query("SELECT id,email FROM users WHERE id=$1", [uid(req)])
    ).rows[0];
    res.json({
      ...user,
      demo: process.env.DEMO_MODE === "true",
      uploads:
        process.env.UPLOAD_DIR !== undefined ||
        process.env.NODE_ENV !== "production",
    });
  });
  app.get("/api/workspace", async (req, res) => {
    const farms = (
      await db.query(
        "SELECT f.* FROM farms f JOIN farm_members m ON m.farm_id=f.id WHERE m.user_id=$1 ORDER BY f.created_at",
        [uid(req)],
      )
    ).rows;
    const ponds = (
      await db.query(
        "SELECT p.* FROM ponds p JOIN farm_members m ON m.farm_id=p.farm_id WHERE m.user_id=$1 ORDER BY p.created_at",
        [uid(req)],
      )
    ).rows;
    const cycles = (
      await db.query(
        "SELECT c.* FROM culture_cycles c JOIN ponds p ON p.id=c.pond_id JOIN farm_members m ON m.farm_id=p.farm_id WHERE m.user_id=$1 ORDER BY c.created_at DESC",
        [uid(req)],
      )
    ).rows;
    res.json({ farms, ponds, cycles });
  });
  app.post("/api/farms", async (req, res) => {
    const data = v.farm.parse(req.body),
      id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.query("INSERT INTO farms(id,data) VALUES($1,$2)", [
        id,
        JSON.stringify(data),
      ]);
      await tx.query(
        "INSERT INTO farm_members(id,farm_id,user_id,role) VALUES($1,$2,$3,$4)",
        [randomUUID(), id, uid(req), "OWNER"],
      );
      await audit(tx, uid(req), id, "FARM_CREATED", { id });
    });
    res.status(201).json({ id, data });
  });
  app.post("/api/ponds", async (req, res) => {
    const data = v.pond.parse(req.body);
    await farmAccess(db, uid(req), data.farmId);
    const id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.query("INSERT INTO ponds(id,farm_id,data) VALUES($1,$2,$3)", [
        id,
        data.farmId,
        JSON.stringify(data),
      ]);
      await audit(tx, uid(req), data.farmId, "POND_CREATED", { id });
    });
    res.status(201).json({ id, data });
  });
  app.post("/api/cycles", async (req, res) => {
    const data = v.cycle.parse(req.body),
      pond = (await db.query("SELECT * FROM ponds WHERE id=$1", [data.pondId]))
        .rows[0];
    if (!pond) throw new HttpError(404, "Pond not found");
    await farmAccess(db, uid(req), pond.farm_id);
    const id = randomUUID();
    await db.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO culture_cycles(id,pond_id,data) VALUES($1,$2,$3)",
        [id, data.pondId, JSON.stringify(data)],
      );
      await insertRecord(
        tx,
        "event",
        id,
        uid(req),
        data.stockingDate,
        "USER_REPORTED",
        {
          kind: "Stocking",
          notes:
            "Stocked " +
            data.stocked.toLocaleString("en-IN") +
            " PL. " +
            data.notes,
        },
      );
      if (data.seedCost != null && data.seedCost > 0)
        await insertRecord(
          tx,
          "cost",
          id,
          uid(req),
          data.stockingDate,
          "USER_REPORTED",
          {
            category: "Seed",
            amountPaise: money(data.seedCost),
            note: "Initial seed cost",
          },
        );
      await audit(tx, uid(req), pond.farm_id, "CYCLE_CREATED", { id, data });
    });
    res.status(201).json({ id, data, doc: doc(data.stockingDate, today()) });
  });
  app.get("/api/cycles/:id", async (req, res) => {
    const id = v.id.parse(req.params.id),
      c = await authorize(db, uid(req), id),
      r = await records(db, id);
    const images = (
      await db.query(
        "SELECT id,record_id,data,'sample' AS kind FROM sampling_images WHERE cycle_id=$1 UNION ALL SELECT id,record_id,data,'event' AS kind FROM event_images WHERE cycle_id=$1",
        [id],
      )
    ).rows;
    res.json({ cycle: c, records: r, summary: summary(c, r), images });
  });
  app.post("/api/cycles/:id/completeness", async (req, res) => {
    const id = v.id.parse(req.params.id),
      c = await authorize(db, uid(req), id),
      input = v.completeness.parse(req.body);
    await db.transaction(async (tx) => {
      await tx.query("UPDATE culture_cycles SET data=$1 WHERE id=$2", [
        JSON.stringify({ ...c.data, ...input }),
        id,
      ]);
      await audit(tx, uid(req), c.farm_id, "COMPLETENESS_ATTESTED", {
        cycleId: id,
        before: c.data,
        after: input,
      });
    });
    res.json({ ok: true });
  });
  app.post("/api/cycles/:id/scenario-preview", async (req, res) => {
    const id = v.id.parse(req.params.id),
      c = await authorize(db, uid(req), id),
      input = v.scenario.parse(req.body);
    doc(c.data.stockingDate, input.date);
    const r = await records(db, id, input.date);
    res.json(computeScenario(c, r, input));
  });
  app.post("/api/cycles/:id/records/:kind", async (req, res) => {
    const cycleId = v.id.parse(req.params.id),
      c = await authorize(db, uid(req), cycleId),
      kind = req.params.kind as v.RecordKind;
    if (!Object.hasOwn(v.recordSchemas, kind))
      throw new HttpError(404, "Record type not found");
    const data: any = v.recordSchemas[kind].parse(req.body);
    doc(c.data.stockingDate, data.date);
    if (c.status === "CLOSED") {
      const last = (
        await db.query(
          "SELECT date FROM harvests WHERE cycle_id=$1 AND data->>'final'='true' ORDER BY date DESC LIMIT 1",
          [cycleId],
        )
      ).rows[0];
      if (last && data.date > last.date)
        throw new HttpError(
          422,
          "Record date is after final harvest. Start a new crop.",
        );
    }
    let payload = { ...data };
    let basis = "USER_REPORTED";
    if (kind === "sample" || kind === "water") basis = "MEASURED";
    if (kind === "assumption") basis = "USER_ASSUMED";
    if (kind === "cost") payload = { ...data, amountPaise: money(data.amount) };
    if (kind === "market") payload = { ...data, pricePaise: money(data.price) };
    if (kind === "harvest")
      payload = { ...data, pricePaise: money(data.price) };
    if (kind === "decision" && data.scenarioId) {
      const row = (
        await db.query(
          "SELECT id FROM harvest_scenarios WHERE id=$1 AND cycle_id=$2",
          [data.scenarioId, cycleId],
        )
      ).rows[0];
      if (!row)
        throw new HttpError(422, "Scenario does not belong to this crop");
    }
    if (kind === "scenario") {
      basis = "FORECAST";
      payload = computeScenario(c, await records(db, cycleId, data.date), data);
    }
    const result = await db.transaction(async (tx) => {
      const recordId = await insertRecord(
        tx,
        kind as TableKind,
        cycleId,
        uid(req),
        data.date,
        basis,
        payload,
      );
      if (kind === "daily" && data.feedKg != null) {
        await insertRecord(
          tx,
          "feed",
          cycleId,
          uid(req),
          data.date,
          "USER_REPORTED",
          { kg: data.feedKg, brand: data.brand, dailyLogId: recordId },
        );
      }
      if (kind === "daily" && data.feedCost != null && data.feedCost > 0)
        await insertRecord(
          tx,
          "cost",
          cycleId,
          uid(req),
          data.date,
          "USER_REPORTED",
          {
            amountPaise: money(data.feedCost),
            category: "Feed",
            note: "Daily feed expense; do not duplicate in cost ledger",
            dailyLogId: recordId,
          },
        );
      if (kind === "harvest" && data.final)
        await tx.query(
          "UPDATE culture_cycles SET status='CLOSED' WHERE id=$1",
          [cycleId],
        );
      await audit(tx, uid(req), c.farm_id, "RECORD_CREATED", {
        cycleId,
        kind,
        recordId,
      });
      return recordId;
    });
    res.status(201).json({ id: result, data: payload });
  });
  app.post(
    "/api/cycles/:id/decisions/:decisionId/outcome",
    async (req, res) => {
      const id = v.id.parse(req.params.id),
        decisionId = v.id.parse(req.params.decisionId),
        c = await authorize(db, uid(req), id),
        input = v.outcome.parse(req.body);
      doc(c.data.stockingDate, input.date);
      const d = (
        await db.query(
          "SELECT * FROM decision_records WHERE id=$1 AND cycle_id=$2",
          [decisionId, id],
        )
      ).rows[0];
      if (!d) throw new HttpError(404, "Decision not found");
      if (input.date < d.date)
        throw new HttpError(422, "Outcome cannot precede decision");
      await db.transaction(async (tx) => {
        await insertRecord(
          tx,
          "event",
          id,
          uid(req),
          input.date,
          "USER_REPORTED",
          { kind: "Decision outcome", notes: input.outcome, decisionId },
        );
        await audit(tx, uid(req), c.farm_id, "DECISION_OUTCOME_RECORDED", {
          decisionId,
          input,
        });
      });
      res.json({ ok: true });
    },
  );

  app.post("/api/cycles/:id/records/:kind/:recordId/void", async (req, res) => {
    const cycleId = v.id.parse(req.params.id),
      recordId = v.id.parse(req.params.recordId),
      c = await authorize(db, uid(req), cycleId),
      kind = req.params.kind as TableKind;
    if (
      !["daily", "sample", "cost", "market", "water", "assumption"].includes(
        kind,
      )
    )
      throw new HttpError(
        422,
        "This record type needs a clarification event rather than voiding",
      );
    const reason = v.event.parse({
      date: today(),
      kind: "Correction",
      notes: req.body.reason,
    }).notes;
    const row = (
      await db.query(
        "SELECT * FROM " + tables[kind] + " WHERE id=$1 AND cycle_id=$2",
        [recordId, cycleId],
      )
    ).rows[0];
    if (!row) throw new HttpError(404, "Record not found");
    if (row.data.voidedAt)
      throw new HttpError(409, "This record is already void");
    const stamp = new Date().toISOString(),
      patch = JSON.stringify({ voidedAt: stamp, voidReason: reason });
    await db.transaction(async (tx) => {
      await tx.query(
        "UPDATE " + tables[kind] + " SET data=data || $1::jsonb WHERE id=$2",
        [patch, recordId],
      );
      if (kind === "daily")
        for (const table of ["feed_records", "cost_records"])
          await tx.query(
            "UPDATE " +
              table +
              " SET data=data || $1::jsonb WHERE cycle_id=$2 AND data->>'dailyLogId'=$3",
            [patch, cycleId, recordId],
          );
      await insertRecord(
        tx,
        "event",
        cycleId,
        uid(req),
        today(),
        "USER_REPORTED",
        {
          kind: "Record correction",
          notes: reason,
          voidedRecordId: recordId,
          recordType: kind,
        },
      );
      await audit(tx, uid(req), c.farm_id, "RECORD_VOIDED", {
        cycleId,
        kind,
        recordId,
        reason,
        original: row.data,
      });
    });
    res.json({ ok: true });
  });
  app.get("/api/cycles/:id/export.csv", async (req, res) => {
    const id = v.id.parse(req.params.id),
      c = await authorize(db, uid(req), id);
    const r = await records(db, id, today(), true);
    if (Object.values(r).some((a) => a.length > 5000))
      throw new HttpError(
        422,
        "Export exceeds V0 limit. Contact administrator for a full database export.",
      );
    const linked = (
      await db.query(
        "SELECT id,record_id,data FROM sampling_images WHERE cycle_id=$1 UNION ALL SELECT id,record_id,data FROM event_images WHERE cycle_id=$1",
        [id],
      )
    ).rows;
    const rows = Object.entries(r).flatMap(([kind, rows]) =>
      rows.map((row) => ({
        schema_version: "1",
        record_type: kind,
        record_id: row.id,
        farm_id: c.farm_id,
        pond_id: c.pond_id,
        culture_cycle_id: id,
        species: c.data.species,
        stocking_date: c.data.stockingDate,
        date: row.date,
        doc: doc(c.data.stockingDate, row.date),
        basis: row.basis,
        data_origin:
          process.env.DEMO_MODE === "true"
            ? "SYNTHETIC"
            : "PRIVATE_FARM_RECORD",
        created_at: row.created_at,
        image_references: linked
          .filter((i) => i.record_id === row.id)
          .map((i) => ({
            id: i.id,
            sha256: i.data.sha256,
            category: i.data.category,
          })),
        ...row.data,
      })),
    );
    res
      .set(
        "Content-Disposition",
        'attachment; filename="aquaintel-cycle-' + id + '.csv"',
      )
      .type("text/csv")
      .send(csv(rows));
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 5 },
  });
  app.post(
    "/api/cycles/:id/images/:kind/:recordId",
    upload.single("image"),
    async (req, res) => {
      const cycleId = v.id.parse(req.params.id),
        c = await authorize(db, uid(req), cycleId),
        recordId = v.id.parse(req.params.recordId),
        kind = req.params.kind;
      if (kind !== "sample" && kind !== "event")
        throw new HttpError(422, "Link images to a sampling or event record");
      if (process.env.NODE_ENV === "production" && !process.env.UPLOAD_DIR)
        throw new HttpError(503, "Image storage is not configured");
      if (
        !(
          await db.query(
            "SELECT id FROM " + tables[kind] + " WHERE id=$1 AND cycle_id=$2",
            [recordId, cycleId],
          )
        ).rows.length
      )
        throw new HttpError(404, "Linked record not found");
      if (req.body.consent !== "true")
        throw new HttpError(422, "Confirm permission to store this photo");
      const file = req.file;
      if (!file) throw new HttpError(422, "Choose a JPEG or PNG image");
      const png = file.buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        jpeg =
          file.buffer[0] === 255 &&
          file.buffer[1] === 216 &&
          file.buffer[2] === 255;
      if (!png && !jpeg)
        throw new HttpError(
          422,
          "Only genuine JPEG and PNG files are accepted",
        );
      try {
        await sharp(file.buffer, { limitInputPixels: 40000000 }).stats();
      } catch {
        throw new HttpError(
          422,
          "Image is damaged or exceeds the 40-megapixel limit",
        );
      }
      const id = randomUUID(),
        directory = resolve(process.env.UPLOAD_DIR || ".local/uploads");
      await mkdir(directory, { recursive: true });
      await writeFile(resolve(directory, id), file.buffer, { flag: "wx" });
      const data = {
        category: ["Shrimp", "Feed tray", "Pond", "Event"].includes(
          req.body.category,
        )
          ? req.body.category
          : "Shrimp",
        mime: png ? "image/png" : "image/jpeg",
        size: file.size,
        sha256: createHash("sha256").update(file.buffer).digest("hex"),
        consent: true,
        original: true,
      };
      await db.transaction(async (tx) => {
        await tx.query(
          "INSERT INTO " +
            (kind === "sample" ? "sampling_images" : "event_images") +
            "(id,cycle_id,record_id,data) VALUES($1,$2,$3,$4)",
          [id, cycleId, recordId, JSON.stringify(data)],
        );
        await audit(tx, uid(req), c.farm_id, "IMAGE_UPLOADED", {
          id,
          recordId,
        });
      });
      res.status(201).json({ id, data });
    },
  );
  app.get("/api/images/:id", async (req, res) => {
    const id = v.id.parse(req.params.id),
      row = (
        await db.query(
          "SELECT * FROM sampling_images WHERE id=$1 UNION ALL SELECT * FROM event_images WHERE id=$1",
          [id],
        )
      ).rows[0];
    if (!row) throw new HttpError(404, "Image not found");
    await authorize(db, uid(req), row.cycle_id);
    res
      .set(
        "Content-Disposition",
        'inline; filename="' +
          id +
          (row.data.mime === "image/png" ? ".png" : ".jpg") +
          '"',
      )
      .type(row.data.mime)
      .send(
        await readFile(resolve(process.env.UPLOAD_DIR || ".local/uploads", id)),
      );
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found" }),
  );
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof DomainError)
      return res.status(422).json({ error: err.message });
    if (err instanceof ZodError)
      return res
        .status(422)
        .json({
          error: err.issues
            .map(
              (i) =>
                (i.path.join(".") ? i.path.join(".") + ": " : "") + i.message,
            )
            .join("; "),
        });
    if (err instanceof HttpError)
      return res.status(err.status).json({ error: err.message });
    if (err.code === "23505")
      return res
        .status(409)
        .json({
          error:
            "This record already exists. Daily logs are one per day; a pond can have only one active crop.",
        });
    if (err instanceof multer.MulterError)
      return res
        .status(422)
        .json({ error: "Upload failed. Use a JPEG/PNG smaller than 10 MB." });
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ error: "Invalid JSON" });
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Request is too large" });
    console.error("Request failed", {
      name: err.name,
      code: err.code,
      message: process.env.NODE_ENV === "production" ? "Redacted" : err.message,
    });
    return res
      .status(500)
      .json({
        error:
          "The record could not be saved or loaded. Please retry. Your form has been kept.",
      });
  });
  return app;
}
