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

// Add an entry for each module.
export const LOCATIONS = {
	0: {key:'SERVER', name:'server'},
	1: {key:'BUILD', name:'build'},
	2: {key:'SSE', name:'sse'},
	3: {key:'TEMPLATES', name:'html templates'},
} as const
const WHERE = lookup(LOCATIONS, 'key')
// Add an entry for each group of processes.
export const KIND = {
	1: {key:'PARSE', name:'parse'},
	2: {key:'LOG', name: 'log'},
	3: {key:'BUILD', name:'build'},
	4: {key:'ROUTE', name:'routing'},
	5: {key:'FILE', name:'file'}
} as const satisfies IdRecord<{name:string}>
const WHAT = lookup(KIND, 'key')
export const PARSE = {
	0:{key:'MATCH', next:{
		0:{key:'SUM', name:'match summary'},
		1:{key:'SPARSE', name:'sparse match'},
		2:{key:'FULL', name:'parsed match'}
	}},
	1:{key:'PLAYER', next:{
		0:{key:'PROFILE', name:'player profile'},
		1:{key:'SPARSE', name:'sparse player'},
		2:{key:'FULL', name:'full player'}
	}},
	3:{key:'STEAM', name:'steam details'},
	4:{key:'RNKS', name:'rank distribution'},
}
export const ODOTA = {
	0:{key:'MATCH', name:'match', next:{
		1:{key:'PRO', name:'pro match'},
		2:{key:'PUB', name:'public match'},
		3:{key:'PRS', name:'parsed matches'}
	}},
	1:{key:'PLAYERS', name:'players', next:{
		0:{key:'PLR', name:'player', next:{
			0:{key:'WLC', name:'win/loss count'},
			1:{key:'RGM', name:'recent matches'},
			2:{key:'AGM', name:'matches'},
			3:{key:'HRS', name:'heroes'},
			4:{key:'PRS', name:'peers'},
			5:{key:'PRO', name:'pros'},
			6:{key:'TOT', name:'totals'},
			7:{key:'CNT', name:'counts'},
			8:{key:'HST', name:'histograms'},
			9:{key:'WRD', name:'wardmap'},
			10:{key:'CLD', name:'wordcloud'},
			11:{key:'RAT', name:'ratings'},
			12:{key:'RNK', name:'rankings'},
			13:{key:'RFS', name:'refresh'}
		}},
	}},
	2:{key:'TOP', name:'top players'},
	3:{key:'PROS', name:'pro players'},
	4:{key:'EXPLORER', name:'explorer'},
	5:{key:'META', name:'metadata'},
	6:{key:'DIST', name:'distributions'},
	7:{key:'SEARCH', name:'search'},
	8:{key:'RANKS', name:'rankings'},
	9:{key:'BENCH', name:'benchmarks'},
	10:{key:'HEALTH', name:'health'},
	11:{key:'REQU', name:'request'},
	12:{key:'FIND', name:'find matches'},
	13:{key:'HERO', name:'hero', next:{
		0:{key:'MATCHES', name:'matches'},
		1:{key:'MATCHUPS', name:'matchups'},
		2:{key:'LENGTH', name:'durations'},
		3:{key:'PLAYERS', name:'players'},
		4:{key:'ITEMS', name:'item popularity'},
		5:{key:'STATS', name:'stats'},
	}},
	14:{key:'LGS', name:'leagues', next:{
		0:{key:'LEAGUE', name:'league'},
		1:{key:'MATCHES', name:'league matches'},
		2:{key:'MATCH_IDS', name:'league match ids'},
		3:{key:'TEAMS', name:'league teams'}
	}},
	15:{key:'TEAM', name:'team', next:{
		0:{key:'MATCHES', name:'matches'},
		1:{key:'PLAYERS', name:'players'},
		2:{key:'HEROES', name:'heroes'},
	}},
	16:{key:'RCD', name:'records'},
	17:{key:'LIVE', name:'live'},
	18:{key:'SCN', name:'scenarios', next:{
		0:{key:'ITEM', name:'item timings'},
		1:{key:'ROLE', name:'lane roles'},
		2:{key:'MISC', name:'misc scenarios'},
	},
	19:{key:'SCHEMA', name:'schema'}},
	20:{key:'CNST', name:'constants'}
}
export const PARSE_TARGET = {
	[KIND.PARSE]: {key:'MATCH_SUM', set:(matchId: number) => `match summary ${matchId}`},
} as const
const TABLE = {
	[WHERE.SERVER]: {
		[WHAT.PARSE]: {
			[]
		}
	},
}


export const TEMPLATES = {
	[LVL.ERR]: (target:string) => `Could not parse ${target}`
} as const

export const CAUSE = {
	[KIND.PARSE]: {
		0: {key:'NOT_IN', set:(lookup: string, key: number|string) => ` ${key} is not in ${lookup}`}
	} as const,
	[KIND.LOG]: {
		0: {key:'NO_CODE', set:() => ``}
	} as const
} as const satisfies Record<number, IdRecord<{set: Function}>>
export function setErrorMsg(kind:string, cause:string) : string {
	return `${kind}: ${cause}`
}

export interface LogEntry {timestamp:number, code:number[], msg:string}

export function logEntry(msg: string, kind: number): LogEntry {
	return {timestamp: Date.now(), msg, code:[kind]}
}
// TODO: update to parse kind
export function getLogString(entry: LogEntry): string {
	const when = new Date(entry.timestamp).toUTCString()
	const lvlCode = entry.code.shift()
	const where = entry.code.reduce((txt, code)=>{}, '')
	if (lvlCode === undefined) {
		return {ok: false, log: [logError(setErrorMsg(WHAT[KIND.LOG].name, CAUSE[KIND.LOG][0].set()), )]}
	}
	const lvl = LVLS[lvlCode as keyof typeof LVLS].name.toUpperCase().padEnd(7, '-')
	return `${when} ${lvl} [] ${entry.msg}`
}
export function logMessage(msg: string, kind:number, log?:LogEntry[]): void {
	const entry = logEntry(msg, LVL.MSG)
	log?.push(entry)
	console.log(getLogString(entry))
}
export function logWarning(msg:string, kind:number, log?:LogEntry[]): void {
	const entry = logEntry(msg, LVL.WRN)
	log?.push(entry)
	console.warn(getLogString(entry))
}
export function logError(msg:string, kind:number, log?:LogEntry[]): void {
	const entry = logEntry(msg, LVL.ERR)
	log?.push(entry)
	console.error(getLogString(entry))
}