// Node part of user library
import fs from 'node:fs/promises'
import { logError, logMessage, type LogEntry, type Result } from './flow'



export async function tryReadJSON<T>(filePath: string): Promise<Result<T>> {
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
		return {ok: false, msg: log}
	}
}

export async function tryWrite(filePath: string, fileData: any): Promise<Result> {
	let log: LogEntry[] = []
	try {
		logMessage(`Writing ${filePath}...`, log)
		const bytesWritten = await Bun.write(filePath, fileData)
		logMessage(`Wrote ${bytesWritten} bytes to ${filePath} in ${Date.now() - log[0]!.timestamp.getTime()}ms.`, log)
		return {ok: true, msg: log}
	}
	catch (error) {
		logError(`Could not write ${filePath}: ${error}`, log)
		return {ok: false, msg: log}
	}
}

export async function tryWriteJSON(filePath: string, data: any): Promise<Result>{
	return tryWrite(filePath, JSON.stringify(data))
}
