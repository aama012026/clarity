const VERSION = 0.0

import { heroLabels, type PlayerMatchSummary } from './src/modules/bindings';
import { DIR, PATHS } from './src/modules/paths';
import home from './src/pages/home.html'
import { LEAVER_STATUS, leaverStatusByKey } from './src/types/OpenDotaTypes';

console.log(`Clarity ver ${VERSION}`);
const server = Bun.serve({
	routes: {
		'/': home, 
		'/profile': (request, server) => {
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(patchSignals({
						accountId: 86176724,
						personaName: 'dotaDestroyer'
					}))
					controller.close()
				},
				cancel() {}
			})
			return new Response(stream, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache"
				}
			})
		},
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

function createMatchSummary(summary: PlayerMatchSummary) {
	const {match, player, hero} = summary
	const startTime = match.startTime ? new Date(match.startTime).toLocaleString() : 'unknown'
	let result = 'Result unavailable'
	let side = 'Side unavailable'
	if(player.slot !== undefined) {
		const playerTeam = player.slot < 128 ? 0 : 1
		result = match.winningTeam === playerTeam ? 'Victory' : 'Defeat'
		side = playerTeam === 0 ? 'Radiant' : 'Dire'

	}
	// TODO: make template function divide template into array by newlines.
	const html = String.raw
	return (
		html`<tr class="match-summary" data-on:click="@get('/match/${match.id}')">
			<td>
				<div>Match: ${match.id}</div>
				<div>Time: ${new Date(match.startTime!).toLocaleString()}<div>
			</td>
			<td><img src="${DIR.ROOT}/${PATHS.IMG.HEROES}/${heroLabels[hero.id]}"
					alt="${heroLabels[hero.id]}"
				>
			</td>
			<td>
				<div data-result="${result}">${result}</div>
				<div data-side="${side}">${side}</div>
			</td>
			<td>${timerStringFromSeconds(match.lengthSeconds)}</td>
			<td>
				<span>Kda: ${hero.kda.kills} / ${hero.kda.deaths} / ${hero.kda.assists}</span>
			</td>
			<td>
				<div>${match.gameMode}</div>
				<div>${match.lobbyType}</div>
				${player.leaverStatus !== LEAVER_STATUS.NONE ? `<div>${leaverStatusByKey[player.leaverStatus]}</div>` : ''}
			</td>
		</tr>`
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