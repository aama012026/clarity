export type Id<P extends object = {}> =	{key: string} & P
export type IdRecord<P extends object = {}> = Record<number, Id<P>>
// Creates static, compile time key:value pairs.
export type Lookup<
	R extends Record<number, object>, Prop extends keyof R[keyof R]
> = {
	[Idx in keyof R as R[Idx][Prop] & PropertyKey]: Idx
} & Record<string | number, R[keyof R][Prop] | undefined>

export function lookup<
	R extends Record<number, any>, P extends keyof R[keyof R]
>(ids: R, keyProp: P) {
	return Object.fromEntries(
		Object.entries(ids).map(([i, v]) => [v[keyProp], parseInt(i)])
	) as Lookup<R, P>
}