import { api } from "./api";
import type { Question, Rubric } from "./types";
import { useLoad } from "./useLoad";

export type ReadyQuestion = { question: Question; rubric: Rubric };

// Questions in a course that have a confirmed rubric, i.e. the ones a student can answer.
export function useReadyQuestions(course: string) {
  return useLoad<ReadyQuestion[]>(course, async () => {
    const { items } = await api.listQuestions(course);
    const withRubric = items.filter((q) => q.rubricId);
    const rubrics = await Promise.all(withRubric.map((q) => api.getRubric(q.rubricId!)));
    return withRubric
      .map((question, i) => ({ question, rubric: rubrics[i] }))
      .filter((x) => x.rubric.status === "confirmed");
  });
}
