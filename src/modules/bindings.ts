import { HERO_IDS } from "../../public/generated/data/heroBindings"
import { HEROES } from "../../public/generated/data/heroes"
import { ITEMS } from "../../public/generated/data/items"
import { ITEM_IDS } from "../../public/generated/data/itemBindings"
import { ABILITY_IDS } from "../../public/generated/data/abilityBindings"
import {
	DAMAGE_TYPES, SIDE, STRUCTURE_FLAGS, RUNE_BY_EXT, LANE_BY_EXT,
	XP_SOURCE_BY_EXT, GOLD_SOURCE_BY_EXT, LIFE_STATE_BY_EXT, DRAFT_ACTION,
	SIDE_BY_EXT, LIFE_STATE, type GoldSource, type Lane, type LifeState,
	type Side, type StructureFlag, type Structure, type StructuresBitmask,
	type Unit, type XpSource, type Rune, type DraftAction
} from "./domainConstants"
import {
	BARRACK_FLAGS, TOWER_FLAGS, type AccountId, type BarracksBitmask,
	type CosmeticDTO, type RankDistDTO, type LeagueId, type LeaverStatus,
	type PlayerMatchDTO, type MatchId, type NeutralItemHistoryDTO, type ObjectiveDTO,
	type ParsedPlayerDTO, type PlayerDTO, type ProfileDTO,
	type AliasDTO, type UnparsedPlayerDTO, type WardLogEntryDTO,
	type ParsedMatchDTO, type PartyId, type PauseDTO, type PercentileDTO, type PickBanDTO,
	type PlayerSlot, type RankBitmask, type SeriesId, type SteamId, type TimingDTO,
	type TowersBitmask, type UnparsedMatchDTO
} from "../types/openDotaTypes"
import {
	isEmpty, nullsToUndefined, stringify, type ISO8601TimeString, type UnixTimestamp
} from "./flow"
import type {
	GameModeId, LobbyTypeId, PatchId, RegionId, UnitOrderId
} from "../types/dotaConstantsTypes"
import { lookup, type Id, type IdRecord, type Lookup } from "./id"
import { EVENT, TARGET, traceBun, traceEvent, traceEventBun, type Result, type TraceEvent, type TracePoint } from "./log"

export const HERO = lookup(HERO_IDS, 'key')
export const HERO_BY_EXT = lookup(HERO_IDS, 'ext')
export const ITEM = lookup(ITEM_IDS, 'key')
export const ITEM_BY_EXT = lookup(ITEM_IDS, 'ext')
export const ABILITY = lookup(ABILITY_IDS, 'key')
export const ABILITY_BY_EXT = lookup(ABILITY_IDS, 'ext')

type Hero = keyof typeof HERO_IDS
type Item = keyof typeof ITEM_IDS
type AbilityId = keyof typeof ABILITY_IDS
const DAMAGE_TYPE = lookup(DAMAGE_TYPES, 'key')

// This comes as a bool from opendota, so no need to freeze keys atm.
export type Outcome = 'win' | 'loss'
function setStructureBitmask(
	towers: TowersBitmask,
	barracks: BarracksBitmask,
	side: Side,
	won: boolean
) {
	let standingStructures = 0
	// These will convert absolute lanes (bot / top) to relative
	// lanes (safe / off) by shifting left or right
	let towerBitshift = 0
	let raxBitshift = 0
	let t4Safe = TOWER_FLAGS.T4.BOT
	let t4Off = TOWER_FLAGS.T4.TOP
	if(side === SIDE.DIRE) {
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

function mapSteamAliases(aliases: AliasDTO[]): SteamAlias[] {
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

export function bindPlayer(player: PlayerDTO): Player {
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

function bindProfile(profile: ProfileDTO): Profile {
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
function bindSteamDetails(profile: ProfileDTO): SteamDetails | undefined {
	const details: SteamDetails = nullsToUndefined({
		id: profile.steamid,
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
export function formatRankDistribution(distributions: RankDistDTO) {
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
	hero: Hero,
	gpm: PercentileDTO[],
	xpm: PercentileDTO[],
	kpm: PercentileDTO[],
	lhpm: PercentileDTO[],
	dmgpm: PercentileDTO[],
	healpm: PercentileDTO[],
	towerDmg: PercentileDTO[]
}

// Performance represents a hero's peformance in a particular match.
// It is always a single tuple of the raw value and the percentile.
export interface Performance {
	gpm: PercentileDTO,
	xpm: PercentileDTO,
	kpm: PercentileDTO,
	lhpm: PercentileDTO,
	dmgpm: PercentileDTO,
	healpm: PercentileDTO,
	towerDmg: PercentileDTO
}

export interface MatchBase {
	fetchTime: UnixTimestamp,
	id: MatchId,
	startTime?: UnixTimestamp,
	lengthSeconds: number,
	winningTeam: Side,
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
		id: Hero,
		facet?: number,
		kda: {kills: number, deaths: number, assists: number}
	}
}

export function bindMatchSummary(summary:PlayerMatchDTO, player:AccountId
):Result<PlayerMatchSummary> {
	const trace = {
		where:TARGET.MATCH_SUM,
		who:summary.match_id,
		what:{events:[] as TraceEvent<any>[]}
	} satisfies Omit<TracePoint, 'when'>

	const heroId = HERO_BY_EXT[summary.hero_id]
	if(!heroId) {
		const eventData = {key:summary.hero_id, lookup:'HERO_BY_EXT'}
		trace.what.events.push(traceEventBun(EVENT.NOT_IN, eventData))
		return {trace:traceBun(trace), ok: false}
	}
	const data = {
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
			leaverStatus: summary.leaver_status,
			partySize: summary.party_size ?? undefined,
			slot: summary.player_slot ?? undefined
		},
		hero: {
			id: heroId,
			kda: {
				kills: summary.kills,
				deaths: summary.deaths,
				assists: summary.assists
			}
		}
	}
	// TODO: check if facets are still deprecated through dotaconstants,
	// and assign hero_variant if not
	return {data, ok:true, trace:traceBun(trace)}
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

export function formatSparseMatch(match: UnparsedMatchDTO): SparseMatch {
	return {
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
				SIDE.RADIANT,
				// TODO: We need to handle case where radiant_win is null
				match.radiant_win!
			),
			kills: match.radiant_score
		},
		dire: {
			structuresLeft: setStructureBitmask(
				match.tower_status_dire,
				match.barracks_status_dire,
				SIDE.DIRE,
				!match.radiant_win
			),
			kills: match.dire_score
		},
		draft: match.picks_bans.map(pb => parsePickBan(pb)),
		players: match.players.map(player => formatSparsePlayer(player, match.match_id)),
		firstBloodSeconds: match.first_blood_time,
		humanPlayerCount: match.human_players,
		preGameLengthSeconds: match.pre_game_duration,
	}
}

export interface FullMatch extends SparseMatch {
	// parsed ---------------------------------------
	players: ParsedPlayer[],
	// TODO: we make this optional for now as it requires a big format function.
	teamfights?: Teamfight[],
	pauses?: PauseDTO[]
	objectives?: NormalizedObjective[],
	chat?: ChatMsg[],
	allChatWordCounts?: {total: object, player: object},
	radiantAdv: {gold: number[], xp: number[]},
	cosmetics?: object,
	draft: DraftStep[] | CaptainsModeDraftStep[],
}

export function formatFullMatch(match: ParsedMatchDTO): FullMatch {
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
				SIDE.RADIANT,
				// TODO: We need to handle case where radiant_win is null
				match.radiant_win!
			),
			kills: match.radiant_score
		},
		dire: {
			structuresLeft: setStructureBitmask(
				match.tower_status_dire,
				match.barracks_status_dire,
				SIDE.DIRE,
				!match.radiant_win
			),
			kills: match.dire_score
		},
		draft: match.picks_bans.map(pb => parsePickBan(pb)),
		players: match.players.map(player => {
			return parseParsedPlayer(player, match.match_id)
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
	abilityUses: Record<AbilityId, number>,
	abilityTargets?: Record<AbilityId, Record<Hero, number>>,
	itemUses: Record<Item, number>,
	killed: Record<Hero, number>,
	deathCount: number,
	buybacks?: number, // Can very theoretically be more than once... We don't need this if deaths are 0.
	damage: number,
	healing: number,
	goldDiff: number,
	xpDiff: number,
	xpStart: number // We don't need to keep xp_end when we have the start and offset
}



export interface NormalizedObjective {
	whenSeconds: number,
	what: ObjectiveDTO,
	who: Hero | Unit,
	target?: Hero | Structure, // not needed when objective can only be one target
	value?: number
}

export interface ChatMsg {
	whenSeconds: number,
	type: string,
	value: string,
	playerSlot: PlayerSlot
}

// Old neutral system
export interface NeutralToken { token: Item, receivedSeconds: number }

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
	match:MatchId,
	account: {
		id?:AccountId,
		personaName?:string,
		name?:string,
		rank?:RankBitmask,
		mmrGuess?:number, // Have been pretty bad...
		oDota:{subscriber:boolean, contributor:boolean}
	},
	slot?:PlayerSlot,
	partyId?:number,
	left:LeaverStatus,
	performance:Performance,
	kda:{kills:number, deaths:number, assists:number, ratio:number},
	cs:{lastHits:number, denies:number},
	// if total-spent != remaining, gold lost is not concidered spent by the API.
	gold:{total:number, spent:number, remaining:number},
	hero: {
		id:Hero,
		lvl:number,
		abilityUpgrades:AbilityId[],
		permanentBuffs?:PermanentBuff[],
		netWorth:number,
		inventory:Inventory,
		neutralItem:{artifact:Item, enchantment:Item}
	},
	damage:{toHeroes:number, toBuildings:number}
	healing:{amt:number}
}

// 0-5 for main, 6-8 for backpack
type Inventory = [Item, Item, Item, Item, Item, Item, Item, Item, Item]

function formatSparsePlayer(player:UnparsedPlayerDTO, matchId:MatchId):SparsePlayer {
	const inventory: Item[] = [
		ITEM_BY_EXT[player.item_0], ITEM_BY_EXT[player.item_1],
		ITEM_BY_EXT[player.item_2], ITEM_BY_EXT[player.item_3],
		ITEM_BY_EXT[player.item_4], ITEM_BY_EXT[player.item_5],
		ITEM_BY_EXT[player.backpack_0],
		ITEM_BY_EXT[player.backpack_1],
		ITEM_BY_EXT[player.backpack_2]
		].forEach(itemId => {
			if(!itemId) {
				return
			}
		})
	const sparsePlayer:SparsePlayer = {
		match:matchId,
		account: {
			id: player.account_id ?? undefined,
			personaName: player.personaname ?? undefined,
			name: player.name ?? undefined,
			rank: player.rank_tier ?? undefined,
			mmrGuess: player.computed_mmr ?? undefined,
			oDota: {
				subscriber: player.is_subscriber,
				contributor: player.is_contributor
			}
		},
		slot: player.player_slot ?? undefined,
		partyId: player.party_id ?? undefined,
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
			id: HERO_BY_EXT[player.hero_id],
			lvl: player.level,
			abilityUpgrades: player.ability_upgrades_arr.map(ability => {
				return ABILITY_BY_EXT[ability]
			}),
			permanentBuffs: player.permanent_buffs ? player.permanent_buffs.map(buff => {
				return {
					id: buff.permanent_buff,
					stackCount: buff.stack_count,
					receivedSeconds: buff.grant_time
				}
			}) : undefined,
			netWorth: player.net_worth,
			inventory: [
				ITEM_BY_EXT[player.item_0], ITEM_BY_EXT[player.item_1],
				ITEM_BY_EXT[player.item_2], ITEM_BY_EXT[player.item_3],
				ITEM_BY_EXT[player.item_4], ITEM_BY_EXT[player.item_5],
				ITEM_BY_EXT[player.backpack_0],
				ITEM_BY_EXT[player.backpack_1],
				ITEM_BY_EXT[player.backpack_2],
			],
			neutralItem: {
				artifact: ITEM_BY_EXT[player.item_neutral],
				enchantment: ITEM_BY_EXT[player.item_neutral2]
			}
		},
		damage: {toHeroes: player.hero_damage, toBuildings: player.tower_damage},
		healing: {amt: player.hero_healing}
	}
	return sparsePlayer
}

export interface ParsedPlayer extends SparsePlayer {
	stacked: {creeps: number, camps: number},
	laning: {
		lane: Lane,
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
	xpSources: Record<XpSource, number>,
	goldSources: Record<GoldSource, number>,
	damage: {
		toHeroes: number,
		toBuildings: number,
		dealt: {
			// includes creeps, illusions, structures etc.
			to: Record<string, number>,
			by: Record<string, number>,
			// src can at least be null (maybe rightclick dmg.) | ability | item.
			// number is dmg.amt. Only includes heroes.
			targetsBySource: Record<string, Record<Hero, number>>
		},
		received: {
			from: Record<string, number>,
			by: Record<string, number>,
		},
		hitCount: Record<Hero, number>,
		hardestHit: HardestHitDealt,
	},
	healing: {
		amt: number,
		bySource: Record<string, number>, // string should probably become id.
	},
	lifeState: Record<LifeState, number>,
	abilities: {
		uses: Record<AbilityId, number>,
		targets: Record<AbilityId, Record<Hero, number>>,
	}
	items: {
		uses: Record<Item, number>,
		// we don't neccessarily get recipe entries,
		// so we need to watch item completions.
		purchases: Timestamped<Item>[],
	},
	timings: MatchTimings,
	logs: {
		// should end up as combination of obs_log and obs_left_log.
		observers: WardLogEntry[],
		sentries: WardLogEntry[],
		kills: Timestamped<Hero>[],
		buybackTimestamps: number[],
		runes: Timestamped<Rune>[],
		neutralItems: NeutralItem[],
		neutralTokensLog?: Timestamped<Item>[]
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
	cosmetics?: CosmeticDTO[],
	additionalUnits?: object[]
}
export interface Timestamped<T extends number | string> {whenSeconds: number, id: T}

export function parseParsedPlayer(player: ParsedPlayerDTO, matchId:MatchId): Result<ParsedPlayer> {
	const trace = {
		where:TARGET.PARSED_PLAYER,
		who:player.account_id,
		what:{children:[] as TracePoint[]}
	} satisfies Omit<TracePoint, 'when'>
	const neutralItems = bindNeutralItemsLog(player.neutral_item_history)
	const runesLog = translateTimings(player.runes_log, RUNE_BY_EXT)
	const killsLog = translateTimings(player.kills_log, HERO_BY_EXT)
	const purchaseLog = translateTimings(player.purchase_log, ITEM_BY_EXT)

	if(!(neutralItems.ok && runesLog.ok && killsLog.ok && purchaseLog.ok)) {
		trace.what.children.push(
			neutralItems.trace,
			runesLog.trace,
			killsLog.trace,
			purchaseLog.trace
		)
		return {trace:traceBun(trace), ok:false}
	}

	const parsedPlayer: ParsedPlayer = {
		match:matchId,
		account: {
			id: player.account_id,
			personaName: player.personaname ?? undefined,
			name: player.name ?? undefined,
			rank: player.rank_tier ?? undefined,
			mmrGuess: player.computed_mmr ?? undefined,
			oDota: {
				subscriber: player.is_subscriber,
				contributor: player.is_contributor
			}
		},
		partyId: player.party_id ?? undefined,
		slot: player.player_slot ?? undefined,
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
			id: HERO_BY_EXT[player.hero_id],
			lvl: player.level,
			abilityUpgrades: player.ability_upgrades_arr,
			permanentBuffs: player.permanent_buffs ? player.permanent_buffs.map(buff => {
				return {
					id: buff.permanent_buff,
					stackCount: buff.stack_count,
					receivedSeconds: buff.grant_time
				}
			}) : undefined,
			netWorth: player.net_worth,
			inventory: [
				ITEM_BY_EXT[player.item_0], ITEM_BY_EXT[player.item_1],
				ITEM_BY_EXT[player.item_2], ITEM_BY_EXT[player.item_3],
				ITEM_BY_EXT[player.item_4], ITEM_BY_EXT[player.item_5],
				ITEM_BY_EXT[player.backpack_0],
				ITEM_BY_EXT[player.backpack_1],
				ITEM_BY_EXT[player.backpack_2],

			],
			neutralItem: {
				artifact: ITEM_BY_EXT[player.item_neutral],
				enchantment: ITEM_BY_EXT[player.item_neutral2]
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
				who: HERO_BY_EXT[player.max_hero_hit.key],
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
			lane: LANE_BY_EXT[player.lane_role],
			efficiencyRate: player.lane_efficiency,
			roamed: player.is_roaming ?? undefined,
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
		xpSources: translateRecord(player.xp_reasons, XP_SOURCE_BY_EXT),
		goldSources: translateRecord(player.gold_reasons, GOLD_SOURCE_BY_EXT),
		lifeState: translateRecord(player.life_state, LIFE_STATE_BY_EXT),
		abilities: {
			uses: Object.fromEntries(
				Object.entries(player.ability_uses).map(([ability, useCount]) => {
				 return [ABILITY_BY_EXT[ability], useCount]})
			),
			targets: player.ability_targets
		},
		items: {
			uses: translateRecord(player.item_uses, ITEM),
			purchases: purchaseLog.data,
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
			kills: killsLog.data,
			buybackTimestamps: player.buyback_log.map(bb => bb.time),
			runes: runesLog.data,
			neutralItems: neutralItems.data,
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
		additionalUnits: player.additional_units ?? undefined,
		cosmetics: player.cosmetics ?? undefined
	}
	return {data: parsedPlayer, trace:traceBun(trace), ok: true}
}

function translateArray<K extends PropertyKey>(lookup:Record<K, number>, array:K[]) {
	const outArray:number[] = []
	const badKeys:K[] = []
	for(const item of array) {
		const id = lookup[item]
		id ? outArray.push(id) : badKeys.push(item)
	}
}

function bindNeutralItemsLog(itemLog: NeutralItemHistoryDTO[]): Result<NeutralItem[]> {
	const where = TARGET.LOG_NI
	const items: NeutralItem[] = []
	const invalidItemKeys: string[] = []
	itemLog.forEach((entry => {
		const artifact = ITEM_BY_EXT[entry.item_neutral]
		const enchantment = ITEM_BY_EXT[entry.item_neutral_enhancement]
		if(!(artifact && enchantment)){
			if(!artifact) {
				invalidItemKeys.push(entry.item_neutral)
			}
			if(!enchantment) {
				invalidItemKeys.push(entry.item_neutral_enhancement)
			}
		}
		else {
			items.push({artifact, enchantment, craftedSeconds: entry.time})
		}
	}))
	if(invalidItemKeys.length > 0) {
		const trace = traceBun({where, what:{
			events:[traceEventBun(EVENT.NOT_IN, {
				key:invalidItemKeys.join(', '), lookup:'ITEM_BY_EXT'
			})]
		}})
		return {trace, ok: false}
	}
	return {data:items, ok:true, trace:traceBun({where})}
}

function translateTimings<T>(
	timings: TimingDTO[], lookup: Lookup<IdRecord<{ext:T}>, 'ext'>
):Result<Timestamped<number>[]> {
	const trace = {
		where:TARGET.TIMINGS,
		what:{events:[] as TraceEvent<any>[]}
	} satisfies Omit<TracePoint, 'when'>
	const data: Timestamped<number>[] = []
	const undefinedKeys: string[] = []
	timings.forEach(({time, key}) => {
		const id = lookup[key]
		if(!id) {
			undefinedKeys.push(key)
		}
		else {
			data.push({whenSeconds: time, id})
		}
	})
	if(undefinedKeys.length > 0) {
		const eventData = {key:undefinedKeys.join(', '), lookup:'lookup'}
		trace.what.events.push(traceEventBun(EVENT.NOT_IN, eventData))
		return {trace:traceBun(trace), ok: false}
	}
	return {data, ok:true, trace:traceBun(trace)}
}

function translateRecord<K extends number | string, V, P extends 'key'|'ext'>(
	record: Record<K, V>, lookup: Lookup<Record<number, Id<{ext:K}>>,P>
): Record<number, V> {
	return Object.fromEntries(
		Object.entries(record).map(([k, v]) => [lookup[parseInt(k)], v])
	)
}

function formatWardLog(enteredLog: WardLogEntryDTO[], leftLog: WardLogEntryDTO[]) {
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
	artifact: Item,
	enchantment: Item
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
	who: Hero,
	// can be both items and abilities, so keep string and resolve on display.
	what: string,
	amount: number
}

export interface MatchTimings {
	timedSeconds:number[],
	goldValues:number[],
	xpValues:number[],
	lastHits:number[],
	denies:number[]
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
	team: Side,
	hero: Hero,
}

export function parsePickBan(pickBan: PickBanDTO): Result<DraftStep> {
	const trace = {
		where:TARGET.PICK_BAN,
		who:pickBan.order,
		what:{events:[] as TraceEvent<any>[]}
	} satisfies Omit<TracePoint, 'when'>
	const team = SIDE_BY_EXT[pickBan.team]
	const hero = HERO_BY_EXT[pickBan.hero_id]
	if(!hero || !team) {
		let eventData
		if(!hero) eventData = {key:pickBan.hero_id, lookup:'HERO_BY_EXT'}
		else eventData = {key:pickBan.team, lookup:'SIDE_BY_EXT'}

		trace.what.events.push(traceEventBun(EVENT.NOT_IN, eventData))
		return {trace:traceBun(trace), ok:false}
	}
	const data: DraftStep = {
		order: pickBan.order,
		action: pickBan.is_pick ? DRAFT_ACTION.PICK : DRAFT_ACTION.BAN,
		team,
		hero
	}
	trace.what.events.push(traceEventBun(EVENT.DONE))
	return {data, trace:traceBun(trace), ok: true}
}

export interface CaptainsModeDraftStep extends DraftStep {
	time: {
		extra: number,
		total: number
	}
}

export function getSecondsDead(lifeState: Record<LifeState, number>): number {
	return (lifeState[LIFE_STATE.UNKN] || 0) + (lifeState[LIFE_STATE.DEAD] || 0)
}
