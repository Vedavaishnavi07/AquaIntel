import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Waves,
  House,
  Layers,
  Clock3,
  Store,
  Menu,
  Plus,
  ArrowUpRight,
  ChevronDown,
  Scale,
  Utensils,
  IndianRupee,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Download,
  Camera,
  ShieldCheck,
  Leaf,
  WifiOff,
} from "lucide-react";
import { api, post } from "./api";
import { en } from "./strings";
import { today, doc } from "../../../packages/domain/index";
import {
  Basis,
  Empty,
  Metric,
  GrowthChart,
  Login,
  ImagePanel,
  num,
  rs,
  dateText,
} from "./components";
import { RecordForm } from "./forms";
import { HarvestPanel } from "./harvest";
import { Timeline } from "./timeline";
import "./style.css";
const icons = [House, Layers, Clock3, Store, Menu];
function App() {
  const [user, setUser] = useState<any>(null),
    [workspace, setWorkspace] = useState<any>(null),
    [data, setData] = useState<any>(null),
    [cycleId, setCycleId] = useState(""),
    [nav, setNav] = useState("Home"),
    [tab, setTab] = useState("Today"),
    [modal, setModal] = useState<any>(null),
    [imageTarget, setImageTarget] = useState<any>(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [loading, setLoading] = useState(true),
    [online, setOnline] = useState(navigator.onLine);
  async function load() {
    setError("");
    try {
      const me = await api("/me");
      setUser(me);
      const w = await api("/workspace");
      setWorkspace(w);
      setCycleId((prev) =>
        w.cycles.some((c: any) => c.id === prev) ? prev : w.cycles[0]?.id || "",
      );
    } catch (e) {
      if ((e as Error).message === "Please sign in") setUser(null);
      else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function refresh() {
    if (cycleId) setData(await api("/cycles/" + cycleId));
    await load();
  }
  useEffect(() => {
    void load();
    const off = () => setOnline(false),
      on = () => setOnline(true);
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => {
      window.removeEventListener("offline", off);
      window.removeEventListener("online", on);
    };
  }, []);
  useEffect(() => {
    if (!cycleId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setData(null);
    api("/cycles/" + cycleId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [cycleId]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!modal && !imageTarget) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setImageTarget(null);
      }
      if (e.key === "Tab") {
        const items = document
          .querySelector('[role="dialog"]')
          ?.querySelectorAll<HTMLElement>(
            "button:not([disabled]),input,select,textarea,a[href]",
          );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [modal, imageTarget]);
  async function save(values: any) {
    let path = "",
      payload = values;
    const kind = modal.kind;
    if (kind === "farm") path = "/farms";
    else if (kind === "pond") {
      path = "/ponds";
      payload = { ...values, farmId: modal.farmId || workspace.farms[0].id };
    } else if (kind === "cycle") {
      path = "/cycles";
      payload = { ...values, pondId: modal.pondId || workspace.ponds[0].id };
    } else if (kind === "completeness")
      path = "/cycles/" + cycleId + "/completeness";
    else if (kind === "void")
      path =
        "/cycles/" +
        cycleId +
        "/records/" +
        modal.recordKind +
        "/" +
        modal.recordId +
        "/void";
    else if (kind === "outcome")
      path =
        "/cycles/" + cycleId + "/decisions/" + modal.decisionId + "/outcome";
    else {
      path = "/cycles/" + cycleId + "/records/" + kind;
      if (kind === "decision")
        payload = { ...values, scenarioId: modal.scenarioId || null };
    }
    const r = await post(path, payload);
    setModal(null);
    setToast("Saved. Your farm record is up to date.");
    await refresh();
    if (kind === "cycle") setCycleId(r.id);
  }
  const open = (kind: string, extra: any = {}) => setModal({ kind, ...extra });
  const currentPond = workspace?.ponds.find(
      (p: any) => p.id === data?.cycle.pond_id,
    ),
    farm =
      workspace?.farms.find((f: any) => f.id === currentPond?.farm_id) ||
      workspace?.farms[0],
    s = data?.summary,
    r = data?.records;
  if (loading)
    return (
      <div className="loading">
        <Waves />
        <p>Opening your farm workspace…</p>
      </div>
    );
  if (!user)
    return (
      <>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Login
          done={() => {
            setLoading(true);
            void load();
          }}
        />
      </>
    );
  const add = (kind: string, label: string) => (
    <button onClick={() => open(kind)}>
      <Plus size={18} />
      {label}
    </button>
  );
  function navigate(name: string) {
    setNav(name);
    if (name === "Home" || name === "Ponds") setTab("Today");
  }
  const timeline = () => (
    <Timeline
      data={data}
      open={open}
      photos={setImageTarget}
      uploads={user.uploads}
    />
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("Home");
          }}
        >
          <span className="brand-icon">
            <Waves />
          </span>
          AquaIntel
        </a>
        <div className="workspace-label">FARM WORKSPACE</div>
        <nav>
          {en.nav.map((name, i) => {
            const Icon = icons[i];
            return (
              <button
                className={nav === name ? "active" : ""}
                onClick={() => navigate(name)}
                key={name}
              >
                <Icon size={20} />
                {name}
                {nav === name && <span className="nav-indicator" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="pilot-badge">
            <Leaf size={20} />
            <div>
              {user.demo ? "Synthetic demo" : "Farm pilot"}
              <small>Litopenaeus vannamei</small>
            </div>
          </div>
          <button
            onClick={async () => {
              await post("/auth/logout", {});
              setUser(null);
              setData(null);
              setWorkspace(null);
              setCycleId("");
            }}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <span className="mobile-logo">
              <Waves />
            </span>
            <span>
              {farm?.data.name || "Your farm"}
              <small>{farm?.data.location || "Private farm workspace"}</small>
            </span>
          </div>
          <div className="topbar-right">
            <span className="today-date">
              <CalendarDays size={16} />
              {dateText(today())}
            </span>
            <span className="avatar" title={user.email}>
              {user.email[0].toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main-content">
          {user.demo && (
            <div className="demo-banner">
              <ShieldCheck size={17} />
              DEMO · Synthetic records. No real farmer data or validated
              business results.
            </div>
          )}
          {!online && (
            <div role="status" className="notice">
              <WifiOff size={18} />
              You’re offline. Keep the form open and reconnect before saving.
            </div>
          )}
          {toast && (
            <div role="status" className="toast">
              <CheckCircle2 size={18} />
              {toast}
            </div>
          )}
          {error && (
            <div role="alert" className="error">
              {error}
              <button
                className="text-button"
                onClick={() => void refresh().catch((e) => setError(e.message))}
              >
                Retry
              </button>
            </div>
          )}
          {!workspace?.farms.length ? (
            <section className="onboarding panel">
              <span className="eyebrow">WELCOME TO AQUAINTEL</span>
              <h1>Your farm. A clearer picture.</h1>
              <p>
                Add your farm, pond, and current crop. Start with today’s feed
                and your latest weighed sample.
              </p>
              <ol>
                <li>Create your private farm workspace</li>
                <li>Add a pond and its original stocking date</li>
                <li>Start tracking today; backfill when you can</li>
              </ol>
              {add("farm", "Create my farm")}
            </section>
          ) : !workspace?.ponds.length ? (
            <Empty
              title="Add your first pond"
              action={add("pond", "Add pond")}
            />
          ) : !workspace?.cycles.length ? (
            <Empty
              title="Start tracking an existing crop"
              action={
                <button
                  onClick={() =>
                    open("cycle", { pondId: workspace.ponds[0].id })
                  }
                >
                  Add current crop
                </button>
              }
            >
              Use its original stocking date. Missing past records are allowed.
            </Empty>
          ) : !data ? (
            <div className="loading">
              <Waves />
              <p>Loading crop records…</p>
            </div>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {nav === "Home"
                      ? "YOUR DAILY POND CHECK"
                      : nav === "Market"
                        ? "MANUAL BUYER QUOTES"
                        : "FARM WORKSPACE"}
                  </span>
                  <h1>
                    {nav === "Home"
                      ? "Your crop, at a glance."
                      : nav === "Ponds"
                        ? "Ponds & culture cycles"
                        : nav === "Timeline"
                          ? "Every change, in context."
                          : nav === "Market"
                            ? "Know your market."
                            : "Your farm toolkit"}
                  </h1>
                </div>
                <label className="cycle-picker">
                  <span className="sr-only">Selected pond and crop</span>
                  <Layers size={18} />
                  <select
                    aria-label="Selected pond and crop"
                    value={cycleId}
                    onChange={(e) => setCycleId(e.target.value)}
                  >
                    {workspace.cycles.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {
                          workspace.ponds.find((p: any) => p.id === c.pond_id)
                            ?.data.name
                        }{" "}
                        ·{" "}
                        {c.status === "ACTIVE"
                          ? "DOC " + doc(c.data.stockingDate, today())
                          : "Closed"}{" "}
                        · {c.data.stockingDate}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>
              </div>
              {(nav === "Home" || nav === "Ponds") && (
                <div className="mobile-quick-entry">
                  <button onClick={() => open("daily")}>
                    <Utensils size={18} />
                    Log today’s feed
                  </button>
                </div>
              )}
              {nav === "Ponds" && (
                <section className="panel">
                  <div className="section-heading">
                    <h2>Your ponds</h2>
                    <div className="actions">
                      {add("farm", "Add farm")}
                      <button onClick={() => open("pond", { farmId: farm.id })}>
                        <Plus size={18} />
                        Add pond
                      </button>
                    </div>
                  </div>
                  <div className="actions farm-actions">
                    {workspace.farms.map((f: any) => (
                      <button
                        className="secondary"
                        key={f.id}
                        onClick={() => open("pond", { farmId: f.id })}
                      >
                        Add pond to {f.data.name}
                      </button>
                    ))}
                  </div>
                  <div className="pond-grid">
                    {workspace.ponds.map((p: any) => (
                      <article className="pond-card" key={p.id}>
                        <Waves />
                        <h3>{p.data.name}</h3>
                        <p>
                          {num(p.data.areaAcres)} acres ·{" "}
                          {
                            workspace.farms.find((f: any) => f.id === p.farm_id)
                              ?.data.name
                          }
                        </p>
                        {workspace.cycles.some(
                          (c: any) =>
                            c.pond_id === p.id && c.status === "ACTIVE",
                        ) ? (
                          <button
                            className="secondary"
                            onClick={() =>
                              setCycleId(
                                workspace.cycles.find(
                                  (c: any) =>
                                    c.pond_id === p.id && c.status === "ACTIVE",
                                ).id,
                              )
                            }
                          >
                            Open active crop
                          </button>
                        ) : (
                          <button
                            onClick={() => open("cycle", { pondId: p.id })}
                          >
                            Add current crop
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {(nav === "Home" || nav === "Ponds") && (
                <>
                  <section className="crop-banner">
                    <div>
                      <span className="crop-status">
                        {data.cycle.status === "ACTIVE"
                          ? "ACTIVE CULTURE"
                          : "CLOSED CULTURE"}{" "}
                        · VANNAMEI
                      </span>
                      <h2>
                        {currentPond?.data.name}
                        <span>{num(currentPond?.data.areaAcres)} acres</span>
                      </h2>
                      <p>
                        Stocked {dateText(data.cycle.data.stockingDate)} ·{" "}
                        {num(data.cycle.data.stocked, 0)} PL{" "}
                        <Basis value="USER_REPORTED" />
                      </p>
                    </div>
                    <div className="doc-display">
                      <span>DAY OF CULTURE</span>
                      <strong>{s.doc}</strong>
                      <small>days since stocking</small>
                    </div>
                  </section>
                  <div
                    className="tabs"
                    role="navigation"
                    aria-label="Crop sections"
                  >
                    {en.tabs.map((t) => (
                      <button
                        className={tab === t ? "active" : ""}
                        key={t}
                        onClick={() => setTab(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {tab === "Today" && (
                    <>
                      <div className="metrics">
                        <Metric
                          label="Latest average weight"
                          value={num(s.latest?.abw)}
                          unit="g"
                          basis="DERIVED"
                          icon={Scale}
                          note={
                            s.latest
                              ? "Weighed sample · " + dateText(s.latest.date)
                              : "Add your first sample"
                          }
                        />
                        <Metric
                          label="Current count"
                          value={num(s.latest?.countPerKg)}
                          unit="/kg"
                          basis="DERIVED"
                          icon={Waves}
                          note="1,000 ÷ measured ABW"
                        />
                        <Metric
                          label="Feed recorded"
                          value={num(s.feedKg)}
                          unit="kg"
                          basis="USER_REPORTED"
                          icon={Utensils}
                          note={
                            data.cycle.data.feedComplete
                              ? "History attested complete"
                              : "Partial history may be missing"
                          }
                        />
                        <Metric
                          label="Total recorded costs"
                          value={rs(s.costPaise)}
                          basis="USER_REPORTED"
                          icon={IndianRupee}
                          note={
                            data.cycle.data.costsComplete
                              ? "History attested complete"
                              : "Unrecorded costs are excluded"
                          }
                        />
                      </div>
                      <div className="dashboard-grid">
                        <section className="panel">
                          <div className="section-heading">
                            <div>
                              <h2>Growth, measured.</h2>
                              <p className="muted">
                                One sampling observation at a time.
                              </p>
                            </div>
                            <button
                              className="text-button"
                              onClick={() => setTab("Growth")}
                            >
                              View growth
                              <ArrowUpRight size={16} />
                            </button>
                          </div>
                          <GrowthChart samples={s.samples} />
                          <div className="growth-footer">
                            <span>
                              Recent daily growth{" "}
                              <strong>{num(s.growth?.daily, 3)} g/day</strong>
                            </span>
                            <span>
                              Between sample dates <Basis value="DERIVED" />
                            </span>
                          </div>
                        </section>
                        <section className="panel quick-panel">
                          <span className="eyebrow">
                            SMALL RECORDS. BETTER DECISIONS.
                          </span>
                          <h2>What happened today?</h2>
                          <button onClick={() => open("daily")}>
                            <Utensils size={21} />
                            <span>
                              Log today’s feed
                              <small>Feed total & quick observations</small>
                            </span>
                            <Plus size={20} />
                          </button>
                          <button
                            className="secondary"
                            onClick={() => open("sample")}
                          >
                            <Scale size={21} />
                            <span>
                              Add a sampling
                              <small>Count, weigh, track growth</small>
                            </span>
                            <Plus size={20} />
                          </button>
                          <button
                            className="secondary"
                            onClick={() => open("event")}
                          >
                            <Clock3 size={21} />
                            <span>
                              Log a crop event
                              <small>Rain, power, behavior & more</small>
                            </span>
                            <Plus size={20} />
                          </button>
                          <p className="fineprint">
                            A blank is unknown, never a zero.
                          </p>
                        </section>
                      </div>
                      <div className="dashboard-grid">
                        <section className="panel">
                          <div className="section-heading">
                            <h2>Needs your attention</h2>
                            <span className="count-badge">
                              {s.warnings.length}
                            </span>
                          </div>
                          {s.warnings.length ? (
                            <ul className="attention-list">
                              {s.warnings.map((w: string) => (
                                <li key={w}>
                                  <AlertTriangle size={17} />
                                  {w}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="muted">
                              No record reminders. This is not a pond health
                              assessment.
                            </p>
                          )}
                        </section>
                        <section className="panel">
                          <div className="section-heading">
                            <h2>Biomass & feed efficiency</h2>
                            <button
                              className="text-button"
                              onClick={() => open("assumption")}
                            >
                              Set survival
                            </button>
                          </div>
                          <div className="biomass-line">
                            <strong>
                              {num(s.biomass?.base, 0)}
                              <small> kg</small>
                            </strong>
                            <Basis value="USER_ASSUMED" />
                          </div>
                          <p>
                            {s.biomass
                              ? "Low " +
                                num(s.biomass.low, 0) +
                                " · Base " +
                                num(s.biomass.base, 0) +
                                " · High " +
                                num(s.biomass.high, 0) +
                                " kg"
                              : "Needs sampling and a survival assumption."}
                          </p>
                          <p className="muted">
                            Biomass at the latest sample date, not today’s
                            measured stock. Survival{" "}
                            {s.assumption
                              ? num(s.assumption.low) +
                                "–" +
                                num(s.assumption.high) +
                                "%"
                              : "unknown"}
                            .
                          </p>
                          <div className="growth-footer">
                            <span>Estimated FCR</span>
                            <strong>{num(s.fcr, 2)}</strong>
                          </div>
                          <small>
                            Feed through the latest sample date ÷ biomass gain.
                            Requires complete feed and initial biomass; assumes
                            survival.
                          </small>
                        </section>
                      </div>
                    </>
                  )}

                  {tab === "Sampling" && (
                    <section className="panel">
                      <div className="section-heading">
                        <div>
                          <h2>Sampling & ground truth</h2>
                          <p className="muted">
                            Keep raw measured inputs. Link original photos after
                            saving.
                          </p>
                        </div>
                        {add("sample", "Add sampling")}
                      </div>
                      {s.samples.length ? (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Date / DOC</th>
                                <th>Sample count</th>
                                <th>Total weight</th>
                                <th>ABW</th>
                                <th>Count/kg</th>
                                <th>Photos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.samples
                                .slice()
                                .reverse()
                                .map((x: any) => (
                                  <tr key={x.id}>
                                    <td>
                                      {dateText(x.date)}
                                      <small>
                                        DOC{" "}
                                        {doc(
                                          data.cycle.data.stockingDate,
                                          x.date,
                                        )}
                                      </small>
                                    </td>
                                    <td>
                                      {num(x.data.count, 0)}
                                      <Basis value="MEASURED" />
                                    </td>
                                    <td>{num(x.data.weightG)} g</td>
                                    <td>
                                      {num(x.abw, 2)} g<Basis value="DERIVED" />
                                    </td>
                                    <td>{num(x.countPerKg, 1)}</td>
                                    <td>
                                      {user.uploads ? (
                                        <button
                                          className="secondary"
                                          onClick={() =>
                                            setImageTarget({
                                              kind: "sample",
                                              id: x.id,
                                            })
                                          }
                                        >
                                          <Camera size={17} />
                                          {
                                            data.images.filter(
                                              (i: any) => i.record_id === x.id,
                                            ).length
                                          }{" "}
                                          photos
                                        </button>
                                      ) : (
                                        <span>Storage not configured</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <Empty title="Add your first weighed sample" />
                      )}
                      <p className="notice">
                        Protocol: representative locations → photograph with
                        reference → count → tare scale and weigh → save raw
                        count/weight and original photos.
                      </p>
                    </section>
                  )}
                  {tab === "Growth" && (
                    <section className="panel">
                      <div className="section-heading">
                        <h2>Measured growth history</h2>
                        {add("sample", "Add sampling")}
                      </div>
                      <GrowthChart samples={s.samples} />
                      <div className="metrics">
                        <Metric
                          label="ABW change"
                          value={num(s.growth?.change, 2)}
                          unit="g"
                          basis="DERIVED"
                          icon={Scale}
                          note="Last two distinct sample dates"
                        />
                        <Metric
                          label="Daily growth"
                          value={num(s.growth?.daily, 3)}
                          unit="g/day"
                          basis="DERIVED"
                          icon={Leaf}
                          note="Weight change ÷ elapsed days"
                        />
                        <Metric
                          label="Count change"
                          value={num(s.growth?.countChange, 2)}
                          unit="/kg"
                          basis="DERIVED"
                          icon={Waves}
                          note="Latest minus previous count"
                        />
                        <Metric
                          label="Sample interval"
                          value={num(s.growth?.days, 0)}
                          unit="days"
                          basis="DERIVED"
                          icon={CalendarDays}
                          note="No forecast without a basis"
                        />
                      </div>
                      <p className="notice">
                        The chart connects measured samples, not continuous
                        measurements. Deterministic projections are in Harvest
                        scenarios.
                      </p>
                    </section>
                  )}
                  {tab === "Costs" && (
                    <section className="panel">
                      <div className="section-heading">
                        <div>
                          <h2>Cost ledger</h2>
                          <p className="muted">
                            {currentPond?.data.name} · {rs(s.costPaise)}{" "}
                            recorded
                          </p>
                        </div>
                        {add("cost", "Add expense")}
                      </div>
                      <div className="cost-categories">
                        {Object.entries(s.costByCategory).map(
                          ([key, value]) => (
                            <div key={key}>
                              <span>{key}</span>
                              <strong>{rs(value as number)}</strong>
                            </div>
                          ),
                        )}
                      </div>
                      {r.cost.length ? (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.cost
                                .slice()
                                .reverse()
                                .map((c: any) => (
                                  <tr key={c.id}>
                                    <td>{dateText(c.date)}</td>
                                    <td>{c.data.category}</td>
                                    <td>{c.data.note || "—"}</td>
                                    <td>{rs(c.data.amountPaise)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <Empty title="No expenses recorded" />
                      )}
                      <p className="notice">
                        {data.cycle.data.costsComplete
                          ? "Cost history attested complete."
                          : "Recorded costs are not complete crop costs."}{" "}
                        Switch crop to review another pond/cycle.
                      </p>
                    </section>
                  )}
                  {tab === "Harvest" && (
                    <HarvestPanel
                      key={cycleId}
                      data={data}
                      cycleId={cycleId}
                      onSaved={refresh}
                      onDecision={(id) => open("decision", { scenarioId: id })}
                    />
                  )}
                  {tab === "History" && timeline()}
                </>
              )}
              {nav === "Timeline" && timeline()}
              {nav === "Market" && (
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <h2>Price book</h2>
                      <p className="muted">
                        Vannamei · Manual quotes · Selected crop
                      </p>
                    </div>
                    {add("market", "Add price")}
                  </div>
                  {r.market.length ? (
                    <div className="price-grid">
                      {r.market
                        .slice()
                        .reverse()
                        .map((m: any) => (
                          <article className="price-card" key={m.id}>
                            <div>
                              <span className="eyebrow">
                                {num(m.data.countPerKg)} COUNT / KG
                              </span>
                              <Basis value="USER_REPORTED" />
                            </div>
                            <h3>
                              {rs(m.data.pricePaise)}
                              <small>/kg</small>
                            </h3>
                            <p>{m.data.location}</p>
                            <small>
                              {dateText(m.date)} · Source: {m.data.source}
                            </small>
                            <p className="muted">{m.data.note}</p>
                          </article>
                        ))}
                    </div>
                  ) : (
                    <Empty title="No market quotes yet">
                      Add the buyer’s quoted size, price, source and date. No
                      invented live prices.
                    </Empty>
                  )}
                </section>
              )}
              {nav === "More" && (
                <>
                  <section className="panel">
                    <h2>Records & farm tools</h2>
                    <div className="tool-grid">
                      <button
                        className="secondary"
                        onClick={() => open("water")}
                      >
                        Add instrument / lab reading
                      </button>
                      <button
                        className="secondary"
                        onClick={() => open("assumption")}
                      >
                        Set survival assumptions
                      </button>
                      <button
                        className="secondary"
                        onClick={() => open("decision")}
                      >
                        Log a farmer decision
                      </button>
                      <button
                        className="secondary"
                        onClick={() => open("harvest")}
                      >
                        Record actual harvest
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          open("completeness", { initial: data.cycle.data })
                        }
                      >
                        Review history completeness
                      </button>
                      <a
                        className="button secondary"
                        href={"/api/cycles/" + cycleId + "/export.csv"}
                      >
                        <Download size={18} />
                        Export crop records (CSV)
                      </a>
                      <button
                        className="secondary"
                        onClick={() => window.print()}
                      >
                        Print crop summary
                      </button>
                      <button
                        className="secondary"
                        onClick={() => open("event")}
                      >
                        Record a correction / event
                      </button>
                      <button
                        className="secondary"
                        onClick={async () => {
                          try {
                            await post("/auth/logout", {});
                            setUser(null);
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  </section>
                  <section className="panel">
                    <h2>What the numbers mean</h2>
                    <div className="provenance-list">
                      {[
                        [
                          "MEASURED",
                          "Scale, instrument or lab. Sampling still has uncertainty.",
                        ],
                        [
                          "USER_REPORTED",
                          "Entered by the farmer; not independently verified.",
                        ],
                        [
                          "USER_ASSUMED",
                          "An explicit assumption, including current survival.",
                        ],
                        [
                          "DERIVED",
                          "A transparent calculation from recorded inputs.",
                        ],
                        [
                          "FORECAST",
                          "An uncertain scenario, never a guarantee.",
                        ],
                        [
                          "EXTERNAL",
                          "Attributed external source. No live integration in V0.",
                        ],
                        [
                          "UNKNOWN",
                          "Missing or not known. Never silently converted to zero.",
                        ],
                      ].map(([basis, text]) => (
                        <p key={basis}>
                          <Basis value={basis} />
                          {text}
                        </p>
                      ))}
                    </div>
                    <p className="notice">
                      No disease diagnosis, image weight estimation,
                      water-quality inference, or production ML is present.
                    </p>
                  </section>
                  <section className="panel">
                    <h2>Crop summary</h2>
                    <p>
                      {farm?.data.name} · {currentPond?.data.name} · Stocked{" "}
                      {dateText(data.cycle.data.stockingDate)}
                    </p>
                    <p>
                      DOC {s.doc} · Latest ABW {num(s.latest?.abw)} g · Recorded
                      feed {num(s.feedKg)} kg · Recorded cost {rs(s.costPaise)}
                    </p>
                    <p>
                      History: feed{" "}
                      {data.cycle.data.feedComplete
                        ? "complete (user attested)"
                        : "incomplete"}
                      ; costs{" "}
                      {data.cycle.data.costsComplete
                        ? "complete (user attested)"
                        : "incomplete"}
                      .
                    </p>
                  </section>
                </>
              )}
            </>
          )}
          <footer className="app-footer">
            <span>
              <ShieldCheck size={15} />
              Transparent inputs. Farmer-led decisions.
            </span>
            <span>AquaIntel · Pilot v0.1</span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Main navigation">
        {en.nav.map((name, i) => {
          const Icon = icons[i];
          return (
            <button
              key={name}
              className={nav === name ? "active" : ""}
              onClick={() => navigate(name)}
            >
              <Icon size={21} />
              {name}
            </button>
          );
        })}
      </nav>
      {modal && (
        <RecordForm
          key={modal.kind}
          kind={modal.kind}
          initial={modal.initial}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}{" "}
      {imageTarget && (
        <ImagePanel
          target={imageTarget}
          cycleId={cycleId}
          images={data.images}
          close={() => setImageTarget(null)}
          refresh={refresh}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register("/sw.js").catch(() => {});
