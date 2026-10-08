"""In-memory stand-in for the slice of Firestore the API uses. For tests and the check scripts."""
import copy
from typing import Any


class Snapshot:
    def __init__(self, doc_id: str, data: dict | None) -> None:
        self.id = doc_id
        self.exists = data is not None
        self._data = data

    def to_dict(self) -> dict | None:
        return copy.deepcopy(self._data)


class Document:
    def __init__(self, docs: dict[str, dict], doc_id: str) -> None:
        self._docs, self.id = docs, doc_id

    def get(self) -> Snapshot:
        return Snapshot(self.id, self._docs.get(self.id))

    def set(self, data: dict) -> None:
        self._docs[self.id] = copy.deepcopy(data)

    def update(self, fields: dict) -> None:
        self._docs[self.id].update(copy.deepcopy(fields))


class Collection:
    def __init__(self, docs: dict[str, dict], filters: tuple = ()) -> None:
        self._docs, self._filters = docs, filters

    def document(self, doc_id: str) -> Document:
        return Document(self._docs, doc_id)

    def where(self, *, filter: Any) -> "Collection":  # noqa: A002 - mirrors Firestore's keyword
        assert filter.op_string == "==", "memdb only supports =="
        return Collection(self._docs, self._filters + ((filter.field_path, filter.value),))

    def stream(self) -> list[Snapshot]:
        return [
            Snapshot(doc_id, data)
            for doc_id, data in self._docs.items()
            if all(data.get(field) == value for field, value in self._filters)
        ]


class MemDb:
    def __init__(self) -> None:
        self.data: dict[str, dict[str, dict]] = {}

    def collection(self, name: str) -> Collection:
        return Collection(self.data.setdefault(name, {}))
