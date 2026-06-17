import type { ISO8601TimeString, Unique, UnixTimestamp
} from "../modules/flow.js"
import type { GameModeId, LobbyTypeId, PatchId, RegionId, UnitOrderId
} from "./dotaConstantsTypes.js"

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

// Self documentation
export type GoldReasonId = number
export type XpReasonId = number
export type xPos = number
export type yPos = number

export interface KDAProps {kills:number,deaths:number,assists:number}
// Response interfaces -----------------------------------------------
// GET /players
// /:accountId
export interface PlayerRankDTO {
	rank_tier:RankBitmask|null,
	leaderboard_rank?:number|null,
	computed_mmr?:number|null,
	computed_mmr_turbo?:number|null
}

export interface PlayerDTO extends PlayerRankDTO {
	profile: ProfileDTO,
	aliases: AliasDTO[],
}

export interface AvatarDTO {
	avatar:string|null,
	avatarmedium:string|null,
	avatarfull:string|null
}
export interface AccountBaseDTO {
	account_id:AccountId,
	personaname:string|null,
	last_login:string|null //<date-time>
}
export interface ProfileBaseDTO extends AvatarDTO {
	account_id:AccountId,
	steamid:SteamId,
	personaname:string|null,
	profileurl:string|null,
	last_login:string|null, //<date-time>
	cheese:number|null,
	fh_unavailable:boolean|null,
	loccountrycode:string|null,
}
export interface OdRelation {is_contributor:boolean, is_subscriber:boolean}
export interface ProfileDTO extends ProfileBaseDTO, OdRelation {
	name:string|null,
	status:unknown|null
}

export interface AliasDTO {
	personaname: string,
	/** YYYY-MM-DDTHH:MM:SS.XXXZ */
	name_since: ISO8601TimeString
}
// /:accountId/wl
export interface MatchCountDTO {win: number, lose: number}
// /:accountId/matches
export interface PlayerMatchDTO extends MatchSummaryDTO, PlayerSummaryDTO {
	average_rank:RankBitmask|null
}
export interface PlayerSummaryDTO extends KDAProps {
	leaver_status:LeaverStatus,
	player_slot: PlayerSlot|null,
	party_size:number|null,
	hero_id:number,
	hero_variant?:number
}
// /:accountId/heroes
export interface PeerBaseDTO extends WinrateShortDTO {
	last_played:number|null, // maybe a match id?
	with_games:number,
	with_wins:number,
	against_games:number,
	against_win:number
}
export interface PlayerHeroStatsDTO extends PeerBaseDTO {
	hero_id:number
}
// /:accountId/peers
export interface PeerDTO extends PeerBaseDTO {
	account_id:AccountId,
	with_gpm_sum:number|null,
	with_xpm_sum:number|null,
	personaname:string|null,
	name:string|null,
	is_contributor:boolean,
	is_subscriber:boolean,
	last_login:string|null,
	avatar:string|null,
	avatarfull:string|null
}
// /:accountId/pros
export interface RelationalProPlayerDTO extends Omit<
	PeerBaseDTO, 'is_contributor'|'is_subscriber'
> {
	country_code: string,
	fantasy_role: number, // prob. 1-5 for carry-hard support.
	team_id: number,
	team_name: string|null,
	team_tag: string|null,
	is_locked: boolean,
	is_pro: boolean,
	locked_until: number|null,
	steamid: SteamId|null,
	avatarmedium: string|null,
	profileurl:string|null
	full_history_time: string|null //<date-time>
	cheese: number|null,
	fh_unavailable: boolean|null,
	loccountrycode: string|null,
}
// /:accountId/totals
export interface StatDTO { field: string, n: number, sum: number}
// /:accountId/counts
export interface CountsDTO {
	leaver_status:Record<number, WinrateShortDTO>,
	game_mode:Record<number, WinrateShortDTO>,
	lobby_type:Record<number, WinrateShortDTO>,
	lane_role:Record<number, WinrateShortDTO>,
	region:Record<number, WinrateShortDTO>,
	patch:Record<number, WinrateShortDTO>,
	is_radiant:Record<number, WinrateShortDTO>
}
// /:accountId/ratings
export interface PlayerRatingsDTO {
	account_id: AccountId,
	match_id: MatchId,
	rank_tier: RankBitmask,
	time: number
}
// /:accountId/rankings
export interface PlayerHeroRankings {
	hero_id: number,
	score: number,
	percent_rank: number,
	card: number
}

export interface MatchBaseDTO {
	match_id:MatchId,
	start_time:UnixTimestamp|null,
	duration:number,
	radiant_win:boolean|null
}
export interface GameFormatDTO {game_mode:GameModeId, lobby_type:LobbyTypeId}

export interface MatchSummaryDTO extends MatchBaseDTO, GameFormatDTO {
	version: number | null,
	skill?: number | null // not seen in response but present in docs.
}
interface MatchScoreDTO {radiant_score:number, dire_score:number}
interface MatchSeriesDTO {series_id?:number, series_type?:number}
// GET /leagues/:leagueId/matches
export interface LeagueMatchDTO extends MatchBaseDTO, MatchScoreDTO, MatchSeriesDTO {
	leagueid:number,
	radiant_team_id:number|null,
	radiant_team_name:string|null,
	dire_team_id:number|null,
	dire_team_name:string|null,
}
// GET /proMatches
export interface ProMatchDTO extends LeagueMatchDTO {version:number|null}
// GET /publicMatches
export interface PublicMatchDTO extends MatchBaseDTO, GameFormatDTO {
	match_seq_num:number,
	avg_rank_tier:RankBitmask,
	num_rank_tier:number,
	cluster:number,
	radiant_team:[number,number,number,number,number],
	dire_team:[number,number,number,number,number]
}
// GET /teams/:teamId/matches
export interface TeamMatchDetailsDTO {
	leagueid:LeagueId,
	league_name:string,
	radiant:boolean
}
export interface TeamMatchDTO extends MatchBaseDTO, MatchScoreDTO, TeamMatchDetailsDTO {
	cluster:number,
	opposing_team_id:number,
	opposing_team_name:string,
	opposing_team_logo:string
}
// GET /heroes/:heroId/matches
export type HeroMatchDTO = MatchBaseDTO & KDAProps & TeamMatchDetailsDTO
// GET /matches/:MatchId
export interface SparseMatchDTO extends MatchSummaryDTO, MatchScoreDTO, MatchSeriesDTO {
	players: SparsePlayerDTO[],
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
	picks_bans: PickBanDTO[], // duplicate info from draft_timings?
	od_data: OdDataDTO, // not present in documentation
	metadata: any, // not present in documentation
	replay_url?: string,
	patch:PatchId, // patch ID from dotaconstants
	region:RegionId, // region ID from dotaconstants
}

export interface ParsedMatchDTO extends SparseMatchDTO {
	players: ParsedPlayerDTO[],
	teamfights?: TeamfightDTO[] | null,
	pauses?: PauseDTO[], // unverified - empty in seen parsed matches
	objectives?: ObjectiveDTO[],
	chat?: ChatMsgDTO[],
	radiant_gold_adv?: number[], // i=minute. Negative for disadvantage
	radiant_xp_adv?: number[], // i=minute. Negative for disadvantage
	cosmetics?: object,
	draft_timings?: DraftTimingDTO[], // present but empty in parsed matches. Prob deprecated.
	all_word_counts?: Record<string, number>, // seen, but only empty
	my_word_counts?: Record<string, number>, // seen, but only empty
	comeback?: number, // max gold disadv. on winning team
	stomp?: number,  // undocumented, prob max gold adv. on winning team (see win).
	// Present on league matches
	radiant_team: TeamInfoDTO, //Only need to keep id.
	dire_team: TeamInfoDTO, // Only need to keep id.
	league: LeagueDTO, // Only need to keep id.
	// Prob present when captains mode
	radiant_captain?:AccountId,
	dire_captain?:AccountId
	// Unseen in responses but present in documentation
	// negative_votes: number,
	// positive_votes: number[],
	// skill: number | null, // bracket assigned by Valve (Normal, High, Very High)
	// throw: number, // max gold adv. on losing team
	// loss: number, // max gold disadvantage on losing team
	// win: number, // max gold advantage on winning team
}

export interface ChatMsgDTO {
	time:number,
	type:string,
	key:string|null,
	slot:number|null,
	player_slot:PlayerSlot|null
}
// only present on parsed matches ----------------------------------------------
export interface TeamfightDTO {
	start: number,
	end: number,
	last_death: number,
	deaths: number,
	players: TeamfightPlayerDTO[],
}

export interface TeamfightPlayerDTO {
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
export interface ObjectiveDTO extends ChatMsgDTO {
	unit?: string, // maybe subject (ex. "npc_dota_hero_viper")
	team?: number,
	value?: number, // probably present on courier kills
	killer?: number, // probably present on courier kills and looks like PlayerSlot, but couriers can die to more than heroes...
}
// -----------------------------------------------------------------------------

export interface OdDataDTO {
	has_api: boolean,
	has_gcdata: boolean,
	has_parsed: boolean,
	has_archived: boolean
}

// Prob. only present for captains mode
export interface DraftTimingDTO {
	order: number,
	pick: boolean,
	active_team: number,
	hero_id: number,
	player_slot: PlayerSlot | null,
	extra_time: number,
	total_time_taken: number
}

export interface PickBanDTO {
	is_pick: boolean,
	hero_id: number,
	team: number,
	order: number
}

export interface SparsePlayerDTO extends PlayerSummaryDTO, GameFormatDTO, OdRelation, PlayerRankDTO, MatchCountDTO {
	party_id?:number|null,
	team_number:number, // undocumented, prob unneeded - 0 for radiant and 1 for dire
	team_slot:number, // undocumented, prob unneeded (0-4)
	item_0:number,
	item_1:number,
	item_2:number,
	item_3:number,
	item_4:number,
	item_5:number,
	backpack_0:number, // prob. id for item
	backpack_1:number,
	backpack_2:number,
	item_neutral:number, // artifact
	item_neutral2:number, // enchantment
	permanent_buffs?:PermaBuffDTO[],
	last_hits:number,
	denies:number,
	gold_per_min:number,
	xp_per_min:number,
	level:number, // @ match conclusion
	net_worth:number, // undocumented
	aghanims_scepter:number, // undocumented. Can presumably be mapped to bool
	aghanims_shard:number, // undocumented. Can presumably be mapped to bool
	moonshard:number, // undocumented. Can presumably be mapped to bool
	hero_damage:number,
	tower_damage:number,
	hero_healing:number,
	gold:number, // @ match conclusion
	gold_spent:number,
	ability_upgrades_arr:number[],
	// Composed from profile?
	account_id?:AccountId,
	personaname:string|null,
	last_login:string|null, //<date-time>
	name:string|null,
	radiant_win:boolean|null,
	start_time:UnixTimestamp,
	duration:number,
	cluster:number,
	patch:number,
	region:number,
	isRadiant:boolean,
	total_gold:number,
	total_xp:number,
	kills_per_min:number,
	kda:number,
	abandons:number,
	benchmarks:PlayerHeroPerformanceDTO,
}

export interface ParsedPlayerDTO extends SparsePlayerDTO {
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
	max_hero_hit: MaxHeroHitDTO, // highest dmg. instance player inflicted
	times: number[], // moment in seconds other arrays' entries represent
	gold_t: number[], // gold @ different timings
	lh_t: number[], // @ each min. of game
	dn_t: number[], // denies @ different times of the match
	xp_t: number[], // xp @ min.i
	obs_log: WardLogEntryDTO[],
	obs_left_log: WardLogEntryDTO[], // When observer left - either killed or timed out
	sen_log: WardLogEntryDTO[],
	sen_left_log: WardLogEntryDTO[],
	purchase_log: PurchaseDTO[],
	kills_log: TimingDTO[],
	buyback_log: BuybackDTO[],
	runes_log: TimingDTO[],
	connection_log: ConnectionEventDTO[],
	lane_pos: Record<xPos, Record<yPos, number>>, //outer record key is x, inner y (or other way around), and value of inner is presumably weight.
	obs: Record<xPos, Record<yPos, number>>
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
	neutral_tokens_log: TimingDTO[], //prob. deprecated since replaced by madstones
	neutral_item_history: NeutralItemHistoryDTO[]
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
	cosmetics: CosmeticDTO[],
	// Not present ---------------------------------------------------------
	// match_id: MatchId, // never seen, is present in match data.
	additional_units?: object[] | null, // never seen, might be included when needed
}

export interface PermaBuffDTO {
	permanent_buff: number,
	stack_count: number, // 0 for buffs without stacks
	grant_time: number
}

export interface BenchmarkPerformanceDTO {raw: number, pct: number}

export interface PlayerHeroPerformanceDTO {
	gold_per_min: BenchmarkPerformanceDTO,
	xp_per_min: BenchmarkPerformanceDTO,
	kills_per_min: BenchmarkPerformanceDTO,
	last_hits_per_min: BenchmarkPerformanceDTO,
	hero_damage_per_min: BenchmarkPerformanceDTO,
	hero_healing_per_min: BenchmarkPerformanceDTO,
	tower_damage: BenchmarkPerformanceDTO
}

export interface MaxHeroHitDTO extends ChatMsgDTO {
	unit: string, // redundant unless other than hero (maybe summon etc.)
	value: number,
	inflictor: string, // can prob be right-click, ability, item, etc.
	max: boolean // unneccesary
}

export interface WardLogEntryDTO extends ChatMsgDTO {
	attackername?: string,
	x: number,
	y: number,
	z: number,
	entityleft: boolean,
	ehandle: number // same for corresponding wards in log and left_log arrays, might be useful if order of wards placed and wards left is different.
}

export interface BuybackDTO {time:number, slot:number, player_slot:PlayerSlot}

export interface ConnectionEventDTO {
	time: number,
	event: string,
	player_slot: PlayerSlot | null
}

export interface TimingDTO {time: number, key: string}

export interface PurchaseDTO extends TimingDTO {charges: number}

export interface CosmeticDTO {
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

export interface NeutralItemHistoryDTO {
	item_neutral: string, // check dotaconstants
	time: number,
	item_neutral_enhancement: string // check dotaconstants
}

// TODO: verify pause shape.
export interface PauseDTO {
	time: number, // paused @ second
	duration: number // in seconds
}

// GET /distributions
export interface RankDistDTO {
	ranks: {
		rows: RankRowDTO[],
		sum: {count: number}
	}
}

export interface RankRowDTO {
	bin: RankBitmask,
	bin_name: RankBitmask, // duplicate info? (16.4.26)
	count: number,
	cumulative_sum: number
}
// GET /search
export interface SearchResDTO {
	account_id: AccountId,
	avatarfull: string,
	personaname: string,
	last_match_time: string,
	similarity: number
}
// GET /rankings
export interface HeroRankingsDTO {
	hero_id: number,
	rankings: RankingDTO[]
}
export interface RankingDTO extends ProfileBaseDTO {
	score: number,
	full_history_time:string, // <date-time>
	rank_tier: RankBitmask|null
}
// GET /benchmarks?hero_id=ID
export interface HeroBenchmark {
	hero_id: number,
	result: {
		gold_per_min: PercentileDTO[],
		xp_per_min: PercentileDTO[],
		kills_per_min: PercentileDTO[],
		last_hits_per_min: PercentileDTO[],
		hero_damage_per_min: PercentileDTO[],
		hero_healing_per_min: PercentileDTO[],
		tower_damage: PercentileDTO[],
	}
}
export interface PercentileDTO {percentile: number, value: number|null}

// GET /heroes

// /heroes/:heroId/matchups
export interface MatchupDTO extends WinrateLongDTO {hero_id: number}
// /heroes/:heroId/durations
export interface HeroPerformanceByDurationDTO extends WinrateLongDTO {duration_bin:string}
// /heroes/:heroId/players
export interface HeroPlayerDTO extends WinrateLongDTO {account_id:AccountId}
export interface WinrateShortDTO {games:number, win:number}
export interface WinrateLongDTO {games_played:number, wins:number}
// /heroes/:heroId/itemPopularity
export interface ItemPopularityDTO {
	//Record<itemId, count>
	start_game_items: Record<number, number>,
	early_game_items: Record<number, number>, // Before 10min @cost >= 700
	mid_game_items: Record<number, number>, // Between 10 and 25min @cost >= 2000
	late_game_items: Record<number, number> // At or after 25min @cost >= 4000
}
// GET /leagues | /leagues/:leagueId
export interface LeagueDTO {
	leagueid:LeagueId,
	ticket:string|null,
	banner:string|null,
	tier:string,
	name:string
}

// GET /teams | /teams/:teamId
export type TeamDTO = TeamInfoDTO & TeamStatsDTO
export interface TeamInfoDTO {
	team_id:number,
	name:string,
	tag:string,
	logo_url:string
}
export interface TeamStatsDTO extends TeamInfoDTO {
	rating:number, //ELO rating.
	delta:number|null, // Maybe ELO delta over a period?
	wins:number,
	losses:number,
	last_match_time:UnixTimestamp,
	match_id:number|null, // Maybe id of last played match?
}

// /teams/:teamId/players
export interface TeamPlayerDTO extends WinrateLongDTO {
	account_id:AccountId,
	name:string|null,
	is_current_team_member:boolean|null
}
// /teams/:teamId/heroes
export interface TeamHeroWinrateDTO extends WinrateLongDTO {
	hero_id:number,
	localized_name:string
}
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
export type PlayerSlot = typeof RADIANT_SLOTS[number] | typeof DIRE_SLOTS[number]

