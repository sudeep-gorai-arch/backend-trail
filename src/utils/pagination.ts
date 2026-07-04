export interface PaginationOptions {
    page?: number;
    limit?: number;
}

export interface PaginationResult {
    page: number;
    limit: number;
    skip: number;
    take: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Converts page & limit into Prisma skip/take.
 */
export const getPagination = (
    options: PaginationOptions = {},
): PaginationResult => {
    let page = Number(options.page || DEFAULT_PAGE);
    let limit = Number(options.limit || DEFAULT_LIMIT);

    if (isNaN(page) || page < 1) {
        page = DEFAULT_PAGE;
    }

    if (isNaN(limit) || limit < 1) {
        limit = DEFAULT_LIMIT;
    }

    if (limit > MAX_LIMIT) {
        limit = MAX_LIMIT;
    }

    return {
        page,
        limit,
        skip: (page - 1) * limit,
        take: limit,
    };
};

/**
 * Builds API pagination response.
 */
export const buildPagination = (
    total: number,
    page: number,
    limit: number,
) => {
    const totalPages = Math.ceil(total / limit);

    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
};