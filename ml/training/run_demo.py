"""DEMO ONLY. No learned artifact is loaded by the production application."""

import hashlib, json, platform, subprocess, tomllib
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from ml.features.growth import features, arrays
from ml.evaluation.metrics import evaluate


def generate(seed=42):
    rng = np.random.default_rng(seed)
    rows = []
    for farm in range(8):
        for pond in range(2):
            for cycle in range(2):
                rate = 0.17 + 0.018 * farm + rng.normal(0, 0.012)
                for day in range(14, 99, 7):
                    abw = max(
                        0.5,
                        1.8
                        + rate * (day - 14)
                        + 0.00045 * (day - 14) ** 2
                        + rng.normal(0, 0.22),
                    )
                    rows.append(
                        {
                            "farm_id": f"demo-farm-{farm}",
                            "pond_id": f"demo-pond-{farm}-{pond}",
                            "cycle_id": f"demo-cycle-{farm}-{pond}-{cycle}",
                            "event_id": f"demo-event-{farm}-{pond}-{cycle}-{day}",
                            "doc": day,
                            "abw_g": round(abw, 4),
                            "origin": "SYNTHETIC",
                        }
                    )
    return rows


def run():
    cfg = tomllib.loads(Path("ml/experiments/growth_demo.toml").read_text())
    samples = generate(cfg["seed"])
    rows = features(samples)
    splits = {
        name: [r for r in rows if r["farm_id"] in cfg[name + "_farms"]]
        for name in ["train", "validation", "test"]
    }
    groups = [{r["cycle_id"] for r in splits[n]} for n in splits]
    assert not (
        groups[0] & groups[1] or groups[0] & groups[2] or groups[1] & groups[2]
    ), "Cycle leakage"
    X, y = arrays(splits["train"])
    coefficients = np.linalg.lstsq(
        np.column_stack([np.ones(len(X)), X]), y, rcond=None
    )[0]
    predictions = {}
    results = []
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    output = Path("ml/artifacts") / stamp
    output.mkdir(parents=True, exist_ok=False)
    for name in cfg["models"]:
        metrics = {}
        for split, observations in splits.items():
            X, y = arrays(observations)
            pred = (
                np.array([r["baseline"] for r in observations])
                if name == "last_growth_rate"
                else np.column_stack([np.ones(len(X)), X]) @ coefficients
            )
            metrics[split] = evaluate(y, pred)
            predictions[name + "_" + split] = pred.tolist()
        errors = []
        test_rows = splits["test"]
        pred = predictions[name + "_test"]
        for label, selection in [
            ("DOC < 56", [i for i, r in enumerate(test_rows) if r["doc"] < 56]),
            ("DOC >= 56", [i for i, r in enumerate(test_rows) if r["doc"] >= 56]),
            *[
                (f, [i for i, r in enumerate(test_rows) if r["farm_id"] == f])
                for f in cfg["test_farms"]
            ],
        ]:
            errors.append(
                {
                    "subgroup": label,
                    **evaluate(
                        [test_rows[i]["y"] for i in selection],
                        [pred[i] for i in selection],
                    ),
                }
            )
        worst = sorted(
            [
                {
                    "event_id": r["event_id"],
                    "doc": r["doc"],
                    "actual_g": r["y"],
                    "predicted_g": p,
                    "absolute_error_g": abs(r["y"] - p),
                }
                for r, p in zip(test_rows, pred)
            ],
            key=lambda r: r["absolute_error_g"],
            reverse=True,
        )[:10]
        results.append(
            {
                "model": name,
                "version": name + "-demo-v1",
                "state": "EXPERIMENTAL",
                "hyperparameters": (
                    {}
                    if name == "last_growth_rate"
                    else {"solver": "numpy.linalg.lstsq", "rcond": None}
                ),
                "metrics": metrics,
                "error_analysis": errors,
                "worst_cases": worst,
            }
        )
    try:
        commit = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL
        ).strip()
        dirty = bool(
            subprocess.check_output(["git", "status", "--porcelain"], text=True)
        )
    except (OSError, subprocess.CalledProcessError):
        commit = None
        dirty = True
    source = {
        str(p): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in Path("ml").rglob("*.py")
    }
    manifest = {
        "version": cfg["dataset_version"],
        "origin": "SYNTHETIC",
        "farms": 8,
        "ponds": 16,
        "cycles": 32,
        "samples": len(samples),
        "images": 0,
        "doc_range": [14, 98],
        "species": "Synthetic vannamei-like growth; no biological validity claimed",
        "sha256": hashlib.sha256(
            json.dumps(samples, sort_keys=True).encode()
        ).hexdigest(),
        "split_counts": {n: len(v) for n, v in splits.items()},
        "split_rationale": "Whole unseen farms held out. All pond/cycle/sample events remain within one partition. Synthetic farms are not evidence of real farm generalization.",
        "known_biases": [
            "Invented smooth growth",
            "No genuine weather, disease, farm-management or sampling bias",
            "No real image or outcome data",
        ],
    }
    record = {
        "experiment_id": cfg["experiment_id"] + "-" + stamp,
        "timestamp": stamp,
        "config": cfg,
        "dataset": manifest,
        "code_commit": commit,
        "dirty": dirty,
        "source_hashes": source,
        "environment": {"python": platform.python_version(), "numpy": np.__version__},
        "runs": results,
        "notes": "All runs retained; no hyperparameter search. No production promotion. No profit or disease claims.",
    }
    (output / "experiment.json").write_text(
        json.dumps(record, indent=2, allow_nan=False)
    )
    (output / "dataset.json").write_text(json.dumps(samples, indent=2))
    (output / "linear_coefficients.json").write_text(
        json.dumps(
            {
                "features": ["abw_g", "doc", "last_growth_g_per_day", "horizon_days"],
                "coef": coefficients[1:].tolist(),
                "intercept": float(coefficients[0]),
                "state": "EXPERIMENTAL",
                "use": "DEMO ONLY",
            },
            indent=2,
        )
    )
    print(
        json.dumps(
            {
                "artifact": str(output),
                "results": [
                    {"model": r["model"], "test": r["metrics"]["test"]} for r in results
                ],
            },
            indent=2,
        )
    )
    return output


if __name__ == "__main__":
    run()
