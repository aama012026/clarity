// Node part of user library
import fs from 'node:fs/promises'
import { logError, logMessage, type LogEntry, type Result } from './log'



export async function tryReadJSON<T>(filePath: string): Promise<Result<T>> {
	let log: LogEntry[] = []
	try {
		logMessage(`Reading ${filePath}...`, log)
		const contents = await fs.readFile(filePath, {encoding: 'utf8'})
		logMessage(`Read ${filePath} in ${Date.now() - log[0]!.timestamp}`, log)
		return {data: JSON.parse(contents) as T, log, ok: true}
	}
	catch(e) {
		const error = e as Error
		logError(error.message, log)
		return {log, ok: false}
	}
}

export async function tryWrite(filePath: string, fileData: any): Promise<Result> {
	let log: LogEntry[] = []
	try {
		logMessage(`Writing ${filePath}...`, log)
		const bytesWritten = await Bun.write(filePath, fileData)
		logMessage(`Wrote ${bytesWritten} bytes to ${filePath} in ${Date.now() - log[0]!.timestamp}ms.`, log)
		return {data: null, log, ok: true}
	}
	catch (error) {
		logError(`Could not write ${filePath}: ${error}`, log)
		return {log, ok: false}
	}
}

export async function tryWriteJSON(filePath: string, data: any): Promise<Result>{
	return tryWrite(filePath, JSON.stringify(data))
}
