/**
 * Standard response helpers
 */

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	timestamp: string;
}

export interface ApiErrorResponse {
	success: false;
	error: string;
	statusCode: number;
	timestamp: string;
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T): ApiResponse<T> {
	return {
		success: true,
		data,
		timestamp: new Date().toISOString(),
	};
}

/**
 * Create an error response
 */
export function errorResponse(
	error: string,
	statusCode: number = 500
): ApiErrorResponse {
	return {
		success: false,
		error,
		statusCode,
		timestamp: new Date().toISOString(),
	};
}

/**
 * Create a paginated response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
	count: number;
	total?: number;
	limit: number;
	offset: number;
}

export function paginatedResponse<T>(
	data: T[],
	limit: number,
	offset: number,
	total?: number
): PaginatedResponse<T> {
	return {
		success: true,
		data,
		count: data.length,
		total,
		limit,
		offset,
		timestamp: new Date().toISOString(),
	};
}
