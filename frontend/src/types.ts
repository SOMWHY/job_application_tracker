export type ApplicationStatus = 'PENDING' | 'INTERVIEW' | 'REJECTED' | 'OFFER';

export type InterviewRoundType = 'PHONE' | 'TECH' | 'ONSITE' | 'HR';
export type InterviewRoundResult = 'PENDING' | 'PASS' | 'FAIL';

export interface Note {
  id: string;
  applicationId: string;
  content: string;
  createdAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  changedAt: string;
}

export interface InterviewRound {
  id: string;
  applicationId: string;
  type: InterviewRoundType;
  scheduledAt: string;
  result: InterviewRoundResult;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  userId: string;
  company: string;
  position: string;
  appliedDate: string;
  status: ApplicationStatus;
  source: string | null;
  link: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: Note[];
  statusHistory?: StatusHistoryEntry[];
  interviewRounds?: InterviewRound[];
  _count?: { notes: number };
}

export interface ApplicationListResponse {
  items: Application[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface StatsResponse {
  total: number;
  counts: Record<ApplicationStatus, number>;
  recent: Application[];
}

export interface ApiError {
  error: { code: string; message: string };
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: '待处理',
  INTERVIEW: '面试中',
  REJECTED: '已拒绝',
  OFFER: '已 Offer',
};

export const STATUS_ORDER: ApplicationStatus[] = ['PENDING', 'INTERVIEW', 'REJECTED', 'OFFER'];

export const INTERVIEW_TYPE_LABELS: Record<InterviewRoundType, string> = {
  PHONE: '电话',
  TECH: '技术',
  ONSITE: '现场',
  HR: 'HR',
};

export const INTERVIEW_RESULT_LABELS: Record<InterviewRoundResult, string> = {
  PENDING: '待定',
  PASS: '通过',
  FAIL: '未通过',
};
