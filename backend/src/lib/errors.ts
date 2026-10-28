export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

export const errors = {
  unauthorized: () => new AppError(401, 'UNAUTHORIZED', 'Authentication required'),
  forbidden: () => new AppError(403, 'FORBIDDEN', 'Forbidden'),
  notFound: (message = 'Resource not found') => new AppError(404, 'NOT_FOUND', message),
  conflict: (message: string) => new AppError(409, 'CONFLICT', message),
  validation: (message: string) => new AppError(400, 'VALIDATION_ERROR', message),
};
