import { useState } from "react";
import { X } from "lucide-react";
import { today, sampling } from "../../../packages/domain/index";
import { Basis, num } from "./components";
type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  hint?: string;
  step?: string;
  min?: string;
  default?: any;
};
const date: Field = {
    key: "date",
    label: "Record date",
    type: "date",
    required: true,
  },
  notes: Field = { key: "notes", label: "Notes", type: "textarea" };
const n = (key: string, label: string, required = false): Field => ({
  key,
  label,
  type: "number",
  required,
  min: required ? "0.01" : "0",
});
const t = (key: string, label: string, required = false): Field => ({
  key,
  label,
  required,
});
const choice = (key: string, label: string, options: string[]): Field => ({
  key,
  label,
  type: "select",
  options,
});
const check = (key: string, label: string): Field => ({
  key,
  label,
  type: "checkbox",
});
export const forms: Record<
  string,
  { title: string; description: string; fields: Field[] }
> = {
  farm: {
    title: "Create your farm",
    description:
      "A private workspace. Use a general location, not a precise address.",
    fields: [
      t("name", "Farm name", true),
      t("location", "Village / district (optional)"),
      n("areaAcres", "Total farm area (acres)", true),
    ],
  },
  pond: {
    title: "Add a pond",
    description: "Keep each pond’s crops and records separate.",
    fields: [
      t("name", "Pond name", true),
      n("areaAcres", "Pond area (acres)", true),
    ],
  },
  cycle: {
    title: "Start tracking this crop",
    description:
      "Already mid-cycle? Enter the original stocking date. Start today without complete backfill.",
    fields: [
      {
        key: "stockingDate",
        label: "Original stocking date",
        type: "date",
        required: true,
      },
      { ...n("stocked", "Number stocked (PL)", true), step: "1", min: "1" },
      t("plStage", "PL stage (if known)"),
      t("source", "Hatchery / source"),
      n("seedCost", "Seed cost (₹, if known)"),
      {
        ...n("initialBiomassKg", "Initial stocking biomass (kg, if known)"),
        hint: "Leave blank if unknown. Needed for biomass-gain FCR.",
      },
      notes,
    ],
  },
  daily: {
    title: "Today’s feed & observations",
    description:
      "One daily total per pond. Unknown fields stay blank. Enter 0 only for a confirmed zero.",
    fields: [
      date,
      n("feedKg", "Feed total (kg)"),
      { ...n("feedings", "Number of feedings"), step: "1", min: "1" },
      t("brand", "Feed type / brand"),
      {
        ...n("feedCost", "Feed expense for this day (₹, optional)"),
        hint: "Adds one Feed expense. Do not duplicate in the cost ledger.",
      },
      { ...n("mortality", "Observed dead shrimp (if known)"), step: "1" },
      choice("behavior", "Shrimp behavior", [
        "UNKNOWN",
        "NORMAL",
        "WATCH",
        "CONCERN",
      ]),
      t("appearance", "Pond / water appearance"),
      t("weather", "Rain / weather observed"),
      t("aerator", "Aerator / fan observation"),
      t("treatment", "Treatments / additives used"),
      t("nearby", "Nearby pond concern"),
      notes,
    ],
  },
  sample: {
    title: "Record a weighed sample",
    description:
      "Use a scale and a representative sample. Photos are linked ground truth, not AI measurements.",
    fields: [
      date,
      { ...n("count", "Number of shrimp sampled", true), step: "1", min: "1" },
      n("weightG", "Total measured weight (grams)", true),
      {
        ...t("method", "Sampling method / locations", true),
        hint: "Example: cast net from four pond locations.",
      },
      choice("representative", "Representative of the pond?", [
        "UNKNOWN",
        "YES",
        "NO",
      ]),
      check("scaleChecked", "Scale checked / tared"),
      notes,
    ],
  },
  cost: {
    title: "Add an expense",
    description:
      "Actual expense, entered once. Daily feed expenses already appear in the ledger.",
    fields: [
      date,
      {
        ...t("category", "Category (custom names allowed)", true),
        default: "Feed",
      },
      n("amount", "Amount (₹)", true),
      {
        key: "note",
        label: "Description / receipt reference",
        type: "textarea",
      },
    ],
  },
  market: {
    title: "Add a market price",
    description:
      "Manual quote, not a live price. Add a separate entry for each count size.",
    fields: [
      date,
      t("location", "Market / location", true),
      n("countPerKg", "Count per kg", true),
      n("price", "Quoted price (₹/kg)", true),
      t("source", "Source (buyer / market contact)", true),
      { key: "note", label: "Source notes", type: "textarea" },
    ],
  },
  event: {
    title: "Log a crop event",
    description:
      "Record what happened. No automatic diagnosis or treatment advice.",
    fields: [
      date,
      choice("kind", "Event", [
        "Heavy rainfall",
        "Mortality spike",
        "Feed response change",
        "Behavior change",
        "Water appearance change",
        "Power interruption",
        "Aerator problem",
        "Nearby pond concern",
        "Shrimp abnormality",
        "Treatment",
        "Expert consultation",
        "Lab test",
        "Emergency harvest",
        "Correction / clarification",
        "Other",
      ]),
      {
        key: "notes",
        label: "What happened?",
        type: "textarea",
        required: true,
      },
    ],
  },
  assumption: {
    title: "Set survival assumptions",
    description:
      "Survival is not directly known. These assumptions determine biomass and economic ranges.",
    fields: [
      date,
      { ...n("low", "Low survival (%)", true), min: "0" },
      { ...n("base", "Base survival (%)", true), min: "0" },
      { ...n("high", "High survival (%)", true), min: "0" },
      notes,
    ],
  },
  decision: {
    title: "Record your decision",
    description:
      "Your judgment stays independent. Record the reason, then the actual outcome later.",
    fields: [
      date,
      t("decision", "Decision", true),
      {
        key: "reason",
        label: "Why did you decide this?",
        type: "textarea",
        required: true,
      },
    ],
  },
  harvest: {
    title: "Record actual harvest",
    description:
      "V0 pauses biomass/scenarios after any harvest to avoid double counting. A final harvest closes the crop.",
    fields: [
      date,
      n("weightKg", "Actual harvested weight (kg)", true),
      n("price", "Actual sale price (₹/kg)", true),
      check("final", "Final harvest — close this crop"),
      notes,
    ],
  },
  water: {
    title: "Record instrument / lab reading",
    description:
      "Only actual instrument or laboratory measurements. Never camera estimates.",
    fields: [
      date,
      choice("metric", "Measurement", [
        "DO",
        "pH",
        "ammonia",
        "nitrite",
        "salinity",
        "temperature",
      ]),
      { ...n("value", "Measured value", true), min: "0" },
      choice("unit", "Unit", ["mg/L", "pH", "ppt", "°C"]),
      t("source", "Instrument / lab source", true),
      notes,
    ],
  },
  completeness: {
    title: "Review history completeness",
    description:
      "Confirm only after checking all past entries. Changes to calculation assumptions are audited.",
    fields: [
      check("feedComplete", "All feed since stocking is recorded"),
      check("costsComplete", "All crop costs to date are recorded"),
      n("initialBiomassKg", "Initial stocking biomass (kg)"),
      t("reason", "How was this verified?", true),
    ],
  },
  void: {
    title: "Correct a record",
    description:
      "The original stays in the database and export, marked void. Related daily feed/cost entries are also voided. Add a replacement after this step. Saved scenarios retain their original snapshots.",
    fields: [t("reason", "Why is this record being corrected?", true)],
  },
  outcome: {
    title: "Record a decision outcome",
    description:
      "Describe what actually happened, separately from expectations.",
    fields: [
      date,
      {
        key: "outcome",
        label: "Actual outcome",
        type: "textarea",
        required: true,
      },
    ],
  },
};
export function RecordForm({
  kind,
  initial = {},
  onSave,
  onClose,
}: {
  kind: string;
  initial?: any;
  onSave: (values: any) => Promise<void>;
  onClose: () => void;
}) {
  const c = forms[kind],
    [values, setValues] = useState<any>(() =>
      Object.fromEntries(
        c.fields.map((f) => [
          f.key,
          initial[f.key] ??
            f.default ??
            (f.type === "date"
              ? today()
              : f.type === "checkbox"
                ? false
                : f.type === "select"
                  ? f.options![0]
                  : ""),
        ]),
      ),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [expanded, setExpanded] = useState(false);
  const preview =
    kind === "sample" &&
    Number.isInteger(Number(values.count)) &&
    Number(values.count) > 0 &&
    Number(values.weightG) > 0
      ? sampling(Number(values.count), Number(values.weightG))
      : null;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const out: any = { ...values };
      c.fields.forEach((f) => {
        if (f.type === "number")
          out[f.key] = values[f.key] === "" ? null : Number(values[f.key]);
      });
      await onSave(out);
    } catch (e) {
      setError((e as Error).message);
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
        aria-labelledby="form-title"
      >
        <header>
          <div>
            <span className="eyebrow">FARM RECORD</span>
            <h2 id="form-title">{c.title}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close form"
          >
            <X />
          </button>
        </header>
        <p className="muted">{c.description}</p>
        <form onSubmit={submit}>
          <div className="form-grid">
            {c.fields
              .filter((_f, i) => kind !== "daily" || i < 3 || expanded)
              .map((f, i) => (
                <label
                  className={
                    f.type === "textarea" || f.type === "checkbox" ? "full" : ""
                  }
                  key={f.key}
                >
                  {f.type === "checkbox" ? (
                    <span className="checkbox">
                      <input
                        type="checkbox"
                        checked={values[f.key]}
                        onChange={(e) =>
                          setValues({ ...values, [f.key]: e.target.checked })
                        }
                      />
                      {f.label}
                    </span>
                  ) : (
                    <>
                      <span>
                        {f.label}
                        {f.required ? " *" : ""}
                      </span>
                      {f.type === "select" ? (
                        <select
                          value={values[f.key]}
                          onChange={(e) =>
                            setValues({ ...values, [f.key]: e.target.value })
                          }
                        >
                          {f.options!.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.type === "textarea" ? (
                        <textarea
                          required={f.required}
                          value={values[f.key]}
                          maxLength={2000}
                          onChange={(e) =>
                            setValues({ ...values, [f.key]: e.target.value })
                          }
                        />
                      ) : (
                        <input
                          autoFocus={i === 0}
                          required={f.required}
                          type={f.type || "text"}
                          min={f.type === "number" ? f.min || "0" : undefined}
                          max={f.type === "date" ? today() : undefined}
                          step={f.step || "any"}
                          value={values[f.key]}
                          maxLength={f.type === "number" ? undefined : 2000}
                          onChange={(e) =>
                            setValues({ ...values, [f.key]: e.target.value })
                          }
                        />
                      )}
                    </>
                  )}
                  {f.hint && <small>{f.hint}</small>}
                </label>
              ))}
          </div>
          {kind === "daily" && (
            <button
              type="button"
              className="text-button"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Fewer fields" : "More observations & feed expense"}
            </button>
          )}
          {preview && (
            <div className="calculation-preview">
              ABW <strong>{num(preview.abw, 2)} g</strong> · Count{" "}
              <strong>{num(preview.countPerKg, 1)}/kg</strong>
              <Basis value="DERIVED" />
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer>
            <button
              type="button"
              className="secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button disabled={busy}>
              {busy
                ? "Saving…"
                : "Save " + (kind === "daily" ? "daily log" : "record")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
