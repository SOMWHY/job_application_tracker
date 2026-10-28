import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { Application, ApplicationStatus, InterviewRound, Note } from '../types';
import { api } from './api';
import type { ListParams } from './api';

export type ApplicationListParams = ListParams;

export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (params: ApplicationListParams) =>
    [...applicationKeys.lists(), params] as const,
  detail: (id: string) => [...applicationKeys.all, 'detail', id] as const,
  stats: () => [...applicationKeys.all, 'stats'] as const,
  notes: (id: string) => [...applicationKeys.all, 'notes', id] as const,
  interviews: (id: string) => [...applicationKeys.all, 'interviews', id] as const,
};

export function useApplications(params: ApplicationListParams = {}) {
  return useQuery({
    queryKey: applicationKeys.list(params),
    queryFn: () => api.listApplications(params),
    placeholderData: keepPreviousData,
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => api.getApplication(id),
    enabled: Boolean(id),
  });
}

export function useStats() {
  return useQuery({
    queryKey: applicationKeys.stats(),
    queryFn: () => api.getStats(),
  });
}

export function useNotes(id: string) {
  return useQuery({
    queryKey: applicationKeys.notes(id),
    queryFn: () => api.listNotes(id),
    enabled: Boolean(id),
  });
}

export function useInterviews(id: string) {
  return useQuery({
    queryKey: applicationKeys.interviews(id),
    queryFn: () => api.listInterviews(id),
    enabled: Boolean(id),
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.createApplication>[0]) =>
      api.createApplication(input),
    onSuccess: async (created) => {
      queryClient.setQueryData(applicationKeys.detail(created.id), created);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.stats() }),
      ]);
    },
  });
}

export function useUpdateApplication(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.updateApplication>[1]) =>
      api.updateApplication(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(applicationKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    },
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) =>
      api.updateStatus(id, status),
    onMutate: async ({ id, status: newStatus }) => {
      const detailKey = applicationKeys.detail(id);
      const listKeys = queryClient
        .getQueryCache()
        .findAll({ queryKey: applicationKeys.lists() });

      await Promise.all(
        listKeys.map((query) =>
          queryClient.cancelQueries({ queryKey: query.queryKey }),
        ),
      );
      await queryClient.cancelQueries({ queryKey: detailKey });

      const previousDetail = queryClient.getQueryData<Application>(detailKey);
      const previousLists = new Map(
        listKeys.map((query) => [
          JSON.stringify(query.queryKey),
          queryClient.getQueryData(query.queryKey),
        ]),
      );

      if (previousDetail) {
        queryClient.setQueryData<Application>(detailKey, {
          ...previousDetail,
          status: newStatus,
        });
      }

      for (const query of listKeys) {
        queryClient.setQueryData(query.queryKey, (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          const data = old as { items?: Application[] };
          if (!Array.isArray(data.items)) return old;
          return {
            ...data,
            items: data.items.map((item) =>
              item.id === id ? { ...item, status: newStatus } : item,
            ),
          };
        });
      }

      return { previousDetail, previousLists, detailKey, listKeys };
    },
    onError: (_err, _newStatus, context) => {
      if (!context) return;
      if (context.previousDetail !== undefined) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
      }
      for (const query of context.listKeys) {
        const key = JSON.stringify(query.queryKey);
        if (context.previousLists.has(key)) {
          queryClient.setQueryData(query.queryKey, context.previousLists.get(key));
        }
      }
    },
    onSettled: async (_data, _error, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.stats() }),
      ]);
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteApplication(id),
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: applicationKeys.detail(id) });
      queryClient.removeQueries({ queryKey: applicationKeys.notes(id) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.stats() }),
      ]);
    },
  });
}

export function useCreateNote(applicationId: string) {
  const queryClient = useQueryClient();
  const notesKey = applicationKeys.notes(applicationId);

  return useMutation({
    mutationFn: (content: string) => api.createNote(applicationId, content),
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: notesKey });
      const previousNotes = queryClient.getQueryData<Note[]>(notesKey) ?? [];
      const tempNote: Note = {
        id: `temp-${Date.now()}`,
        applicationId,
        content,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Note[]>(notesKey, [tempNote, ...previousNotes]);
      return { previousNotes };
    },
    onError: (_err, _content, context) => {
      if (context) queryClient.setQueryData(notesKey, context.previousNotes);
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Note[]>(notesKey, (old) => {
        const rest = (old ?? []).filter((n) => !n.id.startsWith('temp-'));
        return [created, ...rest];
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notesKey }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) }),
      ]);
    },
  });
}

export function useDeleteNote(applicationId: string) {
  const queryClient = useQueryClient();
  const notesKey = applicationKeys.notes(applicationId);

  return useMutation({
    mutationFn: (noteId: string) => api.deleteNote(applicationId, noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: notesKey });
      const previousNotes = queryClient.getQueryData<Note[]>(notesKey) ?? [];
      queryClient.setQueryData<Note[]>(
        notesKey,
        previousNotes.filter((n) => n.id !== noteId),
      );
      return { previousNotes };
    },
    onError: (_err, _noteId, context) => {
      if (context) queryClient.setQueryData(notesKey, context.previousNotes);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: notesKey }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) }),
      ]);
    },
  });
}

function sortRounds(rounds: InterviewRound[]): InterviewRound[] {
  return [...rounds].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export function useCreateInterview(applicationId: string) {
  const queryClient = useQueryClient();
  const interviewsKey = applicationKeys.interviews(applicationId);

  return useMutation({
    mutationFn: (input: Parameters<typeof api.createInterview>[1]) =>
      api.createInterview(applicationId, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: interviewsKey });
      const previous = queryClient.getQueryData<InterviewRound[]>(interviewsKey) ?? [];
      const temp: InterviewRound = {
        id: `temp-${Date.now()}`,
        applicationId,
        type: input.type,
        scheduledAt: input.scheduledAt,
        result: input.result ?? 'PENDING',
        feedback: input.feedback ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData<InterviewRound[]>(interviewsKey, sortRounds([...previous, temp]));
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context) queryClient.setQueryData(interviewsKey, context.previous);
    },
    onSuccess: (created) => {
      queryClient.setQueryData<InterviewRound[]>(interviewsKey, (old) => {
        const rest = (old ?? []).filter((r) => !r.id.startsWith('temp-'));
        return sortRounds([...rest, created]);
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: interviewsKey }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.stats() }),
      ]);
    },
  });
}

export function useDeleteInterview(applicationId: string) {
  const queryClient = useQueryClient();
  const interviewsKey = applicationKeys.interviews(applicationId);

  return useMutation({
    mutationFn: (interviewId: string) => api.deleteInterview(applicationId, interviewId),
    onMutate: async (interviewId) => {
      await queryClient.cancelQueries({ queryKey: interviewsKey });
      const previous = queryClient.getQueryData<InterviewRound[]>(interviewsKey) ?? [];
      queryClient.setQueryData<InterviewRound[]>(
        interviewsKey,
        previous.filter((r) => r.id !== interviewId),
      );
      return { previous };
    },
    onError: (_err, _interviewId, context) => {
      if (context) queryClient.setQueryData(interviewsKey, context.previous);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: interviewsKey }),
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) }),
      ]);
    },
  });
}
