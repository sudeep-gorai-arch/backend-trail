import { Response } from "express";

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
  pagination?: Pagination;
  timestamp: string;
}

class ApiResponder {
  success<T>(
    res: Response,
    data: T,
    options: {
      status?: number;
      message?: string;
      pagination?: Pagination;
    } = {}
  ) {
    return res.status(options.status ?? 200).json({
      success: true,
      message: options.message,
      data,
      pagination: options.pagination,
      timestamp: new Date().toISOString(),
    });
  }

  created<T>(
    res: Response,
    data: T,
    message = "Created successfully"
  ) {
    return this.success(res, data, {
      status: 201,
      message,
    });
  }

  error(
    res: Response,
    message = "Something went wrong",
    status = 500,
    errors?: unknown
  ) {
    return res.status(status).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  validation(
    res: Response,
    errors: unknown,
    message = "Validation failed"
  ) {
    return this.error(
      res,
      message,
      400,
      errors
    );
  }

  unauthorized(
    res: Response,
    message = "Unauthorized"
  ) {
    return this.error(res, message, 401);
  }

  forbidden(
    res: Response,
    message = "Forbidden"
  ) {
    return this.error(res, message, 403);
  }

  notFound(
    res: Response,
    message = "Resource not found"
  ) {
    return this.error(res, message, 404);
  }

  conflict(
    res: Response,
    message = "Resource already exists"
  ) {
    return this.error(res, message, 409);
  }

  noContent(res: Response) {
    return res.status(204).send();
  }
}

export const response = new ApiResponder();

export const buildPagination = (
  total: number,
  limit: number,
  offset: number,
  returnedCount: number
): Pagination => ({
  total,
  limit,
  offset,
  hasMore: offset + returnedCount < total,
});