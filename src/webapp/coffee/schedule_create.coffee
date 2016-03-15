'use strict';

strPublicKey = ''
arrSelectedActions = []

# ONLOAD
# ------
#
# When the document has loaded we really start to execute some logic
fOnLoad = () ->
	main.registerHoverInfo d3.select('#schedule'), 'schedule.html'

	# First we need to fetch a lot of stuff. If all promises fulfill eventually the rule gets loaded
	# TODO Yes we could move this above onLoad and also take the loading as a promise and then do all 
	# the other stuff in order to optimize document loading time. Let's do this another day ;)
	arrPromises = []
	addPromise = (url, thenFunc, failMsg) ->
		p = new Promise (resolve, reject) ->
			main.post(url)
				.done (dat) -> resolve dat
				.fail (err) -> reject new Error failMsg
		arrPromises.push p.then thenFunc

	# Load public key for encryption
	afterwards = (key) ->  strPublicKey = key
	addPromise '/service/session/publickey', afterwards,
		'Error when fetching public key. Unable to send user specific parameters securely!'

	# Load Actions
	addPromise '/service/eventtrigger/get', functions.fillList, 'Unable to fetch Event Triggers'

	# First we want to load all data, then we want to load a rule if the user edits one
	# finally we want to attach all the listeners on the document so it works properly
	Promise.all(arrPromises)
		.then () ->
			if oParams.id is undefined then return null;
			else return loadSchedule();
		.then functions.init(true, strPublicKey)
		.then attachListeners
		.then () ->
			$('#input_name').get(0).setSelectionRange(0,0);
			$('#input_name').focus()
		.catch (err) -> main.setInfo false, err.toString()


# Preload editting of a Rule
# -----------
loadSchedule = () ->
	return new Promise (resolve, reject) ->
		main.post('/service/schedule/get/'+oParams.id)
			.done (oSched) ->
				# Schedule Name
				$('#input_name').val oSched.name
				$('#input_schedule').val(oSched.text)

				functions.fillExisting([oSched.execute])
				
				d3.select('#mainbody h1').text('Update Schedule');
				resolve 'Schedule loaded'
			.fail () ->
				oParams.id = undefined
				main.setInfo false, 'Unable to edit this schedule since it is not existing!'
				resolve 'Schedule not loaded'


# LISTENERS
# ---------
attachListeners = () ->
	# SUBMIT
	$('#but_submit').click () ->
		main.clearInfo true
		try
			if $('#input_name').val() is ''
				$('#input_name').focus()
				throw new Error 'Please enter a Schedule name!'

			# Store all selected action dispatchers
			arrExecution = functions.getSelected()
			if arrExecution.length is 0
				throw new Error 'Please select an Event Trigger!'

			obj = 
				name: $('#input_name').val()
				execute: arrExecution[0]

			txt = $('#input_schedule').val()
			schedule = later.parse.text(txt)
			if schedule.error > -1
				throw new Error('You have an error in your schedule!')
			obj.schedule = {
				text: txt,
				arr: schedule.schedules
			};

			# User is creating a new rule
			if oParams.id is undefined
				cmd = 'create'
			else
				obj.id = oParams.id
				cmd = 'update'
			main.post('/service/schedule/'+cmd, obj)
				.done (msg) ->
					main.setInfo true, 'Schedule ' + if oParams.id is undefined then 'stored!' else 'updated!'
					setTimeout () ->
						window.location.href = 'list_et'
					, 500
				.fail (err) -> main.setInfo false, err.responseText

		catch err
			console.log err
			main.setInfo false, 'Error in upload: '+err.message


# Most stuff is happening after the document has loaded:
window.addEventListener 'load', fOnLoad, true



