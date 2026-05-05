const VERSION = 0.0

import home from './src/pages/home.html'

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