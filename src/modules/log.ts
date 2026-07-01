import { nanoseconds } from "bun"
import { lookup, type Id, type IdRecord } from "./id"

// Self documentation types
type UnixTimestamp = number
type Nanoseconds = number
type Milliseconds = number
type Success<T = null> = {ok:true, data:T}
interface Failure {ok:false, data?:never}
export type Result<T = null> = {trace:TracePoint} & (Success<T> | Failure)
export type Status = {trace:TracePoint, ok:boolean}

const LVLS = {
	0: {key:'MSG', name:'message'},
	1: {key:'WRN', name:'warning'},
	2: {key:'ERR', name:'error'},
	3: {key:'DBG', name:'debug'},
	4: {key:'TIP', name:'hint'}
} as const satisfies IdRecord<{name:string}>
const LVL = lookup(LVLS, 'key')
type LogLvl = keyof typeof LVLS

const SOURCES = {
	0:{key:'DOM', name:'flow DOM'},
	1:{key:'FILE', name:'file'},
	2:{key:'BUN', name:'server'},
	3:{key:'BUILD', name:'build'},
	4:{key:'TEST', name:'test'},
	5:{key:'LOG', name:'log'},
	6:{key:'ROUTE', name:'route'},
} as const satisfies IdRecord<{name:string}>
const SRC = lookup(SOURCES, 'key')
type Source = typeof SOURCES[keyof typeof SOURCES]
type SourceId = keyof typeof SOURCES

// Add an entry for each module / subprocess.
const TARGETS = {
	0:{key:'FETCH', name:'fetch'},
	1:{key:'GET_ELEMENT', name:'get element'},
	2:{key:'READ', name:'read'},
	3:{key:'WRITE', name:'write'},
	4:{key:'ID_BINDS', name:'update id bindings'},
	5:{key:'HEROES', name:'heroes'},
	6:{key:'ITEMS', name:'items'},
	7:{key:'ABILITIES', name:'abilities'},
	8:{key:'MATCH_SUM', name:'match summary'},
	9:{key:'PICK_BAN', name: 'pick/ban'},
	10:{key:'TIMINGS', name:'timings'},
	11:{key:'LOG_NI', name:'neutral items log'},
	12:{key:'PARSED_PLAYER', name:'parsed player'},
	13:{key:'BIND_ITEM', name:'bind item'}
} as const satisfies IdRecord<{name:string}>
export const TARGET = lookup(TARGETS, 'key')
type Target = typeof TARGETS
type TargetId = keyof typeof TARGETS

const EVENTS = {
	0:{key:'START', lvl:LVL.DBG},
	1:{key:'DONE', lvl:LVL.DBG},
	2:{key:'THROW', lvl:LVL.ERR, msg:(e:string) => `Threw with error msg: ${e}`},
	3:{key:'FETCH_OK', lvl:LVL.MSG, msg:(e:{url:URL, status:string}
	) => `Fetched${e.url} (${e.status})`},
	4:{key:'FETCH_BAD', lvl:LVL.ERR, msg:(e:{url:URL, status:string}
	) => `Could not fetch ${e.url}, (${e.status})`},
	5:{key:'GOT_NULL', lvl:LVL.ERR, msg:() => `returned NULL`},
	6:{key:'DUPE_KEYS', lvl:LVL.ERR, msg:(e:{msgs:string[]}
	) => `Duplicate entries in existing bindings:${e.msgs.join()}`},
	7:{key:'KEY_REBIND', lvl:LVL.WRN, msg:(
		e:{key:string, oldExt:number, newExt:number}
	) => `External id for key ${e.key} changed from ${e.oldExt} to ${e.newExt}`},
	8:{key:'EXT_REBIND', lvl:LVL.WRN, msg:(e:{key:string, oldBinding:string}
	) => `External id for new key ${e.key} was already bound: ${e.oldBinding}`},
	9:{key:'RETIRE_BIND', lvl:LVL.WRN, msg:(e:{binding:string}
	) => `Retired binding ${e.binding} which is not present in new dataset`},
	10:{key:'NEW_BIND', lvl:LVL.MSG, msg:(e:{binding:string}
	) => `Added new binding ${e.binding}`},
	11:{key:'MISSING_ITEM_NAME', lvl:LVL.WRN, msg:(
		e:{dataName:string, generatedName:string}
	) => `${e.dataName} does not have property dname. Generated name: ${e.generatedName}`},
	12:{key:'NOT_IN', lvl:LVL.ERR, msg:(
		e:{lookup:string, key:number|string}
	) => `${e.key} not in ${e.lookup}`},
	13:{key:'WROTE', lvl:LVL.MSG, msg:(
		e:{filePath:string, bytesWritten:number}
	) => `Wrote ${e.bytesWritten} to ${e.filePath}`}
} as const satisfies IdRecord<{lvl:LogLvl, msg?:(...args: any[]) => string}>
export const EVENT = lookup(EVENTS, 'key')
type EventId = Extract<keyof typeof EVENTS, number>

type EventData<E extends EventId> = (
	typeof EVENTS[E] extends {msg: infer Fn extends (...args: any[]) => string }
	? Parameters<Fn> extends [infer P] ? P : never
	: never
)
type EventArgs<E extends EventId> = (
	EventData<E> extends never ? [] : [args:EventData<E>]
)
export type TraceEvent<E extends EventId> = {
	kind:E, time:number, data?:EventData<E>
}

export function traceEvent<E extends EventId> (
	event:E, time:number, ...args:EventArgs<E>
):TraceEvent<E> {
	return {kind:event, time, data:args[0]}
}
export function traceEventBun<E extends EventId>(event:E, ...args:EventArgs<E>
):TraceEvent<E> {
	return traceEvent(event, nanoseconds(), ...args)
}
export function traceEventDom<E extends EventId>(event:E, ...args:EventArgs<E>
):TraceEvent<E> {
	return traceEvent(event, performance.now(), ...args)
}

type TimeUnit = 'ns'|'ms'
export interface TracePoint {
	when:number,
	where:TargetId,
	who?:number|string,
	what?:{
		children?:TracePoint[],		// Acts like branches in practice
		events?:TraceEvent<any>[],	// Acts like leaves in practice
	}
}
export type TraceInfo = TracePoint['what']
export function traceBun(trace:Omit<TracePoint, 'when'>):TracePoint {
	return {when:nanoseconds()*0.001, ...trace}
}
export function traceDom(trace:Omit<TracePoint, 'when'>):TracePoint {
	return {when:performance.now(), ...trace}
}
interface Log {
	lvls:IdRecord<{name:string}>
	targets:IdRecord<{name:string}>,
	events:IdRecord<{lvl:LogLvl, msg?:(e:any) => string}>,
	traces:TracePoint[],
	timestamp:UnixTimestamp,
}

function formatTraceEvent(
	event:TraceEvent<any>,
	prevTime:number,
	lvls:IdRecord<{name:string}>,
	events:IdRecord<{lvl:LogLvl, msg?:(...args:any[]) => string}>
):{msg:string|null, time:number} {
	const getMsg = events[event.kind]?.msg
	if(getMsg === undefined) {
		return {msg:null, time:event.time}
	}
	const msg = getMsg(event.data)
	const lvl = lvls[events[event.kind]?.lvl!]?.name ?? ''
	const deltaTime = event.time - prevTime
	return {msg:`${lvl.toUpperCase()}: ${msg} (${deltaTime}ms)`, time:event.time}
}
function formatTraceLine(tracePoints:string[]):string {
	const target = ` > ${tracePoints.pop()}`
	return tracePoints.join(':') + target
}
function formatTracePoint(log:Log, depth = 0): string {
	const {targets, events, traces, timestamp} = log
	const dateTime = new Date(timestamp).toUTCString()
	for(const trace of traces) {
		const startTime = trace.when
		const startString = new Date(timestamp-startTime).toUTCString()
		const tracePath:string[] = []
		let target = targets[trace.where]?.name ?? 'unknown'
		if(trace.who) {
			target += ` ${trace.who}`
		}
		if(trace.what?.children?.length === 1 && (!trace.what.events || trace.what.events.length > 0)) {
			// Recursion, but without indentation and linebreak
			// Current target should be on same line with <:name> unless it is first
		}
		if(!trace.what) {
			tracePath.push(target)
		}
	}
    const targetInfo = src?.targets?.[evt.target]
    const kindInfo = targetInfo?.events?.[evt.kind]
    const logLevel = (
    	LVLS[(kindInfo?.level ?? 0) as LogLvl]?.name ?? 'unknown'
    ).toUpperCase()

    const tracePath = evt.trace.points.toReversed().map(
    	tp => SOURCES[tp.where as SourceId].name
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
        ...evt.children.map(c => formatTracePoint(c, depth + 1))
    ].join('\n')
}