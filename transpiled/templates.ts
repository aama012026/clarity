// This file is generated from templates.html.	Don't edit manually!
// We tag the literals for syntax highlighting
const html = String.raw

export function makeMatchHistorySection(): string {
	return html`<section id="match-history">
		<h2>Match History</h2>
		<table>
			<thead>
				<tr>
					<th scope="col">Match</th>
					<th scope="col">Hero</th>
					<th scope="col">Result</th>
					<th scope="col">Duration</th>
					<th scope="col">Score</th>
					<th scope="col">Type</th>
				</tr>
			</thead>
			<tbody id="match-history-table"></tbody>
		</table>
	</section>`
}

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
		<td class="match-clock">${duration}</td>
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

export function makeHead(title: string): string {
	return html`<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">

		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">

		<link rel="stylesheet" href="/static/style.css">
		<script src="/static/datastar.js" type="module"></script>
		<title>${title}</title>
	</head>`
}

export function makeHeader(
	title: string,
	a1Link: string,
	a1Text: string,
	a2Link: string,
	a2Text: string
	): string {
	return html`<header>
		<h1>${title}</h1>
		<nav>
			<a class="text-gradient" href="${a1Link}">${a1Text}</a>
			<a class="text-gradient" href="${a2Link}">${a2Text}</a>
		</nav>
	</header>`
}

export function makeItemsPage(
	head: string,
	header: string,
	basics: string,
	upgrades: string,
	neutrals: string
	): string {
	return html`<!DOCTYPE html>
	<html>
	${head}
	<body>
		${header}
		<main>
			<section class="flex" id="items">
				${basics}
				${upgrades}
				${neutrals}
			</section>
		</main>
	</body>
	</html>`
}

export function makeItemsPanel(panelName: string, itemGrids: string): string {
	return html`<section class="items-panel">
		<h2>${panelName}</h2>
		<div class="grid">${itemGrids}</div>
	</section>`
}

export function makeItemGrid(category: string, items: string): string {
	return html`<section id="items-${category}">
		<h3>${category}</h3>
		<div class="grid">${items}</div>
	</section>`
}

export function makeItem(
	quality: string,
	imgSrc: string,
	imgAlt: string,
	name: string
	): string {
	return html`<button class="glow-frame ${quality}" type="button">
		<img src="${imgSrc}" alt="${imgAlt}"
			data-attr="{inactive: !(/$itemSearch/gmi.test(${name}))}"
		>
	</button>`
}