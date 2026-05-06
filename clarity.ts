const VERSION = 0.0

import home from './src/pages/home.html'

import heroes from './public/generated/data/heroes.json'

import { makeMatchSummary } from './transpiled/templates';
import { DIR, PATHS } from './src/modules/paths';
import { bindPlayer, heroLabels, RANK_NAMES, type Player, type PlayerMatchSummary } from './src/modules/bindings';
import { LEAVER_STATUS, leaverStatusByKey, type MatchForPlayer, type OdotaPlayer, type RankBitmask } from './src/types/OpenDotaTypes';

import axios from 'axios';
axios.defaults.baseURL = 'https://api.opendota.com/api'

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


console.log(`Clarity ver ${VERSION}`);
const server = Bun.serve({
	routes: {
		'/': home, 
		'/account/:accountId': async r => sendAccountIdResponse(r.params.accountId),
		'/*': (request) => {
			try {
				return new Response(Bun.file(`./public/${new URL(request.url).pathname}`))
			}
			catch {
				return Response.json({message: "Not found"}, {status: 404})
			}
		},
		'/api/status': new Response("OK"),
	}
})
console.log(`server running @ ${server.url}`)

async function sendAccountIdResponse(id: string) {
	let controller: ReadableStreamDefaultController
	const stream = new ReadableStream({
		start(c) {controller = c},
		cancel() {}
	})
	Promise.all([
		axios.get<OdotaPlayer>(`${ENDPOINT.PLAYERS}/${parseInt(id)}`).then(
			r => {controller.enqueue(patchProfileSignals(bindPlayer(r.data)))}
		),
		axios.get<MatchForPlayer[]>(`${ENDPOINT.PLAYERS}/${parseInt(id)}/matches`).then(
			// Match history logic
		),


	])
	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache"
		}
	})
}

function patchSignals(data: Record<string, any>, onlyIfMissing: boolean = false): string {
	return ( 
		`event: datastar-patch-signals\n` + 
		`data: onlyIfMissing ${onlyIfMissing}\n` +
		`data: signals ${JSON.stringify(data)}\n\n`
	)
}

function patchElements(data: string[], modifiers?: string[]) {
	let ssEvent = `event: datastar-patch-elements\n`
	modifiers?.forEach(mod => ssEvent += `data: ${mod}\n`)
	data.forEach(line => ssEvent += `data: elements ${line}\n`)
	ssEvent += '\n'
	return ssEvent
}

function bindMatchDataToSummary(summary: PlayerMatchSummary) {
	const {match, player, hero} = summary
	const startTime = match.startTime ? new Date(match.startTime).toLocaleString() : 'unknown'
	const heroAttribute = heroes[hero.id]?.attributes.primary ?? 'missingAttr'
	const imgSrc = `${DIR.ROOT}/${PATHS.IMG.HEROES}/${heroLabels[hero.id]}`
	const imgAlt = heroLabels[hero.id] ?? 'not found'
	const duration = timerStringFromSeconds(match.lengthSeconds)
	const leaverStatus = leaverStatusByKey[player.leaverStatus]
	let result = 'Result unavailable'
	let side = 'Side unavailable'
	if(player.slot !== undefined) {
		const playerTeam = player.slot < 128 ? 0 : 1
		result = match.winningTeam === playerTeam ? 'Victory' : 'Defeat'
		side = playerTeam === 0 ? 'Radiant' : 'Dire'

	}
	// TODO: make template function divide template into array by newlines.
	return makeMatchSummary(match.id, startTime, heroAttribute,	hero.id,
		imgSrc,	imgAlt,	result, side, duration,
		hero.kda.kills, hero.kda.deaths, hero.kda.assists,
		match.gameMode.toString(), match.lobbyType.toString(),
		player.leaverStatus !== LEAVER_STATUS.NONE, leaverStatus
	)
}

function timerStringFromSeconds(duration: number): string {
	const wholeSeconds = Math.round(duration);
	const seconds = wholeSeconds % 60;
	const minutes = ((wholeSeconds - seconds) % 3600) / 60;
	const hours = Math.floor((wholeSeconds - seconds - minutes) / 3600);
	const hoursString = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
	return `${hoursString}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function patchProfileSignals(player: Player) {
	const {id, personaName} = player.profile.account
	const avatar = player.profile.steam?.avatar
	const selImg = avatar?.full ? avatar?.full : (
		avatar?.medium ? avatar.medium : avatar?.small
	)
	return patchSignals({
		accountId: id,
		personaName: personaName ?? '',
		steamAvatar: selImg ?? '',
		rankMedal: getMedalImgPath(player.rank),
		rankTitle: getRankTitle(player.rank, player.leaderboardPos)
	})
}

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