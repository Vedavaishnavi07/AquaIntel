import numpy as np


def features(samples):
    """Only information available at the prediction date enters X. Target is the next sample."""
    rows = []
    groups = {}
    for row in samples:
        groups.setdefault(row["cycle_id"], []).append(row)
    for cycle in groups.values():
        cycle.sort(key=lambda r: r["doc"])
        for prev, current, nxt in zip(cycle, cycle[1:], cycle[2:]):
            delta = current["doc"] - prev["doc"]
            if delta <= 0:
                raise ValueError("Distinct sample dates are required")
            rate = (current["abw_g"] - prev["abw_g"]) / delta
            horizon = nxt["doc"] - current["doc"]
            rows.append(
                {
                    "farm_id": current["farm_id"],
                    "cycle_id": current["cycle_id"],
                    "event_id": current["event_id"],
                    "doc": current["doc"],
                    "x": [current["abw_g"], current["doc"], rate, horizon],
                    "y": nxt["abw_g"],
                    "baseline": current["abw_g"] + rate * horizon,
                }
            )
    return rows


def arrays(rows):
    return np.asarray([r["x"] for r in rows]), np.asarray([r["y"] for r in rows])
