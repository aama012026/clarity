export interface IdKey {key: string}
export interface Binding<T extends number | string = number> {ext: T}
interface IdDataProps {name: string, img: string}
export type IdData<P extends keyof IdDataProps> = Pick<IdDataProps, P>
export type Ids<P extends object ={}> = Record<number, IdKey & P>
// Creates static, compile time key:value pairs.
export type ConstEnum<O, K extends keyof O, V extends keyof O> = {
	[E in O as E[K] & PropertyKey]: E[V]
}

export type IdMap<R extends Record<number, object>, Prop extends keyof R[keyof R]> = {
	[Idx in keyof R as R[Idx][Prop] & PropertyKey]: Idx
} & Record<string | number, R[keyof R][Prop] | undefined>

export function getIdMap<
	T extends Record<number, any>, K extends keyof T[keyof T]
>(ids: T, keyProp: K) {
	return Object.fromEntries(
		Object.entries(ids).map(([i, v]) => [v[keyProp], parseInt(i)])
	) as IdMap<T, K>
}
