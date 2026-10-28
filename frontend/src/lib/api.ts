import type {
  Application,
  ApplicationListResponse,
  ApplicationStatus,
  InterviewRound,
  InterviewRoundResult,
  InterviewRoundType,
  Note,
  StatsResponse,
} from '../types';

const BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = body?.error?.message ?? `Request failed (${res.status})`;
    const err = new Error(message) as Error & { status: number; code: string };
    err.status = res.status;
    err.code = body?.error?.code;
    throw err;
  }

  return body as T;
}

export interface ListParams {
  status?: ApplicationStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateApplicationInput {
  company: string;
  position: string;
  appliedDate: string;
  status?: ApplicationStatus;
  source?: string;
  link?: string;
}

export interface UpdateApplicationInput {
  company?: string;
  position?: string;
  appliedDate?: string;
  source?: string | null;
  link?: string | null;
}

export interface CreateInterviewInput {
  type: InterviewRoundType;
  scheduledAt: string;
  result?: InterviewRoundResult;
  feedback?: string;
}

export const api = {
  listApplications: (params: ListParams = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.q) qs.set('q', params.q);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<ApplicationListResponse>(`/api/applications${suffix}`);
  },

  getApplication: (id: string) => request<Application>(`/api/applications/${id}`),

  createApplication: (data: CreateApplicationInput) =>
    request<Application>('/api/applications', { method: 'POST', body: JSON.stringify(data) }),

  updateApplication: (id: string, data: UpdateApplicationInput) =>
    request<Application>(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  updateStatus: (id: string, status: ApplicationStatus) =>
    request<Application>(`/api/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteApplication: (id: string) =>
    request<void>(`/api/applications/${id}`, { method: 'DELETE' }),

  listNotes: (id: string) => request<Note[]>(`/api/applications/${id}/notes`),

  createNote: (id: string, content: string) =>
    request<Note>(`/api/applications/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  deleteNote: (applicationId: string, noteId: string) =>
    request<void>(`/api/applications/${applicationId}/notes/${noteId}`, { method: 'DELETE' }),

  getStats: () => request<StatsResponse>('/api/applications/stats'),

  listInterviews: (id: string) =>
    request<InterviewRound[]>(`/api/applications/${id}/interviews`),

  createInterview: (id: string, data: CreateInterviewInput) =>
    request<InterviewRound>(`/api/applications/${id}/interviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteInterview: (applicationId: string, interviewId: string) =>
    request<void>(`/api/applications/${applicationId}/interviews/${interviewId}`, {
      method: 'DELETE',
    }),
};
