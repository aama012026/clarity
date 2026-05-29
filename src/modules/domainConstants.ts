import { getIdMap, type Binding, type IdData, type Ids } from "../types/clarityTypes";
import type { Unique } from "./flow";

export const SIDES = {
	0: {key:'RADIANT', ext:0},
	1: {key:'DIRE', ext:1}
} as const satisfies Ids<Binding>

export const LANES = {
	0: {key:'SAF', name:'safelane', ext:1},
	1: {key:'MID', name:'midlane', ext:2},
	2: {key:'OFF', name:'offlane', ext:3},
	/** maybe not needed */
	3: {key:'RAJ', name:'radiant jungle', ext:4},
	/** maybe not needed */
	4: {key:'DIJ', name:'dire junle', ext:5}
} as const satisfies Ids<Binding & IdData<'name'>>

export const ROLE = {
	1: {key:'CARRY', name:'carry'},
	2: {key:'MID', name:'midlaner'},
	3: {key:'OFF', name:'offlaner'},
	4: {key:'SUP_SOFT', name:'soft support'},
	5: {key:'SUP_HARD', name:'hard support'}
} as const satisfies Ids<IdData<'name'>>

export const DRAFT_ACTIONS = {
	0: {key:'PICK'},
	1: {key:'BAN'}
} as const satisfies Ids

export const STRUCTURE_FLAGS = {
	SAFE: {
		T1: 1,
		T2: 1 << 1,
		T3: 1 << 2,
		MELEE_BARRACKS: 1 << 3,
		RANGE_BARRACKS: 1 << 4
	} as const,
	MID: {
		T1: 1 << 5,
		T2: 1 << 6,
		T3: 1 << 7,
		MELEE_BARRACKS: 1 << 8,
		RANGE_BARRACKS: 1 << 9
	} as const,
	OFF: {
		T1: 1 << 10,
		T2: 1 << 11,
		T3: 1 << 12,
		MELEE_BARRACKS: 1 << 13,
		RANGE_BARRACKS: 1 << 14,
	} as const,
	T4: {
		SAFE: 1 << 15,
		OFF: 1 << 16,
	} as const,
	ANCIENT: 1 << 17
} as const
export type StructureFlag = typeof STRUCTURE_FLAGS[keyof typeof STRUCTURE_FLAGS]
export type StructuresBitmask = Unique<number, 'structuresBitmask'>

export const OBJECTIVES = {
	0:{key:'FB', name:'first blood'},
	1:{key:'COURIER', name:'courier'},
	2:{key:'BUILDING', name:'building'},
	3:{key:'TORM', name: 'tormentor'},
	4:{key:'ROSH', name:'roshan'},
	5:{key:'AEGIS', name: 'aegis'}
} as const satisfies Ids<IdData<'name'>>

export const RUNES = {
	0:{key:'BNTY', name:'bounty', ext:5},
	1:{key:'WISD', name:'wisdom', ext:8},
	2:{key:'WATR', name:'water', ext:7},
	3:{key:'INVS', name:'invisibility', ext:3},
	4:{key:'RGEN', name:'regeneration', ext:4},
	5:{key:'AMPD', name:'amplify damage', ext:0},
	6:{key:'ARCA', name:'arcane', ext:6},
	7:{key:'HAST', name:'haste', ext:1},
	8:{key:'ILLU', name:'illusion', ext:2},
	9:{key:'SHLD', name:'shield', ext:9}
} as const satisfies Ids<Binding & IdData<'name'>>

export const GOLD_SOURCES = {
	0: {key:'OTHER', name:'other', ext:0},
	1: {key:'DEATHS', name:'deaths', ext:1},
	6: {key:'UNKN6', name:'unknown6', ext:6},
	11:{key:'STRCTS', name:'structures', ext:11},
	12:{key:'HEROES', name:'heroes', ext:12},
	13:{key:'LANE_C', name:'lane creeps', ext:13},
	14:{key:'JNGL_C', name:'neutral creeps', ext:14},
	16:{key:'FBLOOD', name:'first blood', ext:16},
	17:{key:'BNTY_R', name:'bounty runes', ext:17},
	19:{key:'UNKN19', name:'unknown19', ext:19},
	20:{key:'WARDS',name:'wards', ext:20},
	21:{key:'UNKN21', name:'unknown21 (value 135)', ext:21}
} as const satisfies Ids<Binding & IdData<'name'>>

export const XP_SOURCES = {
	0:{key:'OTHER', name:'other', ext:0},
	1:{key:'HEROES', name:'heroes', ext:1},
	2:{key:'CREEPS', name:'creeps', ext:2},
	3:{key:'UNKN4', name:'unknown4', ext:4},
} as const satisfies Ids<Binding & IdData<'name'>>

export const LIFE_STATES = {
	0:{key:'ALIVE', name: 'alive', ext: 0},
	1:{key:'UNKN', name:'unknown (pseudo-death?)', ext: 1},
	2:{key:'DEAD', name:'dead', ext: 2}
	// Potential unknown sources: respawning, reincarnation / pseudo-death (aegis, wraith king)
} as const satisfies Ids<Binding & IdData<'name'>>

export const UNIT_IDS = {
	0:{key:'RADI_MEELE', name:'radiant melee creep', ext:'npc_dota_creep_goodguys_melee'},
	1:{key:'RADI_RANGE', name:'radiant ranged creep', ext:'npc_dota_creep_goodguys_ranged'},
	2:{key:'RADI_SIEGE', name:'radiant siege creep', ext:'npc_dota_goodguys_siege'},
	3:{key:'DIRE_MELEE', name:'dire melee creep', ext:'npc_dota_creep_badguys_melee'},
	4:{key:'DIRE_RANGE', name:'dire ranged creep', ext:'npc_dota_creep_badguys_ranged'},
	5:{key:'DIRE_SIEGE', name:'dire siege creep', ext:'npc_dota_badguys_siege'}
} as const satisfies Ids<Binding<string> & IdData<'name'>>

export const STRUCTURE_IDS = {
	0:{
		key:'RADI_SAF_T1',
		name:'radiant safelane tier 1 tower',
		ext:'npc_dota_goodguys_tower1_bot'
	},
	1:{
		key: 'RADI_SAF_T2',
		name: 'radiant safelane tier 2 tower',
		ext: 'npc_dota_goodguys_tower2_bot'
	},
	2:{
		key: 'RADI_SAF_T3',
		name: 'radiant safelane tier 3 tower',
		ext: 'npc_dota_goodguys_tower3_bot'
	},
	3:{
		key: 'RADI_SAF_RAX_MEELE',
		name: 'radiant safelane melee barracks',
		ext: 'npc_dota_goodguys_melee_rax_bot'
	},
	4:{
		key: 'RADI_SAF_RAX_RANGE',
		name: 'radiant safelane range barracks',
		ext: 'npc_dota_goodguys_range_rax_bot'
	},
	5:{
		key: 'RADI_MID_T1',
		name: 'radiant midlane tier 1 tower',
		ext: 'npc_dota_goodguys_tower1_mid'
	},
	6:{
		key: 'RADI_MID_T2',
		name: 'radiant midlane tier 2 tower',
		ext: 'npc_dota_goodguys_tower2_mid'
	},
	7:{
		key: 'RADI_MID_T3',
		name: 'radiant midlane tier 3 tower',
		ext: 'npc_dota_goodguys_tower3_mid'
	},
	8:{
		key: 'RADI_MID_RAX_MELEE',
		name: 'radiant midlane melee barracks',
		ext: 'npc_dota_goodguys_melee_rax_mid'
	},
	9:{
		key: 'RADI_MID_RAX_RANGE',
		name: 'radiant midlane range barracks',
		ext: 'npc_dota_goodguys_range_rax_mid'
	},
	10:{
		key: 'RADI_OFF_T1',
		name: 'radiant offlane tier 1 tower',
		ext: 'npc_dota_goodguys_tower1_top'
	},
	11:{
		key: 'RADI_OFF_T2',
		name: 'radiant offlane tier 2 tower',
		ext: 'npc_dota_goodguys_tower2_top'
	},
	12:{
		key: 'RADI_OFF_T3',
		name: 'radiant offlane tier 3 tower',
		ext: 'npc_dota_goodguys_tower3_top'
	},
	13:{
		key: 'RADI_OFF_RAX_MELEE',
		name: 'radiant offlane melee barracks',
		ext: 'npc_dota_goodguys_melee_rax_top'
	},
	14:{
		key: 'RADI_OFF_RAX_RANGE',
		name: 'radiant offlane range barracks',
		ext: 'npc_dota_goodguys_range_rax_top'
	},
	15:{
		key: 'RADI_T4',
		name: 'radiant tier 4 tower',
		ext: 'npc_dota_goodguys_tower4'
	},
	16:{
		key: 'RADI_FORT',
		name: 'radiant ancient',
		ext: 'npc_dota_goodguys_fort'
	},
	17:{
		key: 'DIRE_SAF_T1',
		name: 'dire safelane tier 1 tower',
		ext: 'npc_dota_badguys_tower1_top'
	},
	18:{
		key: 'DIRE_SAF_T2',
		name: 'dire safelane tier 2 tower',
		ext: 'npc_dota_badguys_tower2_top'
	},
	19:{
		key: 'DIRE_SAF_T3',
		name: 'dire safelane tier 3 tower',
		ext: 'npc_dota_badguys_tower3_top'
	},
	20:{
		key: 'DIRE_SAF_RAX_MELEE',
		name: 'dire safelane melee barracks',
		ext: 'npc_dota_badguys_melee_rax_top'
	},
	21:{
		key: 'DIRE_SAF_RAX_RANGE',
		name: 'dire safelane range barracks',
		ext: 'npc_dota_badguys_range_rax_top'
	},
	22:{
		key: 'DIRE_MID_T1',
		name: 'dire midlane tier 1 tower',
		ext: 'npc_dota_badguys_tower1_mid'
	},
	23:{
		key: 'DIRE_MID_T2',
		name: 'dire midlane tier 2 tower',
		ext: 'npc_dota_badguys_tower2_mid'
	},
	24:{
		key: 'DIRE_MID_T3',
		name: 'dire midlane tier 3 tower',
		ext: 'npc_dota_badguys_tower3_mid'
	},
	25:{
		key: 'DIRE_MID_RAX_MELEE',
		name: 'dire midlane melee barracks',
		ext: 'npc_dota_badguys_melee_rax_mid'
	},
	26:{
		key: 'DIRE_MID_RAX_RANGE',
		name: 'dire midlane range barracks',
		ext: 'npc_dota_badguys_range_rax_mid'
	},
	27:{
		key: 'DIRE_OFF_T1',
		name: 'dire offlane tier 1 tower',
		ext: 'npc_dota_badguys_tower1_bot'
	},
	28:{
		key: 'DIRE_OFF_T2',
		name: 'dire offlane tier 2 tower',
		ext: 'npc_dota_badguys_tower2_bot'
	},
	29:{
		key: 'DIRE_OFF_T3',
		name: 'dire offlane tier 3 tower',
		ext: 'npc_dota_badguys_tower3_bot'
	},
	30:{
		key: 'DIRE_OFF_RAX_MELEE',
		name: 'dire offlane melee barracks',
		ext: 'npc_dota_badguys_melee_rax_bot'
	},
	31:{
		key: 'DIRE_OFF_RAX_RANGE',
		name: 'dire offlane range barracks',
		ext: 'npc_dota_badguys_range_rax_bot'
	},
	32:{
		key: 'DIRE_T4',
		name: 'dire tier 4 tower',
		ext: 'npc_dota_badguys_tower4'
	},
	33:{
		key: 'DIRE_FORT',
		name: 'dire ancient',
		ext: 'npc_dota_badguys_fort'
	},
} as const satisfies Ids<Binding<string> & IdData<'name'>>

export const RANK_NAMES = {
	1:{key: 'HERALD'},
	2:{key:'GUARDIAN'},
	3:{key:'CRUSADER'},
	4:{key:'ARCHON'},
	5:{key:'LEGEND'},
	6:{key:'ANCIENT'},
	7:{key:'DIVINE'},
	8:{key:'IMMORTAL'}
} as const satisfies Ids