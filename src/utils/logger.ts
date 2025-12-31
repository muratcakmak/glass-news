/**
 * Structured logging utilities
 */

export enum LogLevel {
	DEBUG = "DEBUG",
	INFO = "INFO",
	WARN = "WARN",
	ERROR = "ERROR",
}

export interface LogEntry {
	level: LogLevel;
	message: string;
	context?: string;
	timestamp: string;
	data?: any;
}

/**
 * Create a logger with context
 */
export function createLogger(context: string) {
	return {
		debug(message: string, data?: any) {
			log(LogLevel.DEBUG, message, context, data);
		},
		info(message: string, data?: any) {
			log(LogLevel.INFO, message, context, data);
		},
		warn(message: string, data?: any) {
			log(LogLevel.WARN, message, context, data);
		},
		error(message: string, data?: any) {
			log(LogLevel.ERROR, message, context, data);
		},
	};
}

/**
 * Log a structured message
 */
function log(
	level: LogLevel,
	message: string,
	context?: string,
	data?: any
): void {
	const entry: LogEntry = {
		level,
		message,
		context,
		timestamp: new Date().toISOString(),
		data,
	};

	const prefix = context ? `[${context}]` : "";
	const dataStr = data ? ` ${JSON.stringify(data)}` : "";

	switch (level) {
		case LogLevel.DEBUG:
		case LogLevel.INFO:
			console.log(`${prefix} ${message}${dataStr}`);
			break;
		case LogLevel.WARN:
			console.warn(`${prefix} ${message}${dataStr}`);
			break;
		case LogLevel.ERROR:
			console.error(`${prefix} ${message}${dataStr}`);
			break;
	}
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(
	name: string,
	fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
	const start = Date.now();
	const result = await fn();
	const duration = Date.now() - start;
	console.log(`[Performance] ${name} took ${duration}ms`);
	return { result, duration };
}
