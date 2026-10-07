"""Build a validated ML snapshot from the application's CSV export. No production service imports this."""

import argparse, csv, hashlib, json, math
from datetime import date
from pathlib import Path


def validate(rows):
    seen = set()
    samples = []
    for row in rows:
        if row.get("record_type") != "sample" or row.get("voidedAt"):
            continue
        required = [
            "record_id",
            "farm_id",
            "pond_id",
            "culture_cycle_id",
            "date",
            "stocking_date",
            "species",
            "basis",
            "count",
            "weightG",
            "data_origin",
        ]
        if any(not row.get(k) for k in required):
            raise ValueError("Missing required sampling field")
        if row["record_id"] in seen:
            raise ValueError(
                "Duplicate sampling event; never split duplicate images as separate observations"
            )
        seen.add(row["record_id"])
        if row["basis"] != "MEASURED":
            raise ValueError(
                "Training target must have MEASURED basis; assumptions/forecasts are rejected"
            )
        count, weight = float(row["count"]), float(row["weightG"])
        if not (
            math.isfinite(count)
            and math.isfinite(weight)
            and count > 0
            and count.is_integer()
            and weight > 0
        ):
            raise ValueError(
                "Count and total weight must be positive; count must be integer"
            )
        age = (
            date.fromisoformat(row["date"]) - date.fromisoformat(row["stocking_date"])
        ).days
        if age < 0 or (row.get("doc") and int(row["doc"]) != age):
            raise ValueError("Stocking/observation/DOC mismatch")
        if row["species"] != "Litopenaeus vannamei":
            raise ValueError("Species mixing requires a new dataset contract")
        item = {
            k: row.get(k) or None
            for k in [
                "record_id",
                "farm_id",
                "pond_id",
                "culture_cycle_id",
                "date",
                "stocking_date",
                "species",
                "basis",
                "method",
                "representative",
                "scaleChecked",
                "image_references",
                "data_origin",
            ]
        }
        item.update(
            doc=age,
            sample_count=int(count),
            total_weight_g=weight,
            abw_g=weight / count,
            count_per_kg=1000 * count / weight,
            ground_truth_status="RECORDED_NOT_INDEPENDENTLY_VERIFIED",
        )
        item["context_record_refs"] = {
            kind: [
                r["record_id"]
                for r in rows
                if r.get("record_type") == kind
                and r.get("culture_cycle_id") == row["culture_cycle_id"]
                and r.get("date", "") <= row["date"]
                and not r.get("voidedAt")
            ]
            for kind in ["feed", "cost", "water", "market", "event"]
        }
        item["created_at"] = row.get("created_at") or None
        item["image_references"] = (
            json.loads(row["image_references"]) if row.get("image_references") else None
        )
        samples.append(item)
    if len({r["data_origin"] for r in samples}) > 1:
        raise ValueError("Synthetic and private data cannot be silently mixed")
    if not samples:
        raise ValueError("No measured sampling rows")
    return sorted(
        samples,
        key=lambda r: (
            r["farm_id"],
            r["pond_id"],
            r["culture_cycle_id"],
            r["date"],
            r["record_id"],
        ),
    )


def build(source, output):
    raw = Path(source).read_bytes()
    with Path(source).open(encoding="utf-8-sig", newline="") as f:
        observations = validate(list(csv.DictReader(f)))
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    encoded = json.dumps(observations, indent=2, allow_nan=False).encode()
    (output / "observations.json").write_bytes(encoded)
    manifest = {
        "contract_version": "1",
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "dataset_sha256": hashlib.sha256(encoded).hexdigest(),
        "samples": len(observations),
        "farms": len({r["farm_id"] for r in observations}),
        "ponds": len({r["pond_id"] for r in observations}),
        "culture_cycles": len({r["culture_cycle_id"] for r in observations}),
        "date_range": [
            min(r["date"] for r in observations),
            max(r["date"] for r in observations),
        ],
        "images": sum(len(r["image_references"] or []) for r in observations),
        "origin": observations[0]["data_origin"],
        "abw_distribution_g": {
            "min": min(r["abw_g"] for r in observations),
            "max": max(r["abw_g"] for r in observations),
            "mean": sum(r["abw_g"] for r in observations) / len(observations),
        },
        "known_biases": [
            (
                "Synthetic demonstration; no real farm labels"
                if observations[0]["data_origin"] == "SYNTHETIC"
                else "Convenience pilot sample; no representativeness or generalization established"
            )
        ],
        "missing": {
            k: sum(r.get(k) is None for r in observations) for k in observations[0]
        },
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("export_csv")
    parser.add_argument(
        "--output",
        required=True,
        help="Private, new output directory. Never place real farmer data in Git.",
    )
    args = parser.parse_args()
    print(json.dumps(build(args.export_csv, args.output), indent=2))
