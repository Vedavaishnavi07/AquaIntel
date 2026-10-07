import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import type { Request } from "express";
const scrypt = promisify(scryptCallback);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return salt + ":" + hash.toString("hex");
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hex] = stored.split(":");
  const expected = Buffer.from(hex, "hex");
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const token = () => randomBytes(32).toString("hex");
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const sessionToken = (req: Request) =>
  (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("aqua_session="))
    ?.slice(13) || "";
