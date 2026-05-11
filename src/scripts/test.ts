import * as ITEMS from '../modules/itemConstants'
import itemJson from '../../public/generated/data/items.json'
import type { Item } from '../types/BoundTypes'
import type { ItemLabel } from '../modules/bindings'
const items = itemJson as Record<ItemLabel, Item>

function checkItemConstants() {
	Object.entries(ITEMS.GROUP_BY_ITEM).forEach(([label, _]) => {
		let ok = true
		if(!items[label]) {
			console.error(`${label} does not exist in items!`)
			ok = false
		}
		if(ok) {
			console.log('GROUP_BY_ITEM in itemConstants.ts - OK')
		}
		})
}