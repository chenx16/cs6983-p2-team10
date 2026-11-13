export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ORGANIZER" | "ADMINISTRATOR";
  isActive: boolean;
};

export type AdminQuestion = {
  id: string;
  title: string;
  status: string;
  predictionCount: number;
};

export type AdminPage<T> = { page: number; pageSize: number; total: number; pageCount: number } & T;
export type AdminHistoryEntry = {
  id: string;
  action: "ROLE_CHANGE" | "QUESTION_CANCELLATION";
  previousRole: AdminUser["role"] | null;
  newRole: AdminUser["role"] | null;
  amount: number | null;
  reason: string;
  createdAt: string;
  responsibleUser: { username: string };
  targetUser: { username: string } | null;
  question: { title: string } | null;
};

type ErrorPayload = { error?: { message?: string } };

const request = async <T extends object>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { credentials: "include", ...init });
  const payload = await response.json() as T | ErrorPayload;
  if (!response.ok) {
    throw new Error(("error" in payload && payload.error?.message) || "Administrator request failed.");
  }
  return payload as T;
};

export const getAdminUsers = (page: number, search: string) =>
  request<AdminPage<{ users: AdminUser[] }>>(`/api/v1/private/admin/users?page=${page}&search=${encodeURIComponent(search)}`);
export const getAdminQuestions = (page: number, search: string) =>
  request<AdminPage<{ questions: AdminQuestion[] }>>(`/api/v1/private/admin/questions?page=${page}&search=${encodeURIComponent(search)}`);
export const getAdminHistory = (page: number) =>
  request<AdminPage<{ entries: AdminHistoryEntry[] }>>(`/api/v1/private/admin/history?page=${page}`);

export const updateUserRole = (userId: string, role: AdminUser["role"], reason: string) =>
  request<{ user: AdminUser }>(`/api/v1/private/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, reason }),
  });

export const cancelAdminQuestion = (questionId: string, reason: string) =>
  request<{ status: "CANCELLED"; refunded: number }>(`/api/v1/private/admin/questions/${questionId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
