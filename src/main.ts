import axios from 'axios';
import type {AxiosResponse} from 'axios';
import {PATHS} from './modules/paths.js';
import {getLocalOrSet, round, setLocal, tryGetElement, tryGetLocal, type NamedElement,
	type Result, type UnixTimestamp 
} from './modules/flow.js';
import {bindPlayer, formatFullMatch, bindMatchSummary, formatRankDistribution,
	formatSparseMatch, heroNames, RANK_NAMES, type FullMatch,
	type Player, type PlayerMatchSummary, type RankDistribution, type RankStats,
	type SparseMatch
} from './modules/bindings.js';
import {type Distributions, type AccountId, type OdotaPlayer, type OdotaSearchResult,
	type MatchForPlayer, leaverStatusByKey, LEAVER_STATUS, type RankBitmask,
	type UnparsedMatch, type ParsedMatch, type MatchId
} from './types/OpenDotaTypes.js'

axios.defaults.baseURL = 'https://api.opendota.com/api'
axios.defaults.allowAbsoluteUrls = false

interface CallsLeft {
	minute: {left: number, sinceWhen: UnixTimestamp},
	today: {left: number, sinceWhen: UnixTimestamp}
}

const ENDPOINT = {
	MATCHES: '/matches',
	PLAYERS: '/players',
	TOP_PlAYERS:'/topPlayers',
	PRO_PLAYERS: '/proPlayers',
	PRO_MATCHES: '/ProMatches',
	PUBLIC_MATCHES: '/publicMatches',
	PARSED_MATCHES: '/parsedMatches',
	EXPLORER: '/explorer',
	METADATA: '/metadata',
	DISTRIBUTIONS: '/distributions',
	SEARCH: '/search',
	RANKINGS: '/rankings',
	BENCHMARKS: '/benchmarks',
	HEALTH: '/health',
	REQUEST: '/request',
	FIND_MATCHES: '/findMatches',
	HEROES: '/heroes',
	HEROSTATS: '/heroStats',
	LEAGUES: '/rankings',
	TEAMS: '/rankings',
	RECORDS: '/rankings',
	LIVE: '/rankings',
	SCENARIOS: '/rankings',
	SCHEMA: '/rankings',
	CONSTANTS: '/rankings',
} as const

const LocalDataKey = {
	CALL_LIMIT_TIMESTAMPS: 'callLimitTimestamps',
	RANK_DISTRIBUTION: 'rankDistribution',
	BENCHMARKS: 'benchmarks',
	STORED_MATCHES: 'storedMatches',
} as const

// INIT
// We need to make the function available in the DOM for datastar. 
Object.assign(window, {
	searchTypedAccount,
	timerStringFromSeconds
})
// let benchmarks = tryGetLocal<Benchmark[]>(LocalDataKey.Benchmarks)

const templates = {
	rankBar: tryGetElement<HTMLTemplateElement>('#rank-bar-template')
}

const sections = {
	matchHistory: tryGetElement<HTMLDivElement>('#match-history'),
	rankDistribution: tryGetElement<HTMLDivElement>('#rank-distribution')
}

const calls = getLocalOrSet<CallsLeft>(
	LocalDataKey.CALL_LIMIT_TIMESTAMPS, {
		minute: {left: 60, sinceWhen: Date.now() as UnixTimestamp},
		today: {left: 3000, sinceWhen: Date.now() as UnixTimestamp}
	}
)
// We dispatch the update event without change once to echo loaded object.
updateCallsLeft(0)

const rankDistribution = await tryGetRankDistribution()
createRankDistributionBars(rankDistribution.data!.ranks)
console.log(JSON.stringify(rankDistribution))

// Functions
function updateCallsLeft(callsToSubtract?: number): void {
	const count = callsToSubtract != null ? callsToSubtract : 1
	const now = Date.now() as UnixTimestamp
	if(now - calls.minute.sinceWhen > 60000){
		calls.minute.left = 60
		calls.minute.sinceWhen = Date.now() as UnixTimestamp
	}
	if(now - calls.today.sinceWhen > 86400000) {
		calls.today.left = 3000
		calls.today.sinceWhen = Date.now() as UnixTimestamp
	}
	calls.minute.left = Math.max(calls.minute.left - count, 0)
	calls.today.left = Math.max(calls.today.left - count, 0)
	setLocal<CallsLeft>(LocalDataKey.CALL_LIMIT_TIMESTAMPS, calls)
	const evtObj = {detail:  {minute: calls.minute.left, today: calls.today.left}}
	// We dispatch event that datastar data-on attributes can listen to.
	document.dispatchEvent( new CustomEvent('callsleftupdate', evtObj))
}

async function setMatch(matchId: MatchId) {
	console.log(`Setting match: ${matchId}`)
	const match = await tryGetMatch(matchId)
	if(!match) {
		console.log(`Could not get match: ${matchId}`)
		return
	}
	const evtObj = {detail: [
		match.id,
		new Date(match.fetchTime).toLocaleString(),
		match.startTime ? new Date(match.startTime).toLocaleString() : 'unknown',
		timerStringFromSeconds(match.lengthSeconds),
		match.gameMode,
		match.lobbyType,
		match.radiant.kills,
		match.dire.kills,
		match.winningTeam
	]}
	document.dispatchEvent(new CustomEvent('matchset', evtObj))
}
// TODO: We get leaderboard position for immortal players as well, so we could
// overlay a number on their medal plaque in the future.
function getMedalImgPath(rank: RankBitmask | undefined, leaderboardPos?: number) {
	let suffix = !rank ? '0' : rank.toString()
	if(!!leaderboardPos && suffix === '80') {
		if(leaderboardPos && leaderboardPos >= 100) {
			suffix = leaderboardPos >= 10 ? '84' : '83'
		}
	}
	return `${PATHS.IMG.MEDALS}/rank${suffix}.webp`
}

function getRankTitle(rank: RankBitmask | undefined, leaderboardPos?: number): string {
	if(!rank) {
		return 'uncalibrated'
	}
	else if(!leaderboardPos && rank >= 80) {
		switch(rank) {
			case 82: return 'top 1000'
			case 83: return 'top 100'
			case 84: return 'top 10'
			case 85: return 'top 1'
			default: return 'immortal'
		}
	}
	const star = rank % 10
	const medal = RANK_NAMES[(rank - star) / 10]
	return `${medal} ${medal != 'immortal' ? star : leaderboardPos}`
}

async function searchTypedAccount(searchTerm: string | AccountId) {
	/* TODO: Restructure validation and error for axios.
	Axios throws errors (usually rejecting the promise). Our validation
	should be simple catches initially. Any advanced validation we do should be
	on the datastructure. */
	const playerResult = await tryGetPlayer(searchTerm)
	if(!playerResult.ok || !playerResult.data) {
		throw new Error(`could not get player data for ${searchTerm}`)
	}
	const player = playerResult.data
	const matchesResponse = await tryGetMatches(player.profile.account.id)
	const matchHistory: PlayerMatchSummary[] = matchesResponse.data.map(match => 
		bindMatchSummary(match, player.profile.account.id)
	)
}


async function tryGetPlayer(idOrPersona: AccountId | string): Promise<Result<Player>> {
	let accountId: number
	if(typeof idOrPersona === 'string') {
		// url.search = `?q=${idOrPersona}`
		const response = await axios.get<OdotaSearchResult[]>(ENDPOINT.SEARCH, {params: {q: idOrPersona}})
		updateCallsLeft()
		if(!response.data[0]?.account_id) {
			return {ok: false}
		}
		accountId = response.data[0].account_id
	}
	else {
		accountId = idOrPersona
	}
	const response = await axios.get<OdotaPlayer>(`${ENDPOINT.PLAYERS}/${accountId}`)
	updateCallsLeft()
	return {ok: true, data: bindPlayer(response.data)}
}

async function tryGetMatches(id: AccountId): Promise<AxiosResponse<MatchForPlayer[]>> {
	const response = await axios.get<MatchForPlayer[]>(`${ENDPOINT.PLAYERS}/${id}/matches`)
	updateCallsLeft()
	return response
}

async function tryGetMatch(matchId: number): Promise<SparseMatch | FullMatch | null> {
	let match = tryGetLocal<SparseMatch | FullMatch>(`match:${matchId}`)
	if(match) {
		return match
	}
	const response = await axios.get<UnparsedMatch | ParsedMatch>(`${ENDPOINT.MATCHES}/${matchId}`)
	updateCallsLeft()
	if(response.status != 200) {
		return null
	}
	const isParsed = response.data.od_data.has_parsed
	const boundMatch = isParsed ? 
		formatFullMatch(response.data as ParsedMatch) : formatSparseMatch(response.data)
	setLocal(`match:${matchId}`, boundMatch)
	return boundMatch
}

async function requestParse(matchId: number): Promise<AxiosResponse> {
	const response = await axios.post(`${ENDPOINT.REQUEST}/${matchId}`)
	updateCallsLeft()
	return response
}

async function tryGetRankDistribution(): Promise<Result<RankDistribution>> {
	let rankDistribution = tryGetLocal<RankDistribution>(LocalDataKey.RANK_DISTRIBUTION)
	// Try to get from localstorage first, fetch if not present or stale (here 24H shelf life).
	if(!(rankDistribution && new Date().getHours() - new Date(rankDistribution.timestamp).getHours() <= 24)) {
		const result = await axios.get<Distributions>(`${ENDPOINT.DISTRIBUTIONS}`)
		updateCallsLeft()
		if(result.status != 200) {
			return {ok: false}
		}
		rankDistribution = formatRankDistribution(result.data)
		setLocal<RankDistribution>(LocalDataKey.RANK_DISTRIBUTION, rankDistribution)
	}
	return {ok: true, data: rankDistribution}
}

function createRankDistributionBars(ranks: RankStats[]) {
	sections.rankDistribution.replaceChildren()
	const sum: number = ranks.reduce((tally, rank) => tally += rank.count, 0)
	const maxCount: number = ranks.reduce((highest, rank) => {
		return Math.max(highest, rank.count)
	}, 0)
	let cumulative = 0
	ranks.forEach((rank) => {
		cumulative += rank.count
		const rankBarFragment: NamedElement = {
			node: document.importNode(templates.rankBar.content, true),
			name: 'rankBarFragment'
		}
		const el = {
			rankBars: tryGetElement<HTMLDivElement>('.rank-bar', rankBarFragment),
			countBar: tryGetElement<HTMLDivElement>('.bar[data-role="count"]', rankBarFragment),
			percentileBar: tryGetElement<HTMLDivElement>('.bar[data-role="percentile"]', rankBarFragment),
			medal: tryGetElement<HTMLImageElement>('.rank-medal', rankBarFragment),
			name: tryGetElement('[data-role="rank-name"]', rankBarFragment),
			count: tryGetElement('[data-role="player-count"]', rankBarFragment),
			percentile: tryGetElement('[data-role="player-percentile"]', rankBarFragment)
		}
		const signal = `$isRank${rank.rank}`
		el.rankBars.dataset['effect'] = `${signal} = $rankString === '${getRankTitle(rank.rank)}'`
		el.countBar.style.height = `${round(rank.count / maxCount * 100, 2)}%`
		el.countBar.dataset['class'] = `{'player-rank': ${signal}}`
		el.percentileBar.style.height = `${round(cumulative / sum * 100, 2)}%`
		el.percentileBar.dataset['class'] = `{'player-rank': ${signal}}`
		el.medal.src = getMedalImgPath(rank.rank)
		el.medal.alt = getRankTitle(rank.rank)
		el.name.textContent = getRankTitle(rank.rank)
		el.count.textContent = `Players: ${rank.count}`
		el.percentile.textContent = `Percentile: ${round((cumulative / sum) * 100, 2)}`
		sections.rankDistribution.append(rankBarFragment.node)
	})
}

function timerStringFromSeconds(duration: number): string {
	const wholeSeconds = Math.round(duration);
	const seconds = wholeSeconds % 60;
	const minutes = ((wholeSeconds - seconds) % 3600) / 60;
	const hours = Math.floor((wholeSeconds - seconds - minutes) / 3600);
	const hoursString = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
	return `${hoursString}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}