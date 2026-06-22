// Node part of user library
import fs from 'node:fs/promises'
import { getTraceBun, LOG_EVENT, logBunEvent, startTracingBun, WHERE, type Result } from './log'
import { nanoseconds } from 'bun'

const EVENT = LOG_EVENT.FILE

export async function tryReadJSON<T>(filePath: string): Promise<Result<T>> {
	const startTime = startTracingBun()
	try {
		const contents = await fs.readFile(filePath, {encoding: 'utf8'})
		const log = logBunEvent(EVENT.READ.OK, {
			file:filePath, duration:nanoseconds() - startTime, timeUnit:'ns'
		})
		log.trace.points.push(getTraceBun(WHERE.FILE, startTime))
		return {data: JSON.parse(contents) as T, log, ok: true}
	}
	catch(e) {
		const error = e as Error
		const log = logBunEvent(EVENT.READ.ERROR, {file:filePath, msg: error.message})
		log.trace.points.push(getTraceBun(WHERE.FILE, startTime))
		return {log, ok: false}
	}
}

export async function tryWrite(filePath: string, fileData: any): Promise<Result> {
	const startTime = startTracingBun()
	try {
		const bytesWritten = await Bun.write(filePath, fileData)
		const log = logBunEvent(EVENT.WRITE.OK, {
			file:filePath,
			bytes:bytesWritten,
			duration:nanoseconds() - startTime,
			timeUnit:'ns'
		})
		log.trace.points.push(getTraceBun(WHERE.FILE, startTime))
		return {data:null, log, ok:true}
	}
	catch (error) {
		const log = logBunEvent(EVENT.WRITE.ERROR, {file:filePath, msg:(error as Error).message})
		return {log, ok:false}
	}
}

export async function tryWriteJSON(filePath: string, data: any): Promise<Result>{
	return tryWrite(filePath, JSON.stringify(data))
}
