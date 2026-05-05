export const DIR = {
	ROOT: `public`,
	BUILD: `public`,
	GENERATED: `generated`,
	STATIC: 'static',
	DATA: `data`,
	IMG: `img`,
	HEROES: `heroes`,
	ITEMS: `items`,
	ABILITIES: `abilities`,
	MEDALS: 'medals'
} as const
const IMG_PATH = `${DIR.GENERATED}/${DIR.IMG}`

export const PATHS = {
	GENERATED_DATA: `${DIR.GENERATED}/${DIR.DATA}`,
	IMG: {
		HEROES: `${IMG_PATH}/${DIR.HEROES}`,
		ITEMS: `${IMG_PATH}/${DIR.ITEMS}`,
		ABILITIES: `${IMG_PATH}/${DIR.ABILITIES}`,
		MEDALS: `${DIR.STATIC}/${DIR.IMG}/${DIR.MEDALS}`
	}
} as const

export const FILES = {
	BINDINGS: {
		HEROES: 'heroBindings.json',
		ITEMS: 'itemBindings.json',
		ABILITIES: 'abilityBindings.json'
	},
	DATA: {
		HEROES: 'heroes.json',
		ITEMS: 'items.json',
		ABILITIES: 'abilities.json',
	}
} as const