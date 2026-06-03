import { HEROES } from "../../public/generated/data/heroes"
import { ITEMS } from "../../public/generated/data/items"
import type { Hero, Item } from "../types/boundTypes"
import type { Binding, Ids } from "../types/clarityTypes"

const HERO_IDS = heroIds as Ids<Binding>
const ITEMSS = ITEMS satisfies Record<number, Item>
const HEROESS = HEROES satisfies Record<number, Hero>
type HeroId = keyof typeof heroIds
const HERO_ID = getIdMap(HERO_IDS, 'key')
const ITEM_ID = getIdMap(itemIds, 'key')
const ABILITY_ID = getIdMap(abilityIds, 'key')
const SIDE = getIdMap(SIDES, 'key')
const DAMAGE_TYPE = getIdMap(DAMAGE_TYPES, 'key')


// This comes as a bool from opendota, so no need to freeze keys atm.
export type Outcome = 'win' | 'loss'
export type PermanentBuffId = Unique<number, 'permanentBuff'>

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
	hero: HeroIdx,
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
	winningTeam: SideIdx,
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
		id: HeroIdx,
		facet?: number,
		kda: {kills: number, deaths: number, assists: number}
	}
}

export function bindMatchSummary(summary: MatchForPlayer, player: AccountId): PlayerMatchSummary {
	return {
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
			id: HERO_ID[summary.hero_id]!,
			kda: {
				kills: summary.kills,
				deaths: summary.deaths,
				assists: summary.assists
			}
		}
	}
	// TODO: check if facets are still deprecated through dotaconstants,
	// and assign hero_variant if not
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
				'RADI',
				// TODO: We need to handle case where radiant_win is null
				match.radiant_win!
			),
			kills: match.radiant_score
		},
		dire: {
			structuresLeft: setStructureBitmask(
				match.tower_status_dire,
				match.barracks_status_dire,
				'DIRE',
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
				'RADI',
				// TODO: We need to handle case where radiant_win is null
				match.radiant_win!
			),
			kills: match.radiant_score
		},
		dire: {
			structuresLeft: setStructureBitmask(
				match.tower_status_dire,
				match.barracks_status_dire,
				'DIRE',
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
	abilityUses: Record<AbilityIdx, number>,
	abilityTargets?: Record<AbilityIdx, Record<HeroIdx, number>>,
	itemUses: Record<ItemIdx, number>,
	killed: Record<HeroIdx, number>,
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
	what: Objective,
	who: HeroIdx | UnitIdx,
	target?: HeroIdx | StructureIdx, // not needed when objective can only be one target
	value?: number
}

export interface ChatMsg {
	whenSeconds: number,
	type: string,
	value: string,
	playerSlot: PlayerSlot
}

// Old neutral system
export interface NeutralToken { token: ItemIdx, receivedSeconds: number }

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
		id: HeroIdx,
		lvl: number,
		abilityUpgrades: AbilityIdx[],
		permanentBuffs?: PermanentBuff[],
		netWorth: number,
		inventory: ItemIdx[], // 0-5 for main, 6-8 for backpack
		neutralItem: {artifact: ItemIdx, enchantment: ItemIdx}
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
			id: HERO_ID[player.hero_id]!,
			lvl: player.level,
			abilityUpgrades: player.ability_upgrades_arr.map(ability => {
				return abilityKeysByExtKey[ability]!
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
				ItemIdxByExtKey[player.item_0]!, ItemIdxByExtKey[player.item_1]!,
				ItemIdxByExtKey[player.item_2]!, ItemIdxByExtKey[player.item_3]!,
				ItemIdxByExtKey[player.item_4]!, ItemIdxByExtKey[player.item_5]!,
				ItemIdxByExtKey[player.backpack_0]!,
				ItemIdxByExtKey[player.backpack_1]!,
				ItemIdxByExtKey[player.backpack_2]!,
				
			],
			neutralItem: {
				artifact: ItemIdxByExtKey[player.item_neutral]!,
				enchantment: ItemIdxByExtKey[player.item_neutral2]!
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
		lane: LaneIdx,
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
	xpSources: Record<XpSourceIdx, number>,
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
			targetsBySource: Record<string, Record<HeroIdx, number>>
		},
		received: {
			from: Record<string, number>,
			by: Record<string, number>,
		},
		hitCount: Record<HeroIdx, number>,
		hardestHit: HardestHitDealt,
	},
	healing: {
		amt: number,
		bySource: Record<string, number>, // string should probably become id.
	},
	lifeState: Record<LifeStateIdx, number>,
	abilities: {
		uses: Record<AbilityIdx, number>,
		targets: Record<AbilityIdx, Record<HeroIdx, number>>,
	}
	items: {
		uses: Record<ItemIdx, number>,
		// we don't neccessarily get recipe entries,
		// so we need to watch item completions.
		purchases: Array<{whenSeconds: number, item: ItemIdx}>,
	},
	timings: MatchTimings,
	logs: {
		// should end up as combination of obs_log and obs_left_log.
		observers: WardLogEntry[],
		sentries: WardLogEntry[],
		kills: Array<{whenSeconds: number, who: HeroIdx}>,
		buybackTimestamps: number[],
		runes: Array<{whenSeconds: number, rune: RuneIdx}>,
		neutralItems: NeutralItem[],
		neutralTokensLog?: Array<{receivedSeconds: number, item: ItemIdx}>
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
				ItemIdxByExtKey[player.item_0]!, ItemIdxByExtKey[player.item_1]!,
				ItemIdxByExtKey[player.item_2]!, ItemIdxByExtKey[player.item_3]!,
				ItemIdxByExtKey[player.item_4]!, ItemIdxByExtKey[player.item_5]!,
				ItemIdxByExtKey[player.backpack_0]!,
				ItemIdxByExtKey[player.backpack_1]!,
				ItemIdxByExtKey[player.backpack_2]!,
				
			],
			neutralItem: {
				artifact: ItemIdxByExtKey[player.item_neutral]!,
				enchantment: ItemIdxByExtKey[player.item_neutral2]!
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
				who: heroIdxByKey[player.max_hero_hit.key]!,
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
			lane: LaneIdxByExtKey[player.lane_role! as LaneExtKey],
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
		xpSources: translateRecord<XpReasonId, XpSourceIdx, number>(
			player.xp_reasons, XpSourceKeyByExtId
		),
		goldSources: translateRecord<GoldReasonId, GoldSourceKey, number>(
			player.gold_reasons, GoldSrcKeysByExtId
		),
		lifeState: translateRecord<number, LifeStateIdx, number>(
			player.life_state, LifeStateKeysByExtId
		),
		abilities: {
			uses: Object.fromEntries(
				Object.entries(player.ability_uses).map(([ability, useCount]) => {
				 return [abilityIdxByKey[ability], useCount]})
			),
			targets: player.ability_targets
		},
		items: {
			uses: player.item_usage,
			purchases: player.purchase_log.map(({time, key}) => {
				return {whenSeconds: time, item: ItemIdxByKey[key]!}
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
				return {whenSeconds: time, who: heroIdxByKey[key]!}
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
					artifact: ItemIdxByKey[n.item_neutral]!,
					enchantment: ItemIdxByKey[n.item_neutral_enhancement]!,
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
	artifact: ItemIdx,
	enchantment: ItemIdx
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
	who: HeroIdx,
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
	team: SideIdx,
	hero: HeroIdx,
}

export function parsePickBan(pickBan: PickBan): DraftStep {
	return {
		order: pickBan.order,
		action: pickBan.is_pick ? 'pick' : 'ban',
		team: SideByExtKey[pickBan.team as SideExtKey],
		hero: HERO_ID[pickBan.hero_id]!,
	}
}

export interface CaptainsModeDraftStep extends DraftStep {
	time: {
		extra: number,
		total: number
	}
}

export function getSecondsDead(lifeState: Record<LifeStateIdx, number>): number {
	return (lifeState[LIFE_STATES[1].idx] || 0) + (lifeState[LIFE_STATES[2].idx] || 0)
}