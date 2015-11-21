'use strict';

urlService = '/service/'

if oParams.m is 'ad'
	urlService += 'actiondispatcher/'
	modName = 'Action Dispatcher'
else
	urlService += 'eventtrigger/'
	modName = 'Event Trigger'

updateModules = (uid) ->
	req = main.post(urlService+'get')
	req.done ( arrModules ) ->
		console.log(arrModules);
		if arrModules.length is 0
			parent = $('#tableModules').parent()
			$('#tableModules').remove()
			parent.append $ "<h3 class=\"empty\">No "+modName+"s available!
				<a href=\"/views/modules_create?m="+oParams.m+"\">Create One first!</a></h3>"
		else
			tr = d3.select('#tableModules tbody').selectAll('tr')
				.data(arrModules, (d) -> d.id);
			tr.exit().remove();
			trNew = tr.enter().append('tr');
			trNew.append('td').classed('smallpadded', true).each (d) ->
				if d.UserId is uid
					d3.select(this).append('img')
						.attr('class', 'icon del')
						.attr('src', '/images/del.png')
						.attr('title', 'Delete Module')
						.on('click', deleteModule);
			trNew.append('td').classed('smallpadded', true)
				.append('img')
					.attr('class', 'icon edit')
					.attr('src', '/images/edit.png')
					.attr('title', 'Edit Module')
					.on('click', editModule);
			trNew.append('td').classed('smallpadded', true)
				.append('div').text((d) -> d.name)
					.each (d) ->
						if d.comment then main.registerHoverInfoHTML d3.select(this), d.comment
			trNew.append('td').text((d) -> d.User.username)

	req.fail ( err ) ->
		main.setInfo false, 'Error in fetching all Modules: ' + err.responseText

deleteModule = (d) ->
	if confirm 'Do you really want to delete the Module "'+d.name+'"?'
		main.post(urlService+'delete', { id: d.id })
			.done () ->
				main.setInfo true, 'Action Dispatcher deleted!', true
				updateModules()
			.fail (err) ->
				main.setInfo false, err.responseText 

editModule = (d) ->
	if oParams.m is 'ad'
		window.location.href = 'modules_create?m=ad&id='+d.id
	else
		window.location.href = 'modules_create?m=et&id='+d.id

fOnLoad = () ->
	$('.moduletype').text modName
	$('#linkMod').attr 'href', '/views/modules_create?m=' + oParams.m

	updateModules(parseInt(d3.select('body').attr('data-uid')))

window.addEventListener 'load', fOnLoad, true


