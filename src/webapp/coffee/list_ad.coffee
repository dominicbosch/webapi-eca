'use strict';

urlService = '/service/actiondispatcher'
strPublicKey = ''

# Load public key for encryption
main.post('/service/session/publickey')
	.done (key) -> strPublicKey = key
	.fail (err) -> main.setInfo false, 'Unable to fetch public key for encryption'

updateModules = (uid) ->
	d3.select('#moduleparams').style('visibility', 'hidden')
	req = main.post(urlService+'/get')
	req.done ( arrModules ) ->
		if arrModules.length is 0
			parent = $('#tableModules').parent()
			$('#tableModules').remove()
			parent.append $ "<h3 class=\"empty\">No Action Dispatchers available!
				<a href=\"/views/modules_create?m=ad\">Create One first!</a></h3>"
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
					window.location.href = 'modules_create?m=ad&id='+d.id

			trNew.append('td').append('div').text((d) -> d.name).each (d) ->
				if d.comment then main.registerHoverInfoHTML d3.select(this), d.comment
			trNew.append('td').text((d) -> d.User.username)

	req.fail ( err ) ->
		main.setInfo false, 'Error in fetching all Modules: ' + err.responseText

updatePlayButton = (d3This) ->
	d3This.attr('src', (d) -> '/images/'+(if d.Schedule.running then 'pause' else 'play')+'.png')
		.attr('title', (d) -> if d.Schedule.running then 'Stop Module' else 'Start Module')

deleteModule = (d) ->
	if confirm 'Do you really want to delete the Module "'+d.name+'"?'
		main.post(urlService+'/delete', { id: d.id })
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
	req = main.post(urlService+'/'+action+'/'+d.id, data)
	req.done () ->
		action = if d.Schedule.running then 'stopped' else 'started'
		d.Schedule.running = !d.Schedule.running;
		updatePlayButton d3.select('#ico'+d.id)
		main.setInfo true, 'Event Trigger '+action

	req.fail (err) ->
		action = if d.Schedule.running then 'stop' else 'start'
		main.setInfo false, 'Unable to '+action+' Event Trigger'

fOnLoad = () ->
	$('#linkMod').attr 'href', '/views/modules_create?m=ad'
	updateModules(parseInt(d3.select('body').attr('data-uid')))

window.addEventListener 'load', fOnLoad, true


