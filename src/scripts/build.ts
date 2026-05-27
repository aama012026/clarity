// FETCH REQUIRED DOTACONSTANTS RESOURCES -> MAP TO CUSTOM DATASTRUCTURES -> WRITE TO ASSETS
const CDN_HOST = 'https://cdn.steamstatic.com/'
const HEROES_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/heroes.json')
const ITEM_IDS_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/item_ids.json')
const ITEMS_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/items.json')
const ABILITY_IDS_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/ability_ids.json')
const ABILITIES_URL = new URL('https://raw.githubusercontent.com/odota/dotaconstants/refs/heads/master/build/abilities.json')

const DATA_PATH = `${DIR.BUILD}/${PATHS.GENERATED_DATA}`
const HERO_BINDINGS_PATH = `${DATA_PATH}/${FILES.BINDINGS.HEROES}`
const HERO_DATA_PATH = `${DATA_PATH}/${FILES.DATA.HEROES}`
const ITEM_ID_BINDINGS_PATH = `${DATA_PATH}/${FILES.BINDINGS.ITEMS}`
const ITEMS_PATH = `${DATA_PATH}/${FILES.DATA.ITEMS}`
const ABILITY_ID_BINDINGS_PATH = `${DATA_PATH}/${FILES.BINDINGS.ABILITIES}`

import type { DotaConstantsHero, DotaConstantsItem } from '../types/DotaConstantsTypes.js'
import { tryGetImg, assert, tryGetJson, logWarning, log, logError } from '../modules/flow.js'
import { tryReadJSON, tryWriteImg, tryWriteJSON } from '../modules/flowNode.js'
import { AttributeBindings, type Hero, type Id, type IdBinding, type Item, type Targets } from '../types/BoundTypes.js'
import { DIR, FILES, PATHS } from '../modules/paths.js'

interface Log {messages: string[], warnings: string[], errors: string[]}
const itemLog: Log = {messages: [], warnings: [], errors: []}

const imgErrors: string[] = []
await tryUpdateHeroes()
await tryUpdateItems()
await tryUpdateAbilities()

// Heroes
async function tryUpdateHeroes() {
	const heroResult = await tryGetJson<Record<string, DotaConstantsHero>>(HEROES_URL)
	if(heroResult.ok) {
		// Update Id bindings
		const rawHeroes = Object.values(assert(heroResult.data, 'heroResult.data', 'Could not unpack rawHeroes'))
		const newHeroIds: Omit<IdBinding<number>, 'idx'>[] = rawHeroes.map(
			({id, name, localized_name}) => {return {extKey: id, key: name.replace('npc_dota_hero_' ,''), name: localized_name}}
		)
		await tryUpdateNumericIdBindings(newHeroIds, HERO_BINDINGS_PATH)

		// Format Heroes to our bind shape.
		const heroIdsResult = await tryReadJSON<IdBinding<number>[]>(HERO_BINDINGS_PATH)
		if (!heroIdsResult.ok) {
			console.error(`Failed to open new HeroId bindings: ${heroIdsResult.msg}`)
		}
		const heroIds = heroIdsResult.data!
		type HeroIdx = typeof heroIds[number]['idx']
		type HeroExtKey = typeof heroIds[number]['extKey']
		const heroIdxByExtKey = Object.fromEntries(
			heroIds.map(hero => [hero.extKey, hero.idx])
		) as Record<HeroExtKey, HeroIdx>

		const formattedHeroes = rawHeroes.map(hero => bindHero(hero, heroIdxByExtKey))
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
			await tryWriteImg(`${DIR.BUILD}/${PATHS.IMG.HEROES}/${hero.name.replace('npc_dota_hero_','')}.png`, Buffer.from(
				assert(img.data, 'img.data', 'Could not convert to buffer')
			))
		});
	}
}

// Items
async function tryUpdateItems() {
	const itemMessages: string[] = []
	const itemsResult = await tryGetJson<Record<string, DotaConstantsItem>>(ITEMS_URL)
	if(!(itemsResult.ok && itemsResult.data)) {
		console.error(`Could not get items from dotaconstants repo: ${itemsResult.msg}`)
		return
	}
	const items = Object.entries(itemsResult.data!)
	const newItemIds:Omit<IdBinding<number>, 'idx'>[] = items.map(([dataName, item]) => {
		return {
			extKey: item.id,
			key: dataName,
			name: item.dname ?? generateMissingItemName(dataName)
		}
	})
	await tryUpdateNumericIdBindings(newItemIds, ITEM_ID_BINDINGS_PATH)
	itemMessages.push(`Updated item id bindings.`)

	const itemBindingsResult = await tryReadJSON<IdBinding<number>[]>(ITEM_ID_BINDINGS_PATH)
	if(!(itemBindingsResult.ok && itemBindingsResult.data)) {
		console.error(`Could not read the updated item bindings: ${itemBindingsResult.msg}`)
		return
	}
	const itemIdBindings = itemBindingsResult.data!
	type ItemIdx = typeof itemIdBindings[number]['idx']
	type ItemKey = typeof itemIdBindings[number]['key']
	type ItemExtKey = typeof itemIdBindings[number]['extKey']
	const ItemIdByExtKey = Object.fromEntries(
		itemIdBindings.map(item => [item.extKey, {idx: item.idx, key: item.key, name: item.name}])
	) as Record<ItemExtKey, Id>
	
	const boundItems = Object.fromEntries(
		items.map(([key, item]) => {
			const itemId = ItemIdByExtKey[item.id]!
			return [key, bindItem(item, itemId.idx, itemId.key)]
		})
	) as Record<ItemKey, Item>
	
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
async function tryUpdateAbilities() {
	const log: Log = {messages: [], warnings: [], errors: []}

	const abilityIdsResult = await tryGetJson<Record<number, string>>(ABILITY_IDS_URL)
	const abilitiesResult = await tryGetJson<Record<string, any>>(ABILITIES_URL)
	const abilityIds = abilityIdsResult.data
	const abilities = abilitiesResult.data
	if(!(abilityIdsResult.ok || !abilityIds)) {
		logError(`Could not get ${ABILITY_IDS_URL}: ${abilityIdsResult.msg} Ability update cancelled.`, log.errors)
		return
	}
	else if(!abilitiesResult.ok || !abilities) {
		logError(`Could not get ${ABILITIES_URL}: ${abilitiesResult.msg} Ability update cancelled.`, log.errors)
		return
	}
	else {
		const newAbilityIds: Omit<IdBinding<number>, 'idx'>[] = []
		Object.entries(abilityIds!).forEach(async ([extKey, key]) => {
			const ability = abilities[key]
			if(!ability){
				logError(`Could not get ability for key ${key}. Ability update cancelled.`, log.errors)
				return
			}
			newAbilityIds.push({key: key, name: ability['dname'], extKey: parseInt(extKey)})
			if(ability.img) {
				const img = await tryGetImg(new URL(ability.img, CDN_HOST))
				if(!img.ok) {
					logError(img.msg!, log.errors)
				}
				else {
					const error = await tryWriteImg(`${DIR.BUILD}/${PATHS.IMG.ABILITIES}/${key}.png`, Buffer.from(
						assert(img.data, 'img.data', 'Could not convert to buffer')
					))
					if(error) {
						logError(error.message, log.errors)
					}
				}
			}
		})
		await tryUpdateNumericIdBindings(newAbilityIds, ABILITY_ID_BINDINGS_PATH)
	}
}

async function tryUpdateNumericIdBindings(
	newIds: Omit<IdBinding<number>, 'idx'>[], oldBindingsFile: string) 
{
	const logs: Log = {messages: [], warnings: [], errors: []}

	const oldBindingsResult = await tryReadJSON<IdBinding<number>[]>(oldBindingsFile)
	const oldBindings: IdBinding<number>[] = oldBindingsResult.data ?? []
	const newBindings: IdBinding<number>[] = []
	let nextIndex = 0
	const assignedIndices = new Set<number>()
	const reservedIndices = new Set<number>(newIds.map(id => id.extKey))
	function getNextAvailableKey() {
		const unavailableIndices = assignedIndices.union(reservedIndices)
		while(unavailableIndices.has(nextIndex)) {
			nextIndex++
		}
		return nextIndex
	}
	const existingByExtKey = new Map<number, IdBinding<number>>()
	const existingByKey = new Map<string, IdBinding<number>>()

	const duplicateErrors: string[] =  []
	oldBindings.forEach(b => {
		let error = false
		let errorMsg = `Existing bindings have duplicate entries:`
		if(existingByKey.has(b.key)) {
			error = true
			errorMsg += `\n${b.key} in ${JSON.stringify(b)} and ${JSON.stringify(existingByKey.get(b.key))}`
		}
		if(existingByExtKey.has(b.extKey) && b.extKey !== -1) {
			error = true
			errorMsg += `\n${b.extKey} in ${JSON.stringify(b)} and ${JSON.stringify(existingByExtKey.get(b.extKey))}}`
		}
		if(assignedIndices.has(b.idx)) {
			error = true
			errorMsg += `\n${b.idx} in ${JSON.stringify(b)}`
		}
		if(error) {
			duplicateErrors.push(errorMsg)
		}
		else {
			existingByExtKey.set(b.extKey, b)
			existingByKey.set(b.key, b)
			assignedIndices.add(b.idx)
		}
	})
	if(duplicateErrors.length > 0) {
		throw new Error(duplicateErrors.join('\n'))
	}

	newIds.forEach(({extKey, key, name}) => {
		// keys are always strings in js / json, we need to convert to number for ts-typing
		const oldBindingByNewKey = existingByKey.get(key)
		const oldBindingByNewExtKey = existingByExtKey.get(extKey)

		// If key exist -> assign id to existing <idx, key> pair.
		if(oldBindingByNewKey) {
			if(oldBindingByNewKey.extKey != extKey) {
				logWarning(`External id for key ${key} changed from ${oldBindingByNewKey.extKey} to ${extKey}.`, logs.warnings)
			}
			const updatedBinding: IdBinding<number> = {
				idx: oldBindingByNewKey.idx,
				key: key,
				name: name,
				extKey: extKey
			}
			newBindings.push(updatedBinding)
			assignedIndices.add(updatedBinding.idx)
		}
		// Else -> assign label to new key, preferably equal to id.
		else {
			const updatedBinding: IdBinding<number> = {
				idx: assignedIndices.has(extKey) ? getNextAvailableKey() : extKey,
				key: key,
				name: name,
				extKey: extKey
			}
			newBindings.push(updatedBinding)
			assignedIndices.add(updatedBinding.idx)
			if(oldBindingByNewExtKey) {
				logWarning(`External id for new key ${key} was already bound: ${JSON.stringify(oldBindingByNewExtKey)}.`, logs.warnings)
			}
			else {
				log(`added new binding ${JSON.stringify(updatedBinding)}`, logs.messages)
			}
		}
	})
	const newBindingsExtKeys = new Set<number>(newBindings.map(binding => binding.extKey))
	const newBindingsIdx = new Set<number>(newBindings.map(binding => binding.idx))
	
	oldBindings.forEach(binding => {
		if(!newBindingsIdx.has(binding.idx)) {
			const deprecatedBinding: IdBinding<number> = {
				idx: binding.idx,
				key: binding.key,
				name: binding.name,
				extKey: newBindingsExtKeys.has(binding.extKey) ? -1 : binding.extKey
			} 
			newBindings.push(deprecatedBinding)
			logWarning(`Transferred old binding ${JSON.stringify(deprecatedBinding)}, which was not present in new dataset.`, logs.warnings)
		}
	})
	const error = await tryWriteJSON(oldBindingsFile, newBindings)
	if(error) {
		throw error
	}
}

function bindHero(hero: DotaConstantsHero, IdxByExtKey: Record<number, number>): Hero {
	return {
		id: IdxByExtKey[hero.id]!,
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
			primary: AttributeBindings[hero.primary_attr],
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

function bindItem(item: DotaConstantsItem, idx: number, dataName: string): Item {
	let name = item.dname
	if(!name) {
		logWarning(`${dataName} does not have property dname. Attempting to generate name`, itemLog.warnings)
		name = generateMissingItemName(dataName)
	}
	const boundItem: Item = {
		id: idx,
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