const VERSION = 0.0

import home from './src/pages/home.html'

console.log(`Clarity ver ${VERSION}`);
const server = Bun.serve({
	routes: {
		'/': home, 
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