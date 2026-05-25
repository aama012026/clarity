const VERSION = 0.0
const LOG = {
	SSE: 1,
	OPENDOTA: 1,
} satisfies Record<string, number>

import * as ITEMS from './src/modules/itemConstants'

import heroes from './public/generated/data/heroes.json'
import itemJson from './public/generated/data/items.json'
const items = itemJson as Record<ItemLabel, Item>



import homePage from './src/pages/home.html'
import heroesPage from './src/pages/heroes.html'
const itemsPage = makeItemsPage(
	makeHead('Clarity - Items'),
	makeHeader('Items', '/', 'home', '/heroes', 'heroes'),
	makeItemsPanel('BASICS',
		generateItemGrid('CONS') +
		generateItemGrid('ATTR') +
		generateItemGrid('EQUI') +
		generateItemGrid('MISC') +
		generateItemGrid('SECR'),
	),
	makeItemsPanel('UPGRADES',
		generateItemGrid('ACCE') +
		generateItemGrid('SUPP') +
		generateItemGrid('MAGI') +
		generateItemGrid('ARMO') +
		generateItemGrid('WEAP') +
		generateItemGrid('ARMA'),
	),
	makeItemsPanel('NEUTRAL ARTIFACTS',	
		generateItemGrid('ARTI') +
		generateItemGrid('ENCH')
	)
)

import { makeHead, makeHeader, makeItem, makeItemGrid, makeItemsPage, makeItemsPanel, makeMatchHistorySection, makeMatchSummary } from './transpiled/templates';
import { PATHS } from './src/modules/paths';
import { bindPlayer, bindMatchSummary, heroLabels, RANK_NAMES, type Player, type PlayerMatchSummary, type ItemLabel } from './src/modules/bindings';
import { LEAVER_STATUS, leaverStatusByKey, type AccountId, type MatchForPlayer, type OdotaPlayer, type RankBitmask } from './src/types/OpenDotaTypes';

import axios from 'axios';
import type { Item } from './src/types/BoundTypes'
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
		'/heroes': heroesPage,
		'/items': new Response(itemsPage, {headers: {'Content-Type': 'text/html'}}),
		'/': homePage, 
		'/account/:accountId': async (r, s) => {
			s.timeout(r, 0) 
			return sendAccountIdResponse(r.params.accountId)
		},
		'/*': (request) => {
			try {
				return new Response(Bun.file(`./public${new URL(request.url).pathname}`))
			}
			catch {
				return Response.json({message: "Not found"}, {status: 404})
			}
		},
		'/api/status': new Response("OK"),
	}
})
console.log(`server running @ ${server.url}`)

function sendAccountIdResponse(accountId: string) {
	const id = parseInt(accountId) as AccountId
	const stream = new ReadableStream({
		start(c) {Promise.all([
			axios.get<OdotaPlayer>(`${ENDPOINT.PLAYERS}/${id}`).then(
				r => {
					log(LOG.OPENDOTA, 1, `Fetched player from odota: ${id}\n`)
					log(LOG.OPENDOTA, 2, JSON.stringify(r.data, null, '\t'))
					c.enqueue(patchProfileSignals(bindPlayer(r.data)))}
			),
			axios.get<MatchForPlayer[]>(`${ENDPOINT.PLAYERS}/${id}/matches`).then(
				r => {
					c.enqueue(patchElements(makeMatchHistorySection().split('\n')))
					r.data.forEach(match => {
						c.enqueue(patchMatchSummary(bindMatchSummary(match, id)))
					})
				}
			),
		]).finally(() => c.close())},
		cancel() {}
	})
	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache"
		}
	})
}

function patchSignals(
	data: Record<string, any>,
	onlyIfMissing: boolean = false
): string {
	const ssEvent = ( 
		`event: datastar-patch-signals\n` + 
		`data: onlyIfMissing ${onlyIfMissing}\n` +
		`data: signals ${JSON.stringify(data)}\n\n`
	)
	log(LOG.SSE, 2, ssEvent)
	return ssEvent
}

interface DatastarEventModifiers {
	selector?: string,
	mode?: 'outer' | 'inner' | 'replace' | 'prepend' | 'append' | 'before' | 'after' | 'remove',
	namespace?: 'svg' | 'mathml',
	useViewTransition?: boolean
}

function patchElements(data: string[], modifiers?: DatastarEventModifiers) {
	let ssEvent = `event: datastar-patch-elements\n`
	if(modifiers) {
		const {selector, mode, namespace, useViewTransition} = modifiers
		ssEvent += selector ? `data: selector ${selector}\n` : ''
		ssEvent += mode ? `data: mode ${mode}\n` : ''
		ssEvent += namespace ? `namespace: ${namespace}\n` : ''
		ssEvent += useViewTransition ? `useViewTransition true\n` : ''
	}
	data.forEach(line => ssEvent += `data: elements ${line}\n`)
	ssEvent += '\n'
	log(LOG.SSE, 2, ssEvent)
	return ssEvent
}

function patchMatchSummary(summary: PlayerMatchSummary): string {
	const {match, player, hero} = summary
	const startTime = match.startTime ? new Date(match.startTime).toLocaleString() : 'unknown'
	const heroAttribute = heroes[hero.id]?.attributes.primary ?? 'missingAttr'
	const imgSrc = `${PATHS.IMG.HEROES}/${heroLabels[hero.id]}.png`
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
	const matchSummary = patchElements(
		makeMatchSummary(
			match.id, startTime, heroAttribute,	hero.id,
			imgSrc,	imgAlt,	result, side, duration,
			hero.kda.kills, hero.kda.deaths, hero.kda.assists,
			match.gameMode.toString(), match.lobbyType.toString(),
			player.leaverStatus !== LEAVER_STATUS.NONE, leaverStatus
		).split('\n'),
		{selector: '#match-history-table', mode: 'append'}
	)
	log(LOG.SSE, 1, `Made SSE for match summary: ${match.id}`)
	return matchSummary
}

function timerStringFromSeconds(duration: number): string {
	const wholeSeconds = Math.round(duration);
	const seconds = wholeSeconds % 60;
	const minutes = ((wholeSeconds - seconds) % 3600) / 60;
	const hours = Math.floor((wholeSeconds - seconds - minutes) / 3600);
	const hoursString = hours > 0 ? `${hours.toString().padStart(2, '0')}:` : '';
	return `${hoursString}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function patchProfileSignals(player: Player): string {
	const {id, personaName} = player.profile.account
	const avatar = player.profile.steam?.avatar
	const selImg = avatar?.full ? avatar?.full : (
		avatar?.medium ? avatar.medium : avatar?.small
	)
	const profile = patchSignals({
		accountId: id,
		personaName: personaName ?? '',
		steamAvatar: selImg ?? '',
		rankMedal: getMedalImgPath(player.rank),
		rankTitle: getRankTitle(player.rank, player.leaderboardPos)
	})
	log(LOG.SSE, 1, `Made signal patch for profile: ${id}`)
	return profile
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

function log(lvlToBeat: number, level: number, msg: string) {
	if(level <= lvlToBeat) {
		console.log(`${new Date().toUTCString()}`)
		console.log(msg + '\n')
	}
}

function generateItemGrid(group: ITEMS.GroupName) {
	return makeItemGrid(
		ITEMS.GROUP[group].label.toUpperCase(),
		Object.entries(ITEMS.GROUP_BY_ITEM).reduce(
			(itemElements, [itemLabel, groupKey]) => { 
				if(groupKey === ITEMS.GROUP[group].key) {
					itemElements += makeItem(
						(items[itemLabel]?.quality) ?? '',
						`${PATHS.IMG.ITEMS}/${itemLabel}.png`,
						itemLabel,
						itemLabel
					)
				}
				return itemElements
			}, ''
		)
	)
}
