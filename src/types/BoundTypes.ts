import type { ItemAbility, ItemAttribute } from "./DotaConstantsTypes.js"

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

export interface Hero {
	id: number,
	name: {
		static: string,
		localized: string
	}
	roles: string[],
	baseHealth: Resource,
	baseMana: Resource,
	baseArmor: number,
	baseMagicResist: number,
	baseAttack: Attack,
	attributes: {
		primary: AttributeIdx,
		base: AttributeSet,
		gain: AttributeSet
	},
	movement: Movement,
	vision: Vision,
	legs: number,
	isInCaptainsMode: boolean
}

interface Resource {
	size: number,
	regen: number
}

const ATTRIBUTES = {
	0: {key:'STR', name:'strength', ext:'str'},
	1: {key:'AGI', name:'agility', ext:'agi'},
	2: {key:'INT', name:'intelligence', ext: 'int'},
	3: {key:'UNI', name:'universal', ext:'all'}
} as const satisfies Ids<Binding<string> & IdData<'name'>>
export type AttributeIdx = keyof typeof ATTRIBUTES
export type AttributeName = typeof ATTRIBUTES[AttributeIdx]['name']
export type AttributeExtKey = typeof ATTRIBUTES[AttributeIdx]['ext']
export const ATTRIBUTE = Object.fromEntries(
	Object.entries(ATTRIBUTES).map(([idx, {key}]) => [key, parseInt(idx)])
) as IdMap<typeof ATTRIBUTES, 'key'>
export const AttributeBindings = Object.fromEntries(
	Object.entries(ATTRIBUTES).map(([idx, {ext}]) => [ext, parseInt(idx)])
) as IdMap<typeof ATTRIBUTES, 'ext'>

interface AttributeSet {
	strength: number,
	agility: number,
	intelligence: number
}

interface Range {
	min: number,
	max: number
}

interface Attack {
	damage: Range,
	speed: number,
	rate: number,
	point: number,
	range: number,
	projectile_speed: number
}

interface Movement {
	speed: number,
	turnRate: number | null
}

interface Vision {
	day: number,
	night: number
}

export interface Item {
	id: number,
	name: string,
	lore: string,
	goldPrice?: number,
	charges?: number,
	manaCost?: number,
	healthCost?: number,
	cooldown?: number,
	quality?: string,
	notes?: string,
	abilities?: ItemAbility[],
	attributes?: ItemAttribute[],
	components?: string[],
	behavior?: string[],
	validTargets?: Targets,
	hint?: string[],
	dispellable?: string,
	piercesBkb?: boolean,
	dmgType?: 'Physical' | 'Magical' | 'Pure' | string,
	tier?: number
}

const DAMAGE_TYPES = {
	0: {key: 'PHYS', name: 'physical', ext: 'Physical'},
	1: {key: 'MAGI', name: 'magical', ext: 'Magical'},
	2: {key: 'PURE', name: 'pure', ext: 'Pure'},
	3: {key: 'UNKN', name: 'other', ext: ''},
} as const satisfies Ids<Binding<string> & IdData<'name'>>

type dmgTypeIdx = keyof typeof DAMAGE_TYPES
const DAMAGE_TYPE = Object.fromEntries(
	Object.entries(DAMAGE_TYPES).map(([idx, {key}]) => [key, parseInt(idx)])
) as IdMap<typeof DAMAGE_TYPES, 'key'>

export interface Targets {
	team?: string[],
	type?:string[]
}