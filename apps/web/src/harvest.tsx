import { useState } from "react";
import { post } from "./api";
import { today } from "../../../packages/domain/index";
import { Basis, Empty, num, rs, dateText } from "./components";
export function HarvestPanel({
  data,
  cycleId,
  onSaved,
  onDecision,
}: {
  data: any;
  cycleId: string;
  onSaved: () => Promise<void>;
  onDecision: (id?: string) => void;
}) {
  const [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState<string | null>(null),
    [input, setInput] = useState<any>(null);
  async function calculate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(null);
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const next = {
      date: today(),
      price: Number(raw.price),
      dailyFeedKg: Number(raw.dailyFeedKg),
      feedPrice: Number(raw.feedPrice),
      dailyOperating: Number(raw.dailyOperating),
      growthOverride:
        raw.growthOverride === "" ? null : Number(raw.growthOverride),
      notes: String(raw.notes || ""),
    };
    try {
      setResult(await post("/cycles/" + cycleId + "/scenario-preview", next));
      setInput(next);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const r = await post("/cycles/" + cycleId + "/records/scenario", input);
      setSaved(r.id);
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TRANSPARENT ECONOMICS</span>
            <h2>Harvest now, or wait?</h2>
          </div>
          <Basis value="FORECAST" />
        </div>
        <p className="muted">
          Compare assumptions, not promises. Price stays constant across sizes
          and dates; get a buyer quote for each scenario before deciding.
        </p>
        {!data.summary.latest ||
        !data.summary.assumption ||
        data.summary.hasHarvest ? (
          <Empty title="A few inputs are needed">
            {data.summary.hasHarvest
              ? "Standing biomass cannot be reconciled after a harvest in V0."
              : "Add a measured sample and survival assumptions."}
          </Empty>
        ) : (
          <form onSubmit={calculate}>
            <div className="form-grid scenario-inputs">
              {[
                { name: "price", label: "Assumed sale price (₹/kg)" },
                { name: "dailyFeedKg", label: "Planned daily feed (kg)" },
                { name: "feedPrice", label: "Feed price (₹/kg)" },
                { name: "dailyOperating", label: "Other daily cost (₹)" },
                {
                  name: "growthOverride",
                  label: "Optional assumed growth (g/day)",
                },
              ].map((f) => (
                <label key={f.name}>
                  {f.label}
                  <input
                    name={f.name}
                    type="number"
                    step="any"
                    min={
                      f.name === "growthOverride"
                        ? "-2"
                        : f.name === "price"
                          ? "0.01"
                          : "0"
                    }
                    required={f.name !== "growthOverride"}
                    placeholder={
                      f.name === "growthOverride"
                        ? "Use recent measured rate"
                        : undefined
                    }
                  />
                </label>
              ))}
              <label>
                Assumption notes
                <input
                  name="notes"
                  placeholder="Quote / feeding-plan context"
                />
              </label>
            </div>
            <p className="fineprint">
              Future price, feed and survival are USER ASSUMED. Blank growth
              uses the last two distinct sample dates. One sample cannot produce
              a future forecast without an explicit growth assumption.
            </p>
            <button disabled={busy}>
              {busy ? "Calculating…" : "Compare scenarios"}
            </button>
          </form>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
      {result && (
        <section>
          <div className="section-heading">
            <h2>Four possibilities. Your decision.</h2>
            <span className="muted">
              Survival {num(result.config.survival.low)}–
              {num(result.config.survival.high)}% <Basis value="USER_ASSUMED" />
            </span>
          </div>
          <div className="scenario-grid">
            {result.results.map((s: any) => (
              <article className="scenario-card" key={s.days}>
                <span className="eyebrow">
                  {s.days === 0 ? "HARVEST NOW" : "WAIT " + s.days + " DAYS"}
                </span>
                <h3>
                  {num(s.abw)} <small>g ABW</small>
                </h3>
                <p>{num(s.countPerKg)} count/kg</p>
                <dl>
                  <div>
                    <dt>Biomass range</dt>
                    <dd>
                      {num(s.bands?.low.biomassKg, 0)}–
                      {num(s.bands?.high.biomassKg, 0)} kg
                    </dd>
                  </div>
                  <div>
                    <dt>Revenue range</dt>
                    <dd>
                      {rs(s.bands?.low.revenuePaise)}–
                      {rs(s.bands?.high.revenuePaise)}
                    </dd>
                  </div>
                  <div>
                    <dt>Additional feed</dt>
                    <dd>{num(s.additionalFeedKg)} kg</dd>
                  </div>
                  <div>
                    <dt>Additional cost</dt>
                    <dd>{rs(s.additionalCostPaise)}</dd>
                  </div>
                  <div className="scenario-total">
                    <dt>
                      {result.config.costsComplete
                        ? "Estimated profit range"
                        : "Margin over recorded costs"}
                    </dt>
                    <dd>
                      {rs(s.bands?.low.marginPaise)}–
                      {rs(s.bands?.high.marginPaise)}
                    </dd>
                  </div>
                </dl>
                <small>
                  {s.abw === null
                    ? "Insufficient growth basis."
                    : "Assumption range; not a statistical confidence interval."}
                </small>
              </article>
            ))}
          </div>
          <p className="notice">
            Sample: {dateText(result.config.sampleDate)} · Growth{" "}
            {num(result.config.dailyGrowth, 3)} g/day ({result.growthBasis}).{" "}
            {result.config.costsComplete
              ? "History attested complete by user."
              : "Unrecorded past costs excluded. These margins are not crop profit."}
          </p>
          <div className="actions">
            <button disabled={busy || !!saved} onClick={save}>
              {saved ? "Snapshot saved" : "Save this scenario snapshot"}
            </button>
            {saved && (
              <button className="secondary" onClick={() => onDecision(saved)}>
                Record a decision
              </button>
            )}
          </div>
        </section>
      )}
      <section className="panel">
        <h2>Saved scenario snapshots</h2>
        {data.records.scenario.length ? (
          data.records.scenario
            .slice()
            .reverse()
            .map((s: any) => (
              <details key={s.id}>
                <summary>
                  {dateText(s.date)} · {s.data.engineVersion} ·{" "}
                  {rs(s.data.config.pricePaise)}/kg
                </summary>
                <p>
                  Frozen inputs and results. Later records do not change this
                  snapshot.
                </p>
                {s.data.results.map((r: any) => (
                  <p key={r.days}>
                    {r.days === 0 ? "Now" : "+" + r.days + " days"}:{" "}
                    {num(r.abw)} g · {rs(r.bands?.base.marginPaise)} base
                    recorded-cost margin
                  </p>
                ))}
                <button className="secondary" onClick={() => onDecision(s.id)}>
                  Link a farmer decision
                </button>
              </details>
            ))
        ) : (
          <p className="muted">No scenarios saved yet.</p>
        )}
      </section>
    </>
  );
}
