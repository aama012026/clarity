import { ITEM } from '#src/modules/bindings'
import * as ITEM_CONST from '../modules/itemConstants'

checkItemConstants()

function checkItemConstants() {
	Object.entries(ITEM_CONST.GROUP_BY_ITEM).forEach(([label, _]) => {
		let ok = true
		if(!ITEM[label]) {
			console.error(`${label} does not exist in items!`)
			ok = false
		}
		if(ok) {
			console.log('GROUP_BY_ITEM in itemConstants.ts - OK')
		}
	})
}