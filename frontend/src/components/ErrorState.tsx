export default function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <p className="text-red-600" data-testid="error-state">
        {message || '加载失败，请稍后重试'}
      </p>
      {onRetry && (
        <button
          data-testid="error-retry"
          onClick={onRetry}
          className="rounded-md border border-red-300 bg-white px-4 py-1.5 text-sm text-red-600 hover:bg-red-100"
        >
          重试
        </button>
      )}
    </div>
  );
}
