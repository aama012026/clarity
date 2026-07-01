import type { DotaConstantsHero, DotaConstantsItem } from '../types/dotaConstantsTypes'
import type { Hero, Item, Targets } from '../types/boundTypes'
import { DIR, FILES, PATHS } from '../modules/paths'
import { tryGetImg, tryFetchJson, stringify } from '../modules/flow.js'
import { tryReadJSON, tryWrite } from '../modules/flowBun.js'
import { ATTRIBUTE_BY_EXT } from '../modules/domainConstants'
import { lookup, type Id, type IdRecord } from '#src/modules/id.js'
import { TARGET, traceBun, type Result, type TraceInfo, type TracePoint, traceEvent, EVENT, type Status, type TraceEvent, traceEventBun } from '#src/modules/log.js'
import type { inspect } from 'bun'

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

type ExtId = Id<{ext:number}>
type IdBinding = {idx: number} & ExtId

// FETCH REQUIRED DOTACONSTANTS RESOURCES -> MAP TO CUSTOM DATASTRUCTURES -> WRITE TO ASSETS
const [heroesStatus, itemsStatus, abilitiesStatus] = await Promise.all([
	tryUpdateHeroes(), tryUpdateItems(), tryUpdateAbilities()
])
// await tryWriteLogFile(log)
// Heroes
async function tryUpdateHeroes(): Promise<Status> {
	const trace = {
		where:TARGET.HEROES,
		what:{children:[] as TracePoint[]}
	} satisfies Omit<TracePoint, 'when'>

	const [heroes, oldHeroBinds] = await Promise.all([
		tryFetchJson<Record<string, DotaConstantsHero>>(HEROES_URL),
		tryReadJSON<IdRecord<{ext:number}>>(HERO_BINDINGS_PATH),
	])
	trace.what.children.push(heroes.trace, oldHeroBinds.trace)
	if(!heroes.ok) {
		return {trace:traceBun(trace), ok:false}
	}
	// Update bindings
	const rawHeroes = Object.values(heroes.data)
	const newHeroIds: ExtId[] = rawHeroes.map(({id, name}) => {
		return {key: name.replace('npc_dota_hero_', ''), ext: id}
	})
	const newHeroBinds = tryUpdateNumericIdBindings(newHeroIds, oldHeroBinds.data ?? {})
	trace.what.children.push(newHeroBinds.trace)
	if(!newHeroBinds.ok) {
		return {trace:traceBun(trace), ok:false}
	}

	// Write bindings
	const bindingsString = (
		getTypeImport(FILES.TYPES.CLARITY_TYPES, 'Ids', 'Binding') +
		getConstExport('HERO_IDS', newHeroBinds, 'Ids<Binding>')
	)
	const bindsWriteRes = await tryWrite(HERO_BINDINGS_PATH, bindingsString)
	trace.what.children.push(bindsWriteRes.trace)
	if(!bindsWriteRes.ok) {
		return {trace:traceBun(trace), ok:false}
	}
	// bind heroes to our shape.
	const HeroIdByExt  = lookup(newHeroBinds.data, 'ext')
	const boundHeroes: Record<number, Hero> = Object.fromEntries(
		rawHeroes.map(hero => [HeroIdByExt[hero.id], bindHero(hero)])
	)

	const heroesString = (
		getTypeImport(FILES.TYPES.BOUND_TYPES, 'Hero') +
		getConstExport('HEROES', boundHeroes, 'Record<number, Hero>')
	)
	await Promise.all([
		tryWrite(HERO_DATA_PATH, heroesString).then(
			r => trace.what.children.push(r.trace)
		),
		// Get hero images
		...rawHeroes.map(async hero => {
			const img = await tryGetImg(new URL(hero.img, CDN_HOST))
			trace.what.children.push(img.trace)
			if(!(img.ok && img.data)) {
				return
			}
			const imgFolder = `${DIR.BUILD}/${PATHS.IMG.HEROES}`
			const fileName = `${hero.name.replace('npc_dota_hero_','')}.png`
			return tryWrite(`${imgFolder}/${fileName}`, Buffer.from(img.data)
			).then(r => trace.what.children.push(r.trace))
		})
	])
	return {trace:traceBun(trace), ok:true}
}

// Items
async function tryUpdateItems(): Promise<Status> {
	const trace = {
		where:TARGET.ITEMS,
		what:{children:[] as TracePoint[]}
	} satisfies Omit<TracePoint, 'when'>
	const [itemsRes, oldBindsResult] = await Promise.all([
		tryFetchJson<Record<string, DotaConstantsItem>>(ITEMS_URL),
		tryReadJSON<IdRecord<{ext:number}>>(ITEM_BINDINGS_PATH)
	])
	trace.what.children.push(itemsRes.trace, oldBindsResult.trace)
	if(!itemsRes.ok) {
		return {trace:traceBun(trace), ok:false}
	}
	const items = Object.entries(itemsRes.data)
	const newItemIds: ExtId[] = items.map(([dataName, item]) => {
		return {
			ext: item.id,
			key: dataName
		}
	})
	const newItemBinds = tryUpdateNumericIdBindings(newItemIds, oldBindsResult.data ?? {})
	trace.what.children.push(newItemBinds.trace)
	if(!newItemBinds.ok) {
		return {trace:traceBun(trace), ok:false}
	}
	const bindingsString = (
		getTypeImport(FILES.TYPES.CLARITY_TYPES, 'Ids', 'Binding') +
		getConstExport('ITEM_IDS', newItemBinds, 'Ids<Binding>')
	)
	const bindsWriteRes = await tryWrite(ITEM_BINDINGS_PATH, bindingsString)
	trace.what.children.push(bindsWriteRes.trace)
	if(!bindsWriteRes.ok) {
		return {trace:traceBun(trace), ok:false}
	}

	const ItemByExtKey = lookup(newItemBinds.data, 'ext')
	const boundItems: Record<number, Item> = Object.fromEntries(
		items.map(([key, item]) => [ItemByExtKey[item.id], bindItem(item, key)])
	)

	const itemsString = (
		getTypeImport(FILES.TYPES.BOUND_TYPES, 'Item') +
		getConstExport('ITEMS', boundItems, 'Record<number, Item>')
	)
	await Promise.all([
		tryWrite(ITEMS_PATH, itemsString).then(
			r => trace.what.children.push(r.trace)),
		// Get images
		...items.map(async ([label, item]) => {
			const img = await tryGetImg(new URL(item.img, CDN_HOST))
			trace.what.children.push(img.trace)
			if(img.ok && img.data) {
				return tryWrite(
					`${DIR.BUILD}/${PATHS.IMG.ITEMS}/${label}.png`,
					Buffer.from(img.data)
				).then(r => trace.what.children.push(r.trace))
			}
		})
	])
	return {trace:traceBun(trace), ok:true}
}

// Abilities
async function tryUpdateAbilities(): Promise<Status> {
	const trace = {
		where:TARGET.ABILITIES,
		what:{children:[] as TracePoint[], events:[] as TraceEvent<any>[]}
	} satisfies Omit<TracePoint, 'when'>
	const [abilityIds, abilities] = await Promise.all([
		tryFetchJson<Record<number, string>>(ABILITY_IDS_URL),
		tryFetchJson<Record<string, any>>(ABILITIES_URL)
	])
	trace.what.children.push(abilityIds.trace, abilities.trace)
	if(!(abilityIds.ok && abilities.ok)) {
		return {trace:traceBun(trace), ok:false}
	}
	const newAbilityIds: ExtId[] = []
	const imgResources: {url: URL, name: string}[] = []
	Object.entries(abilityIds.data).forEach(([ext, key]) => {
		const ability = abilities.data[key]
		if(!ability){
			trace.what.events.push(
				traceEventBun(EVENT.NOT_IN, {key, lookup:'abilities.data'})
			)
		}
		else {
			newAbilityIds.push({key:key, ext:parseInt(ext)})
			if(ability.img) {
				imgResources.push({url:new URL(ability.img, CDN_HOST), name:key})
			}
		}
	})
	await Promise.all(imgResources.map(async (resource) => {
		const img = await tryGetImg(new URL(resource.url, CDN_HOST))
		trace.what.children.push(img.trace)
		if(img.ok && img.data) {
			return tryWrite(
				`${DIR.BUILD}/${PATHS.IMG.ABILITIES}/${resource.name}.png`,
				Buffer.from(img.data)
			).then(r => trace.what.children.push(r.trace))
		}
	}))
	const oldAbilityBinds = (await tryReadJSON<IdRecord<{ext:number}>>(ABILITY_BINDINGS_PATH)).data ?? {}
	const newAbilityBinds = tryUpdateNumericIdBindings(newAbilityIds, oldAbilityBinds)
	if(!newAbilityBinds.ok) {
		return {trace:traceBun(trace), ok:false}
	}
	const bindingsString = (
		getTypeImport(FILES.TYPES.CLARITY_TYPES, 'Ids', 'Binding') +
		getConstExport('ABILITY_IDS', newAbilityBinds.data, 'Ids<Binding>')
	)
	await tryWrite(ABILITY_BINDINGS_PATH, bindingsString).then(
		r => trace.what.children.push(r.trace)
	)
	return {trace:traceBun(trace), ok:true}
}

function tryUpdateNumericIdBindings(
	newIds:ExtId[],
	oldIds:IdRecord<{ext:number}>
):Result<IdRecord<{ext:number}>> {
	const trace = {
		where:TARGET.ID_BINDS,
		what:{events:[] as TraceEvent<any>[]}
	} satisfies Omit<TracePoint, 'when'>
	const oldBinds: IdBinding[] = Object.entries(
		oldIds).map(([i, {key, ext}]) => {
			return {idx: parseInt(i), key: key, ext: ext}
		}
	)
	const newBinds: IdRecord<{ext:number}> = {}
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
	let dupeEntriesMsgs:string[] = []
	oldBinds.forEach((b) => {
		if(existingByKey.has(b.key)) {
			dupeEntriesMsgs.push(`\n${b.key} in ${JSON.stringify(b)} and ${JSON.stringify(existingByKey.get(b.key))}`)
		}
		if(existingByExtKey.has(b.ext) && b.ext !== -1) {
			dupeEntriesMsgs.push(`\n${b.ext} in ${JSON.stringify(b)} and ${JSON.stringify(existingByExtKey.get(b.ext))}}`)
		}
		if(assignedIndices.has(b.idx)) {
			dupeEntriesMsgs.push(`\n${b.idx} in ${JSON.stringify(b)}`)
		}
		if(dupeEntriesMsgs.length > 0) {
			hasDuplicateEntries = true
		}
		else {
			existingByExtKey.set(b.ext, b)
			existingByKey.set(b.key, b)
			assignedIndices.add(b.idx)
		}
	})
	if(hasDuplicateEntries) {
		trace.what.events.push(traceEventBun(EVENT.DUPE_KEYS, {msgs:dupeEntriesMsgs}))
		return {trace:traceBun(trace), ok:false}
	}

	newIds.forEach(binding => {
		const oldBindByNewKey = existingByKey.get(binding.key)
		const oldBindByNewExtKey = existingByExtKey.get(binding.ext)
		let idx
		// If key exist -> assign binding to existing <idx, key> pair.
		if(oldBindByNewKey) {
			if(oldBindByNewKey.ext != binding.ext) {
				trace.what.events.push(traceEventBun(EVENT.KEY_REBIND, {
					key:binding.key,
					oldExt:oldBindByNewKey.ext,
					newExt:binding.ext
				}))
			}
			idx = oldBindByNewKey.idx
		}
		// Else -> assign binding to new index, preferably equal to idx.
		else {
			idx = assignedIndices.has(binding.ext) ? getNextAvailableKey() : binding.ext
			if(oldBindByNewExtKey) {
				trace.what.events.push(traceEventBun(EVENT.EXT_REBIND, {
					key:binding.key,
					oldBinding:Bun.inspect(oldBindByNewExtKey)
				}))
			}
			else {
				trace.what.events.push(traceEventBun(EVENT.NEW_BIND, {
					binding: Bun.inspect(binding)
				}))
			}
		}
		newBinds[idx] = binding
		assignedIndices.add(idx)
	})
	const newBindsArray: IdBinding[] = Object.entries(newBinds).map(
		([idx, {key, ext}])=> {return{idx:parseInt(idx), key:key, ext:ext}}
	)
	const newBindsExtKeys = new Set<number>(newBindsArray.map(binding => binding.ext))
	const newBindsIdx = new Set<number>(newBindsArray.map(binding => binding.idx))

	oldBinds.forEach(binding => {
		if(!newBindsIdx.has(binding.idx)) {
			const idx = binding.idx
			const deprecatedBinds:ExtId = {
				key: binding.key,
				ext: newBindsExtKeys.has(binding.ext) ? -1 : binding.ext
			}
			newBinds[idx] = deprecatedBinds
			trace.what.events.push(traceEventBun(EVENT.RETIRE_BIND, {
				binding:Bun.inspect(binding)
			}))
		}
	})
	return {data:newBinds, ok:true, trace:traceBun(trace)}
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

function bindItem(item: DotaConstantsItem, dataName: string): Result<Item> {
	const trace = {
		where:TARGET.BIND_ITEM,
		what:{events:[] as TraceEvent<any>[]}
	} satisfies Omit<TracePoint, 'when'>

	const boundItem: Item = {
		name: item.dname ?? generateMissingItemName(dataName),
		lore: item.lore,
		goldPrice: item.cost ?? undefined,
		quality: item.qual ?? undefined,
		notes: (n => n === '' ? undefined : n)(item.notes ?? undefined),
		dispellable: item.dispellable ?? undefined,
		dmgType: item.dmg_type ?? undefined,
		tier: item.tier ?? undefined,
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
	if(!item.dname) {
		trace.what.events.push(traceEventBun(EVENT.MISSING_ITEM_NAME, {
			dataName, generatedName:boundItem.name
		}))
		return {
			data:boundItem, ok:true, trace:traceBun(trace)
		}
	}
	return {data:boundItem, ok:true, trace:traceBun({where:TARGET.BIND_ITEM})}
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
/*
async function tryWriteLogFile(log: LogEntry[]): Promise<Result> {
	const errors: string[] = ['\nERRORS:\n']
	const warnings: string[] = ['\nWARNINGS:\n']
	const all: string[] = ['\nFULL LOG:\n']

	log.sort((a, b) => a.when - b.when)
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
	*/