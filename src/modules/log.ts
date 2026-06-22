import { nanoseconds } from "bun"
import { lookup, type Id, type IdRecord } from "./id"

// Self documentation types
type UnixTimestamp = number
type Nanoseconds = number
type Milliseconds = number
interface Success<T = null> {ok:true, data:T}
interface Failure {ok:false}
export type Result<T = null> = {log:BaseLogEvent} & (Success<T> | Failure)

const LVLS = {
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
	0:{key:'FLOW', name:'flow DOM', targets:{
		0:{key:'FETCH', name:'fetch', events:{
			0:{key:'START', level:LVL.MSG, format:(e:{url:URL}) => `Fetching ${e.url}`},
			1:{key:'OK', level:LVL.MSG, format:(e:{url:URL, status:string}) => `Fetched${e.url} (${e.status})`},
			2:{key:'BAD_RES', level:LVL.ERR, format:(e:{url:URL, status:string}) => `Could not fetch ${e.url}, (${e.status})`},
			3:{key:'ERROR', level:LVL.ERR, format:(e:{url:URL, msg:string})=> `Fetch for ${e.url} threw with error msg: ${e.msg}`}
		}},
		1:{key:'GET_ELEMENT', name:'get element', events:{
			0:{key:'OK', level:LVL.MSG, format:(e:{selector:string, all:boolean}) => `Got ${e.all? 'all elements':'element'} for ${e.selector}`},
			1:{key:'NULL', level:LVL.ERR, format:(e:{selector:string}) => `${e.selector} returned NULL`},
			2:{key:'ERROR', level:LVL.ERR, format:(e:{selector:string, all:boolean, msg:string}) => `selector query for ${e.all ? 'all elements':'element'} ${e.selector} threw: ${e.msg}`}
		}}
	}},
	1:{key:'SERVER', name:'server'},
	2:{key:'BUILD', name:'build'},
	3:{key:'SSE', name:'sse'},
	4:{key:'TEMPLATES', name:'html templates'},
	5:{key:'PARSE', name:'parse', targets:{
		0:{key:'MATCH_SUM', name:'match summary', events:{
			0: {key:'NOT_IN', level:LVL.ERR, format:(e:{matchId:number, lookup: string, key: number|string}) => `Could not parse match summary for ${e.matchId}: ${e.key} is not in ${e.lookup}`}
		}}
	}},
	6:{key:'LOG', name:'log'},
	7:{key:'ROUTE', name:'router'},
	8:{key:'FILE', name:'file'}
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

// Maps EVENT.FLOW.FETCH.OK → { source: 0, target: 0, kind: 1 }
type EventId = {[S in EventSource as Sources[S]['key']]: {
	[T in keyof EventTarget<S> as
		// only include targets that have events
		EventTarget<S>[T] extends {
			key:infer K extends string, events:any
		} ? K : never
	]: {
		[K in keyof EventKind<S, T> as
			EventKind<S, T>[K] extends {
				key:infer EK extends string
			} ? EK : never
		]: {source:S, target:T, kind:K}
	}}
}

function buildEventLookup(): EventId {
	const lookup: Record<string, Record<string, Record<string, {
		source:number, target:number, kind:number }>>> = {}
	for (const [srcId, src] of Object.entries(SOURCES)) {
		if (!('targets' in src)){
			continue
		}
		lookup[src.key] = {}
		for (const [tgtId, tgt] of Object.entries(src.targets)) {
			if (!('events' in tgt)){
				continue
			}
			lookup[src.key]![tgt.key] = {}
			for (const [evtId, evt] of Object.entries(tgt.events) as any) {
				lookup[src.key]![tgt.key]![evt.key] = {
					source:parseInt(srcId),
					target:parseInt(tgtId),
					kind:parseInt(evtId)
				}
			}
		}
	}
	return lookup as EventId
}
export const WHERE = lookup(SOURCES, 'key')
export const LOG_EVENT = buildEventLookup()

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
	time:UnixTimestamp,
	trace:Trace,
	target:number,
	kind:number,
	data:object,
	children:BaseLogEvent[]
}
interface LogEvent<
	S extends EventSource,
	T extends keyof EventTarget<S>,
	K extends keyof EventKind<S, T>
> {
	time:UnixTimestamp,
	trace:Trace,
	target:T,
	kind:K,
	data:EventData<S, T, K>,
	children:BaseLogEvent[]
}
function logEvent<
	S extends EventSource,
	T extends keyof EventTarget<S>,
	K extends keyof EventKind<S, T>
> (
	event:{source:S, target:T, kind:K},
	data:EventData<S, T, K>,
	timeUnit:'ns'|'ms',
	...children:BaseLogEvent[]
):LogEvent<S, T, K> {
	return {
		time:Date.now(),
		trace:{points:[], timeUnit},
		target:event.target,
		kind:event.kind,
		data,
		children
	}
}
export function logDomEvent<
	S extends EventSource,
	T extends keyof EventTarget<S>,
	K extends keyof EventKind<S, T>
> (
	event:{source:S, target:T, kind:K},
	data:EventData<S, T, K>,
	...children:BaseLogEvent[]
):LogEvent<S, T, K> {
	return logEvent(event, data, 'ms', ...children)
}
export function logBunEvent<
	S extends EventSource,
	T extends keyof EventTarget<S>,
	K extends keyof EventKind<S, T>
> (
	event:{source:S, target:T, kind:K},
	data:EventData<S, T, K>,
	...children:BaseLogEvent[]
):LogEvent<S, T, K> {
	return logEvent(event, data, 'ns', ...children)
}
interface TracePoint {where:Source, took?:Nanoseconds}
type Trace = {points: TracePoint[], timeUnit:'ns'|'ms'}
export function startTracingBun():Nanoseconds {return nanoseconds()}
export function startTracingDom():Milliseconds {return performance.now()}
export function getTraceBun(where:Source, startTime:Nanoseconds):TracePoint {
	return {where, took:nanoseconds() - startTime}
}
export function getTraceDom(where:Source, startTime:Milliseconds):TracePoint {
	return {where, took:performance.now() - startTime}
}

function formatLogEvent(evt: BaseLogEvent, depth = 0): string {
    const src = SOURCES[evt.trace.points[0]?.where as EventSource] as any
    const targetInfo = src?.targets?.[evt.target]
    const kindInfo = targetInfo?.events?.[evt.kind]
    const logLevel = (
    	LVLS[(kindInfo?.level ?? 0) as LogLvl]?.name ?? 'unknown'
    ).toUpperCase()

    const tracePath = evt.trace.points.toReversed().map(
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