import { EVENT, TARGET, traceDom, traceEvent, traceEventDom, type Result, type TraceEvent, type TracePoint } from "./log"

// USER LIBRARY WITH UNIQUE NAME TO AVOID STANDARD COLLISIONS
export declare const _brand: unique symbol
export type Unique<T, B> = T & {readonly [_brand]: B}
export type Id<B> = Unique<number, B>

export type UnixTimestamp = Unique<number, 'unix_timestamp'>
export type ISO8601TimeString = Unique<string, 'ISO8601_timestamp'>

type NullsAsUndefined<T> = {
	[K in keyof T]: null extends T[K] ? Exclude<T[K], null> | undefined : T[K];
}
export function nullsToUndefined<T extends object>(obj: T): NullsAsUndefined<T> {
	return Object.fromEntries(
		Object.entries(obj).map(([k, v]) => [k, v ?? undefined])
	) as NullsAsUndefined<T>
}
export function isEmpty<T extends object>(obj: T): boolean {
	return !Object.values(obj).some(v => !!v)
}

export function getLocalOrInit<T>(key: string, initValue: T): T {
	return ((item) => item ? JSON.parse(item) : initValue)(localStorage.getItem(key))
}

export function tryGetLocal<T>(key: string): T | null {
	return ((item) => item ? JSON.parse(item) : null)(localStorage.getItem(key))
}

export function setLocal<T>(key: string, value: T) {
	localStorage.setItem(key, JSON.stringify(value))
}

export async function tryFetchJson<T>(url: URL, requestInit: RequestInit = {}): Promise<Result<T>> {
	const trace = {
		where:TARGET.FETCH,
		what:{events:[] as TraceEvent<any>[]}
	} satisfies Omit<TracePoint, 'when'>
	try {
		const response = await fetch(url, requestInit)
		const status = `${response.status}: ${response.statusText}`
		if(!response.ok) {
			trace.what.events.push(traceEventDom(EVENT.FETCH_BAD, {url, status}))
			return {trace:traceDom(trace), ok:false}
		}
		const data = await response.json() as T
		trace.what.events.push(traceEventDom(EVENT.FETCH_OK, {url, status}))
		return {data, ok:true, trace:traceDom(trace)}
	}
	catch (error) {
		const msg = error instanceof Error ? error.message : 'error not instance of Error'
		trace.what.events.push(traceEventDom(EVENT.THROW, msg))
		return {trace:traceDom(trace), ok:false}
	}
}

export async function tryGetImg(url: URL):Promise<Result<ArrayBuffer>> {
	const trace = {
		where:TARGET.FETCH,
		what:{events:[] as TraceEvent<any>[]}
	} satisfies Omit<TracePoint, 'when'>
	try {
		const response = await fetch(url)
		const status = `${response.status}: ${response.statusText}`
		if (!response.ok) {
			trace.what.events.push(
				traceEventDom(EVENT.FETCH_BAD, {url, status})
			)
			return {trace:traceDom(trace), ok:false}
		}
		const data = await response.arrayBuffer()
		trace.what.events.push(traceEventDom(EVENT.FETCH_OK, {url, status}))
		return {data, ok:true, trace:traceDom(trace)}
	}
	catch (error) {
		const msg = error instanceof Error ? error.message : 'error not instance of Error'
		trace.what.events.push(traceEventDom(EVENT.THROW, msg))
		const namedTrace:Omit<TracePoint, 'when'> = {
			...trace, who:url.href
		}
		return {trace:traceDom(namedTrace), ok:false}
	}
}

// HTML
export interface NamedElement {node: Element | DocumentFragment, name: string}

export function tryGetElement<T extends Element>(selector: string, root?: NamedElement): Result<T> {
	const where = TARGET.GET_ELEMENT
	const rootNode = root? root.node : document;
	const fullSelector = `${root? root.name : 'document'} selector`;
	const element = rootNode.querySelector(selector)
	if(!element) {
		const trace = traceDom({
			where,
			who:fullSelector,
			what:{events:[traceEventDom(EVENT.GOT_NULL)]}
		})
		return {trace, ok:false}
	}
	return {data:element as T, ok:true, trace:traceDom({where})}
}

export function tryGetElements(selector: string, root?: NamedElement): Result<NodeListOf<Element>> {
	const where = TARGET.GET_ELEMENT
	const rootNode = root ? root.node : document;
	const fullSelector = `${root? root.name : 'document'} selector`;
	try {
		const elements = rootNode.querySelectorAll(selector)
		return {data:elements, ok:true, trace:traceDom({where})}
	}
	catch(error) {
		const msg = error instanceof Error ? error.message : 'error not instance of Error'
		const event = traceEventDom(EVENT.THROW, msg)
		const trace = traceDom({
			where, who:fullSelector, what:{events:[event]}
		})
		return {trace, ok:false}
	}
}

export function round(number: number, decimals?: number): number {
	const factor = Math.pow(10, decimals ?? 0)
	return Math.round(number * factor) / factor
}



export function stringify(value: unknown, tabStops = 0, keyLength = 0): string {
	const MAX_COLUMNS = 80
	const TAB_SIZE = 4
	const outerTab = '\t'.repeat(tabStops)
	const innerTab = '\t'.repeat(tabStops + 1)

	// Return as literals instead of string versions (don't wrap in quotes)
	if(value === null || typeof value === 'number' || typeof value === 'boolean') {
		return `${value}`
	}

	// Format objects and arrays
	if(Array.isArray(value)) {
		if(value.length === 0) return '[]'
		const items = value.map(i =>
			`${stringify(i, tabStops + 1)}`
		)
		return `[${formatCollection(items)}]`
	}

	if(typeof value === 'object') {
		if(isEmpty(value)) {
			return JSON.stringify(value, null, '\t')
		}
		const entries: string[] = []
		Object.entries(value).forEach(([k, v]) => {
			if(v === undefined){
				return
			}
			// Unquoted key if valid, quoted if not
			const key = /^\w+$/.test(k) ? k : JSON.stringify(k)
			entries.push (`${key}: ${stringify(v, tabStops + 1, key.length)}`)
		})
		return `{${formatCollection(entries)}}`
	}
	// Catch other types we don't know or care about
	else {
		return JSON.stringify(value, null, '\t')
	}
	// Format on same line or one separate line if possible.
	function formatCollection(items: string[]) {
		const itemsString = items.join(', ')
		if(itemsString.length + keyLength + tabStops * 4 <= MAX_COLUMNS - 2) {
			return `${itemsString}`
		}
		else if(itemsString.length + (tabStops + 1) * TAB_SIZE <= MAX_COLUMNS) {
			return `\n${innerTab + itemsString}\n${outerTab}`
		}
		else {
			return `\n${
				innerTab + items.join(`,\n${innerTab}`)}\n${outerTab}`
		}
	}
}