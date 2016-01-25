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
			parent.append $ "<h3 class=\"empty\">No <b>Event Trigger</b> available!
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
						.attr('title', 'Delete Event Trigger')
						.on('click', deleteModule);
			trNew.append('td').append('img')
				.attr('class', 'icon edit')
				.attr('src', '/images/edit.png')
				.attr('title', 'Edit Event Trigger')
				.on 'click', (d) ->
					window.location.href = 'modules_create?m=et&id='+d.id

			trNew.append('td').append('div').text((d) -> d.name).each (d) ->
				if d.comment then main.registerHoverInfoHTML d3.select(this), d.comment
			trNew.append('td').text((d) -> d.User.username)

	req.fail ( err ) ->
		main.setInfo false, 'Error in fetching all Event Triggers: ' + err.responseText

deleteModule = (d) ->
	if confirm 'Do you really want to delete the Event Trigger "'+d.name+'"? All running Schedules that use this Event Trigger will be deleted!'
		main.post('/service/eventtrigger/delete', { id: d.id })
			.done () ->
				main.setInfo true, 'Event Trigger deleted!', true
				updateModules(parseInt(d3.select('body').attr('data-uid')))
				updateSchedules()
			.fail (err) ->
				main.setInfo false, err.responseText 

startStopSchedule = (d) ->
	action = if d.running then 'stop' else 'start'
	req = main.post('/service/schedule/'+action+'/'+d.id)
	req.done () ->
		action = if d.running then 'stopped' else 'started'
		d.running = !d.running;
		updatePlayButton d3.select('#ico'+d.id)
		main.setInfo true, 'Schedule '+action
		setTimeout () -> 
			showLog(d)
		, 500

	req.fail (err) ->
		action = if d.running then 'stop' else 'start'
		main.setInfo false, 'Unable to '+action+' Schedule'

fOnLoad = () ->
	updateModules(parseInt(d3.select('body').attr('data-uid')))
	updateSchedules()

window.addEventListener 'load', fOnLoad, true


updateSchedules = () ->
	req = main.post('/service/schedule/get')
	req.done (arrSchedules) ->
		if arrSchedules.length is 0
			parent = $('#tableSchedules').parent()
			$('#tableSchedules').remove()
			parent.append $ "<h3 class=\"empty\">No <b>Schedules</b> available!
				<a href=\"/views/schedule_create\">Create One first!</a></h3>"
		else
			tr = d3.select('#tableSchedules tbody').selectAll('tr')
				.data(arrSchedules, (d) -> d.id);
			tr.exit().remove();
			trNew = tr.enter().append('tr');
			trNew.append('td').attr('class', 'jumping').each (d) -> 
				if d.error
					d3.select(this).append('img')
						.attr('src', '/images/exclamation.png')
						.attr('title', d.error);
			trNew.append('td').each (d) ->
				d3.select(this).append('img')
					.attr('class', 'icon del')
					.attr('src', '/images/del.png')
					.attr('title', 'Delete Schedule')
					.on('click', deleteSchedule);
			trNew.append('td').append('img')
				.attr('class', 'icon edit')
				.attr('src', '/images/edit.png')
				.attr('title', 'Edit Schedule')
				.on 'click', (d) ->
					window.location.href = 'schedule_create?id='+d.id

			trNew.append('td').append('img')
				.attr('class', 'icon log')
				.attr('src', '/images/log.png')
				.attr('title', 'Show Schedule Log')
				.on('click', showLog);
			trNew.append('td').append('img')
				.attr('class', 'icon log')
				.attr('src', '/images/bulk.png')
				.attr('title', 'Download Data Log')
				.on('click', showDataLog);
			trNew.append('td').append('img')
				.attr('class', 'icon log')
				.attr('src', '/images/bulk_del.png')
				.attr('title', 'Delete Data Log')
				.on('click', clearDataLog);
			img = trNew.append('td').append('img')
				.attr('id', (d) -> 'ico'+d.id)
				.attr('class', (d) -> 'icon edit')
				.on('click', startStopSchedule);
			updatePlayButton img
			trNew.append('td').append('div').text((d) -> d.name).each (d) ->
				if d.comment then main.registerHoverInfoHTML d3.select(this), d.comment
			trNew.append('td').attr('class','consoled mediumfont')
				.text((d) -> d.CodeModule.name+' -> '+d.execute.functions[0].name)
			trNew.append('td').attr('class','consoled mediumfont')
				.text((d) -> d.text)

updatePlayButton = (d3This) ->
	d3This.attr('src', (d) -> '/images/'+(if d.running then 'pause' else 'play')+'.png')
		.attr('title', (d) -> if d.running then 'Stop Schedule' else 'Start Schedule')

deleteSchedule = (d) ->
	if confirm 'Do you really want to delete the Schedule "'+d.name+'"?'
		main.post('/service/schedule/delete', { id: d.id })
			.done () ->
				main.setInfo true, 'Schedule deleted!', true
				updateSchedules()
			.fail (err) ->
				main.setInfo false, err.responseText

showLog = (d) ->
	main.post('/service/schedule/getlog/'+d.id)
		.done (arrLog) ->
			d3.select('#log_col').style('visibility','visible');
			d3.select('#log_col h3').text('Log file "'+d.name+'":');
			d3.selectAll('#log_col li').remove();
			d3tr = d3.select('#log_col ul').selectAll('li').data(arrLog);
			d3tr.enter().append('li').text((d) => d);
			d3.select('#log_col button').on 'click', () -> clearLog(d);
		.fail (err) ->
			main.setInfo false, 'Could not get rule log: '+err.responseText

showDataLog = (d) ->
	window.location.href = '/service/schedule/getdatalog/'+d.id

clearLog = (d) ->
	main.post('/service/schedule/clearlog/'+d.id)
		.done () ->
			main.setInfo true, 'Log deleted!'
			showLog(d)

clearDataLog = (d) ->
	if confirm 'Do you really want to delete all your gathered data?'
		main.post('/service/schedule/cleardatalog/'+d.id)
			.done () ->
				main.setInfo true, 'Data Log deleted!'
				showLog(d)
