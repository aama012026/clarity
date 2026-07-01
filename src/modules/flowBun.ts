// Node part of user library
import fs from 'node:fs/promises'
import { nanoseconds } from 'bun'
import { EVENT, TARGET, traceBun, traceEvent, traceEventBun, type Result, type Status, type TraceEvent, type TracePoint } from './log'

export async function tryReadJSON<T>(path: string): Promise<Result<T>> {
	const trace = {
		where:TARGET.READ,
		who:path
	} satisfies Omit<TracePoint,'when'>
	try {
		const contents = await Bun.file(
			path, {type:'application/json'}
		).json()
		return {
			data: contents as T,
			trace:traceBun(trace),
			ok: true
		}
	}
	catch(e) {
		const error = e as Error
		const trace = traceBun({
			where:TARGET.READ,
			who:path,
			what:{events:[traceEventBun(EVENT.THROW, error.message)]}
		})
		return {trace, ok: false}
	}
}

export async function tryWrite(filePath: string, fileData: any): Promise<Status> {
	const trace = {
		where:TARGET.WRITE,
		what:{events:[] as TraceEvent<any>[]}
	} satisfies Omit<TracePoint, 'when'>
	try {
		const bytesWritten = await Bun.write(filePath, fileData)
		trace.what.events.push(
			traceEventBun(EVENT.WROTE, {filePath, bytesWritten})
		)
		return {ok:true, trace:traceBun(trace)}
	}
	catch (error) {
		const e = error as Error
		trace.what.events.push(traceEventBun(EVENT.THROW, e.message))
		return {trace:traceBun(trace), ok:false}
	}
}

export async function tryWriteJSON(filePath: string, data: any): Promise<Status>{
	return tryWrite(filePath, JSON.stringify(data))
}
