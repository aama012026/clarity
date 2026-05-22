import type { ItemAbility, ItemAttribute } from "./DotaConstantsTypes.js"

export interface Id {key: number, label: string}
export interface IdBinding<T> extends Id {extId: T}

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
		primary: AttributeLabel,
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

const ATTRIBUTE = {
	STR: 0,
	AGI: 1,
	INT: 2,
	UNI: 3
} as const
const ATTRIBUTES = [
	{key:ATTRIBUTE.STR, label:'strength', extId:'str'},
	{key:ATTRIBUTE.AGI, label:'agility', extId:'agi'},
	{key:ATTRIBUTE.INT, label:'intelligence', extId: 'int'},
	{key:ATTRIBUTE.UNI, label:'universal', extId:'all'}
] as const satisfies IdBinding<string>[]
export type AttributeLabel = typeof ATTRIBUTES[number]['label']
export type AttributeExtId = typeof ATTRIBUTES[number]['extId']

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

export interface Targets {
	team?: string[],
	type?:string[]
}