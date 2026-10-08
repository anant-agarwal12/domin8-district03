"""Pydantic models mirroring contracts/api.md (Phase 1). Field names are camelCase on the wire."""
from typing import Literal, get_args

from pydantic import BaseModel, Field, field_validator

StepType = Literal["setup", "formula", "method", "calculation", "final_answer", "presentation"]
ErrorType = Literal[
    "concept", "formula", "calculation", "units", "notation", "skipped_step", "presentation", "incomplete"
]
Source = Literal["sample", "pyq", "generated"]

STEP_TYPES: tuple[str, ...] = get_args(StepType)
ERROR_TYPES: tuple[str, ...] = get_args(ErrorType)


class QuestionIn(BaseModel):
    course: str = Field(min_length=1)
    topic: str = Field(min_length=1)
    text: str = Field(min_length=1)
    marks: float = Field(gt=0)
    source: Source
    year: int | None = None


class Question(QuestionIn):
    id: str
    rubricId: str | None = None


class RubricStepIn(BaseModel):
    id: str | None = None
    description: str = Field(min_length=1)
    marks: float = Field(gt=0)
    type: StepType
    expected: str


class RubricStep(RubricStepIn):
    id: str


class Rubric(BaseModel):
    id: str
    questionId: str
    status: Literal["proposed", "confirmed"]
    steps: list[RubricStep]
    maxMarks: float
    editedBy: str | None
    updatedAt: str


class ExtractIn(BaseModel):
    questionId: str
    kind: Literal["scheme", "sample"]
    content: str = Field(min_length=1)


class RubricUpdateIn(BaseModel):
    steps: list[RubricStepIn] = Field(min_length=1)


class AnswerLine(BaseModel):
    n: int = Field(ge=1)
    text: str
    legible: bool | None = None


class GradeIn(BaseModel):
    questionId: str
    rubricId: str
    inputType: Literal["typed", "photo"]
    lines: list[AnswerLine] = Field(min_length=1)
    imageId: str | None = None

    @field_validator("lines")
    @classmethod
    def line_numbers_unique(cls, lines: list[AnswerLine]) -> list[AnswerLine]:
        numbers = [line.n for line in lines]
        if len(set(numbers)) != len(numbers):
            raise ValueError("line numbers (n) must be unique")
        return lines


class StepResult(BaseModel):
    stepId: str
    awarded: float
    max: float
    matchedLines: list[int]
    reason: str
    errorType: ErrorType | None
    fix: str | None


class Attempt(BaseModel):
    id: str
    uid: str
    questionId: str
    rubricId: str
    inputType: Literal["typed", "photo"]
    imageId: str | None
    lines: list[AnswerLine]
    stepResults: list[StepResult]
    total: float
    max: float
    confidence: Literal["high", "low"]
    confidenceReason: str | None
    gradedAt: str
