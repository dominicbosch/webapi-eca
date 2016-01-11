'use strict';

strPublicKey = ''

# Load public key for encryption
main.post('/service/session/publickey')
	.done (key) -> strPublicKey = key
	.fail (err) -> main.setInfo false, 'Unable to fetch public key for encryption'

updateModules = (uid) ->
	d3.select('#moduleparams').style('visibility', 'hidden')
	req = main.post('/service/eventtrigger/get')
	req.done ( arrModules ) ->
		if arrModules.length is 0
			parent = $('#tableModules').parent()
			$('#tableModules').remove()
			parent.append $ "<h3 class=\"empty\">No <b>Event Triggers</b> available!
				<a href=\"/views/modules_create?m=et\">Create One first!</a></h3>"
		else
			tr = d3.select('#tableModules tbody').selectAll('tr')
				.data(arrModules, (d) -> d.id);
			tr.exit().remove();
			trNew = tr.enter().append('tr');
			trNew.append('td').each (d) ->
				if d.UserId is uid
					d3.select(this).append('img')
						.attr('class', 'icon del')
						.attr('src', '/images/del.png')
						.attr('title', 'Delete Module')
						.on('click', deleteModule);
			trNew.append('td').append('img')
				.attr('class', 'icon edit')
				.attr('src', '/images/edit.png')
				.attr('title', 'Edit Module')
				.on 'click', (d) ->
					window.location.href = 'modules_create?m=et&id='+d.id

			trNew.append('td').append('div').text((d) -> d.name).each (d) ->
				if d.comment then main.registerHoverInfoHTML d3.select(this), d.comment
			trNew.append('td').text((d) -> d.User.username)

	req.fail ( err ) ->
		main.setInfo false, 'Error in fetching all Modules: ' + err.responseText

deleteModule = (d) ->
	if confirm 'Do you really want to delete the Module "'+d.name+'"?'
		main.post('/service/eventtrigger/delete', { id: d.id })
			.done () ->
				main.setInfo true, 'Action Dispatcher deleted!', true
				updateModules(parseInt(d3.select('body').attr('data-uid')))
			.fail (err) ->
				main.setInfo false, err.responseText 

startStopModule = (d) ->
	if d.Schedule.running 
		d3.select('#moduleparams').style('visibility', 'hidden')
		sendStartStopCommand d, 'stop'
	else
		arr = Object.keys(d.globals)
		d3.select('#moduleparams tbody').selectAll('tr').remove();
		if arr.length is 0
			d3.select('#moduleparams tbody').append('tr')
				.append('td').classed('consoled', true).text('No parameters required')
		else
			newTr = d3.select('#moduleparams tbody').selectAll('tr').data(arr).enter().append('tr')
			newTr.append('td').text (d) -> d
			newTr.append('td').append('input').attr('type', (nd) -> if d.globals[nd] then 'password' else 'text')
				.on 'change', () -> d3.select(this).attr('changed', 'yes')
		d3.select('#moduleparams button').attr('onclick', 'start('+d.id+')')
		d3.select('#moduleparams').style('visibility', 'visible')

start = (id) ->
	data = d3.select('#ico'+id).data()[0]
	try
		globals = {}
		d3.selectAll('#moduleparams input').each (d) ->
			d3This = d3.select(this)
			val = d3This.node().value
			if val is ''
				d3This.node().focus()
				throw new Error('Please enter a value in all required fields!')
			if data.globals[d] && d3This.attr('changed') is 'yes'
				val = cryptico.encrypt(val, strPublicKey).cipher
			globals[d] = val
		sendStartStopCommand data, 'start', globals
	catch err
		main.setInfo false, err.message

sendStartStopCommand = (d, action, data) ->
	d3.select('#moduleparams').style('visibility', 'hidden')
	req = main.post('/service/eventtrigger/'+action+'/'+d.id, data)
	req.done () ->
		action = if d.Schedule.running then 'stopped' else 'started'
		d.Schedule.running = !d.Schedule.running;
		updatePlayButton d3.select('#ico'+d.id)
		main.setInfo true, 'Event Trigger '+action

	req.fail (err) ->
		action = if d.Schedule.running then 'stop' else 'start'
		main.setInfo false, 'Unable to '+action+' Event Trigger'

fOnLoad = () ->
	updateModules(parseInt(d3.select('body').attr('data-uid')))
	updateSchedules()

window.addEventListener 'load', fOnLoad, true

		# <div class="row">
		# 	<div class="col-xs-12" id="functionEmpty">
		# 		<h3 class="empty">No <b>Action Dispatchers</b> available! <a href="/views/modules_create?m=ad">Create one first!</a></h3>
		# 	</div>
		# 	<div class="col-md-5" id="functionList"></div>
		# 	<div class="col-md-7" id="selectedFunctions">
		# 		<h3>Selected Actions</h3>
		# 	</div>
		# </div>


updateSchedules = () ->
	req = main.post('/service/schedule/get')
	req.done (arrSchedules) ->
		if arrSchedules.length is 0
			parent = $('#tableModules').parent()
			$('#tableModules').remove()
			parent.append $ "<h3 class=\"empty\">No <b>Event Triggers</b> available!
				<a href=\"/views/modules_create?m=et\">Create One first!</a></h3>"
		else
			tr = d3.select('#tableModules tbody').selectAll('tr')
				.data(arrSchedules, (d) -> d.id);
			tr.exit().remove();
			trNew = tr.enter().append('tr');
			trNew.append('td').each (d) ->
				if d.UserId is uid
					d3.select(this).append('img')
						.attr('class', 'icon del')
						.attr('src', '/images/del.png')
						.attr('title', 'Delete Module')
						.on('click', deleteModule);
			trNew.append('td').append('img')
				.attr('class', 'icon edit')
				.attr('src', '/images/edit.png')
				.attr('title', 'Edit Module')
				.on 'click', (d) ->
					window.location.href = 'modules_create?m=et&id='+d.id

			trNew.append('td').append('div').text((d) -> d.name).each (d) ->
				if d.comment then main.registerHoverInfoHTML d3.select(this), d.comment
			trNew.append('td').text((d) -> d.User.username)

	req.fail ( err ) ->
		main.setInfo false, 'Error in fetching all Modules: ' + err.responseText

	# <h3 class="empty">No <b>Schedules</b> available! <a href="/views/schedule_create">Create one first!</a></h3>

# TODO 

# txt = $('#inp_schedule').val()
# schedule = later.parse.text(txt)
# if schedule.error > -1
# 	throw new Error('You have an error in your schedule!')
# obj.schedule = {
# 	text: txt,
# 	arr: schedule.schedules
# };

# $('#schedule').show()

# $('#inp_schedule').val(oMod.Schedule.text)
# $('#inp_schedule').addClass('readonly')
# 	.attr('readonly', true).attr('disabled', true)


# img = trNew.append('td').append('img')
# 	.attr('id', (d) -> 'ico'+d.id)
# 	.attr('class', (d) -> 'icon edit')
# 	.on('click', startStopModule);
# updatePlayButton img
# trNew.append('td').attr('class','consoled mediumfont')
# 	.text((d) -> d.Schedule.schedule)

# updatePlayButton = (d3This) ->
# 	d3This.attr('src', (d) -> '/images/'+(if d.Schedule.running then 'pause' else 'play')+'.png')
# 		.attr('title', (d) -> if d.Schedule.running then 'Stop Module' else 'Start Module')
