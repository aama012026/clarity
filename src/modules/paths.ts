export const DIR = {
	BUILD: `public`,
	SRC: 'src',
	TYPES: 'types',
	MODULES: 'src',
	GENERATED: `generated`,
	STATIC: 'static',
	LOGS: 'logs',
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
	LOGS: {
		BUILD: `${DIR.LOGS}/build`
	},
	IMG: {
		HEROES: `${IMG_PATH}/${DIR.HEROES}`,
		ITEMS: `${IMG_PATH}/${DIR.ITEMS}`,
		ABILITIES: `${IMG_PATH}/${DIR.ABILITIES}`,
		MEDALS: `${DIR.STATIC}/${DIR.IMG}/${DIR.MEDALS}`
	},
	TYPES: `${DIR.SRC}/${DIR.TYPES}`
} as const

export const FILES = {
	BINDINGS: {
		HEROES: 'heroBindings.ts',
		ITEMS: 'itemBindings.ts',
		ABILITIES: 'abilityBindings.ts',
	},
	DATA: {
		HEROES: 'heroes.ts',
		ITEMS: 'items.ts',
		ABILITIES: 'abilities.ts',
	},
	TYPES: {
		BOUND_TYPES: 'boundTypes.ts',
		CLARITY_TYPES: 'clarityTypes.ts',
	}
} as const