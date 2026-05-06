// We tag the literals for syntax highlighting
const html = String.raw

export function makeMatchSummary(
	matchId: number,
	startTime: string,
	attribute: string,
	heroKey: number,
	imgSrc: string,
	imgAlt: string,
	result: string,
	side: string,
	duration: string,
	kills: number,
	deaths: number,
	assists: number,
	gameMode: string,
	lobbyType: string,
	showLeaverStatus: boolean,
	leaverStatus: string
): string {
		return html`<tr class="match-summary" data-on:click="@get('/match/${matchId}')">
		<td>
			<div>Match: ${matchId}</div>
			<div>Time: ${startTime}<div>
		</td>
		<td><img class="hero ${attribute}" data-hero="${heroKey}"
				src="${imgSrc}" alt="${imgAlt}"
			>
		</td>
		<td>
			<div data-result="${result}">${result}</div>
			<div data-side="${side}">${side}</div>
		</td>
		<td>${duration}</td>
		<td>
			<span>Kda: ${kills} / ${deaths} / ${assists}</span>
		</td>
		<td>
			<div>${gameMode}</div>
			<div>${lobbyType}</div>
			<div data-show="${showLeaverStatus}">${leaverStatus}</div>
		</td>
	</tr>`
	}