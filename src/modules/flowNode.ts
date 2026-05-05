// Node part of user library
import fs from 'node:fs/promises'

export interface Result<T> {
	data: T | null,
	ok: boolean,
	msg?: string
}

export async function tryReadJSON<T>(filePath: string): Promise<Result<T>> {
	try {
		console.log(`reading ${filePath}...`)
		const contents = await fs.readFile(filePath, {encoding: 'utf8'})
		return {data: JSON.parse(contents) as T, ok: true}
	}
	catch(err) {
		const error = err as Error
		return {data: null, ok: false, msg: error.message}
	}
}

export async function tryWriteJSON(filePath: string, data: any): Promise<Error | void> {
	try {
		console.log(`Writing ${filePath}...`)
		const pathComponents = filePath.split('/')
		pathComponents.pop()
		const directory = pathComponents.join('/')
		await fs.mkdir(directory, {recursive: true})
		await fs.writeFile(filePath, JSON.stringify(data, null, '\t'))
		console.log(`Wrote ${filePath}!`)
	}
	catch (error) {
		return new Error(`Could not write ${filePath}: ${error}`)
	}
}


export async function tryWriteImg(filePath: string, data: Buffer): Promise<Error | void> {
	try {
		console.log(`Writing ${filePath}...`);
		const pathComponents = filePath.split('/')
		pathComponents.pop()
		const directory = pathComponents.join('/')
		await fs.mkdir(directory, {recursive: true})
		await fs.writeFile(filePath, data);
		console.log(`Wrote ${filePath}!`);
	}
	catch (error) {
		return new Error(`Could not write ${filePath}: ${error}`);
	}
}
