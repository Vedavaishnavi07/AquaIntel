# AquaIntel research: synthetic only

Run: python -m pip install -r ml/requirements.txt; python -m unittest discover -s ml/tests; python -m ml.training.run_demo.

# ML data contract v1

Production never imports ml/, loads learned coefficients, or reads model_predictions for advice.

Sampling observations preserve farm/pond/cycle/event identity, stocking/observation dates, DOC, species, raw count/grams, ABW/count/kg, sampling method, scale-check/representativeness status, basis, data origin, image references, and ground-truth status. Context references identify feed, cost, water, market and events through the observation date. These are not features yet; same-day context needs precise observation/availability timestamps before future feature use.

Unknown is null. The builder accepts only MEASURED sample labels, rejects duplicate events and inconsistent dates/counts/weights, excludes voided samples, and rejects mixed synthetic/private origins. Recorded measurements remain NOT_INDEPENDENTLY_VERIFIED.

```sh
python -m ml.data.build_dataset export.csv --output .local/datasets/cycle-v1
```

Output must be a new directory. Source/dataset SHA-256, counts, dates, missingness and biases are recorded. This is freezing, **not anonymization**. Never commit private snapshots.

## Leakage

All images from one sampling event share one label/group; never split them independently. Hold related ponds/cycles/farms together where needed. Enforce temporal and label-availability cutoffs. Freeze splits before tuning and keep future holdouts genuinely unseen.

The demo holds out whole synthetic farms, and features see only current/previous samples; the next sample is the target. Farm #001 used repeatedly for tuning cannot be reported as an independent test. Additional real crops/ponds/farms are necessary.

## Meaning

Synthetic results validate plumbing only. Count-band disagreement indicates sensitivity near possible price categories; it is not measured financial impact. Explainability is about prediction behavior, never causality. There are no validated disease, vision, survival or harvest models.

# Growth demo model card

**EXPERIMENTAL — SYNTHETIC DEMO ONLY. No production deployment.**

Purpose: verify reproducible features, grouped evaluation and error analysis. Intended use: local engineering demonstration. Prohibited: farmer advice, crop planning, disease/survival inference, business-impact or generalization claims.

Data: seed-42 invented growth, 8 synthetic farms, 16 ponds, 32 cycles, 416 samples, zero images. Features: current ABW/DOC, last growth rate, forecast horizon. Target: next synthetic ABW. Farms 0–4 train, 5 validation, 6–7 test. 220/44/88 feature rows. Whole farm/pond/cycle/sample groups stay within one split.

Models: last-growth-rate and NumPy ordinary least squares. All compared runs, metrics and worst examples are recorded in timestamped artifacts. No hyperparameter tuning.

Limitations: smooth invented dynamics/noise, no true stress/weather/management/sampling biases, no real labels. Extrapolation is unconstrained. Count errors can cross a market category; no profit implication has been measured.

Confidence: unavailable, never a fabricated probability. Deployment version: none. Rollback: there is no production integration; any future promotion must first implement/test deterministic-only rollback.
