import type { TupleType } from "typescript"
import { lookup, type Id, type IdRecord } from "./id"

interface Success<T = null> {ok: true, data: T}
interface Failure {ok: false}
export type Result<T = null> = { log: LogEntry[] } & (Success<T> | Failure)

// :bind:matchsummary:err
type LogCode = {lookup:number, name:string}
export const LVLS = {
	0: {key:'MSG', name:'message'},
	1: {key:'WRN', name:'warning'},
	2: {key:'ERR', name:'error'},
	3: {key:'DBG', name:'debug'},
	4: {key:'TIP', name:'hint'}
} as const satisfies IdRecord<{name: string}>
const LVL = lookup(LVLS, 'key')
export const KIND = {
	0: {key:'PARSE', lookup:1, name:'parse'},
} as const satisfies IdRecord<LogCode>
export const BIND_TARGET = {
	0: (matchId: number) => `match summary ${matchId}`,
}
export const PARSE_STRING = {
	[LVL.ERR]: (target: string) => `Could not parse ${target}`
}

export const VALIDATION_ERR_CAUSE = {
	notIn: (key: number | string, lookup: string) => ` ${key} is not in ${lookup}`
}
export const BIND_MSG = {
	HERO_ID: (kind: string, cause: number, target) => `${kind}: ${cause}`
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
	const entry = logEntry(msg, LVL.MSG)
	log?.push(entry)
	console.log(getLogString(entry))
}
export function logWarning(msg: string, log?: LogEntry[]): void {
	const entry = logEntry(msg, LVL.WRN)
	log?.push(entry)
	console.warn(getLogString(entry))
}
export function logError(msg: string, log?: LogEntry[]): void {
	const entry = logEntry(msg, LVL.ERR)
	log?.push(entry)
	console.error(getLogString(entry))
}