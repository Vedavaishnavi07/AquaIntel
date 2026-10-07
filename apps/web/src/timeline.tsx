import { Scale, IndianRupee, Clock3, Camera, Plus } from "lucide-react";
import { Basis, Empty, dateText, num, rs } from "./components";
import { doc } from "../../../packages/domain/index";
export function Timeline({
  data,
  open,
  photos,
  uploads,
}: {
  data: any;
  open: (kind: string, extra?: any) => void;
  photos: (target: any) => void;
  uploads: boolean;
}) {
  const items = Object.entries(data.records)
    .filter(([key]) => !["feed", "assumption"].includes(key))
    .flatMap(([kind, rows]) => (rows as any[]).map((row) => ({ ...row, kind })))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        String(b.created_at).localeCompare(String(a.created_at)),
    );
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE STORY OF YOUR CROP</span>
          <h2>Crop timeline</h2>
        </div>
        <button onClick={() => open("event")}>
          <Plus size={18} />
          Log event
        </button>
      </div>
      {items.length ? (
        <div className="timeline">
          {items.map((item) => (
            <article className="timeline-item" key={item.id}>
              <div className="timeline-symbol">
                {item.kind === "sample" ? (
                  <Scale size={18} />
                ) : item.kind === "market" ? (
                  <IndianRupee size={18} />
                ) : (
                  <Clock3 size={18} />
                )}
              </div>
              <div>
                <div className="timeline-meta">
                  {dateText(item.date)}{" "}
                  <span>
                    DOC {doc(data.cycle.data.stockingDate, item.date)}
                  </span>
                  <Basis value={item.basis} />
                </div>
                <h3>
                  {item.kind === "event"
                    ? item.data.kind
                    : item.kind === "daily"
                      ? "Daily feed & observations"
                      : item.kind === "sample"
                        ? "Weighed sampling"
                        : item.kind === "cost"
                          ? item.data.category + " expense"
                          : item.kind === "decision"
                            ? "Farmer decision"
                            : item.kind === "scenario"
                              ? "Harvest scenario saved"
                              : item.kind === "harvest"
                                ? "Harvest recorded"
                                : item.kind === "water"
                                  ? item.data.metric + " reading"
                                  : "Market price recorded"}
                </h3>
                <p>
                  {item.kind === "daily"
                    ? (item.data.feedKg == null
                        ? "Feed not recorded"
                        : num(item.data.feedKg) + " kg feed") +
                      " · Behavior: " +
                      item.data.behavior
                    : item.kind === "sample"
                      ? item.data.count +
                        " shrimp · " +
                        num(item.data.weightG) +
                        " g total weight"
                      : item.kind === "cost"
                        ? rs(item.data.amountPaise)
                        : item.kind === "market"
                          ? num(item.data.countPerKg) +
                            " count · " +
                            rs(item.data.pricePaise) +
                            "/kg · " +
                            item.data.source
                          : item.kind === "decision"
                            ? item.data.decision + " — " + item.data.reason
                            : item.kind === "water"
                              ? item.data.value +
                                " " +
                                item.data.unit +
                                " · " +
                                item.data.source
                              : item.kind === "harvest"
                                ? num(item.data.weightKg) +
                                  " kg · " +
                                  rs(item.data.pricePaise) +
                                  "/kg"
                                : item.data.notes ||
                                  item.data.note ||
                                  "Immutable scenario snapshot"}
                </p>
                {item.kind === "daily" && (
                  <details>
                    <summary>See observations</summary>
                    {[
                      "mortality",
                      "appearance",
                      "weather",
                      "aerator",
                      "treatment",
                      "nearby",
                      "notes",
                    ].map((k) => (
                      <p key={k}>
                        <strong>{k}:</strong>{" "}
                        {item.data[k] == null || item.data[k] === ""
                          ? "UNKNOWN"
                          : item.data[k]}
                      </p>
                    ))}
                  </details>
                )}
                {uploads && ["sample", "event"].includes(item.kind) && (
                  <button
                    className="text-button"
                    onClick={() => photos({ kind: item.kind, id: item.id })}
                  >
                    <Camera size={16} />
                    Linked photos
                  </button>
                )}
                {!["scenario", "harvest", "decision", "event"].includes(
                  item.kind,
                ) && (
                  <button
                    className="text-button correction-link"
                    onClick={() =>
                      open("void", { recordKind: item.kind, recordId: item.id })
                    }
                  >
                    Correct this record
                  </button>
                )}
                {item.kind === "decision" && (
                  <button
                    className="text-button"
                    onClick={() => open("outcome", { decisionId: item.id })}
                  >
                    Record actual outcome
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No events yet" />
      )}
    </section>
  );
}
