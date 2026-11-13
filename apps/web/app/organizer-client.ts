export type OrganizerCategory = { id: string; name: string };
export type OrganizerQuestion = {
  id: string;
  title: string;
  status: string;
  startingPriceA: number;
  deadline: string;
  eventTime: string;
  outcomeCriteria: string;
  source: string;
  category: { name: string };
  answers: { text: string }[];
  _count: { predictions: number };
};
export type ReadyQuestion = OrganizerQuestion & { answers: { id: string; text: string }[] };

type ErrorPayload = { error?: { message?: string } };
const request = async <T extends object>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { credentials: "include", ...init });
  const payload = await response.json() as T | ErrorPayload;
  if (!response.ok) throw new Error(("error" in payload && payload.error?.message) || "Organizer request failed.");
  return payload as T;
};

export const getCategories = () => request<{ categories: OrganizerCategory[] }>("/api/v1/public/categories");
export const getOrganizerQuestions = () => request<{ questions: OrganizerQuestion[] }>("/api/v1/private/organizer/questions");
export const createQuestion = (input: object) => request<{ question: OrganizerQuestion }>("/api/v1/private/organizer/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
export const updateQuestion = (id: string, input: object) => request<{ question: OrganizerQuestion }>(`/api/v1/private/organizer/questions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
export const publishQuestion = (id: string) => request<{ question: OrganizerQuestion }>(`/api/v1/private/organizer/questions/${id}/publish`, { method: "POST" });
export const finalizeQuestion = (id: string) => request<{ question: OrganizerQuestion }>(`/api/v1/private/organizer/questions/${id}/finalize`, { method: "POST" });
export const getReadyToResolve = () => request<{ questions: ReadyQuestion[] }>("/api/v1/private/organizer/questions/ready-to-resolve");
export const resolveQuestion = (id: string, input: { answerId: string; evidenceNote: string }) => request<{ question: OrganizerQuestion }>(`/api/v1/private/organizer/questions/${id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
