import { Response } from 'express';

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Standardized success envelope used by every controller. */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  opts: { status?: number; message?: string; pagination?: Pagination } = {},
) => {
  const { status = 200, message, pagination } = opts;
  return res.status(status).json({
    success: true,
    ...(message ? { message } : {}),
    data,
    ...(pagination ? { pagination } : {}),
  });
};

export const buildPagination = (
  total: number,
  limit: number,
  offset: number,
  returnedCount: number,
): Pagination => ({
  total,
  limit,
  offset,
  hasMore: offset + returnedCount < total,
});
