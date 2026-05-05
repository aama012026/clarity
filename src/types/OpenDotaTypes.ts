import type { ISO8601TimeString, Unique, UnixTimestamp } from "../modules/flow.js"
import type { AbilityId, GameModeId, HeroId, ItemId, LobbyTypeId, PatchId, RegionId,
	UnitOrderId } from "./DotaConstantsTypes.js"

// Type guards
export type MatchId = Unique<number, 'match'>
export type SeriesId = Unique<number, 'series'>
export type LeagueId = Unique<number, 'league'>
export type AccountId = Unique<number, 'account'>
export type SteamId = Unique<number, 'steam'>
export type PartyId = Unique<number, 'party'>
export type BarracksBitmask = Unique<number, 'barracksBitmask'>
export type TowersBitmask = Unique<number, 'towersBitmask'>
export type RankBitmask = Unique<number, 'rankBitmask'>
export type GoldReasonId = Unique<number, 'goldReason'>
export type XpReasonId = Unique<number, 'xpReason'>

// Self documentation
export type xPos = number
export type yPos = number

export interface OdotaPlayer {
	profile: OdotaProfile,
	rank_tier: RankBitmask | null,
	leaderboard_rank: number | null,
	computed_mmr?: number | null, // computed_mmr_turbo is not present in normal ranked. The opposite will prob. be true
	computed_mmr_turbo?: number | null,
	aliases: OdotaSteamAlias[],
}

export interface OdotaSteamAlias {
	personaname: string,
	name_since: ISO8601TimeString
}

export interface OdotaSearchResult {
	account_id: AccountId,
	avatarfull: string,
	personaname: string,
	last_match_time: string,
	similarity: number
}

export interface OdotaPartialProfile {
	account_id: AccountId,
	personaname: string | null,
	name: string | null,
	is_contributor: boolean, // to opendota
	is_subscriber: boolean // to opendota
}

export interface OdotaProfile extends OdotaPartialProfile {
	plus: boolean, //current Dota Plus status
	cheese: number | null, // number is int
	steamId: SteamId | null, //16-digit string or null
	avatar: string | null,
	avatarmedium: string | null,
	avatarfull: string | null,
	profileurl: string | null,
	last_login: string | null,
	loccountrycode: string | null,
	status: unknown | null
	fh_unavailable: boolean,
}

export interface PlayerMatchCount {win: number, lose: number}

export interface MatchSummary {
	match_id: MatchId,
	radiant_win: boolean | null,
	duration: number, // seconds
	game_mode: GameModeId,
	lobby_type: LobbyTypeId,
	start_time: UnixTimestamp | null,
	version: number | null,
	average_rank: RankBitmask | null,
	skill?: number | null // not seen in response but present in docs.
}

export interface UnparsedMatch extends Omit<MatchSummary, 'average_rank'> {
	players: OdotaUnparsedPlayer[],
	series_id?: SeriesId,
	series_type?: number,
	cluster: number, // seen in dota constants
	replay_salt?: number,
	pre_game_duration: number, // not present in documentation.
	match_seq_num: number, // is this for BEST OFs in pro matches?
	tower_status_radiant: TowersBitmask, // int bitmask
	tower_status_dire: TowersBitmask,
	barracks_status_radiant: BarracksBitmask, // int bitmask
	barracks_status_dire: BarracksBitmask,
	first_blood_time: number,
	human_players: number, // human player count
	leagueid?: LeagueId,
	flags: number, // not present in documentation
	engine: number,
	radiant_score: number, // kills by radiant at match end
	dire_score: number, // kills by dire at match end
	picks_bans: PickBan[], // duplicate info from draft_timings?
	od_data: OdotaData, // not present in documentation
	metadata: any, // not present in documentation
	replay_url?: string,
	patch: PatchId, // patch ID from dotaconstants
	region: RegionId, // region id from dotaconstants
}

export interface ParsedMatch extends UnparsedMatch {
	players: OdotaParsedPlayer[],
	teamfights?: OdotaTeamfight[] | null,
	pauses?: Pause[], // unverified - empty in seen parsed matches
	objectives?: Objective[],
	chat?: OdotaChatMsg[],
	radiant_gold_adv?: number[], // i=minute. Negative for disadvantage
	radiant_xp_adv?: number[], // i=minute. Negative for disadvantage
	cosmetics?: object,
	draft_timings?: DraftTiming[], // present but empty in parsed match. Maybe only for captains mode.
	all_word_counts?: object, // seen, but only empty
	my_word_counts?: object, // seen, but only empty
	comeback?: number, // max gold disadv. on winning team
	stomp?: number,  // undocumented, prob max gold adv. on winning team (see win).
	// Unseen in responses but present in documentation
	// negative_votes: number,
	// positive_votes: number[],
	// radiant_team: object,
	// dire_team: object,
	// league: object,
	// skill: number | null, // bracket assigned by Valve (Normal, High, Very High)
	// throw: number, // max gold adv. on losing team
	// loss: number, // max gold disadvantage on losing team
	// win: number, // max gold advantage on winning team
}

// only present on parsed matches ----------------------------------------------
export interface OdotaTeamfight {
	start: number,
	end: number,
	last_death: number,
	deaths: number,
	players: TeamfightPlayer[],
}

export interface TeamfightPlayer {
	deaths_pos: Record<number, Record<number, number>>, // ???
	ability_uses: Record<string, number>, // convert to AbilityId, number on bind
	ability_targets: object | null // seems unused in responses although present as empty object
	item_uses: Record<string, number>, // convert to ItemId, number on bind
	killed: Record<string, number>, // convert to HeroId, number on bind
	deaths: number,
	buybacks: number,
	damage: number,
	healing: number,
	gold_delta: number,
	xp_delta: number,
	xp_start: number,
	xp_end: number
}

// Probably take the approach of only parsing type if composition is well known.
export interface Objective {
	time: number,
	type: string, // ex. "CHAT_MESSAGE_COURIER_LOST" | "building_kill"
	key?: string, // maybe target of type (ex. "npc_dota_badguys_tower1_top")
	slot?: number, // i for players[i] (0-9).
	player_slot?: PlayerSlot,
	unit?: string, // maybe subject (ex. "npc_dota_hero_viper")
	team?: number,
	value?: number, // probably present on courier kills
	killer?: number, // probably present on courier kills and looks like PlayerSlot, but couriers can die to more than heroes...
}
// -----------------------------------------------------------------------------

export interface OdotaData {
	has_api: boolean,
	has_gcdata: boolean,
	has_parsed: boolean,
	has_archived: boolean
}

export interface OdotaChatMsg {
	time: number,
	type: string,
	key: string,
	slot: number,
	player_slot: number
}

// Prob. only present for captains mode
export interface DraftTiming {
	order: number,
	pick: boolean,
	active_team: number,
	hero_id: HeroId,
	player_slot: PlayerSlot | null,
	extra_time: number,
	total_time_taken: number
}

export interface PickBan {
	is_pick: boolean,
	hero_id: number,
	team: number,
	order: number
}

export interface InGamePlayerSummary {
	player_slot: PlayerSlot | null,
	kills: number,
	deaths: number,
	assists: number,
	hero_id: HeroId,
	leaver_status: LeaverStatus,
	party_size: number | null,
	hero_variant?: number
}

export type MatchForPlayer = MatchSummary & InGamePlayerSummary
export interface OdotaUnparsedPlayer extends InGamePlayerSummary {
	account_id: AccountId,
	party_id?: number | null,
	team_number: number, // undocumented, prob unneeded - 0 for radiant and 1 for dire
	team_slot: number, // undocumented, prob unneeded (0-4)
	permanent_buffs?: OdotaPermanentBuff[],
	item_0: ItemId,
	item_1: ItemId,
	item_2: ItemId,
	item_3: ItemId,
	item_4: ItemId,
	item_5: ItemId,
	backpack_0: ItemId, // prob. id for item
	backpack_1: ItemId,
	backpack_2: ItemId,
	item_neutral: ItemId, // artifact
	item_neutral2: ItemId, // enchantment
	last_hits: number,
	denies: number,
	gold_per_min: number,
	xp_per_min: number,
	level: number, // @ match conclusion
	net_worth: number, // undocumented
	aghanims_scepter: number, // undocumented. Can presumably be mapped to bool
	aghanims_shard: number, // undocumented. Can presumably be mapped to bool
	moonshard: number, // undocumented. Can presumably be mapped to bool
	hero_damage: number,
	tower_damage: number,
	hero_healing: number,
	gold: number, // @ match conclusion
	gold_spent: number,
	ability_upgrades_arr: AbilityId[],
	// Composed from profile?
	personaname: string | null,
	name: string | null,
	last_login: string | null, //<date-time>
	rank_tier: RankBitmask | null, // most significant digit -> medal, least significant digit -> stars
	computed_mmr: number | null, // undocumented -> possibly null only assumed because of unranked players
	is_subscriber: boolean,
	radiant_win: boolean | null,
	start_time: UnixTimestamp,
	duration: number,
	cluster: number,
	lobby_type: number,
	game_mode: number,
	is_contributor: boolean,
	patch: number,
	region: number,
	isRadiant: boolean,
	win: number,
	lose: number,
	total_gold: number,
	total_xp: number,
	kills_per_min: number,
	kda: number,
	abandons: number,
	benchmarks: PlayerHeroPerformance,
}

export interface OdotaParsedPlayer extends OdotaUnparsedPlayer {
	obs_placed: number,
	sen_placed: number,
	creeps_stacked: number,
	camps_stacked: number,
	rune_pickups: number,
	firstblood_claimed: number,
	teamfight_participation: number, // rate? (0-1)
	towers_killed: number,
	roshans_killed: number,
	observers_placed: number, // duplicate of obs_placed?
	stuns: number, // seconds of all stuns for all players? (according to doc)
	max_hero_hit: OdotaHardestHitDealt, // highest dmg. instance player inflicted
	times: number[], // moment in seconds other arrays' entries represent
	gold_t: number[], // gold @ different timings
	lh_t: number[], // @ each min. of game
	dn_t: number[], // denies @ different times of the match
	xp_t: number[], // xp @ min.i
	obs_log: OdotaWardLogEntry[],
	obs_left_log: OdotaWardLogEntry[], // When observer left - either killed or timed out
	sen_log: OdotaWardLogEntry[],
	sen_left_log: OdotaWardLogEntry[],
	purchase_log: OdotaPurchase[],
	kills_log: Timing[],
	buyback_log: Buyback[],
	runes_log: Timing[],
	connection_log: ConnectionEvent[],
	lane_pos: Record<xPos, Record<yPos, number>>, //outer record key is x, inner y (or other way around), and value of inner is presumably weight.
	obs: Record<xPos, Record<yPos, number>>,
	sen: Record<xPos, Record<yPos, number>>,
	actions: Record<UnitOrderId, number>,
	pings: number,
	purchase: Record<string, number>,
	gold_reasons: Record<GoldReasonId, number>,
	xp_reasons: Record<XpReasonId, number>,
	killed: Record<string, number>,
	item_uses: Record<string, number>,
	ability_uses: Record<string, number>,
	ability_targets: Record<string, Record<string, number>>, // Record<abilityName, Record<targetName, count>>
	damage_targets: Record<string, Record<string, number>>, // Record<damageSource, Record<targetName, amount>>
	hero_hits: Record<string, number>, // Record<source, count>
	damage: Record<string, number>, //Record<target, amount>
	damage_taken: Record<string, number>, //Record<source, amount>
	damage_inflictor: Record<string, number>, // Record<source, amount>
	damage_inflictor_received: Record<string, number>, //Record<source, amount>
	runes: Record<number, number>, // Record<Rune id, count>
	killed_by: Record<string, number>, // Record<source, count>
	kill_streaks: Record<number, number>, // Record<killCount, occurenceCount> ??
	multi_kills: Record<number, number>, //Record<killCount, occurenceCount> ?? one of these are wrong.
	life_state: Record<number, number>, //??
	healing: Record<string, number>,
	randomed: boolean,
	pred_vict: boolean,
	neutral_tokens_log: Timing[], //prob. deprecated since replaced by madstones
	neutral_item_history: NeutralItemCrafted[]
	neutral_kills: number,
	tower_kills: number,
	courier_kills: number,
	lane_kills: number,
	hero_kills: number,
	observer_kills: number,
	sentry_kills: number,
	roshan_kills: number,
	necronomicon_kills: number,
	ancient_kills: number,
	buyback_count: number,
	observer_uses: number,
	sentry_uses: number,
	lane_efficiency: number, // rate - not rounded
	lane_efficiency_pct: number, // percent - rounded to nearest.
	lane: number | null, // which lane the hero laned in (presumably 0-2 or 1-3 (was 3 for safe on dire))
	lane_role: number | null, // was 1 for carry on dire.
	is_roaming: boolean | null,
	purchase_time: Record<string, number>, // Record<itemName, moment>. Moment can be negative for pre-match start.
	first_purchase_time: Record<string, number>, // Presumably same as purchase_time but without dup. keys.
	item_win: Record<string, number>, // 1 for all items purchased in seen response.
	item_usage: Record<string, number>, //(saw 1 for a set of tangos, quelling blade and magic wand...)??
	purchase_tpscroll: number, // prob. count.
	actions_per_min: number,
	life_state_dead: number, // !! seconds spent dead !!
	cosmetics: Cosmetic[],
	// Not present ---------------------------------------------------------
	// match_id: MatchId, // never seen, is present in match data.
	additional_units?: object[] | null, // never seen, might be included when needed
}

export interface OdotaPermanentBuff {
	permanent_buff: number,
	stack_count: number, // 0 for buffs without stacks
	grant_time: number
}

export interface Percentile {percentile: number, value: number | null}

export interface HeroBenchmark {
	hero_id: HeroId,
	result: {
		gold_per_min: Percentile[],
		xp_per_min: Percentile[],
		kills_per_min: Percentile[],
		last_hits_per_min: Percentile[],
		hero_damage_per_min: Percentile[],
		hero_healing_per_min: Percentile[],
		tower_damage: Percentile[],
	}
}

export interface BenchmarkPerformance {raw: number, pct: number}

export interface PlayerHeroPerformance {
	gold_per_min: BenchmarkPerformance,
	xp_per_min: BenchmarkPerformance,
	kills_per_min: BenchmarkPerformance,
	last_hits_per_min: BenchmarkPerformance,
	hero_damage_per_min: BenchmarkPerformance,
	hero_healing_per_min: BenchmarkPerformance,
	tower_damage: BenchmarkPerformance
}

export interface OdotaHardestHitDealt {
	time: number,
	type: string, // redundant
	unit: string, // redundant unless other than hero (maybe summon etc.)
	key: string,
	value: number,
	slot: number, // redundant
	player_slot: PlayerSlot, // can be inferred if connected to player object
	inflictor: string, // can prob be right-click, ability, item, etc.
	max: boolean // unneccesary
}

export interface OdotaWardLogEntry {
	time: number,
	type: string,
	key: string, // "[124,157]" - representing x,y coordinate where ward was placed.
	slot: number,
	player_slot: PlayerSlot,
	attackername?: string,
	x: number,
	y: number,
	z: number,
	entityleft: boolean,
	ehandle: number // same for corresponding wards in log and left_log arrays, might be useful if order of wards placed and wards left is different.
}

export interface Buyback {time: number, slot: number, player_slot: PlayerSlot}

export interface ConnectionEvent {
	time: number,
	event: string,
	player_slot: PlayerSlot | null
}

export interface Timing {time: number, key: string}

export interface OdotaPurchase {time: number, key: string, charges: number}

export interface Cosmetic {
	item_id: number, // unsure if this is ingame item id or id for cosmetic.
	name: string | null,
	prefab: string,
	creation_date: string | null, // <date-time> (guessing iso8601)
	image_inventory: string | null,
	image_path: string | null,
	item_description: string | null,
	item_name: string,
	item_rarity: string | null,
	item_type_name: string | null,
	used_by_heroes: string | null
}

export interface NeutralItemCrafted {
	item_neutral: string, // check dotaconstants
	time: number,
	item_neutral_enhancement: string // check dotaconstants
}

// TODO: verify pause shape.
export interface Pause {
	time: number, // paused @ second
	duration: number // in seconds
}

export interface HeroPlayerStats {
	hero_id: HeroId,
	last_played: number, // maybe a match id?
	games: number,
	win: number,
	with_games: number,
	with_wins: number,
	against_games: number,
	against_win: number
}

export interface Peer {
	account_id: AccountId,
	last_played: number,
	win: number,
	games: number,
	with_win: number,
	with_games: number,
	against_win: number,
	against_games: number,
	with_gpm_sum: number,
	with_xpm_sum: number,
	personaname: string | null,
	name: string | null,
	is_contributor: boolean,
	is_subscriber: boolean,
	last_login: string | null,
	avatar: string | null,
	avatarfull: string | null
}

export interface RelationalProPlayer {
	account_id: AccountId,
	name: string | null,
	country_code: string,
	fantasy_role: number, // prob. 1-5 for carry-hard support.
	team_id: number,
	team_name: string | null,
	team_tag: string | null,
	is_locked: boolean,
	is_pro: boolean,
	locked_until: number | null,
	steamid: SteamId | null,
	avatar: string | null,
	avatarmedium: string | null,
	avatarfull: string | null,
	last_login: string | null, //<date-time>
	full_history_time: string | null //<date-time>
	cheese: number | null,
	fh_unavailable: boolean | null,
	loccountrycode: string | null,
	last_played: number | null,
	win: number,
	games: number,
	with_win: number,
	with_games: number,
	against_win: number,
	against_games: number,
	with_gpm_sum: number | null,
	with_xpm_sum: number | null
}

export interface Stat { field: string, n: number, sum: number,}

// Manual IDs ------------------------------------------------------------------
// Taken and reworked from odota repo core/proto/dota_shared_enums.proto
export const HISTOGRAM_COLUMNS = {
  KILLS: "kills",
  DEATHS: "deaths",
  ASSISTS: "assists",
  KDA: "kda",
  GPM: "gold_per_min",
  XPM: "xp_per_min",
  LAST_HITS: "last_hits",
  DENIES: "denies",
  LANE_EFFICIENCY_PERCENT: "lane_efficiency_pct",
  DURATION: "duration",
  LEVEL: "Level",
  HERO_DMG: "hero_damage",
  TOWER_DMG: "tower_damage",
  HERO_HEALING: "hero_healing",
  STUNS: "stuns",
  TOWER_KILLS: "tower_kills",
  NEUTRAL_KILLS: "neutral_kills",
  COURIER_KILLS: "courier_kills",
  TP_SCROLL_PURCHASE: "purchase_tpscroll",
  OBSERVER_PURCHASE: "purchase_ward_observer",
  SENTRY_PURCHASE: "purchase_ward_sentry",
  GEM_PURCHASE: "purchase_gem",
  RAPIER_PURCHASE: "purchase_rapier",
  PING_COUNT: "pings",
  THROW: "throw",
  COMEBACK: "comeback",
  STOMP: "stomp",
  LOSS: "loss",
  APM: "actions_per_min",
}
export type HistogramColumn = typeof HISTOGRAM_COLUMNS[keyof typeof HISTOGRAM_COLUMNS]

export const LEAVER_STATUS = {
	NONE: 0,
	DISCONNECTED: 1,
	DISCONNECTED_TOO_LONG: 2,
	ABANDONED: 3,
	AFK: 4,
	NEVER_CONNECTED: 5,
	NEVER_CONNECTED_TOO_LONG: 6,
	FAILED_TO_READY_UP: 7,
	DECLINED: 8,
	DECLINED_REQUEUE: 9
} as const
export type LeaverStatus = typeof LEAVER_STATUS[keyof typeof LEAVER_STATUS]
export const leaverStatusByKey = Object.fromEntries(
	Object.entries(LEAVER_STATUS).map(([string, key]) => [key, string])
) as Record<LeaverStatus, string>

// Gleamed from function in core/svc/util/laneMappings.ts
export const LANE_IDS = {
	BOT: 1,
	MID: 2,
	OFF: 3,
	RADIANT_JUNGLE: 4,
	DIRE_JUNGLE: 5
} as const
export type LaneId = typeof LANE_IDS[keyof typeof LANE_IDS]
// -----------------------------------------------------------------------------

// We bind these so we only need to change in one place if api changes.
export const KEYS = {
	SIDES: {
		RADIANT: 'goodguys',
		DIRE: 'badguys'
	},
	BUILDINGS: {
		T1: 'tower1',
		T2: 'tower2',
		T3: 'tower3',
		T4: 'tower4',
		MELEE_BARRACKS: 'melee_rax',
		RANGED_BARRACKS: 'range_rax',
		ANCIENT: 'fort'
	},
	LANES: {
		BOT: 'bot',
		MID: 'mid',
		TOP: 'top'
	},
	CREEPS: {
		MELEE: 'melee',
		RANGED: 'ranged',
		SIEGE: 'siege'
	}
} as const
export type SideKey = typeof KEYS.SIDES[keyof typeof KEYS.SIDES]
export type BuildingKey = typeof KEYS.BUILDINGS[keyof typeof KEYS.BUILDINGS]
export type LaneKey = typeof KEYS.LANES[keyof typeof KEYS.LANES]
export type CreepKey = typeof KEYS.CREEPS[keyof typeof KEYS.CREEPS]

export const TOWER_FLAGS = {
	BOT: {
		T1: 1,
		T2: 1 << 1,
		T3: 1 << 2
	},
	MID: {
		T1: 1 << 3,
		T2: 1 << 4,
		T3: 1 << 5
	},
	TOP: {
		T1: 1 << 6,
		T2: 1 << 7,
		T3: 1 << 8
	},
	T4: {
		BOT: 1 << 9,
		TOP: 1 << 10
	}
} as const

export const BARRACK_FLAGS = {
	BOT: {
		MELEE: 1,
		RANGE: 1 << 1,
	},
	MID: {
		MELEE: 1 << 2,
		RANGE: 1 << 3,
	},
	TOP: {
		MELEE: 1 << 4,
		RANGE: 1 << 5
	}
} as const

//TODO: Probe multiple parsed matches to find weird combinations.
// Also seen for roshan and aegis, have to find again.
export const OBJECTIVE_TYPES = {
	FIRST_BLOOD: "CHAT_MESSAGE_FIRSTBLOOD",
	COURIER: "CHAT_MESSAGE_COURIER_LOST",
	BUILDING: "building_kill",
} as const
export type ObjectiveType = typeof OBJECTIVE_TYPES[keyof typeof OBJECTIVE_TYPES]


// const arrays lets us access the slots for both team with i < 5.
export const RADIANT_SLOTS = [0, 1, 2, 3, 4] as const
export const DIRE_SLOTS = [128, 129, 130, 131, 132] as const
export type PlayerSlot = Unique<typeof RADIANT_SLOTS[number] | typeof DIRE_SLOTS[number], 'playerSlot'>

export interface Distributions {
	ranks: {
		rows: RankRow[],
		sum: {count: number}
	}
}

export interface RankRow {
	bin: RankBitmask,
	bin_name: RankBitmask, // duplicate info? (16.4.26)
	count: number,
	cumulative_sum: number
}
