import numpy as np


def evaluate(y, prediction):
    y, prediction = np.asarray(y, dtype=float), np.asarray(prediction, dtype=float)
    error = y - prediction
    sst = float(np.sum((y - np.mean(y)) ** 2))
    result = {
        "n": len(y),
        "mae_g": float(np.mean(np.abs(error))),
        "rmse_g": float(np.sqrt(np.mean(error**2))),
        "r2": 1 - float(np.sum(error**2)) / sst if len(y) > 1 and sst > 0 else None,
    }
    positive = (y > 0) & (prediction > 0)
    result["count_per_kg_mae"] = (
        float(np.mean(np.abs(1000 / y[positive] - 1000 / prediction[positive])))
        if positive.any()
        else None
    )
    result["count_band_disagreement_rate"] = (
        float(
            np.mean(
                np.floor(1000 / y[positive] / 10)
                != np.floor(1000 / prediction[positive] / 10)
            )
        )
        if positive.any()
        else None
    )
    return result
