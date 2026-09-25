"""Simple lexical grounding: retrieval, citations, and the explain endpoint.

No vector database and no network: the corpus is a local JSON file, and the
explainer is a fake client.
"""
from __future__ import annotations

from backend.intelligence import knowledge, llm as llm_mod


class FakeLLM:
    available = True
    model = "fake-explainer"

    def complete_json(self, system, user, max_tokens=None):
        return {"explanation": "Divert to the nearest cold store; exposure is high.", "action": "DIVERT"}


def test_retrieve_returns_cited_passages():
    passages = knowledge.retrieve("refrigeration failure chicken temperature", k=3)
    assert passages
    sources = knowledge.sources(passages)
    assert all("licence" in s and "source" in s and "title" in s for s in sources)


def test_retrieve_is_deterministic_and_bounded():
    a = knowledge.retrieve("condensation humidity door", k=2)
    b = knowledge.retrieve("condensation humidity door", k=2)
    assert [p["id"] for p in a] == [p["id"] for p in b]
    assert len(a) <= 2


def test_grounding_endpoint(client):
    body = client.get("/api/ai/grounding", params={"q": "condensation humidity door"}).json()
    assert body["count"] >= 1
    assert any(s["id"] in {"humidity_condensation", "door_openings"} for s in body["sources"])
    assert "SOURCES" not in body["prompt"]  # the prompt uses [n] numbering, not the word
    assert "[1]" in body["prompt"]


def test_explain_is_grounded_and_cited(client, live):
    llm_mod.set_client(FakeLLM())
    try:
        body = client.post("/api/ai/explain", json={"truckId": "T102"}).json()
    finally:
        llm_mod.set_client(None)

    assert body["source"] == "explainer"
    assert body["grounded"] is True
    assert body["sources"] and all("licence" in s for s in body["sources"])
    # Laya is disabled in the test suite, so these System-1 layers are absent.
    assert body["guardrails"] is None
    assert body["moderation"] is None


def test_triage_endpoint_without_laya(client):
    body = client.post("/api/ai/triage", json={"message": "Should I divert T102?"}).json()
    assert body["triage"] is None
