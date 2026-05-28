export type Ids<T extends object ={}> = Record<number,{key: string} & T>
export interface Binding<T extends number | string> {ext: T}
interface IdDataProps {name: string, img: string}
export type IdData<P extends keyof IdDataProps> = Pick<IdDataProps, P>
// Creates static, compile time key:value pairs.
export type ConstEnum<O, K extends keyof O, V extends keyof O> = {
	[E in O as E[K] & PropertyKey]: E[V]
}

export type IdMap<R extends Record<number, object>, K extends keyof R[keyof R]> = {
	[I in keyof R as R[I][K] & PropertyKey]: I
}
export function getIdMap<T extends Record<number, any>, K extends keyof T[keyof T]>(ids: T, keyProp: K) {
	return Object.fromEntries(
		Object.entries(ids).map(([i, v]) => [v[keyProp], parseInt(i)])
	) as IdMap<T, K>
}