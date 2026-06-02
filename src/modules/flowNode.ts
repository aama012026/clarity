// Node part of user library
import fs from 'node:fs/promises'
import { logError, logMessage, type Log, type LogEntry } from './flow'

export interface Result<Data, Log> {
	data: Data | null,
	ok: boolean,
	msg: Log[]
}

export async function tryReadJSON<T>(filePath: string): Promise<Result<T, LogEntry>> {
	let log: LogEntry[] = []
	try {
		logMessage(`Reading ${filePath}...`, log)
		const contents = await fs.readFile(filePath, {encoding: 'utf8'})
		logMessage(`Read ${filePath} in ${Date.now() - log[0]!.timestamp.getTime()}`, log)
		return {data: JSON.parse(contents) as T, ok: true, msg: log}
	}
	catch(e) {
		const error = e as Error
		logError(error.message, log)
		return {data: null, ok: false, msg: log}
	}
}

export async function tryWrite(filePath: string, data: any): Promise<Result<void, LogEntry>> {
	let log: LogEntry[] = []
	try {
		logMessage(`Writing ${filePath}...\n`, log)
		const bytesWritten = await Bun.write(filePath, data)
		logMessage(`Wrote ${bytesWritten} bytes to ${filePath} in ${Date.now() - log[0]!.timestamp.getTime()}ms.\n`, log)
		return {data, ok: true, msg: log}
	}
	catch (error) {
		logError(`Could not write ${filePath}: ${error}`, log)
		return {data, ok: false, msg: log}
	}
}

export async function tryWriteJSON(filePath: string, data: any): Promise<Result<void, LogEntry>>{
	return tryWrite(filePath, JSON.stringify(data))
}
