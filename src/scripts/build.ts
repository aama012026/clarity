// FETCH REQUIRED DOTACONSTANTS RESOURCES -> MAP TO CUSTOM DATASTRUCTURES -> WRITE TO ASSETS
const CDN_HOST = 'https://cdn.steamstatic.com/'
const HEROES_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/heroes.json')
const ITEM_IDS_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/item_ids.json')
const ITEMS_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/items.json')
const ABILITY_IDS_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/ability_ids.json')

// vite treats the public folder as root when serving files. Here at build time we prefix it.
const DATA_PATH = `${DIR.BUILD}/${PATHS.GENERATED_DATA}`
const HERO_BINDINGS_PATH = `${DATA_PATH}/${FILES.BINDINGS.HEROES}`
const HERO_DATA_PATH = `${DATA_PATH}/${FILES.DATA.HEROES}`
const ITEM_ID_BINDINGS_PATH = `${DATA_PATH}/${FILES.BINDINGS.ITEMS}`
const ITEMS_PATH = `${DATA_PATH}/${FILES.DATA.ITEMS}`
const ABILITY_ID_BINDINGS_PATH = `${DATA_PATH}/${FILES.BINDINGS.ABILITIES}`

import type { DotaConstantsHero, DotaConstantsItem } from '../types/DotaConstantsTypes.js'
import { tryGetImg, assert, tryGetJson, logWarning } from '../modules/flow.js'
import { tryReadJSON, tryWriteImg, tryWriteJSON } from '../modules/flowNode.js'
import type { Hero, IdBinding, Item, Targets } from '../types/BoundTypes.js'
import { DIR, FILES, PATHS } from '../modules/paths.js'
import type { ItemKey, ItemLabel } from '../modules/bindings.js'

const itemLog = {
	msg: [] as string[],
	warnings: [] as string[],
	errors: [] as string[]
}

const imgErrors: string[] = []
await tryUpdateItems()

// Heroes
const heroResult = await tryGetJson<Record<string, DotaConstantsHero>>(HEROES_URL)
if(heroResult.ok) {
	// Update Id bindings
	const rawHeroes = Object.values(assert(heroResult.data, 'heroResult.data', 'Could not unpack rawHeroes'))
	const newHeroIds: Record<string, string> = Object.fromEntries(
		rawHeroes.map(hero => [hero.id, hero.name])
	)
	await tryUpdateNumericIdBindings(newHeroIds, HERO_BINDINGS_PATH)

	// Format Heroes to our bind shape.
	const heroIdsResult = await tryReadJSON<IdBinding<number>[]>(HERO_BINDINGS_PATH)
	if (!heroIdsResult.ok) {
		console.error(`Failed to open new HeroId bindings: ${heroIdsResult.msg}`)
	}
	const heroIds = heroIdsResult.data!
	type HeroKey = typeof heroIds[number]['key']
	type HeroExtId = typeof heroIds[number]['extId']
	const heroKeysByExtId = Object.fromEntries(
		heroIds.map(hero => [hero.extId, hero.key])
	) as Record<HeroExtId, HeroKey>

	const formattedHeroes = rawHeroes.map(hero => bindHero(hero, heroKeysByExtId))
	const err = await tryWriteJSON(HERO_DATA_PATH, formattedHeroes)
	if(err) {
		console.log(err)
	}
	// Get hero images
	rawHeroes.forEach(async hero => {
		const img = await tryGetImg(new URL(hero.img, CDN_HOST))
		if(!img.ok) {
			imgErrors.push(img.msg!)
		}
		await tryWriteImg(`${DIR.BUILD}/${PATHS.IMG.HEROES}/${hero.name}.png`, Buffer.from(
			assert(img.data, 'img.data', 'Could not convert to buffer')
		))
	});
}

// Items
async function tryUpdateItems() {
	const itemMessages: string[] = []
	const itemIdsResult = await tryGetJson<Record<string, string>>(ITEM_IDS_URL)
	if(!(itemIdsResult.ok && itemIdsResult.data)) {
		console.error(`Could not get item ids from dotaconstants repo: ${itemIdsResult.msg}`)
		return
	}
	itemMessages.push(`Got item ids from dotaconstants repo: ${itemIdsResult.msg}`)
	const newItemIds = itemIdsResult.data!
	await tryUpdateNumericIdBindings(newItemIds, ITEM_ID_BINDINGS_PATH)
	itemMessages.push(`Updated item id bindings.`)

	const itemBindingsResult = await tryReadJSON<IdBinding<number>[]>(ITEM_ID_BINDINGS_PATH)
	if(!(itemBindingsResult.ok && itemBindingsResult.data)) {
		console.error(`Could not read the updated item bindings: ${itemBindingsResult.msg}`)
		return
	}
	const itemIdBindings = itemBindingsResult.data!
	type ItemKey = typeof itemIdBindings[number]['key']
	type ItemLabel = typeof itemIdBindings[number]['label']
	type ItemExtId = typeof itemIdBindings[number]['extId']
	const ItemKeysByExtId = Object.fromEntries(
		itemIdBindings.map(item => [item.extId, item.key])
	) as Record<ItemExtId, ItemKey>
	const itemsByKey = Object.fromEntries(
		itemIdBindings.map(item => [item.key, item.label])
	) as Record<ItemKey, ItemLabel>
	
	const itemsResult = await tryGetJson<Record<string, DotaConstantsItem>>(ITEMS_URL)
	if(!(itemsResult.ok && itemIdsResult.data)) {
		console.error(`Could not get items from dotaconstants repo: ${itemsResult.msg}`)
		return
	}
	const items = Object.entries(itemsResult.data!)
	const boundItems = Object.fromEntries(
		items.map(([label, item]) => [label, bindItem(item, ItemKeysByExtId, itemsByKey)])
	) as Record<ItemLabel, Item>
	
	const err = await tryWriteJSON(ITEMS_PATH, boundItems)
	if(err) {
		console.log(err)
	}
	// Get images
	items.forEach(async ([label, item]) => {
		const img = await tryGetImg(new URL(item.img, CDN_HOST))
		if(!img.ok) {
			imgErrors.push(img.msg!)
		}
		const error = await tryWriteImg(`${DIR.BUILD}/${PATHS.IMG.ITEMS}/${label}.png`, Buffer.from(
			assert(img.data, 'img.data', 'Could not convert to buffer')
		))
		if(error) {
			console.error(error)
		}
	});
	console.log(itemMessages.join('\n'))
}

// Abilities
const abilityIdsResult = await tryGetJson<Record<string, string>>(ABILITY_IDS_URL)
if(abilityIdsResult.ok){
	const newAbilityIds = assert(abilityIdsResult.data, 'abilityIdsResult.data', 'Could not unpack ability IDs')
	await tryUpdateNumericIdBindings(newAbilityIds, ABILITY_ID_BINDINGS_PATH)
}

async function tryUpdateNumericIdBindings(newIds: Record<string, string>, oldBindingsFile: string) {
	const messages: string[] = []
	const warnings: string[] = []

	const oldBindingsResult = await tryReadJSON<IdBinding<number>[]>(oldBindingsFile)
	const oldBindings: IdBinding<number>[] = oldBindingsResult.data ?? []
	const newBindings: IdBinding<number>[] = []
	let nextKey = 0
	const assignedKeys = new Set<number>()
	const reservedKeys = new Set<number>(Object.keys(newIds).map(k => parseInt(k)))
	function getNextAvailableKey() {
		const unavailableKeys = assignedKeys.union(reservedKeys)
		while(unavailableKeys.has(nextKey)) {
			nextKey++
		}
		return nextKey
	}
	const existingByExtId = new Map<number, IdBinding<number>>()
	const existingByLabel = new Map<string, IdBinding<number>>()

	const duplicateErrors: string[] =  []
	oldBindings.forEach(b => {
		let error = false
		let errorMsg = `Existing bindings have duplicate entries:`
		if(existingByLabel.has(b.label)) {
			error = true
			errorMsg += `\n${b.label} in ${JSON.stringify(b)} and ${JSON.stringify(existingByLabel.get(b.label))}`
		}
		if(existingByExtId.has(b.extId)) {
			error = true
			errorMsg += `\n${b.extId} in ${JSON.stringify(b)} and ${JSON.stringify(existingByExtId.get(b.extId))}}`
		}
		if(assignedKeys.has(b.key)) {
			error = true
			errorMsg += `\n${b.key} in ${JSON.stringify(b)}`
		}
		if(error) {
			duplicateErrors.push(errorMsg)
		}
		else {
			existingByExtId.set(b.extId, b)
			existingByLabel.set(b.label, b)
			assignedKeys.add(b.key)
		}
	})
	if(duplicateErrors.length > 0) {
		throw new Error(duplicateErrors.join('\n'))
	}

	for(const [extIdString, label] of Object.entries(newIds)) {
		// keys are always strings in js / json, we need to convert to number for ts-typing
		const extId = parseInt(extIdString)

		const oldBindingByNewLabel = existingByLabel.get(label)
		const oldBindingByNewExtId = existingByExtId.get(extId)

		// If label exist -> assign id to existing <key, label> pair.
		if(oldBindingByNewLabel) {
			if(oldBindingByNewLabel.extId != extId) {
				warnings.push(`External id for label ${label} changed from ${oldBindingByNewLabel.extId} to ${extId}.`)
			}
			const updatedBinding: IdBinding<number> = {
				key: oldBindingByNewLabel.key,
				label: label,
				extId: extId
			}
			newBindings.push(updatedBinding)
			assignedKeys.add(updatedBinding.key)
		}
		// Else -> assign label to new key, preferably equal to id.
		else {
			const updatedBinding: IdBinding<number> = {
				key: assignedKeys.has(extId) ? getNextAvailableKey() : extId,
				label: label,
				extId: extId
			}
			newBindings.push(updatedBinding)
			assignedKeys.add(updatedBinding.key)
			if(oldBindingByNewExtId) {
				warnings.push(`External id for new label ${label} was already bound: ${JSON.stringify(oldBindingByNewExtId)}.`)
			}
			else {
				messages.push(`added new binding ${JSON.stringify(updatedBinding)}`)
			}
		}
	}
	const newBindingsExtIds = new Set<number>(newBindings.map(binding => binding.extId))
	const newBindingsKeys = new Set<number>(newBindings.map(binding => binding.key))
	
	oldBindings.forEach(binding => {
		if(!newBindingsKeys.has(binding.key)) {
			const deprecatedBinding: IdBinding<number> = {
				key: binding.key,
				label: binding.label,
				extId: newBindingsExtIds.has(binding.extId) ? -1 : binding.extId
			} 
			newBindings.push(deprecatedBinding)
			warnings.push(`Transferred old binding ${JSON.stringify(deprecatedBinding)}, which was not present in new dataset.`)
		}
	})
	const error = await tryWriteJSON(oldBindingsFile, newBindings)
	if(error) {
		throw error
	}
	console.log(messages.join('\n'))
	console.warn(warnings.join('\n'))
}

function bindHero(hero: DotaConstantsHero, keysByExtId: Record<number, number>): Hero {
	return {
		id: keysByExtId[hero.id]!,
		name: {
			static: hero.name,
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
			primary: hero.primary_attr,
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

function bindItem(item: DotaConstantsItem, keysByExtId: Record<number, number>, itemsByKey: Record<ItemKey, ItemLabel>): Item {
	const id = keysByExtId[item.id]!
	let name = item.dname
	if(!name) {
		const label = itemsByKey[item.id]!
		logWarning(`${label} does not have property dname. Attempting to generate name`, itemLog.warnings)
		name = generateMissingItemName(label)
	}
	const boundItem: Item = {
		id: keysByExtId[item.id]!,
		name: name,
		lore: item.lore,
		goldPrice: item.cost ?? undefined,
		quality: item.qual ?? undefined,
		notes: item.notes ?? undefined,
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
		boundItem.healthCost === item.hc
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