# Laya — local, non-autoregressive System 1 decision engine (Apache-2.0,
# Convai Innovations). Runs as its own service so the ~1.4 GB of weights never
# enter the backend image and a model crash cannot take the API down.
#
#   docker compose up -d --build laya
#   make laya-pull        # download the checkpoints once, before the demo
#
# The HTTP surface is Jev-compatible: POST /v1/systemone {state, questions}.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    # Keep every downloaded checkpoint on the mounted volume.
    HF_HOME=/models \
    # The service config (read by laya.serve).
    LAYA_HOST=0.0.0.0 \
    LAYA_PORT=8000 \
    LAYA_MODELS=english,multilingual \
    LAYA_PRELOAD=1 \
    LAYA_DEVICE=cpu

RUN pip install --no-cache-dir "laya[serve]"

EXPOSE 8000

# First boot preloads the checkpoints (downloads them if absent); later boots
# read them from /models.
CMD ["laya-serve"]
