"""Phase 1 accuracy check: extract -> confirm -> grade each case and compare with the expected total.

Run from api/:  python scripts/check_phase1.py [--cases PATH] [--firestore] [-v]

Uses the real model through llm.py (so it is cached on disk after the first run). Data goes to an
in-memory store unless --firestore is given. Exits 1 if any case is outside +-1 mark or breaks a rule.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.auth import CurrentUser, current_user, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.memdb import MemDb  # noqa: E402
from app.models import ERROR_TYPES  # noqa: E402

DEFAULT_CASES = Path(__file__).resolve().parents[1] / "data" / "check" / "phase1_cases.json"
TOLERANCE = 1.0


def to_lines(raw: list) -> list[dict]:
    return [line if isinstance(line, dict) else {"n": i, "text": line} for i, line in enumerate(raw, start=1)]


def call(client: TestClient, method: str, path: str, **kwargs) -> dict:
    res = client.request(method, path, **kwargs)
    if res.status_code >= 400:
        raise RuntimeError(f"{method} {path} -> {res.status_code} {res.text[:300]}")
    return res.json()


def run_case(client: TestClient, case: dict) -> dict:
    question = call(client, "POST", "/questions", json=case["question"])
    rubric = call(
        client,
        "POST",
        "/rubrics/extract",
        json={"questionId": question["id"], "kind": case.get("kind", "scheme"), "content": case["scheme"]},
    )
    rubric = call(client, "POST", f"/rubrics/{rubric['id']}/confirm")
    attempt = call(
        client,
        "POST",
        "/attempts/grade",
        json={
            "questionId": question["id"],
            "rubricId": rubric["id"],
            "inputType": "typed",
            "lines": to_lines(case["answerLines"]),
        },
    )
    steps = attempt["stepResults"]
    return {
        "rubric_max": rubric["maxMarks"],
        "attempt": attempt,
        "over_max": [s["stepId"] for s in steps if s["awarded"] > s["max"]],
        "untyped_loss": [s["stepId"] for s in steps if s["awarded"] < s["max"] and s["errorType"] not in ERROR_TYPES],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES)
    parser.add_argument("--firestore", action="store_true", help="write to the real Firestore instead of memory")
    parser.add_argument("-v", "--verbose", action="store_true", help="print every step result")
    args = parser.parse_args()

    cases = json.loads(args.cases.read_text(encoding="utf-8"))["cases"]
    app.dependency_overrides[current_user] = lambda: CurrentUser(uid="check-phase1", name="check-phase1")
    if not args.firestore:
        memory = MemDb()
        app.dependency_overrides[get_db] = lambda: memory
    client = TestClient(app, raise_server_exceptions=False)

    errors, failures, rows = [], 0, []
    for case in cases:
        try:
            out = run_case(client, case)
        except RuntimeError as exc:
            print(f"[ERROR] {case['name']}: {exc}")
            failures += 1
            continue
        attempt = out["attempt"]
        diff = abs(attempt["total"] - case["expectedTotal"])
        ok = diff <= TOLERANCE and not out["over_max"] and not out["untyped_loss"]
        failures += not ok
        errors.append(diff)
        rows.append((case["name"], case["expectedTotal"], attempt, out, diff, ok))

    for name, expected, attempt, out, diff, ok in rows:
        print(f"[{'PASS' if ok else 'FAIL'}] {name}")
        print(f"       expected {expected:g}  got {attempt['total']:g} / {attempt['max']:g}  diff {diff:g}"
              f"  within 1: {'yes' if diff <= TOLERANCE else 'NO'}  confidence: {attempt['confidence']}")
        print(f"       steps above max: {out['over_max'] or 'none'}   lost marks without a taxonomy type: {out['untyped_loss'] or 'none'}")
        if attempt["confidenceReason"]:
            print(f"       confidence reason: {attempt['confidenceReason']}")
        if args.verbose or not ok:
            for s in attempt["stepResults"]:
                print(f"         {s['stepId']}: {s['awarded']:g}/{s['max']:g} {s['errorType'] or '-'} | {s['reason']}")

    passed = len(rows) - sum(1 for r in rows if not r[5])
    print(f"\n{passed}/{len(cases)} cases pass (total within 1, no step above max, every lost mark typed)")
    if errors:
        print(f"mean absolute error: {sum(errors) / len(errors):.2f} marks over {len(errors)} graded cases")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
