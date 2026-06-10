// USER LIBRARY WITH UNIQUE NAME TO AVOID STANDARD COLLISIONS
export declare const _brand: unique symbol
export type Unique<T, B> = T & {readonly [_brand]: B}
export type Id<B> = Unique<number, B>

export type UnixTimestamp = Unique<number, 'unix_timestamp'>
export type ISO8601TimeString = Unique<string, 'ISO8601_timestamp'>
export const RESPONSE_CODES: Record<number, string> = {
	// Informational responses
	100: 'Continue',
	101: 'Switching Protocols',
	102: 'Processing (deprecated)',
	103: 'Early Hints',
	// Success responses
	200: 'Ok',
	201: 'Created',
	202: 'Accepted',
	203: 'Non-Authoritative Information',
	204: 'No Content',
	205: 'Reset Content',
	206: 'Partial Content',
	207: 'Multi-Status (WebDAV)',
	208: 'Already Reported (WebDav)',
	226: 'IM Used (HTTP Delta encoding)',
	// Redirection messages
	300: 'Multiple Choices',
	301: 'Moved Permanently',
	302: 'Found',
	303: 'See Other',
	304: 'Not Modified', // Server usually handle, so we receive a 200 OK with the cached content.
	305: 'Use Proxy (deprecated)',
	306: 'unused, but reserved response_code',
	307: 'Temporary Redirect',
	308: 'Permanent Redirect',
	// Client error responses
	400: 'Bad Request',
	401: 'Unauthorized',
	402: 'Payment Required',
	403: 'Forbidden',
	404: 'Not Found', // Not billed by OpenDotaAPI. Maybe not counted?
	405: 'Method Not Allowed',
	406: 'Not Acceptable',
	407: 'Proxy Authentication Required',
	408: 'Request Timeout',
	409: 'Confilct',
	410: 'Gone',
	411: 'Length Required',
	412: 'Precondition Failed',
	413: 'Content Too Large',
	414: 'URI Too Long',
	415: 'Unsupported Media Type',
	416: 'Range Not Satisfiable',
	417: 'Expectation Failed',
	418: "I'm a teapot",
	421: 'Misdirected Request',
	422: 'Unprocessable Content (WebDAV)',
	423: 'Locked (WebDAV)',
	424: 'Failed Dependency (WebDAV)',
	425: 'Too Early (experimental)',
	426: 'Upgrade Required',
	428: 'Precondition Required',
	429: 'Too Many Requests', // Not billed by OpenDotaAPI. Maybe not counted?
	431: 'Request Header Fields Too Large',
	451: 'Unavailable For Legal Reasons',
	// Server error responses
	500: 'Internal Server Error', // Not billed by OpenDotaAPI. Maybe not counted?
	501: 'Not Implemented',
	502: 'Bad Gateway',
	503: 'Service Unavailable',
	504: 'Gateway Timeout',
	505: 'HTTP Version Not Supported',
	506: 'Variant Also Negotiates',
	507: 'Insufficient Storage (WebDAV)',
	508: 'Loop Detected (WebDAV)',
	510: 'Not Extended',
	511: 'Network Authentication Required'
}

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

export async function tryGetJson<T>(url: URL, requestInit?: RequestInit): Promise<Result<T>> {
	const result: Result<T> = {ok: false, msg: []}
	try {
		logMessage(`Fetching ${url}...`, result.msg)
		const response = requestInit? await fetch(url, requestInit) : await fetch(url)
		const msg = getResponseMsg(url, response.status)
		if(!response.ok) {
			logError(msg, result.msg)
			return result
		}
		logMessage(msg, result.msg)
		result.data = await response.json() as T
		result.ok = true
		return result
	}
	catch (error) {
		logError(error instanceof Error ? `tryGetJson failed for url: ${url}\n${error.message}` : `tryGetJson failed unexpectedly for url: ${url}`, result.msg)
		return result
	}
}

export async function tryGetImg(url: URL, logName?: string):Promise<Result<ArrayBuffer>> {
	const result: Result<ArrayBuffer> = {ok: false, msg: []}
	try {
		logMessage(`Fetching ${logName ?? url}`, result.msg)
		const response = await fetch(url)
		const msg = getResponseMsg(url, response.status)
		if (!response.ok) {
			logError(msg, result.msg)
			return result
		}
		logMessage(`Got ${logName ? logName + ': ' + url : url}`, result.msg)
		result.data = await response.arrayBuffer()
		result.ok = true
		return result
	}
	catch (error) {
		logError(error instanceof Error ? `tryGetImg failed for url: ${url}\n${error.message}` : `tryGetImg failed unexpectedly for url: ${url}`, result.msg)
		return result
	}
}

export function getResponseMsg(request: URL, responseCode: number): string {
	let responseCategory: string
	switch(true) {
		case responseCode < 200:
			responseCategory = 'an informational response'
			break
		case responseCode < 300:
			responseCategory = 'a success response'
			break
		case responseCode < 400:
			responseCategory = 'a redirect response'
			break
		case responseCode < 500:
			responseCategory = 'a client error'
			break
		case responseCode < 600:
			responseCategory = 'a server error'
			break
		default:
			throw new Error(`getResponseString defaulted in switch on response code ${responseCode}`);
	}
	return `request: ${request}\nGot ${responseCategory}: ${responseCode} - ${RESPONSE_CODES[responseCode]}.`
}

// HTML
export interface NamedElement {node: Element | DocumentFragment, name: string}

export function tryGetElement<T extends Element>(selector: string, root?: NamedElement): T {
	const rootNode = root? root.node : document;
	const fullSelector = `${root? root.name : 'document'} selector`;
	return assert(rootNode.querySelector(selector), fullSelector, 'Could not get element') as T;
}

export function tryGetElements(selector: string, root?: NamedElement): NodeListOf<Element> {
	const rootNode = root ? root.node : document;
	const fullSelector = `${root? root.name : 'document'} selector`;
	return assert(rootNode.querySelectorAll(selector), fullSelector, 'Could not get any elements.');
}

// ERROR HANDLING
export function assert<T>(object: T, objectName: string, partialErrorMsg: string): NonNullable<T> {
	if(!object) {
		logError(`${partialErrorMsg}: ${objectName} is nullish!`)
		throw new Error()
	}
	return object;
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