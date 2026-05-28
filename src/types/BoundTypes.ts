import type { ItemAbility, ItemAttribute } from "./DotaConstantsTypes.js"

// <Key> should be name used in code, <name> should be display name.
export interface Id {idx: number, key: string, name: string}
export interface IdBinding<T extends number | string> extends Id {extKey: T}
// Creates static, compile time key:value pairs.
export type ConstEnum<O, K extends keyof O, V extends keyof O> = {
	[E in O as E[K] & PropertyKey]: E[V]
}

export type IdMap<R extends Record<number, object>, K extends keyof R[keyof R]> = {[I in keyof R as R[I][K] & PropertyKey]: I}

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

const ATTRIBUTES = [
	{idx:0, key:'STR', name:'strength', extKey:'str'},
	{idx:1, key:'AGI', name:'agility', extKey:'agi'},
	{idx:2, key:'INT', name:'intelligence', extKey: 'int'},
	{idx:3, key:'UNI', name:'universal', extKey:'all'}
] as const satisfies IdBinding<string>[]
export type AttributeIdx = typeof ATTRIBUTES[number]['idx']
export type AttributeName = typeof ATTRIBUTES[number]['name']
export type AttributeExtKey = typeof ATTRIBUTES[number]['extKey']
export const ATTRIBUTE = Object.fromEntries(
	ATTRIBUTES.map(({idx, key}) => [key, idx])
) as ConstEnum<typeof ATTRIBUTES[number], 'key', 'idx'>
export const AttributeBindings = Object.fromEntries(
	ATTRIBUTES.map(({idx, extKey}) => [extKey, idx])
) as ConstEnum<typeof ATTRIBUTES[number], 'extKey', 'idx'>

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
	0: {key: 'PHYS', name: 'physical', extKey: 'Physical'},
	1: {key: 'MAGI', name: 'magical', extKey: 'Magical'},
	2: {key: 'PURE', name: 'pure', extKey: 'Pure'},
	3: {key: 'UNKN', name: 'other', extKey: ''},
} as const satisfies Record<number, any>

type dmgTypeIdx = keyof typeof DAMAGE_TYPES
const DAMAGE_TYPE = Object.fromEntries(
	Object.entries(DAMAGE_TYPES).map(([idx, {key}]) => [key, parseInt(idx)])
) as IdMap<typeof DAMAGE_TYPES, 'key'>

export interface Targets {
	team?: string[],
	type?:string[]
}