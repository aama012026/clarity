import { file } from 'bun'
const templates = await file('src/templates.html').text()
const templateRegexp = /<template\s+id="([^"]+)">([\s\S]*?)<\/template>/g
const placeholderRegexp = /%\{([^}]+)\}/g
const placehodlerExcludingType = /%\{([^:}]+)(?::[^}]*)?\}/g

const matches = [...templates.matchAll(templateRegexp)]
const functions = matches.map(([_, id, content]) => {
	if(!(id && content)) {
		throw new Error('match for template was malformed')
	}
	// We're converting template id from kebab-case to camelCase.
	const name = 'make' + id.split('-').map((part) => {
		return part[0]!.toUpperCase() + part.slice(1)
	}).join('')
	const variables = new Map<string, string>()
	for (const [_, placeholder] of content.matchAll(placeholderRegexp)) {
		const ph = placeholder!
		const typeSeparatorPos = ph.indexOf(':')
		let key = placeholder
		let type = 'unknown'
		if(typeSeparatorPos !== -1) {
			key = ph.slice(0, typeSeparatorPos).trim()
			type = ph.slice(typeSeparatorPos + 1).trim()
			if(!variables.has(key) || variables.get(key) === 'unknown') {
				variables.set(key, type)
			}
		}
	}
	const params = [...variables.entries()].map(([key, type]) => `${key}: ${type}`)
	const body = content.trim()
		.replaceAll(placehodlerExcludingType, '${$1}')
		.replaceAll('`', '\\`')
	return `export function ${name}(\n\t${params.join(',\n\t')}\n): string {
		return html\`${body}\`
	}`
})

await Bun.write('transpiled/templates.ts', `// We tag the literals for syntax highlighting
const html = String.raw\n
${functions.join('\n\n')}`)