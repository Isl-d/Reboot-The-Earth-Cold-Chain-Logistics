"""Simple lexical grounding over a curated corpus.

Deliberately **no vector database and no embeddings**: a transparent retrieval
step that tokenises the query, scores each passage with BM25, and returns the
top-k. The corpus is a single JSON file, so it is easy to audit, and every
passage carries its own source, licence and URL.

Retrieval only ever affects the *prose* the explainer writes. Every number still
comes from the deterministic engine.
"""
from __future__ import annotations

import json
import math
import re
from functools import lru_cache
from pathlib import Path

_CORPUS = Path(__file__).resolve().parents[2] / "data" / "knowledge" / "cold_chain.json"
_WORD = re.compile(r"[a-z0-9]+")

_STOP = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
    "was", "were", "be", "it", "its", "this", "that", "with", "as", "at", "by",
    "from", "than", "then", "so", "not", "no", "yes", "can", "may", "if", "but",
}


@lru_cache(maxsize=1)
def load_passages() -> tuple[dict, ...]:
    try:
        data = json.loads(_CORPUS.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return ()
    return tuple(p for p in data if isinstance(p, dict) and p.get("text"))


def _terms(text: str) -> list[str]:
    return [w for w in _WORD.findall(str(text).lower()) if w not in _STOP and len(w) > 1]


def retrieve(query: str, k: int | None = None) -> list[dict]:
    """Top-k passages by BM25 against the query. Pure Python, deterministic."""
    from ..config import settings

    k = k or settings.grounding_top_k
    passages = load_passages()
    if not passages:
        return []
    q = _terms(query)
    if not q:
        return []

    docs = [_terms(f"{p.get('title', '')} {p['text']}") for p in passages]
    n = len(docs)
    avgdl = sum(len(d) for d in docs) / max(n, 1)

    df: dict[str, int] = {}
    for d in docs:
        for t in set(d):
            df[t] = df.get(t, 0) + 1

    k1, b = 1.5, 0.75
    scored: list[tuple[float, dict]] = []
    for passage, doc in zip(passages, docs):
        dl = len(doc)
        if dl == 0:
            continue
        tf: dict[str, int] = {}
        for t in doc:
            tf[t] = tf.get(t, 0) + 1
        score = 0.0
        for t in q:
            if t not in tf:
                continue
            idf = math.log(1.0 + (n - df.get(t, 0) + 0.5) / (df.get(t, 0) + 0.5))
            score += idf * (tf[t] * (k1 + 1.0)) / (tf[t] + k1 * (1.0 - b + b * dl / avgdl))
        if score > 0:
            scored.append((score, passage))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [passage for _, passage in scored[:k]]


def as_prompt(passages: list[dict]) -> str:
    """Render passages as a numbered SOURCES block for the explainer prompt."""
    return "\n".join(
        f"[{i}] {p.get('title')} ({p.get('source')}): {p['text']}"
        for i, p in enumerate(passages, 1)
    )


def sources(passages: list[dict]) -> list[dict]:
    """The citation list returned to the client."""
    return [
        {
            "id": p.get("id"),
            "title": p.get("title"),
            "source": p.get("source"),
            "licence": p.get("licence"),
            "url": p.get("url", ""),
        }
        for p in passages
    ]
