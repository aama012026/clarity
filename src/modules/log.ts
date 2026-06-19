import { nanoseconds } from "bun"
import { lookup, type Id, type IdRecord } from "./id"

// Self documentation types
type UnixTimestamp = number
type Nanoseconds = number
interface Success<T = null> {ok:true, data:T}
interface Failure {ok:false}
export type Result<T = null> = {log:LogEntry} & (Success<T> | Failure)

export const LVLS = {
	0: {key:'MSG', name:'message'},
	1: {key:'WRN', name:'warning'},
	2: {key:'ERR', name:'error'},
	3: {key:'DBG', name:'debug'},
	4: {key:'TIP', name:'hint'}
} as const satisfies IdRecord<{name: string}>
const LVL = lookup(LVLS, 'key')
type LogLvl = keyof typeof LVLS
// Add an entry for each module / subprocess.
export const SOURCES = {
	0:{key:'SERVER', name:'server'},
	1:{key:'BUILD', name:'build'},
	2:{key:'SSE', name:'sse'},
	3:{key:'TEMPLATES', name:'html templates'},
	4:{key:'PARSE', name:'parse', targets:{
		0:{key:'MATCH_SUM', name:'match summary', events:{
			0: {key:'NOT_IN', level:LVL.ERR, format:(e:{matchId:number, lookup: string, key: number|string}) => `Could not parse match summary for ${e.matchId}: ${e.key} is not in ${e.lookup}`}
		}}
	}},
	5:{key:'LOG', name:'log'},
	6:{key:'ROUTE', name:'router'},
	7:{key:'FILE', name:'file'}
} as const

type Sources = typeof SOURCES
type Source = keyof Sources
// Filters to only sources that have targets prop.
type EventSource = {
	[K in Source]:Sources[K] extends {targets:any} ? K : never
}[Source]
// Union of keys in targets for a given EventSource.
type EventTarget<Src extends EventSource
> = Sources[Src] extends {targets:infer E} ? E : never
// Union of keys in events for a given EventTarget.
type EventKind<S extends EventSource, T extends keyof EventTarget<S>
> = EventTarget<S>[T] extends {events:infer K} ? K : never
// typeof signature for a given event format function
type EventData<
	S extends EventSource,
	T extends keyof EventTarget<S>,
	K extends keyof EventKind<S, T>
> = (
	// typeof format function or never if not present
	EventKind<S, T>[K] extends {format: infer F} ? F : never
) extends (e: infer P) => any ? P : never
const WHERE = lookup(SOURCES, 'key')

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
interface BaseLogEvent {
	time:UnixTimestamp, trace:TracePoint[], target:number, kind:number, data:object, children:BaseLogEvent[]
}
interface LogEvent<
	S extends EventSource,
	T extends keyof EventTarget<S>,
	K extends keyof EventKind<S, T>
> {
	time:UnixTimestamp,
	trace:TracePoint[],
	target:T,
	kind:K,
	data:EventData<S, T, K>,
	children:BaseLogEvent[]
}
export function logEvent<
	S extends EventSource,
	T extends keyof EventTarget<S>,
	K extends keyof EventKind<S, T>
> (target:T, kind:K, data:EventData<S, T, K>, ...children:BaseLogEvent[])
: LogEvent<S, T, K> {
	return {time:Date.now(), trace:[], target, kind, data, children}
}
interface TracePoint {where:Source, took:Nanoseconds}
function startTracing():Nanoseconds {return nanoseconds()}
function getTrace(where:Source, startTime:Nanoseconds):TracePoint {
	return {where, took:nanoseconds() - startTime}
}
export interface LogEntry{trace:TracePoint[], events:BaseLogEvent[]}
const startTime = startTracing()
const e:LogEntry = {trace:[getTrace(WHERE.PARSE, startTime)], events:[]}
e.events.push(logEvent(0, 0, {matchId:24870334, lookup:'HEROES', key:0}))

function formatLogEvent(evt: BaseLogEvent, depth = 0): string {
    const src = SOURCES[evt.trace[0]?.where as EventSource] as any
    const targetInfo = src?.targets?.[evt.target]
    const kindInfo = targetInfo?.events?.[evt.kind]
    const logLevel = (
    	LVLS[(kindInfo?.level ?? 0) as LogLvl]?.name ?? 'unknown'
    ).toUpperCase()

    const tracePath = evt.trace.toReversed().map(
    	tp => SOURCES[tp.where as Source].name
    ).join(':')
    const where = `[${tracePath} > ${targetInfo?.name ?? evt.target}]`
    const what = kindInfo?.format(evt.data) ?? `[unknown event]`

    const indent = '\t'.repeat(depth * 2)
    const timeStr = depth === 0
        ? new Date(evt.time).toUTCString()
        : new Date(evt.time).toUTCString().split(' ').slice(4).join(' ')

    return [
        `${indent}${timeStr} ${logLevel}: ${where}`,
        `${indent}\t${what}`,
        ...evt.children.map(c => formatLogEvent(c, depth + 1))
    ].join('\n')
}