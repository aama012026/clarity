import type { Attribute } from "../modules/domainConstants"
import type { ItemAbility, ItemAttribute } from "./dotaConstantsTypes"

export interface Hero {
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
		primary: Attribute,
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