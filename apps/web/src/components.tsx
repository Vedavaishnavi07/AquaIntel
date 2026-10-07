import { useState } from "react";
import { Waves, X, ArrowRight, ShieldCheck } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { post, api } from "./api";
export const num = (n: number | null | undefined, d = 1) =>
  n == null ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: d });
export const rs = (p: number | null | undefined) =>
  p == null ? "—" : "₹" + num(p / 100, 0);
export const dateText = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function Basis({ value = "UNKNOWN" }: { value?: string }) {
  return (
    <span className={"basis " + value.toLowerCase()}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Waves size={30} />
      <h3>{title}</h3>
      <p>
        {children ||
          "Start with what you know. Missing history can be added later."}
      </p>
      {action}
    </div>
  );
}
export function Metric({
  label,
  value,
  unit,
  basis,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  basis?: string;
  note: string;
  icon: any;
}) {
  return (
    <article className="metric">
      <div className="metric-label">
        {label}
        <Icon size={19} />
      </div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <div className="metric-foot">
        <Basis value={basis} />
        <small>{note}</small>
      </div>
    </article>
  );
}
export function GrowthChart({ samples }: { samples: any[] }) {
  return samples.length ? (
    <div
      className="chart"
      role="img"
      aria-label={
        "Measured ABW: " +
        samples
          .map((s) => dateText(s.date) + " " + num(s.abw) + " grams")
          .join(", ")
      }
    >
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart
          data={samples.map((s) => ({
            date: s.date,
            abw: Number(s.abw.toFixed(2)),
          }))}
          margin={{ top: 15, right: 10, bottom: 0, left: -18 }}
        >
          <defs>
            <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9480" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#0d9480" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 5"
            vertical={false}
            stroke="#dce7e5"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(d) =>
              new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })
            }
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            unit="g"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(value) => [value + " g", "Measured ABW"]} />
          <Area
            isAnimationActive={false}
            type="linear"
            dataKey="abw"
            stroke="#078371"
            strokeWidth={3}
            fill="url(#growthFill)"
            dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <Empty title="Your growth story starts with a sample" />
  );
}
export function Login({ done }: { done: () => void }) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      await post("/auth/" + (register ? "register" : "login"), data);
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <Waves />
          </span>
          AquaIntel
        </div>
        <div>
          <span className="eyebrow">SHRIMP FARM INTELLIGENCE</span>
          <h1>
            Know your crop.
            <br />
            Make every day count.
          </h1>
          <p>
            Measured growth. Clear costs.
            <br />
            Harvest scenarios you can understand.
          </p>
          <div className="story-line">
            <ShieldCheck /> Your farm’s records stay private.
          </div>
        </div>
        <small>Built for the realities of a working shrimp farm.</small>
      </section>
      <section className="login-form">
        <div className="mobile-brand">
          <Waves /> AquaIntel
        </div>
        <span className="eyebrow">YOUR FARM WORKSPACE</span>
        <h2>{register ? "Let’s start with your account" : "Welcome back"}</h2>
        <p className="muted">
          {register
            ? "Create an account, then add your farm and existing crop."
            : "Sign in to pick up where you left off."}
        </p>
        <form onSubmit={submit}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              minLength={12}
              maxLength={128}
              required
            />
            <small>At least 12 characters.</small>
          </label>
          {register && (
            <label>
              Pilot registration code
              <input name="registrationCode" autoComplete="off" />
              <small>Required on the deployed pilot. Optional locally.</small>
            </label>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="wide" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>
        <button
          className="text-button wide"
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register
            ? "Already have an account? Sign in"
            : "New to AquaIntel? Create an account"}
        </button>
        <p className="login-note">
          Your first crop can already be in progress.
          <br />
          Complete past records are not required to begin.
        </p>
      </section>
    </main>
  );
}
export function ImagePanel({
  target,
  cycleId,
  images,
  close,
  refresh,
}: {
  target: any;
  cycleId: string;
  images: any[];
  close: () => void;
  refresh: () => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      data = new FormData(form),
      files = data.getAll("images") as File[];
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      let count = 0;
      for (const file of files) {
        const body = new FormData();
        body.set("image", file);
        body.set("consent", "true");
        body.set("category", String(data.get("category")));
        await api(
          "/cycles/" + cycleId + "/images/" + target.kind + "/" + target.id,
          { method: "POST", body },
        );
        count++;
        setSuccess(count + " photo(s) saved.");
      }
      await refresh();
      form.reset();
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Linked photos"
      >
        <header>
          <h2>Photos & ground truth</h2>
          <button
            autoFocus
            className="icon-button"
            onClick={close}
            aria-label="Close photos"
          >
            <X />
          </button>
        </header>
        <p className="muted">
          Original JPEG/PNG files are stored privately, linked to this{" "}
          {target.kind === "sample" ? "weighed sample" : "event"}. No image
          analysis is performed.
        </p>
        <div className="image-grid">
          {images
            .filter((i) => i.record_id === target.id)
            .map((i) => (
              <a
                key={i.id}
                href={"/api/images/" + i.id}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  loading="lazy"
                  src={"/api/images/" + i.id}
                  alt={i.data.category + " linked to farm record"}
                />
              </a>
            ))}
        </div>
        <form onSubmit={submit}>
          <label>
            Category
            <select name="category">
              <option>Shrimp</option>
              <option>Feed tray</option>
              <option>Pond</option>
              <option>Event</option>
            </select>
          </label>
          <label>
            Add photos (10 MB each)
            <input
              name="images"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              required
            />
          </label>
          <label className="checkbox">
            <input type="checkbox" required />I have permission to store these
            photos. Avoid people and private location details.
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {success && <p role="status">{success}</p>}
          <button disabled={busy}>
            {busy ? "Uploading…" : "Upload originals"}
          </button>
        </form>
      </section>
    </div>
  );
}
