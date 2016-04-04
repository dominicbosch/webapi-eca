'use strict';

let editor;
let strPublicKey = '';
let arrSelectedActions = [];

function setEditorReadOnly(isReadOnly) {
	editor.setReadOnly(isReadOnly);
	$('.ace_content').css('background', (isReadOnly ? '#BBB' : '#FFF'));
	$('#fill_example').toggle(!isReadOnly);
}

// ONLOAD
// ------
// 
// When the document has loaded we really start to execute some logic
// Most stuff is happening after the document has loaded:
window.addEventListener('load', function() {

	// First we need to fetch a lot of stuff. If all promises fulfill eventually the rule gets loaded
	// TODO Yes we could move this above onLoad and also take the loading as a promise and then do all 
	// the other stuff in order to optimize document loading time. Let's do this another day ;)
	let arrPromises = []
	function addPromise(url, thenFunc, failMsg) {
		let p = new Promise(function(resolve, reject) {
			main.post(url)
				.done(resolve)
				.fail(function(err) {
					reject(new Error(failMsg))
				});
		});
		arrPromises.push(p.then(thenFunc));
	}
	// Load public key for encryption
	function afterwards(key) { strPublicKey = key }
	addPromise('/service/session/publickey', afterwards,
		'Error when fetching public key. Unable to send user specific parameters securely!');

	// Load Webhooks
	addPromise('/service/webhooks/get', fillWebhooks, 'Unable to fetch Webhooks');

	// Load Actions
	function checkLength (arr) {	
		if(arr.length === 0) setEditorReadOnly(true);
		else functions.fillList(arr);
	}
	addPromise('/service/actiondispatcher/get', checkLength, 'Unable to fetch Action Dispatchers');

	// First we want to load all data, then we want to load a rule if the user edits one
	// finally we want to attach all the listeners on the document so it works properly
	Promise.all(arrPromises)
		.then(function() {	
			if(oParams.id === undefined) return null;
			else return loadRule();
		})
		.then(function() { functions.init(false, strPublicKey) })
		.then(attachListeners)
		.then(function() {	
			$('#input_name').get(0).setSelectionRange(0,0);
			$('#input_name').focus();
		})
		.catch(function(err) { main.setInfo(false, err.message) };

	editor = ace.edit('divConditionsEditor');
	editor.setTheme('ace/theme/crimson_editor');
	editor.setFontSize('14px');
	editor.getSession().setMode('ace/mode/json');
	editor.setShowPrintMargin(false);

	$('#editor_theme').change(function(el) { editor.setTheme('ace/theme/'+$(this).val()) });
	$('#editor_font').change(function(el) { editor.setFontSize($(this).val()) };
	$('#fill_example').click(function() {
		editor.setValue(`
			[
				{
					"selector": ".nested_property",
					"type": "string",
					"operator": "<=",
					"compare": "has this value"
				}
			]
		`);
		editor.gotoLine(1, 1);
	});

	main.registerHoverInfo(d3.select('#actiontitle'), 'modules_params.html');
	main.registerHoverInfo(d3.select('#conditionstitle'), 'conditions.html');

}, true);


// Preload editting of a Rule
// -----------
function loadRule() {
	return new Promise(function(resolve, reject) {	
		console.warn('TODO FIXME implement edit rules'); // FIXME
		main.post('/service/rules/get/'+oParams.id)
			.done(function(oRule) {

				// Rule Name
				$('#input_name').val(oRule.name);

				// Webhook
				d3.select('#selectWebhook option[value="'+oRule.WebhookId+'"]').attr('selected', true);

				// Conditions
				editor.setValue('\n'+(JSON.stringify(oRule.conditions, undefined, 2))+'\n');
				editor.gotoLine(1, 1);

				functions.fillExisting(oRule.actions);
							
				resolve('Rule loaded');
			.fail(reject);
		});
	});
}


// EVENT
// -----
function fillWebhooks(oHooks) {
	let prl = oHooks.private ? Object.keys(oHooks.private).length : 0;
	let pul = oHooks.public ? Object.keys(oHooks.public).length : 0;
	if(prl + pul === 0) {
		d3.select('#selectWebhook').append('h3').classed('empty', true)
			.html('No <b>Webhooks</b> available! <a href="/views/webhooks">Create one first!</a>');
		setEditorReadOnly(true);
	} else {
		let d3Sel = d3.select('#selectWebhook')
			.append('h3').text('Active Webhooks:')
			.append('select').attr('class','mediummarged smallfont');
		d3Sel.append('option').attr('value', -1).text('No Webhook selected');
		function createWebhookRow(oHook, owner) {
			let isSel = (oParams.webhook && oParams.webhook===oHook.hookurl) ? true : null;
			d3Sel.append('option').attr('value', oHook.id).attr('selected', isSel)
				.text(oHook.hookname+' ('+owner+')');
		}
		for(let i = 0; i < oHooks.private.length; i++) {
			createWebhookRow(oHooks.private[i], 'yours');
		}
		for(let i = 0; i < oHooks.public.length; i++) {
			createWebhookRow(oHooks.public[i], oHooks.public[i].User.username);
		}
	}
}

// LISTENERS
// ---------
function attachListeners() {

	// SUBMIT
	$('#but_submit').click(function() {
		main.clearInfo(true);
		try {
			if($('#input_name').val()==='') {
				$('#input_name').focus();
				throw new Error('Please enter a Rule name!');
			}
			let hurl = parseInt($('#selectWebhook select').val());
			if(hurl===-1) throw new Error('Please select a valid Webhook!');

			// Store all selected action dispatchers
			let arrActions = functions.getSelected();
			if(arrActions.length===0) throw new Error('Please select at least one action!');

			let arrConditions;
			try {
				arrConditions = JSON.parse editor.getValue()
			} catch(err) {
				throw new Error('Parsing of your conditions failed! Needs to be an Array of Strings!');
			}

			if(!(arrConditions instanceof Array)) {
				throw new Error('Conditions Invalid! Needs to be an Array of Objects!');
			}
			for(let i = 0; i < arrConditions.length; i++) {
				let el = arrConditions[i];
				if(!(el instanceof Object)) throw new Error('Conditions Invalid! Needs to be an Array of Objects!');
			}

			let obj = {
				name: $('#input_name').val(),
				hookurl: hurl,
				conditions: arrConditions,
				actions: arrActions
			};

			let cmd;
			// User is creating a new rule
			if(oParams.id===undefined) cmd = 'create';
			else {
				obj.id = oParams.id;
				cmd = 'update';
			}
			main.post('/service/rules/'+cmd, obj)
				.done(function(msg) {
					main.setInfo(true, 'Rule '+((oParams.id===undefined)?'stored!':'updated!'));
					oParams.id = msg.id;
					let wl = window.location;
					let newurl = wl.protocol+'//'+wl.host + wl.pathname + '?id='+msg.id;
					window.history.pushState({ path: newurl }, '', newurl);
				})
				.fail(function(err) { main.setInfo(false, err.responseText) });

		} catch(err) {
			main.setInfo(false, 'Error in upload: '+err.message);
		}

	}
}
