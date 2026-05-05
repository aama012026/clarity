import type { Id, ISO8601TimeString } from "../modules/flow.js"

export type PatchId = Id<'patch'>
export type RegionId = Id<'region'>
export type ChatWheelId = Id<'chatWheel'>
export type LobbyTypeId = Id<'lobby'>
export type ItemId = Id<'item'>
export type HeroId = Id<'hero'>
export type UnitOrderId = Id<'unitOrder'>
export type GameModeId = Id<'gameMode'>
export type AbilityId = Id<'ability'>

export interface DotaConstantsHero {
	id: HeroId,
	name: string,
	primary_attr: 'agi' | 'str' | 'int' | 'all',
	attack_type: 'Melee' | 'Ranged',
	roles: string[],
	img: string,
	icon: string,
	base_health: number,
	base_health_regen: number,
	base_mana: number,
	base_mana_regen: number,
	base_armor: number,
	base_mr: number,
	base_attack_min: number,
	base_attack_max: number,
	base_str: number,
	base_agi: number,
	base_int: number,
	str_gain: number,
	agi_gain: number,
	int_gain: number,
	attack_range: number,
	projectile_speed: number,
	attack_rate: number,
	base_attack_time: number,
	attack_point: number,
	move_speed: number,
	turn_rate: number | null,
	cm_enabled: boolean,
	legs: number,
	day_vision: number,
	night_vision: number,
	localized_name: string
}

export interface Talent {
	name: string,
	level: number
}

export interface Facet {
	id: number,
	name: string,
	deprecated: boolean,
	icon: string,
	color: string,
	gradient_id: number,
	title: string,
	description: string
	abilities?: string[]
}

export interface HeroAbilities {
	abilities: string[],
	talents: Talent[],
	facets: Facet[]
}

export interface GameMode {
	id: GameModeId,
	name: string,
	balanced: boolean
}

export interface ChatWheelItem {
	id: ChatWheelId,
	name: string,
	label?: string,
	all_chat?: boolean
	message?: string,
	image?: string,
	sound_ext?: string
}

export interface ItemAttribute {
	key: string,
	value: string | number;
	display?: string
}

export interface ItemAbility {
	type: 'active' | 'passive' | 'use' | 'upgrade',
	title: string,
	description: string
}

export interface DotaConstantsItem {
	id: ItemId, // if starts with 'enhancement_', prob. a neutral item enhancement
	dname: string,
	cost: number | null,
	lore: string,
	img: string,
	created: boolean,
	charges: boolean | number,
	mc: boolean | number,
	hc: boolean | number,
	cd: boolean | number,
	qual?: string,
	notes?: string,
	abilities?: ItemAbility[],
	attrib?: ItemAttribute[],
	components?: string[] | null,
	behavior?: string | string[],
	target_team?: string | string[],
	target_type?: string | string[],
	hint?: string[],
	dispellable?: string,
	bkbpierce?: 'Yes' | 'No',
	dmg_type?: string,
	tier?: number // If this is present - prob. a neutral item.
}

export interface Patch {
	name: string,
	date: ISO8601TimeString,
	id: number
}

export interface Country {
	name: {common: string},
	cca2: string
}


