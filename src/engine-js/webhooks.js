'use strict';

var activeHooks = {},
	geb = global.eventBackbone;

geb.addListener('webhook:activated', (oHook) =>  {
	activeHooks[oHook.hookurl] = oHook;
	console.log(activeHooks)
});

geb.addListener('webhook:deactivated', (hid) =>  {
	for(let hookurl in activeHooks) {
		if(activeHooks[hookurl].id === hid) {	
			delete activeHooks[hookurl];
		}
	}
});

exports.getByUrl = function(hurl) {
	return activeHooks[hurl];
}

exports.getByUser = function(uid, hookname) {
	for(let hookurl in activeHooks) {
		let o = activeHooks[hookurl];
		if((o.UserId===uid) && (o.hookname===hookname)) return o;
	}
}