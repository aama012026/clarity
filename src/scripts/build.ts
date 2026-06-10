import { type Ids, type Binding, type IdKey, getIdMap } from '../types/clarityTypes'
import type { DotaConstantsHero, DotaConstantsItem } from '../types/dotaConstantsTypes'
import type { Hero, Item, Targets } from '../types/boundTypes'
import { DIR, FILES, PATHS } from '../modules/paths'
import { tryGetImg, tryGetJson, stringify } from '../modules/flow.js'
import { tryReadJSON, tryWrite } from '../modules/flowNode'
import { ATTRIBUTE_BY_EXT } from '../modules/domainConstants'
import { getLogString, logError, logMessage, logWarning, type LogEntry, type Result } from '../modules/log.js'

const CDN_HOST = 'https://cdn.steamstatic.com/'
const HEROES_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/heroes.json')
const ITEMS_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/items.json')
const ABILITY_IDS_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/ability_ids.json')
const ABILITIES_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/abilities.json')

const DATA_PATH = `${DIR.BUILD}/${PATHS.GENERATED_DATA}`
const HERO_BINDINGS_PATH = `${DATA_PATH}/${FILES.BINDINGS.HEROES}`
const HERO_DATA_PATH = `${DATA_PATH}/${FILES.DATA.HEROES}`
const ITEM_BINDINGS_PATH = `${DATA_PATH}/${FILES.BINDINGS.ITEMS}`
const ITEMS_PATH = `${DATA_PATH}/${FILES.DATA.ITEMS}`
const ABILITY_BINDINGS_PATH = `${DATA_PATH}/${FILES.BINDINGS.ABILITIES}`
const ROOT_FROM_DATA_PATH = `../../..`

type ExtId = Binding & IdKey
type IdBinding = {idx: number} & ExtId
const log: LogEntry[] = []

// FETCH REQUIRED DOTACONSTANTS RESOURCES -> MAP TO CUSTOM DATASTRUCTURES -> WRITE TO ASSETS
await Promise.all([
	tryUpdateHeroes(),
	tryUpdateItems(),
	tryUpdateAbilities()
])
await tryWriteLogFile(log)
// Heroes
async function tryUpdateHeroes() {
	const [heroesRes, oldHeroBindingsRes] = await Promise.all([
		tryGetJson<Record<string, DotaConstantsHero>>(HEROES_URL),
		tryReadJSON<Ids<Binding<number>>>(HERO_BINDINGS_PATH),
	])
	log.push(...heroesRes.log, ...oldHeroBindingsRes.log)
	if(!(heroesRes.ok && heroesRes.data)) {
		return
	}
	// Update bindings
	const rawHeroes = Object.values(heroesRes.data)
	const newHeroIds: ExtId[] = rawHeroes.map(({id, name}) => {
		return {key: name.replace('npc_dota_hero_', ''), ext: id}
	})
	const oldHeroBindings = oldHeroBindingsRes.data ?? {}
	const newHeroBindings = tryUpdateNumericIdBindings(newHeroIds, oldHeroBindings)
	if(!newHeroBindings) {
		return
	}

	// Write bindings
	const bindingsString = (
		getTypeImport(FILES.TYPES.CLARITY_TYPES, 'Ids', 'Binding') +
		getConstExport('HERO_IDS', newHeroBindings, 'Ids<Binding>')
	)
	const bindingsWriteRes = await tryWrite(HERO_BINDINGS_PATH, bindingsString)
	log.push(...bindingsWriteRes.log)
	if(!bindingsWriteRes.ok) {
		return
	}
	// bind heroes to our shape.
	const HeroIdByExt  = getIdMap(newHeroBindings, 'ext')
	const boundHeroes: Record<number, Hero> = Object.fromEntries(
		rawHeroes.map(hero => [HeroIdByExt[hero.id], bindHero(hero)])
	)

	const heroesString = (
		getTypeImport(FILES.TYPES.BOUND_TYPES, 'Hero') +
		getConstExport('HEROES', boundHeroes, 'Record<number, Hero>')
	)
	await Promise.all([

		tryWrite(HERO_DATA_PATH, heroesString).then(r => log.push(...r.log)),
		// Get hero images
		Promise.all(rawHeroes.map(async hero => {
			const img = await tryGetImg(new URL(hero.img, CDN_HOST))
			log.push(...img.log)
			if(!(img.ok && img.data)) {
				return
			}
			const imgFolder = `${DIR.BUILD}/${PATHS.IMG.HEROES}`
			const fileName = `${hero.name.replace('npc_dota_hero_','')}.png`
			return tryWrite(`${imgFolder}/${fileName}`, Buffer.from(img.data)
			).then(r => log.push(...r.log))
		}))
	])
}

// Items
async function tryUpdateItems() {
	const [itemsResult, oldItemBindingsResult] = await Promise.all([
		tryGetJson<Record<string, DotaConstantsItem>>(ITEMS_URL),
		tryReadJSON<Ids<Binding>>(ITEM_BINDINGS_PATH)
	])
	log.push(...itemsResult.log, ...oldItemBindingsResult.log)
	if(!(itemsResult.ok && itemsResult.data)) {
		logError(`Could not get items from dotaconstants repo: ${itemsResult.log}`, log)
		return
	}
	const items = Object.entries(itemsResult.data)
	const newItemIds: ExtId[] = items.map(([dataName, item]) => {
		return {
			ext: item.id,
			key: dataName
		}
	})
	const oldItemBindings = oldItemBindingsResult.data ?? {}
	const newItemBindings = tryUpdateNumericIdBindings(newItemIds, oldItemBindings)
	if(!newItemBindings) {
		return
	}
	const bindingsString = (
		getTypeImport(FILES.TYPES.CLARITY_TYPES, 'Ids', 'Binding') +
		getConstExport('ITEM_IDS', newItemBindings, 'Ids<Binding>')
	)
	const bindingsWriteRes = await tryWrite(ITEM_BINDINGS_PATH, bindingsString)
	log.push(...bindingsWriteRes.log)
	if(!bindingsWriteRes.ok) {
		return
	}

	const ItemByExtKey = getIdMap(newItemBindings, 'ext')
	const boundItems: Record<number, Item> = Object.fromEntries(
		items.map(([key, item]) => [ItemByExtKey[item.id], bindItem(item, key)])
	)

	const itemsString = (
		getTypeImport(FILES.TYPES.BOUND_TYPES, 'Item') +
		getConstExport('ITEMS', boundItems, 'Record<number, Item>')
	)
	await Promise.all([
		tryWrite(ITEMS_PATH, itemsString).then(r => log.push(...r.log)),
		// Get images
		Promise.all(items.map(async ([label, item]) => {
			const img = await tryGetImg(new URL(item.img, CDN_HOST))
			log.push(...img.log)
			if(img.ok && img.data) {
				return tryWrite(
					`${DIR.BUILD}/${PATHS.IMG.ITEMS}/${label}.png`,
					Buffer.from(img.data)
				).then(r => log.push(...r.log))
			}
		}))
	])
}

// Abilities
async function tryUpdateAbilities() {
	const [abilityIdsResult, abilitiesResult] = await Promise.all([
		tryGetJson<Record<number, string>>(ABILITY_IDS_URL),
		tryGetJson<Record<string, any>>(ABILITIES_URL)
	])
	log.push(...abilityIdsResult.log, ...abilitiesResult.log)
	if(!(abilityIdsResult.ok && abilitiesResult.ok)) {
		return
	}
	const abilityIds = abilityIdsResult.data
	const abilities = abilitiesResult.data
	const newAbilityIds: ExtId[] = []
	const imgResources: {url: URL, name: string}[] = []
	Object.entries(abilityIds).forEach(([ext, key]) => {
		const ability = abilities[key]
		if(!ability){
			logError(`Could not get ability for key ${key}.`, log)
		}
		else {
			newAbilityIds.push({key: key, ext: parseInt(ext)})
			if(ability.img) {
				imgResources.push({url: new URL(ability.img, CDN_HOST), name: key})
			}
		}
	})
	await Promise.all(imgResources.map(async (resource) => {
		const img = await tryGetImg(new URL(resource.url, CDN_HOST))
		log.push(...img.log)
		if(img.ok && img.data) {
			return tryWrite(
				`${DIR.BUILD}/${PATHS.IMG.ABILITIES}/${resource.name}.png`,
				Buffer.from(img.data)
			).then(r => log.push(...r.log))
		}
	}))
	const oldAbilityBindings = (await tryReadJSON<Ids<Binding>>(ABILITY_BINDINGS_PATH)).data ?? {}
	const newAbilityBindings = tryUpdateNumericIdBindings(newAbilityIds, oldAbilityBindings)
	if(!newAbilityBindings) {
		return
	}
	const bindingsString = (
		getTypeImport(FILES.TYPES.CLARITY_TYPES, 'Ids', 'Binding') +
		getConstExport('ABILITY_IDS', newAbilityBindings, 'Ids<Binding>')
	)
	await tryWrite(ABILITY_BINDINGS_PATH, bindingsString).then(
		r => log.push(...r.log)
	)
}

function tryUpdateNumericIdBindings(newIds: ExtId[], oldIds: Ids<Binding>) {
	const oldBindings: IdBinding[] = Object.entries(
		oldIds).map(([i, {key, ext}]) => {
			return {idx: parseInt(i), key: key, ext: ext}
		}
	)
	const newBindings: Ids<Binding> = {}
	let nextIndex = 0
	const assignedIndices = new Set<number>()
	const reservedIndices = new Set<number>(newIds.map(id => id.ext))
	function getNextAvailableKey() {
		const unavailableIndices = assignedIndices.union(reservedIndices)
		while(unavailableIndices.has(nextIndex)) {
			nextIndex++
		}
		return nextIndex
	}


	let hasDuplicateEntries = false
	const existingByExtKey = new Map<number, IdBinding>()
	const existingByKey = new Map<string, IdBinding>()
	// Analyze and error check old bindings
	oldBindings.forEach((b) => {
		let error = false
		let errorMsg = `Existing bindings have duplicate entries:`
		if(existingByKey.has(b.key)) {
			error = true
			errorMsg += `\n${b.key} in ${JSON.stringify(b)} and ${JSON.stringify(existingByKey.get(b.key))}`
		}
		if(existingByExtKey.has(b.ext) && b.ext !== -1) {
			error = true
			errorMsg += `\n${b.ext} in ${JSON.stringify(b)} and ${JSON.stringify(existingByExtKey.get(b.ext))}}`
		}
		if(assignedIndices.has(b.idx)) {
			error = true
			errorMsg += `\n${b.idx} in ${JSON.stringify(b)}`
		}
		if(error) {
			hasDuplicateEntries = true
			logError(errorMsg, log)
		}
		else {
			existingByExtKey.set(b.ext, b)
			existingByKey.set(b.key, b)
			assignedIndices.add(b.idx)
		}
	})
	if(hasDuplicateEntries) {
		logError('Duplicate entries in old bindings. Cancelling binding update.', log)
		return
	}

	newIds.forEach(binding => {
		const oldBindingByNewKey = existingByKey.get(binding.key)
		const oldBindingByNewExtKey = existingByExtKey.get(binding.ext)
		let idx

		// If key exist -> assign binding to existing <idx, key> pair.
		if(oldBindingByNewKey) {
			if(oldBindingByNewKey.ext != binding.ext) {
				logWarning(`External id for key ${binding.key} changed from ${oldBindingByNewKey.ext} to ${binding.ext}.`, log)
			}
			idx = oldBindingByNewKey.idx
		}
		// Else -> assign binding to new index, preferably equal to idx.
		else {
			idx = assignedIndices.has(binding.ext) ? getNextAvailableKey() : binding.ext
			if(oldBindingByNewExtKey) {
				logWarning(`External id for new key ${binding.key} was already bound: ${JSON.stringify(oldBindingByNewExtKey)}.`, log)
			}
			else {
				logMessage(`added new binding ${JSON.stringify(binding)}`, log)
			}
		}
		newBindings[idx] = binding
		assignedIndices.add(idx)
	})
	const newBindingsArray: IdBinding[] = Object.entries(newBindings).map(
		([idx, {key, ext}])=> {return{idx:parseInt(idx), key:key, ext:ext}}
	)
	const newBindingsExtKeys = new Set<number>(newBindingsArray.map(binding => binding.ext))
	const newBindingsIdx = new Set<number>(newBindingsArray.map(binding => binding.idx))

	oldBindings.forEach(binding => {
		if(!newBindingsIdx.has(binding.idx)) {
			const idx = binding.idx
			const deprecatedBinding: ExtId = {
				key: binding.key,
				ext: newBindingsExtKeys.has(binding.ext) ? -1 : binding.ext
			}
			newBindings[idx] = deprecatedBinding
			logWarning(`Transferred old binding ${JSON.stringify(deprecatedBinding)}, which was not present in new dataset.`, log)
		}
	})
	return newBindings
}

function bindHero(hero: DotaConstantsHero): Hero {
	return {
		name: {
			static: hero.name.replace('npc_dota_hero_',''),
			localized: hero.localized_name
		},
		roles: hero.roles,
		baseHealth: {
			size: hero.base_health,
			regen: hero.base_health_regen
		},
		baseMana: {
			size: hero.base_mana,
			regen: hero.base_mana_regen
		},
		baseArmor: hero.base_armor,
		baseMagicResist: hero.base_mr,
		baseAttack: {
			damage: {
				min: hero.base_attack_min,
				max: hero.base_attack_max
			},
			speed: hero.base_attack_time,
			rate: hero.attack_rate,
			point: hero.attack_point,
			range: hero.attack_range,
			projectile_speed: hero.projectile_speed
		},
		attributes: {
			primary: ATTRIBUTE_BY_EXT[hero.primary_attr],
			base: {
				strength: hero.base_str,
				agility: hero.base_agi,
				intelligence: hero.base_int
			},
			gain: {
				strength: hero.str_gain,
				agility: hero.agi_gain,
				intelligence: hero.int_gain
			}
		},
		movement: {
			speed: hero.move_speed,
			turnRate: hero.turn_rate
		},
		vision: {
			day: hero.day_vision,
			night: hero.night_vision
		},
		legs: hero.legs,
		isInCaptainsMode: hero.cm_enabled
	}
}

function bindItem(item: DotaConstantsItem, dataName: string): Item {
	let name = item.dname
	if(!name) {
		logWarning(`${dataName} does not have property dname. Attempting to generate name`, log)
		name = generateMissingItemName(dataName)
	}
	const boundItem: Item = {
		name: name,
		lore: item.lore,
		goldPrice: item.cost ?? undefined,
		quality: item.qual ?? undefined,
		notes: (n => n === '' ? undefined : n)(item.notes ?? undefined),
		dispellable: item.dispellable ?? undefined,
		dmgType: item.dmg_type ?? undefined,
		tier: item.tier ?? undefined
	}
	if(typeof item.charges === 'number' && item.charges > 0) {
		boundItem.charges = item.charges
	}
	if(typeof item.mc === 'number') {
		boundItem.manaCost = item.mc
	}
	if(typeof item.hc === 'number') {
		boundItem.healthCost = item.hc
	}
	if(typeof item.cd === 'number') {
		boundItem.cooldown = item.cd
	}
	if(item.abilities && item.abilities.length > 0) {
		boundItem.abilities = item.abilities
	}
	if(item.attrib && item.attrib.length > 0) {
		boundItem.attributes = item.attrib
	}
	if(item.components && item.components.length > 0) {
		boundItem.components = item.components
	}
	if(item.behavior && item.behavior.length > 0) {
		boundItem.behavior = typeof item.behavior === 'string' ? [item.behavior] : item.behavior
	}
	if(item.target_team || item.target_type) {
		const {target_team, target_type} = item
		const targets: Targets = {}
		if(target_team && target_team.length > 0) {
			targets.team = typeof target_team === 'string' ? [target_team] : target_team
		}
		if(target_type && target_type.length > 0) {
			targets.type = typeof target_type === 'string' ? [target_type] : target_type
		}
		boundItem.validTargets = targets
	}
	if(item.hint && item.hint.length > 0) {
		boundItem.hint = item.hint
	}
	if(item.dispellable) {
		boundItem.dispellable = item.dispellable
	}
	if(item.bkbpierce) {
		boundItem.piercesBkb = item.bkbpierce === 'Yes' ? true : false
	}
	return boundItem
}

function generateMissingItemName(label: string): string {
	const parts = label.split('_')
	// If first part is recipe, we move it to the end
	if(parts[0] === 'recipe') {
		parts.push(parts.shift()!)
	}
	return parts.map(
		(part) => part[0]?.toUpperCase() + part.slice(1)
	).join(' ')
}

function getTypeImport(file: string, type: string, ...types: string[]): string {
	types.unshift(type)
	const path = `${ROOT_FROM_DATA_PATH}/${PATHS.TYPES}/${file.split('.')[0]}`
	return `import type {${types.join(', ')}} from '${path}'\n`
}

function getConstExport(name: string, obj: unknown, type: string): string {
	return `export const ${name} = ${stringify(obj)} as const satisfies ${type}`
}

async function tryWriteLogFile(log: LogEntry[]): Promise<Result> {
	const errors: string[] = ['\nERRORS:\n']
	const warnings: string[] = ['\nWARNINGS:\n']
	const all: string[] = ['\nFULL LOG:\n']

	log.sort((a, b) => a.timestamp - b.timestamp)
	log.forEach(entry => {
		const msgString = getLogString(entry)
		if(entry.lvl === LOG_LVL.ERR) {
			errors.push(msgString)
		}
		if(entry.lvl === LOG_LVL.WRN) {
			warnings.push(msgString)
		}
		all.push(msgString)
	})
	const logString = errors.join('\n')+warnings.join('\n')+all.join('\n')
	return await tryWrite(
		`${PATHS.LOGS.BUILD + new Date().toISOString().replace(/:/g,'.')}.txt`, logString
	)
}
