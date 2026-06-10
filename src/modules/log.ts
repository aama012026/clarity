interface Success<T = null> {ok: true, data: T}
interface Failure {ok: false}
export type Result<T = null> = { log: LogEntry[] } & (Success<T> | Failure)
// TODO: move to appropriate module and flesh out.
interface Id<K extends number | string, V>{ key: K, value: V}

export const LOG_LVL = {
	MSG: 0,
	WRN: 1,
	ERR: 2,
	DBG: 3,
	TIP: 4,
} as const

export interface LogEntry {timestamp: number, msg: string, kind: number}

export function logEntry(msg: string, kind: number): LogEntry {
	return {timestamp: Date.now(), msg: msg, kind: kind}
}
// TODO: update to parse kind
export function getLogString(entry: LogEntry): string {
	return `[${new Date(entry.timestamp).toUTCString()}]: ${entry.msg}`
}
export function logMessage(msg: string, log?: LogEntry[]): void {
	const entry = logEntry(msg, LOG_LVL.MSG)
	log?.push(entry)
	console.log(getLogString(entry))
}
export function logWarning(msg: string, log?: LogEntry[]): void {
	const entry = logEntry(msg, LOG_LVL.WRN)
	log?.push(entry)
	console.warn(getLogString(entry))
}
export function logError(msg: string, log?: LogEntry[]): void {
	const entry = logEntry(msg, LOG_LVL.ERR)
	log?.push(entry)
	console.error(getLogString(entry))
}