# Laya — local System 1 decision engine

[Laya](https://huggingface.co/convaiinnovations/laya) (Convai Innovations,
Apache-2.0) is a **non-autoregressive System 1 decision engine**: give it a state
and typed questions (`choice` / `score` / `noul`), get typed answers with
calibrated probabilities in a single forward pass. It **never generates text**,
so it cannot hallucinate a number.

It runs here as its own service (`laya-serve`) so the ~1.4 GB of weights never
enter the backend image and a model crash cannot take the API down. The backend
reaches it over the Jev-compatible `POST /v1/systemone` protocol via
`backend/intelligence/laya.py`.

## Run

```bash
make laya-pull      # once, before the demo: downloads the checkpoints
make demo           # starts laya alongside the rest of the stack
```

- In the compose network: `http://laya:8000`
- From the host: `http://localhost:8100`
- Weights are cached in the `laya_models` volume (`HF_HOME=/models`).

## What the backend asks it

`backend/intelligence/laya.py` builds a JSON state from the computed facts and
asks for `condition`, `recommended_action`, `urgency` and `needs_human_review`.
Laya **corroborates** the deterministic decision engine; it never overrides it,
and if the service is down the System-1 block is simply absent. See
`GET /api/system1/{truckId}`.

## Honest limits

The base checkpoints are a fast base to specialise, not a zero-shot decision
engine, and they ship over-confident — so the UI labels confidence
**uncalibrated**. Fine-tuning on cold-chain decisions is the path to higher
accuracy (see the Laya fine-tuning notebook).
