import { QueryCache, QueryClient } from '@tanstack/react-query';

export function formatApiError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return '请求失败，请稍后重试';
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // 全局统一兜底：把后端 { error: { code, message } } 的文案透出。
      // 组件侧可再通过 ErrorState 的「重试」触发 invalidate 重新拉取。
      console.error('[query]', formatApiError(error));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
