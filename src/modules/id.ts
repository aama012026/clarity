export type Id<P extends object = {}> =	{key:string} & P
export type IdRecord<P extends object = {}> = Record<number, Id<P>>
// Creates static, compile time key:value pairs.
export type Lookup<
	R extends Record<number, object>|object[],
	Prop extends keyof R[number & keyof R]
> = {
	[Idx in Extract<keyof R, number> as R[Idx][Prop] & string|number]: Idx
} & Record<string|number, Extract<keyof R, number>|undefined>

export function lookup<
	R extends Record<number, any>|object[],
	P extends keyof R[keyof R & number]
>(ids:R, keyProp:P):Lookup<R, P> {
	if(Array.isArray(ids)) {
		return Object.fromEntries(ids.map((v, i) => [v[keyProp], i])) as Lookup<R, P>
	}
	return Object.fromEntries(
		Object.entries(ids).map(([i, v]) => [v[keyProp], parseInt(i)])
	) as Lookup<R, P>
}