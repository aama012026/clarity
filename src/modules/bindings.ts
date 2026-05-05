import { FILES, PATHS } from "./paths.js"
import { isEmpty, nullsToUndefined, type ISO8601TimeString, type Unique, type UnixTimestamp } from "./flow.js"
import type { IdBinding } from "../types/BoundTypes.js"
import type { GameModeId, LobbyTypeId, PatchId, RegionId, UnitOrderId} from "../types/DotaConstantsTypes.js"
import { BARRACK_FLAGS, TOWER_FLAGS, type AccountId, type BarracksBitmask,
	type Cosmetic, type Distributions, type GoldReasonId, type OdotaUnparsedPlayer,
	type LeagueId, type LeaverStatus, type MatchForPlayer, type MatchId,
	type OdotaParsedPlayer, type OdotaPlayer, type OdotaProfile, type OdotaSteamAlias, type OdotaWardLogEntry, type ParsedMatch, type PartyId,
	type Pause, type Percentile, type PickBan, type PlayerSlot, type RankBitmask,
	type SeriesId, type SteamId, type TowersBitmask, type UnparsedMatch, type XpReasonId
} from "../types/OpenDotaTypes.js"

import heroIds from '../../public/generated/data/heroBindings.json'
import abilityIds from '../../public/generated/data/abilityBindings.json'
import itemIds from '../../public/generated/data/itemBindings.json'

export type HeroKey = typeof heroIds[number]['key']
export type HeroLabel = typeof heroIds[number]['label']
type HeroExtId = typeof heroIds[number]['extId']
const heroKeysByExtId = Object.fromEntries(
	heroIds.map(hero => [hero.extId, hero.key])
) as Record<HeroExtId, HeroKey>
const heroKeysByLabel = Object.fromEntries(
	heroIds.map(hero => [hero.label, hero.key])
) as Record<HeroLabel, HeroKey>
export const heroLabels = Object.fromEntries(
	heroIds.map(hero => [hero.key, hero.label])
) as Record<HeroKey, HeroLabel>

export type AbilityKey = typeof abilityIds[number]['key']
export type AbilityLabel = typeof abilityIds[number]['label']
type AbilityExtId = typeof abilityIds[number]['extId']
const abilityKeysByExtId = Object.fromEntries(
	abilityIds.map(ability => [ability.extId, ability.key])
) as Record<AbilityExtId, AbilityKey>
const abilityKeysByLabel = Object.fromEntries(
	abilityIds.map(ability => [ability.label, ability.key])
) as Record<AbilityLabel, AbilityKey>
export const abilityNames = Object.fromEntries(
	abilityIds.map(ability => [ability.key, ability.label])
) as Record<AbilityKey, AbilityLabel>

export type ItemKey = typeof itemIds[number]['key']
export type ItemLabel = typeof itemIds[number]['label']
type ItemExtId = typeof itemIds[number]['extId']
const ItemKeysByLabel = Object.fromEntries(
	itemIds.map(item => [item.label, item.key])
) as Record<ItemLabel, ItemKey>
const ItemKeysByExtId = Object.fromEntries(
	itemIds.map(item => [item.extId, item.key])
) as Record<ItemExtId, ItemKey>

const SIDE = [
	{key: 0, label: 'radiant', extId: 0},
	{key: 1, label: 'dire', extId: 1}
] as const satisfies IdBinding<number>[]
type SideKey = typeof SIDE[number]['key']
type SideLabel = typeof SIDE[number]['label']
type SideExtId = typeof SIDE[number]['extId']
const SideKeysByExtId = Object.fromEntries(
	SIDE.map(side => [side.extId, side.key])
) as Record<SideExtId, SideKey>

// Used for rendering.
export const sideNames = Object.fromEntries(
	SIDE.map(side => [side.key, side.label])
) as Record<SideKey, SideLabel>

// This comes as a bool from opendota, so no need to freeze keys atm.
export type Outcome = 'win' | 'loss'
export type PermanentBuffId = Unique<number, 'permanentBuff'>

export const LANES = [
	{key: 0, label: 'safelane', extId: 1},
	{key: 1, label: 'midlane', extId: 2},
	{key: 2, label: 'offlane', extId: 3},
	/** maybe not needed */
	{key: 3, label: 'radiant jungle', extId: 4},
	/** maybe not needed */
	{key: 4, label: 'dire junle', extId: 5}
] as const satisfies IdBinding<number>[]

export type LaneKey = typeof LANES[number]['key']
export type LaneLabel = typeof LANES[number]['label']
export type LaneExtId = typeof LANES[number]['extId']

export const LaneKeyByExtId = Object.fromEntries(
	LANES.map(lane => [lane.extId, lane.key])
) as Record<LaneExtId, LaneKey>
export const Lanes = Object.fromEntries(
	LANES.map(lane => [lane.key, lane.label])
) as Record<LaneKey, LaneLabel>

export const ROLE = [
	'carry', 'midlaner', 'offlaner', 'soft support', 'hard support'
] as const
export type Role = Unique<typeof ROLE[number], 'role'>

export type DraftAction = 'pick' | 'ban'
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

function setStructureBitmask(
	towers: TowersBitmask,
	barracks: BarracksBitmask,
	side: SideLabel,
	won: boolean
) {
	let standingStructures = 0
	// These will convert absolute lanes (bot / top) to relative 
	// lanes (safe / off) by shifting left or right
	let towerBitshift = 0
	let raxBitshift = 0
	let t4Safe = TOWER_FLAGS.T4.BOT
	let t4Off = TOWER_FLAGS.T4.TOP
	if(side === 'dire') {
		towerBitshift = 6
		raxBitshift = 4
		t4Safe = TOWER_FLAGS.T4.TOP
		t4Off = TOWER_FLAGS.T4.BOT
	}
	// Check bitmask against every structure flag and update combined bitmask.
	if((towers & (TOWER_FLAGS.BOT.T1 << towerBitshift)) != 0) {
		standingStructures |= STRUCTURE_FLAGS.SAFE.T1
	}
	if((towers & (TOWER_FLAGS.BOT.T2 << towerBitshift)) != 0) {
		standingStructures |= STRUCTURE_FLAGS.SAFE.T2
	}
	if((towers & (TOWER_FLAGS.BOT.T3 << towerBitshift)) != 0) {
		standingStructures |= STRUCTURE_FLAGS.SAFE.T3
	}
	if((barracks & (BARRACK_FLAGS.BOT.MELEE << raxBitshift)) != 0) {
		standingStructures |= STRUCTURE_FLAGS.SAFE.MELEE_BARRACKS
	}
	if((barracks & (BARRACK_FLAGS.BOT.RANGE << raxBitshift)) != 0) {
		standingStructures |= STRUCTURE_FLAGS.SAFE.RANGE_BARRACKS
	}
	if((towers & TOWER_FLAGS.MID.T1) != 0) {
		standingStructures |= STRUCTURE_FLAGS.MID.T1
	}
	if((towers & TOWER_FLAGS.MID.T2) != 0) {
		standingStructures |= STRUCTURE_FLAGS.MID.T2
	}
	if((towers & TOWER_FLAGS.MID.T3) != 0) {
		standingStructures |= STRUCTURE_FLAGS.MID.T3
	}
	if((barracks & BARRACK_FLAGS.MID.MELEE) != 0) {
		standingStructures |= STRUCTURE_FLAGS.MID.MELEE_BARRACKS
	}
	if((barracks & BARRACK_FLAGS.MID.RANGE) != 0) {
		standingStructures |= STRUCTURE_FLAGS.MID.RANGE_BARRACKS
	}
	if((towers & (TOWER_FLAGS.TOP.T1 >> towerBitshift)) != 0) {
		standingStructures |= STRUCTURE_FLAGS.OFF.T1
	}
	if((towers & (TOWER_FLAGS.TOP.T2 >> towerBitshift)) != 0) {
		standingStructures |= STRUCTURE_FLAGS.OFF.T2
	}
	if((towers & (TOWER_FLAGS.TOP.T3 >> towerBitshift)) != 0) {
		standingStructures |= STRUCTURE_FLAGS.OFF.T3
	}
	if((barracks & (BARRACK_FLAGS.TOP.MELEE >> raxBitshift)) != 0) {
		standingStructures |= STRUCTURE_FLAGS.OFF.MELEE_BARRACKS
	}
	if((barracks & (BARRACK_FLAGS.TOP.RANGE >> raxBitshift)) != 0) {
		standingStructures |= STRUCTURE_FLAGS.OFF.RANGE_BARRACKS
	}
	if((towers & t4Safe) != 0) {
		standingStructures |= STRUCTURE_FLAGS.T4.SAFE
	}
	if((towers & t4Off) != 0) {
		standingStructures |= STRUCTURE_FLAGS.T4.OFF
	}
	if(won) {
		standingStructures |= STRUCTURE_FLAGS.ANCIENT
	}
	return standingStructures as StructuresBitmask
}
// performs bitmasking to check if structure was standing at game end
export function structureSurvived(structures: StructuresBitmask, mask: StructureFlag): boolean {
	return ((structures as number) & (mask as number)) != 0
}

export interface RankStats {
	rank: RankBitmask,
	count: number
}

export interface RankDistribution {
	ranks: RankStats[],
	timestamp: ISO8601TimeString
}

export interface OpenDotaMembership {
	isContributor?: boolean,
	isSubscriber?: boolean
}
export interface SteamAlias {
	personaName: string,
	since: ISO8601TimeString
}

function mapSteamAliases(aliases: OdotaSteamAlias[]): SteamAlias[] {
	return aliases.map(({personaname, name_since}) => {
		return {personaName: personaname, since: name_since}
	})
}

export interface Account {
	id: AccountId,
	personaName?: string,
	name?: string,
	oDota?: OpenDotaMembership
}

export interface SteamDetails {
	id?: SteamId,
	avatar?: {
		small?: string,
		medium?: string,
		full?: string
	},
	url?: string,
	lastLogin?: string,
	countryCode?: string,
	status?: unknown,
	fullHistoryUnavailable?: boolean
}

export interface Profile {
	account: Account,
	steam?: SteamDetails,
	isDotaPlusSub?: boolean,
}

export interface Player {
	profile: Profile,
	rank?: RankBitmask,
	leaderboardPos?: number,
	mmrGuess?: {
		normal?: number,
		turbo?: number
	},
	aliases: SteamAlias[]
}

export function bindPlayer(player: OdotaPlayer): Player {
	return {
		profile: bindProfile(player.profile),
		rank: player.rank_tier ?? undefined,
		leaderboardPos: player.leaderboard_rank ?? undefined,
		mmrGuess: ((obj => isEmpty(obj) ? undefined : obj))(nullsToUndefined({
			normal: player.computed_mmr,
			turbo: player.computed_mmr_turbo
		})),
		aliases: mapSteamAliases(player.aliases)
	}
}

function bindProfile(profile: OdotaProfile): Profile {
	return {
		account: nullsToUndefined({
			id: profile.account_id,
			personaName: profile.personaname,
			name: profile.name,
			oDota: (obj => isEmpty(obj) ? undefined : obj)({
				isSubscriber: profile.is_subscriber ?? undefined,
				isContributor: profile.is_contributor ?? undefined
			}),
		}),
		steam: bindSteamDetails(profile),
		isDotaPlusSub: profile.plus ? true : undefined
	}
}
function bindSteamDetails(profile: OdotaProfile): SteamDetails | undefined {
	const details: SteamDetails = nullsToUndefined({
		id: profile.steamId,
		avatar: (obj => isEmpty(obj) ? undefined : obj)(nullsToUndefined({
			small: profile.avatar,
			medium: profile.avatarmedium,
			full: profile.avatarfull
		})),
		url: profile.profileurl,
		lastLogin: profile.last_login,
		countryCode: profile.loccountrycode,
		status: profile.status,
		fullHistoryUnavailable: profile.fh_unavailable
	})
	return isEmpty(details) ? undefined : details
}

// We discard the derived data as it is trivial to calculate and would
// double the size.
export function formatRankDistribution(distributions: Distributions) {
	const DIVISIONS = 4
	const TOP1 = 1 * DIVISIONS
	const TOP10 = 10 * DIVISIONS - TOP1
	const TOP100 = 100 * DIVISIONS - (TOP1 + TOP10)
	const TOP1000 = 1000 * DIVISIONS - (TOP1 + TOP10 + TOP100)

	const ranks: RankStats[] = distributions.ranks.rows.map(rank => {
		return {rank: rank.bin as RankBitmask, count: rank.count}
	});
	// We assert here because logically this has to exist
	ranks[ranks.length-1]!.count -= 1000 * DIVISIONS
	ranks.push(
		{rank: 82 as RankBitmask, count: TOP1000},
		{rank: 83 as RankBitmask, count: TOP100},
		{rank: 84 as RankBitmask, count: TOP10},
		{rank: 85 as RankBitmask, count: TOP1},
	)
	return {
		ranks: ranks,
		timestamp: new Date().toISOString() as ISO8601TimeString
	} as RankDistribution
}

// /benchmarks?hero_id returns an array of values for a given percentile.
// It is always an array of values for different percentiles.
export interface Benchmark {
	timestamp: ISO8601TimeString,
	hero: HeroKey,
	gpm: Percentile[],
	xpm: Percentile[],
	kpm: Percentile[],
	lhpm: Percentile[],
	dmgpm: Percentile[],
	healpm: Percentile[],
	towerDmg: Percentile[]
}

// Performance represents a hero's peformance in a particular match.
// It is always a single tuple of the raw value and the percentile.
export interface Performance {
	gpm: Percentile,
	xpm: Percentile,
	kpm: Percentile,
	lhpm: Percentile,
	dmgpm: Percentile,
	healpm: Percentile,
	towerDmg: Percentile
}

export interface MatchBase {
	fetchTime: UnixTimestamp,
	id: MatchId,
	startTime?: UnixTimestamp,
	lengthSeconds: number,
	winningTeam: SideKey,
	gameMode: GameModeId,
	lobbyType: LobbyTypeId,
	parseVersion: number | null,
}

export interface PlayerMatchSummary {
	match: MatchBase,
	player: {
		id: AccountId,
		slot?: PlayerSlot,
		leaverStatus: LeaverStatus,
		partySize?: number,
	}
	hero: {
		id: HeroKey,
		facet?: number,
		kda: {kills: number, deaths: number, assists: number}
	}
}

export function formatMatchSummary(summary: MatchForPlayer, player: AccountId): PlayerMatchSummary {
	const matchSummary: PlayerMatchSummary = {
		match: {
			id: summary.match_id,
			fetchTime: new Date().getTime() as UnixTimestamp,
			startTime: summary.start_time ?? undefined,
			lengthSeconds: summary.duration,
			winningTeam: summary.radiant_win ? 0 : 1,
			gameMode: summary.game_mode,
			lobbyType: summary.lobby_type,
			parseVersion: summary.version,
		},
		player: {
			id: player,
			leaverStatus: summary.leaver_status
		},
		hero: {
			id: heroKeysByExtId[summary.hero_id]!,
			kda: {
				kills: summary.kills,
				deaths: summary.deaths,
				assists: summary.assists
			}
		}
	}
	if(summary.start_time) {
		matchSummary.match.startTime = summary.start_time
	}
	if(summary.party_size) {
		matchSummary.player.partySize = summary.party_size
	}
	if(summary.player_slot) {
		matchSummary.player.slot = summary.player_slot
	}
	// TODO: check if facets are still deprecated through dotaconstants,
	// and assign hero_variant if not
	return matchSummary
}

export interface SparseMatch extends MatchBase {
	meta: {
		matchSeqNum: number,
		patch: PatchId,
		region: RegionId,
		cluster: number,
		odota: OpenDotaMetadata
		series?: {id?: SeriesId, type?: number},
		leagueId?: LeagueId,
		league?: object,
		replay?: {url?: URL, salt?: number},
	},
	radiant: {
		structuresLeft: StructuresBitmask,
		kills: number,
	}
	dire: {
		structuresLeft: StructuresBitmask,
		kills: number,
	}
	draft: DraftStep[],
	players: SparsePlayer[],
	firstBloodSeconds: number,
	humanPlayerCount: number,
	preGameLengthSeconds: number
}

export function formatSparseMatch(match: UnparsedMatch): SparseMatch {
	const formattedMatch: SparseMatch = {
		id: match.match_id,
		fetchTime: new Date().getTime() as UnixTimestamp,
		startTime: match.start_time ?? undefined,
		lengthSeconds: match.duration,
		winningTeam: match.radiant_win ? 0 : 1,
		gameMode: match.game_mode,
		lobbyType: match.lobby_type,
		parseVersion: match.version,
		meta: {
			matchSeqNum: match.match_seq_num,
			series: ((obj) => isEmpty(obj) ? undefined : obj)({
				id: match.series_id,
				type: match.series_type
			}),
			leagueId: match.leagueid,
			patch: match.patch,
			region: match.region,
			cluster: match.cluster,
			replay: ((obj) => isEmpty(obj) ? undefined : obj)(nullsToUndefined({
				url: match.replay_url ? new URL(match.replay_url) : undefined,
				salt: match.replay_salt
			})),
			odota: {
				engine: match.engine,
				parseVersion: match.version,
				api: match.od_data.has_api,
				gcData: match.od_data.has_gcdata,
				archived: match.od_data.has_archived,
				flags: match.flags,
				metadata: match.metadata,
			}
		},
		radiant: {
			structuresLeft: setStructureBitmask(
				match.tower_status_radiant,
				match.barracks_status_radiant,
				'radiant',
				// TODO: We need to handle case where radiant_win is null
				match.radiant_win!
			),
			kills: match.radiant_score
		},
		dire: {
			structuresLeft: setStructureBitmask(
				match.tower_status_dire,
				match.barracks_status_dire,
				'dire',
				!match.radiant_win
			),
			kills: match.dire_score
		},
		draft: match.picks_bans.map(pb => parsePickBan(pb)),
		players: match.players.map(player => formatSparsePlayer(player)),
		firstBloodSeconds: match.first_blood_time,
		humanPlayerCount: match.human_players,
		preGameLengthSeconds: match.pre_game_duration,
	}
	return formattedMatch
}

export interface FullMatch extends SparseMatch {
	// parsed ---------------------------------------
	players: ParsedPlayer[],
	// TODO: we make this optional for now as it requires a big format function.
	teamfights?: Teamfight[],
	pauses?: Pause[]
	objectives?: NormalizedObjective[],
	chat?: ChatMsg[],
	allChatWordCounts?: {total: object, player: object},
	radiantAdv: {gold: number[], xp: number[]},
	cosmetics?: object,
	draft: DraftStep[] | CaptainsModeDraftStep[],
}

export function formatFullMatch(match: ParsedMatch): FullMatch {
	const formattedMatch: FullMatch = {
		id: match.match_id,
		fetchTime : new Date().getTime() as UnixTimestamp,
		lengthSeconds: match.duration,
		winningTeam: match.radiant_win ? 0 : 1,
		gameMode: match.game_mode,
		lobbyType: match.lobby_type,
		parseVersion: match.version,
		meta: {
			matchSeqNum: match.match_seq_num,
			series: {id: match.series_id, type: match.series_type},
			leagueId: match.leagueid,
			patch: match.patch,
			region: match.region,
			cluster: match.cluster,
			replay: {
				url: match.replay_url ? new URL(match.replay_url) : undefined,
				salt: match.replay_salt},
			odota: {
				engine: match.engine,
				parseVersion: match.version,
				api: match.od_data.has_api,
				gcData: match.od_data.has_gcdata,
				archived: match.od_data.has_archived,
				flags: match.flags,
				metadata: match.metadata,
			}
		},
		radiant: {
			structuresLeft: setStructureBitmask(
				match.tower_status_radiant,
				match.barracks_status_radiant,
				'radiant',
				// TODO: We need to handle case where radiant_win is null
				match.radiant_win!
			),
			kills: match.radiant_score
		},
		dire: {
			structuresLeft: setStructureBitmask(
				match.tower_status_dire,
				match.barracks_status_dire,
				'dire',
				!match.radiant_win
			),
			kills: match.dire_score
		},
		draft: match.picks_bans.map(pb => parsePickBan(pb)),
		players: match.players.map(player => {
			return formatFullInGamePlayer(player)
		}),
		firstBloodSeconds: match.first_blood_time,
		humanPlayerCount: match.human_players,
		preGameLengthSeconds: match.pre_game_duration,
		radiantAdv: {gold: match.radiant_gold_adv!, xp: match.radiant_xp_adv!},
	}
	if(match.pauses && match.pauses.length > 0) {
		formattedMatch.pauses = match.pauses
	}
	// TODO: Conditionally add objectives, chat, wordCounts and cosmetics
	return formattedMatch
}

export interface Teamfight {
	startSeconds: number,
	endSeconds: number,
	finalDeathSeconds: number,
	deathCount: number,
	player: TeamfightPlayerData[]
}

export interface TeamfightPlayerData {
	deathPositionsByWhen: Record<number, {x: number, y: number}>,
	abilityUses: Record<AbilityKey, number>,
	abilityTargets?: Record<AbilityKey, Record<HeroKey, number>>,
	itemUses: Record<ItemKey, number>,
	killed: Record<HeroKey, number>,
	deathCount: number,
	buybacks?: number, // Can very theoretically be more than once... We don't need this if deaths are 0.
	damage: number,
	healing: number,
	goldDiff: number,
	xpDiff: number,
	xpStart: number // We don't need to keep xp_end when we have the start and offset
}

export const OBJECTIVES = {
	FIRST_BLOOD: 'first blood',
	COURIER: 'courier',
	BUILDING: 'building',
	TORMENTOR: 'tormentor',
	ROSHAN: 'roshan',
	AEGIS: 'aegis'
} as const
export type Objective = typeof OBJECTIVES[keyof typeof OBJECTIVES]

export interface NormalizedObjective {
	whenSeconds: number,
	what: Objective,
	who: HeroKey | UnitKey,
	target?: HeroKey | StructureKey, // not needed when objective can only be one target
	value?: number
}

export interface ChatMsg {
	whenSeconds: number,
	type: string,
	value: string,
	playerSlot: PlayerSlot
}

// Old neutral system
export interface NeutralToken { token: ItemKey, receivedSeconds: number }

export interface OpenDotaMetadata {
	engine: number,
	parseVersion: number | null,
	api: boolean,
	gcData: boolean,
	archived: boolean,
	flags: number,
	metadata: any,
}

export interface SparsePlayer {
	account: {
		id: AccountId,
		personaName?: string,
		name?: string,
		rank?: RankBitmask,
		mmrGuess?: number, // Have been pretty bad...
		oDota: {subscriber: boolean, contributor: boolean}
	},
	slot?: PlayerSlot,
	partyId?: PartyId,
	left: LeaverStatus,
	performance: Performance,
	kda: {kills: number, deaths: number, assists: number, ratio: number},
	cs: {lastHits: number, denies: number},
	// if total-spent != remaining, gold lost is not concidered spent by the API.
	gold: {total: number, spent: number, remaining: number},
	hero: {
		id: HeroKey,
		lvl: number,
		abilityUpgrades: AbilityKey[],
		permanentBuffs?: PermanentBuff[],
		netWorth: number,
		inventory: ItemKey[], // 0-5 for main, 6-8 for backpack
		neutralItem: {artifact: ItemKey, enchantment: ItemKey}
	},
	damage: {
		toHeroes: number,
		toBuildings: number
	}
	healing: {
		amt: number
	}
}

function formatSparsePlayer(player: OdotaUnparsedPlayer): SparsePlayer {
	const sparsePlayer: SparsePlayer = {
		account: {
			id: player.account_id,
			oDota: {
				subscriber: player.is_subscriber,
				contributor: player.is_contributor
			}
		},
		left: player.leaver_status,
		performance: {
			gpm: {
				percentile: player.benchmarks.gold_per_min.pct,
				value: player.benchmarks.gold_per_min.raw
			},
			xpm: {
				percentile: player.benchmarks.xp_per_min.pct,
				value: player.benchmarks.xp_per_min.raw,
			},
			kpm: {
				percentile: player.benchmarks.kills_per_min.pct,
				value: player.benchmarks.kills_per_min.raw
			},
			lhpm: {
				percentile: player.benchmarks.last_hits_per_min.pct,
				value: player.benchmarks.last_hits_per_min.raw
			},
			dmgpm: {
				percentile: player.benchmarks.hero_damage_per_min.pct,
				value: player.benchmarks.hero_damage_per_min.raw
			},
			healpm: {
				percentile: player.benchmarks.hero_healing_per_min.pct,
				value: player.benchmarks.hero_healing_per_min.raw
			},
			towerDmg: {
				percentile: player.benchmarks.tower_damage.pct,
				value: player.benchmarks.tower_damage.raw
			}
		},
		kda: {
			kills: player.kills,
			deaths: player.deaths,
			assists: player.assists,
			ratio: player.kda
		},
		cs: {lastHits: player.last_hits, denies: player.denies},
		// if total-spent != remaining, gold lost is not concidered spent by the API.
		gold: {
			total: player.total_gold,
			spent: player.gold_spent,
			remaining: player.gold},
		hero: {
			id: heroKeysByExtId[player.hero_id]!,
			lvl: player.level,
			abilityUpgrades: player.ability_upgrades_arr.map(ability => {
				return abilityKeysByExtId[ability]!
			}),
			permanentBuffs: player.permanent_buffs ? player.permanent_buffs.map(buff => {
				return {
					id: buff.permanent_buff as PermanentBuffId,
					stackCount: buff.stack_count,
					receivedSeconds: buff.grant_time
				}
			}) : undefined,
			netWorth: player.net_worth,
			inventory: [
				ItemKeysByExtId[player.item_0]!, ItemKeysByExtId[player.item_1]!,
				ItemKeysByExtId[player.item_2]!, ItemKeysByExtId[player.item_3]!,
				ItemKeysByExtId[player.item_4]!, ItemKeysByExtId[player.item_5]!,
				ItemKeysByExtId[player.backpack_0]!,
				ItemKeysByExtId[player.backpack_1]!,
				ItemKeysByExtId[player.backpack_2]!,
				
			],
			neutralItem: {
				artifact: ItemKeysByExtId[player.item_neutral]!,
				enchantment: ItemKeysByExtId[player.item_neutral2]!
			}
		},
		damage: {toHeroes: player.hero_damage, toBuildings: player.tower_damage},
		healing: {amt: player.hero_healing}
	}
	if(player.personaname) {
		sparsePlayer.account.personaName = player.personaname
	}
	if(player.name) {
		sparsePlayer.account.name = player.name
	}
	if(player.rank_tier) {
		sparsePlayer.account.rank = player.rank_tier
	}
	if(player.computed_mmr) {
		sparsePlayer.account.mmrGuess = player.computed_mmr
	}
	if(player.player_slot) {
		sparsePlayer.slot = player.player_slot
	}
	if(player.party_id) {
		sparsePlayer.partyId = player.party_id as PartyId
	}
	return sparsePlayer
}

export interface ParsedPlayer extends SparsePlayer {
	stacked: {creeps: number, camps: number},
	laning: {
		lane: LaneKey,
		efficiencyRate: number,
		weightedPosCoords: Record<number, Record<number, number>>,
		roamed?: boolean,
		kills: number
	}
	randomed: boolean,
	predictedWin: boolean,
	gotFirstBlood: boolean,
	teamfightParticipationRate: number,
	wasStunnedSeconds: number,
	xpSources: Record<XpSourceKey, number>,
	goldSources: Record<GoldSourceKey, number>,
	damage: {
		toHeroes: number,
		toBuildings: number,
		dealt: {
			// includes creeps, illusions, structures etc.
			to: Record<string, number>,
			by: Record<string, number>,
			// src can at least be null (maybe rightclick dmg.) | ability | item.
			// number is dmg.amt. Only includes heroes.
			targetsBySource: Record<string, Record<HeroKey, number>>
		},
		received: {
			from: Record<string, number>,
			by: Record<string, number>,
		},
		hitCount: Record<HeroKey, number>,
		hardestHit: HardestHitDealt,
	},
	healing: {
		amt: number,
		bySource: Record<string, number>, // string should probably become id.
	},
	lifeState: Record<LifeStateKey, number>,
	abilities: {
		uses: Record<AbilityKey, number>,
		targets: Record<AbilityKey, Record<HeroKey, number>>,
	}
	items: {
		uses: Record<ItemKey, number>,
		// we don't neccessarily get recipe entries,
		// so we need to watch item completions.
		purchases: Array<{whenSeconds: number, item: ItemKey}>,
	},
	timings: MatchTimings,
	logs: {
		// should end up as combination of obs_log and obs_left_log.
		observers: WardLogEntry[],
		sentries: WardLogEntry[],
		kills: Array<{whenSeconds: number, who: HeroKey}>,
		buybackTimestamps: number[],
		runes: Array<{whenSeconds: number, rune: RuneKey}>,
		neutralItems: NeutralItem[],
		neutralTokensLog?: Array<{receivedSeconds: number, item: ItemKey}>
		// TODO: bind events to ids -> need sample responses...
		connection: Array<{whenSeconds: number, event: string}>,
	},
	killed: Record<string, number>, //includes creeps, wards, buildings, etc.
	killedBy: Record<string, number>, //can presumably include more than heroes.
	killstreak: Record<number, number>,
	multikills: Record<number, number>,
	actions: Record<UnitOrderId, number>,
	apm: number, //not strictly needed as we can divide above with match length
	pingCount: number,
	cosmetics?: Cosmetic[],
	additionalUnits?: object[]
}

export function formatFullInGamePlayer(player: OdotaParsedPlayer): ParsedPlayer {
	const parsedPlayer: ParsedPlayer = {
		account: {
			id: player.account_id,
			oDota: {
				subscriber: player.is_subscriber,
				contributor: player.is_contributor
			}
		},
		left: player.leaver_status,
		performance: {
			gpm: {
				percentile: player.benchmarks.gold_per_min.pct,
				value: player.benchmarks.gold_per_min.raw
			},
			xpm: {
				percentile: player.benchmarks.xp_per_min.pct,
				value: player.benchmarks.xp_per_min.raw,
			},
			kpm: {
				percentile: player.benchmarks.kills_per_min.pct,
				value: player.benchmarks.kills_per_min.raw
			},
			lhpm: {
				percentile: player.benchmarks.last_hits_per_min.pct,
				value: player.benchmarks.last_hits_per_min.raw
			},
			dmgpm: {
				percentile: player.benchmarks.hero_damage_per_min.pct,
				value: player.benchmarks.hero_damage_per_min.raw
			},
			healpm: {
				percentile: player.benchmarks.hero_healing_per_min.pct,
				value: player.benchmarks.hero_healing_per_min.raw
			},
			towerDmg: {
				percentile: player.benchmarks.tower_damage.pct,
				value: player.benchmarks.tower_damage.raw
			}
		},
		kda: {
			kills: player.kills,
			deaths: player.deaths,
			assists: player.assists,
			ratio: player.kda
		},
		cs: {lastHits: player.last_hits, denies: player.denies},
		gold: {
			total: player.total_gold,
			spent: player.gold_spent,
			remaining: player.gold
		},
		hero: {
			id: player.hero_id,
			lvl: player.level,
			abilityUpgrades: player.ability_upgrades_arr,
			permanentBuffs: player.permanent_buffs ? player.permanent_buffs.map(buff => {
				return {
					id: buff.permanent_buff as PermanentBuffId,
					stackCount: buff.stack_count,
					receivedSeconds: buff.grant_time
				}
			}) : undefined,
			netWorth: player.net_worth,
			inventory: [
				ItemKeysByExtId[player.item_0]!, ItemKeysByExtId[player.item_1]!,
				ItemKeysByExtId[player.item_2]!, ItemKeysByExtId[player.item_3]!,
				ItemKeysByExtId[player.item_4]!, ItemKeysByExtId[player.item_5]!,
				ItemKeysByExtId[player.backpack_0]!,
				ItemKeysByExtId[player.backpack_1]!,
				ItemKeysByExtId[player.backpack_2]!,
				
			],
			neutralItem: {
				artifact: ItemKeysByExtId[player.item_neutral]!,
				enchantment: ItemKeysByExtId[player.item_neutral2]!
			}
		},
		damage: {
			toHeroes: player.hero_damage,
			toBuildings: player.tower_damage,
			dealt: {
				to: player.damage,
				by: player.damage_inflictor,
				targetsBySource: player.damage_targets
			},
			received: {
				from: player.damage_taken,
				by: player.damage_inflictor_received
			},
			hitCount: player.hero_hits,
			hardestHit: {
				whenSeconds: player.max_hero_hit.time,
				// TODO: who should be heroId - conversion needed.
				who: heroKeysByLabel[player.max_hero_hit.key]!,
				what: player.max_hero_hit.inflictor,
				amount: player.max_hero_hit.value
			}
		},
		healing: {
			amt: player.hero_healing,
			bySource: player.healing
		},
		stacked: {
			creeps: player.creeps_stacked, camps: player.camps_stacked
		},
		laning: {
			lane: LaneKeyByExtId[player.lane_role! as LaneExtId],
			efficiencyRate: player.lane_efficiency,
			weightedPosCoords: player.lane_pos,
			kills: player.lane_kills
		},
		randomed: player.randomed,
		predictedWin: player.pred_vict,
		gotFirstBlood: player.firstblood_claimed === 1 ? true : false,
		teamfightParticipationRate: player.teamfight_participation,
		wasStunnedSeconds: player.stuns,
		// TODO: external IDs should be validated; we can probably refactor
		// into generic function.
		xpSources: translateRecord<XpReasonId, XpSourceKey, number>(
			player.xp_reasons, XpSourceKeyByExtId
		),
		goldSources: translateRecord<GoldReasonId, GoldSourceKey, number>(
			player.gold_reasons, GoldSrcKeysByExtId
		),
		lifeState: translateRecord<number, LifeStateKey, number>(
			player.life_state, LifeStateKeysByExtId
		),
		abilities: {
			uses: Object.fromEntries(
				Object.entries(player.ability_uses).map(([ability, useCount]) => {
				 return [abilityKeysByLabel[ability], useCount]})
			),
			targets: player.ability_targets
		},
		items: {
			uses: player.item_usage,
			purchases: player.purchase_log.map(({time, key}) => {
				return {whenSeconds: time, item: ItemKeysByLabel[key]!}
			})
		},
		timings: {
			timedSeconds: player.times,
			goldValues: player.gold_t,
			xpValues: player.xp_t,
			lastHits: player.lh_t,
			denies: player.dn_t
		},
		logs: {
			observers: formatWardLog(player.obs_log, player.obs_left_log),
			sentries: formatWardLog(player.sen_log, player.sen_left_log),
			kills: player.kills_log.map(({time, key}) => {
				return {whenSeconds: time, who: heroKeysByLabel[key]!}
			}),
			buybackTimestamps: player.buyback_log.map(bb => bb.time),
			runes: player.runes_log.map(({time, key}) => {
				return {
					whenSeconds: time,
					rune: RuneKeysByExtId[parseInt(key) as RuneExtId]
				}
			}),
			neutralItems: player.neutral_item_history.map((n => {
				return {
					artifact: ItemKeysByLabel[n.item_neutral]!,
					enchantment: ItemKeysByLabel[n.item_neutral_enhancement]!,
					craftedSeconds: n.time
				}
			})),
			// TODO: insert old neutral token log for old matches
			// TODO: create id bindings for connection events.
			connection: Object.entries(player.connection_log).map(([_, v]) => {
				return {whenSeconds: v.time, event: v.event }
			}),
		},
		killed: player.killed,
		killedBy: player.killed_by,
		killstreak: player.kill_streaks,
		multikills: player.multi_kills,
		/** TODO: Same as further up, but for Unit order IDs */
		actions: player.actions,
		apm: player.actions_per_min,
		pingCount: player.pings,
	}
	if(player.personaname) {
		parsedPlayer.account.personaName = player.personaname
	}
	if(player.name) {
		parsedPlayer.account.name = player.name
	}
	if(player.rank_tier) {
		parsedPlayer.account.rank = player.rank_tier
	}
	if(player.computed_mmr) {
		parsedPlayer.account.mmrGuess = player.computed_mmr
	}
	if(player.player_slot) {
		parsedPlayer.slot = player.player_slot
	}
	if(player.party_id) {
		parsedPlayer.partyId = player.party_id as PartyId
	}
	if(player.is_roaming) {
		parsedPlayer.laning.roamed = true
	}
	if(player.cosmetics) {
		parsedPlayer.cosmetics = player.cosmetics
	}
	if(player.additional_units) {
		parsedPlayer.additionalUnits
	}
	return parsedPlayer
}

function translateRecord<inK extends number, outK extends number | string, valueT>
(record: Record<inK, valueT>, lookup: Record<inK, outK>) {
	return Object.fromEntries(
		Object.entries(record).map(([k, v]) => [lookup[parseInt(k) as inK], v])
	) as Record<outK, valueT>
}

function formatWardLog(enteredLog: OdotaWardLogEntry[], leftLog: OdotaWardLogEntry[]) {
	enteredLog.sort((a, b) => a.ehandle - b.ehandle);
	leftLog.sort((a, b) => a.ehandle - b.ehandle);
	const wardLog: WardLogEntry[] = []
	enteredLog.forEach((entry, i) => {
		const combinedEntry: WardLogEntry = {
			placedSeconds: entry.time,
			leftSeconds: leftLog[i]?.time ?? null,
			position: {x: entry.x, y: entry.y, z: entry.z},
		}
		if(leftLog[i]?.attackername) {
			combinedEntry.killer = leftLog[i].attackername
		}
		wardLog.push(combinedEntry)
	})
	return wardLog
}

export interface NeutralItem {
	craftedSeconds: number,
	artifact: ItemKey,
	enchantment: ItemKey
}

export interface WardLogEntry {
	placedSeconds: number,
	leftSeconds: number | null,
	killer?: string, // odota shows placers as attackers if ward times out, so we have to guard against full duration if killer is same as placedBy.
	position: {x: number, y: number, z: number}
}

export interface HardestHitDealt {
	whenSeconds: number,
	// keep this in case hardest hit can come from other than hero.
	unit?: string,
	who: HeroKey,
	// can be both items and abilities, so keep string and resolve on display.
	what: string,
	amount: number
}

export interface MatchTimings {
	timedSeconds: number[],
	goldValues: number[],
	xpValues: number[],
	lastHits: number[],
	denies: number[]
}

export interface PermanentBuff {
	id: PermanentBuffId,
	stackCount: number,
	receivedSeconds: number
}

export interface DmgBreakdown {distribution: object, sources: object}

export interface MinMax {min: number, max: number}

export interface DraftStep {
	order: number,
	action: DraftAction,
	team: SideKey,
	hero: HeroKey,
}

export function parsePickBan(pickBan: PickBan): DraftStep {
	return {
		order: pickBan.order,
		action: pickBan.is_pick ? 'pick' : 'ban',
		team: SideKeysByExtId[pickBan.team as SideExtId],
		hero: heroKeysByExtId[pickBan.hero_id]!,
	}
}

export interface CaptainsModeDraftStep extends DraftStep {
	time: {
		extra: number,
		total: number
	}
}

export const RUNES = [
	{key: 0, label: 'bounty', extId: 5},
	{key: 1, label: 'wisdom', extId: 8},
	{key: 2, label: 'water', extId: 7},
	{key: 3, label: 'invisibility', extId: 3},
	{key: 4, label: 'regeneration', extId: 4},
	{key: 5, label: 'amplify damage', extId: 0},
	{key: 6, label: 'arcane', extId: 6},
	{key: 7, label: 'haste', extId: 1},
	{key: 8, label: 'illusion', extId: 2},
	{key: 9, label: 'shield', extId: 9}
] as const satisfies readonly IdBinding<number>[]

export type RuneKey = typeof RUNES[number]['key']
export type RuneLabel = typeof RUNES[number]['label']
export type RuneExtId = typeof RUNES[number]['extId']

export const RuneKeysByExtId = Object.fromEntries(
	RUNES.map(rune => [rune.extId, rune.key])
) as Record<RuneExtId, RuneKey>
export const Runes = Object.fromEntries(
	RUNES.map(rune => [rune.key, rune.label])
) as Record<RuneKey, RuneLabel>

export const GOLD_SOURCES = [
	{key: 0, label: 'other', extId: 0},
	{key: 1, label: 'deaths', extId: 1},
	{key: 6, label: 'unknown6', extId: 6},
	{key: 11, label: 'buildings', extId: 11},
	{key: 12, label: 'heroes', extId: 12},
	{key: 13, label: 'lane creeps', extId: 13},
	{key: 14, label: 'neutral creeps', extId: 14},
	{key: 16, label: 'first blood', extId: 16},
	{key: 17, label: 'bounty runes', extId: 17},
	{key: 19, label: 'unknown19', extId: 19},
	{key: 20, label: 'wards', extId: 20},
	{key: 21, label: 'unknown21 (value 135)', extId: 21}
] as const satisfies readonly IdBinding<number>[]

export type GoldSourceKey = typeof GOLD_SOURCES[number]['key']
export type GoldSourceLabel = typeof GOLD_SOURCES[number]['label']
export type GoldSourceExtId = typeof GOLD_SOURCES[number]['extId']

export const GoldSrcKeysByExtId = Object.fromEntries(
	GOLD_SOURCES.map(src => [src.extId, src.key])
) as Record<GoldSourceExtId, GoldSourceKey>
export const GoldSources = Object.fromEntries(
	GOLD_SOURCES.map(src => [src.key, src.label])
) as Record<GoldSourceKey, GoldSourceLabel>

export const XP_SOURCES = [
	{key: 0, label: 'other', extId: 0},
	{key: 1, label: 'heroes', extId: 1},
	{key: 2, label: 'creeps', extId: 2},
	{key: 4, label: 'unknown4', extId: 4},
] as const satisfies readonly IdBinding<number>[]

export type XpSourceKey = typeof XP_SOURCES[number]['key']
export type XpSourceLabel = typeof XP_SOURCES[number]['label']
export type XpSourceExtId = typeof XP_SOURCES[number]['extId']

export const XpSourceKeyByExtId = Object.fromEntries(
	XP_SOURCES.map(src => [src.extId, src.key])
) as Record<XpSourceExtId, XpSourceKey>
export const XpSources = Object.fromEntries(
	XP_SOURCES.map(src => [src.key, src.label])
) as Record<XpSourceKey, XpSourceLabel>

// Single source of truth data binding
export const LIFE_STATES = [
	{key:0, label: 'alive', extId: 0},
	{key:1, label:'unknown (pseudo-death?)', extId: 1},
	{key:2, label:'dead', extId: 2}
	// Potential unknown sources: respawning, reincarnation / pseudo-death (aegis, wraith king)
] as const satisfies readonly IdBinding<number>[]

// Derived types
export type LifeStateKey = typeof LIFE_STATES[number]['key']
export type LifeStateLabel = typeof LIFE_STATES[number]['label']
export type LifeStateExtId = typeof LIFE_STATES[number]['extId']

// Lookups - (we really only need external -> internal and internal -> label as we always transform and store data by internal id).
export const LifeStateKeysByExtId = Object.fromEntries(
	LIFE_STATES.map(state => [state.extId, state.key])
) as Record<LifeStateExtId, LifeStateKey>
/* We could have defined the original data in the structure of this record, but
we get the added compile time safety by only allowing valid IDs through type. */
export const LifeStates = Object.fromEntries(
	LIFE_STATES.map( state => [state.key, state.label])
) as Record<LifeStateKey, LifeStateLabel>

// Computed values
export function getSecondsDead(lifeState: Record<LifeStateKey, number>): number {
	return (lifeState[LIFE_STATES[1].key] || 0) + (lifeState[LIFE_STATES[2].key] || 0)
}

export const UNIT_IDS = [
	{
		key: 0,
		label: 'radiant melee creep',
		extId: 'npc_dota_creep_goodguys_melee'
	},
	{
		key: 1,
		label: 'radiant ranged creep',
		extId: 'npc_dota_creep_goodguys_ranged'
	},
	{
		key: 2,
		label: 'radiant siege creep',
		extId: 'npc_dota_goodguys_siege'
	},
	{
		key: 3,
		label: 'dire melee creep',
		extId: 'npc_dota_creep_badguys_melee'
	},
	{
		key: 4,
		label: 'dire ranged creep',
		extId: 'npc_dota_creep_badguys_ranged'
	},
	{
		key: 5,
		label: 'dire siege creep',
		extId: 'npc_dota_badguys_siege'
	}
] as const satisfies IdBinding<string>[]

export type UnitKey = typeof UNIT_IDS[number]['key']
export type UnitName = typeof UNIT_IDS[number]['label']
export type UnitExtId = typeof UNIT_IDS[number]['extId']

export const UnitKeysByExtId = Object.fromEntries(
	UNIT_IDS.map(unit => [unit.extId, unit.key])
) as Record<UnitExtId, UnitKey>

export const Units = Object.fromEntries(
	UNIT_IDS.map(unit => [unit.key, unit.label])
) as Record<UnitKey, UnitName>

export const STRUCTURE_IDS = [
	{
		key: 0,
		label: 'radiant safelane tier 1 tower',
		extId: 'npc_dota_goodguys_tower1_bot'
	},
	{
		key: 1,
		label: 'radiant safelane tier 2 tower',
		extId: 'npc_dota_goodguys_tower2_bot'
	},
	{
		key: 2,
		label: 'radiant safelane tier 3 tower',
		extId: 'npc_dota_goodguys_tower3_bot'
	},
	{
		key: 3,
		label: 'radiant safelane melee barracks',
		extId: 'npc_dota_goodguys_melee_rax_bot'
	},
	{
		key: 4,
		label: 'radiant safelane range barracks',
		extId: 'npc_dota_goodguys_range_rax_bot'
	},
	{
		key: 5,
		label: 'radiant midlane tier 1 tower',
		extId: 'npc_dota_goodguys_tower1_mid'
	},
	{
		key: 6,
		label: 'radiant midlane tier 2 tower',
		extId: 'npc_dota_goodguys_tower2_mid'
	},
	{
		key: 7,
		label: 'radiant midlane tier 3 tower',
		extId: 'npc_dota_goodguys_tower3_mid'
	},
	{
		key: 8,
		label: 'radiant midlane melee barracks',
		extId: 'npc_dota_goodguys_melee_rax_mid'
	},
	{
		key: 9,
		label: 'radiant midlane range barracks',
		extId: 'npc_dota_goodguys_range_rax_mid'
	},
		{
		key: 10,
		label: 'radiant offlane tier 1 tower',
		extId: 'npc_dota_goodguys_tower1_top'
	},
	{
		key: 11,
		label: 'radiant offlane tier 2 tower',
		extId: 'npc_dota_goodguys_tower2_top'
	},
	{
		key: 12,
		label: 'radiant offlane tier 3 tower',
		extId: 'npc_dota_goodguys_tower3_top'
	},
	{
		key: 13,
		label: 'radiant offlane melee barracks',
		extId: 'npc_dota_goodguys_melee_rax_top'
	},
	{
		key: 14,
		label: 'radiant offlane range barracks',
		extId: 'npc_dota_goodguys_range_rax_top'
	},
	{
		key: 15,
		label: 'radiant tier 4 tower',
		extId: 'npc_dota_goodguys_tower4'
	},
	{
		key: 16,
		label: 'radiant ancient',
		extId: 'npc_dota_goodguys_fort'
	},
	{
		key: 17,
		label: 'dire safelane tier 1 tower',
		extId: 'npc_dota_badguys_tower1_top'
	},
	{
		key: 18,
		label: 'dire safelane tier 2 tower',
		extId: 'npc_dota_badguys_tower2_top'
	},
	{
		key: 19,
		label: 'dire safelane tier 3 tower',
		extId: 'npc_dota_badguys_tower3_top'
	},
	{
		key: 20,
		label: 'dire safelane melee barracks',
		extId: 'npc_dota_badguys_melee_rax_top'
	},
	{
		key: 21,
		label: 'dire safelane range barracks',
		extId: 'npc_dota_badguys_range_rax_top'
	},
	{
		key: 22,
		label: 'dire midlane tier 1 tower',
		extId: 'npc_dota_badguys_tower1_mid'
	},
	{
		key: 23,
		label: 'dire midlane tier 2 tower',
		extId: 'npc_dota_badguys_tower2_mid'
	},
	{
		key: 24,
		label: 'dire midlane tier 3 tower',
		extId: 'npc_dota_badguys_tower3_mid'
	},
	{
		key: 25,
		label: 'dire midlane melee barracks',
		extId: 'npc_dota_badguys_melee_rax_mid'
	},
	{
		key: 26,
		label: 'dire midlane range barracks',
		extId: 'npc_dota_badguys_range_rax_mid'
	},
	{
		key: 27,
		label: 'dire offlane tier 1 tower',
		extId: 'npc_dota_badguys_tower1_bot'
	},
	{
		key: 28,
		label: 'dire offlane tier 2 tower',
		extId: 'npc_dota_badguys_tower2_bot'
	},
	{
		key: 29,
		label: 'dire offlane tier 3 tower',
		extId: 'npc_dota_badguys_tower3_bot'
	},
	{
		key: 30,
		label: 'dire offlane melee barracks',
		extId: 'npc_dota_badguys_melee_rax_bot'
	},
	{
		key: 31,
		label: 'dire offlane range barracks',
		extId: 'npc_dota_badguys_range_rax_bot'
	},
	{
		key: 32,
		label: 'dire tier 4 tower',
		extId: 'npc_dota_badguys_tower4'
	},
	{
		key: 33,
		label: 'dire ancient',
		extId: 'npc_dota_badguys_fort'
	},
] as const satisfies IdBinding<string>[]

export type StructureKey = typeof STRUCTURE_IDS[number]['key']
export type StructureName = typeof STRUCTURE_IDS[number]['label']
export type StructureExtId = typeof STRUCTURE_IDS[number]['extId']

export const StructureKeysByExtId = Object.fromEntries(
	STRUCTURE_IDS.map(structure => [structure.extId, structure.key])
) as Record<StructureExtId, StructureKey>

export const Structures = Object.fromEntries(
	STRUCTURE_IDS.map(structure => [structure.key, structure.label])
) as Record<StructureKey, StructureName>

export const RANK_NAMES = {
	1: 'herald',
	2: 'guardian',
	3: 'crusader',
	4: 'archon',
	5: 'legend',
	6: 'ancient',
	7: 'divine',
	8: 'immortal'
} as Record<number, string>