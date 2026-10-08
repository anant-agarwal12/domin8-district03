import json
from pathlib import Path

from app import llm

MOCKS = Path(__file__).resolve().parents[2] / "contracts" / "mocks"
H = {"X-Dev-Uid": "u1"}

QUESTION = {
    "course": "physics-101",
    "topic": "work-energy",
    "text": "A 2 kg mass moves at 3 m/s. Find its kinetic energy.",
    "marks": 10,
    "source": "sample",
    "year": None,
}
RUBRIC_STEPS = [
    {"description": "States the given quantities", "marks": 2, "type": "setup", "expected": "m and v listed"},
    {"description": "Writes the formula", "marks": 2, "type": "formula", "expected": "E = 1/2 m v^2"},
    {"description": "Substitutes values", "marks": 2, "type": "method", "expected": "values in formula"},
    {"description": "Calculates correctly", "marks": 2, "type": "calculation", "expected": "E = 9"},
    {"description": "Final answer with units", "marks": 2, "type": "final_answer", "expected": "9 J"},
]
LINES = [
    {"n": 1, "text": "Given: m = 2, v = 3"},
    {"n": 2, "text": "E = 1/2 (2)(3)^2"},
    {"n": 3, "text": "E = 9"},
    {"n": 4, "text": "Answer: 9"},
]


def load_mock(name: str) -> dict:
    return json.loads((MOCKS / f"{name}.json").read_text(encoding="utf-8"))


class ScriptedLlm:
    """Stands in for llm.generate: returns queued replies and records every call."""

    def __init__(self) -> None:
        self.replies: list[str] = []
        self.calls: list[dict] = []

    def push(self, reply: object) -> None:
        self.replies.append(reply if isinstance(reply, str) else json.dumps(reply))

    def __call__(self, prompt, *, schema=None, temperature=0.0, cache_salt="", image=None, settings=None):
        self.calls.append({"prompt": prompt, "schema": schema, "temperature": temperature, "salt": cache_salt})
        return llm.LlmResult(text=self.replies.pop(0), provider="gemini", model="gemini-test")

    @property
    def salts(self) -> list[str]:
        return [call["salt"] for call in self.calls]


def grade_reply(awards: dict[str, tuple[float, str | None]], rubric_steps: list[dict]) -> dict:
    """Model-style grading output. awards maps step id -> (awarded, errorType)."""
    steps = []
    for i, step in enumerate(rubric_steps, start=1):
        sid = f"s{i}"
        awarded, error = awards.get(sid, (step["marks"], None))
        steps.append(
            {
                "stepId": sid,
                "awarded": awarded,
                "matchedLines": [i] if i <= 4 else [],
                "reason": f"Reason for {sid}.",
                "errorType": error,
                "fix": None if error is None else f"Fix for {sid}.",
            }
        )
    return {"steps": steps}


def make_confirmed_rubric(client, fake_llm: ScriptedLlm) -> tuple[dict, dict]:
    """Create a question, extract a rubric (scripted), confirm it. Returns (question, rubric)."""
    question = client.post("/questions", json=QUESTION, headers=H).json()
    fake_llm.push({"steps": RUBRIC_STEPS})
    rubric = client.post(
        "/rubrics/extract", json={"questionId": question["id"], "kind": "scheme", "content": "2 marks each"}, headers=H
    ).json()
    rubric = client.post(f"/rubrics/{rubric['id']}/confirm", headers=H).json()
    return question, rubric


def grade_body(question: dict, rubric: dict, lines: list[dict] | None = None) -> dict:
    return {
        "questionId": question["id"],
        "rubricId": rubric["id"],
        "inputType": "typed",
        "lines": lines or LINES,
    }
