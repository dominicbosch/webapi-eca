'use strict';


fOnLoad = () ->
	fetchRules = () ->
		main.post('/service/rules/get')
			.done fUpdateRuleList
			.fail (err) ->
				main.setInfo false, 'Did not retrieve rules: '+err.responseText

	fUpdateRuleList = (data) ->
		console.log(data)
		if data.length is 0			
			d3.select('#hasnorules').style('display', 'block');
			d3.select('#hasrules').style('display', 'none');
		else
			d3.select('#hasnorules').style('display', 'none');
			d3.select('#hasrules').style('display', 'block');
			d3div = d3.select('#tableRules');
			d3tr = d3div.select('table').selectAll('tr').data(data, (d) -> d.id);
			d3tr.exit().transition().style('opacity', 0).remove();
			d3newTrs = d3tr.enter().append('tr');
			d3newTrs.append('td').append('img')
				.attr('class', 'icon del')
				.attr('src', '/images/del.png')
				.attr('title', 'Delete Rule')
				.on('click', deleteRule);
			d3newTrs.append('td').append('img')
				.attr('class', 'icon edit')
				.attr('src', '/images/edit.png')
				.attr('title', 'Edit Rule')
				.on('click', editRule);
			d3newTrs.append('td').append('img')
				.attr('class', 'icon log')
				.attr('src', '/images/log.png')
				.attr('title', 'Show Rule Log')
				.on('click', showLog);
			d3newTrs.append('td').append('img')
				.attr('class', 'icon log')
				.attr('src', '/images/bulk.png')
				.attr('title', 'Download Data Log')
				.on('click', showDataLog);
			d3newTrs.append('td').append('img')
				.attr('class', 'icon log')
				.attr('src', '/images/bulk_del.png')
				.attr('title', 'Delete Data Log')
				.on('click', clearDataLog);
			d3newTrs.append('td').text (d) -> d.name 

	fetchRules()

	deleteRule = (d) ->
		if confirm  "Do you really want to delete the rule '#{ d.name }'?"
			main.post('/service/rules/delete', { id: d.id })
				.done fetchRules
				.fail (err) ->
					main.setInfo false, 'Could not delete rule: '+err.responseText

	editRule = (d) ->
		window.location.href = 'rules_create?id='+d.id

	showLog = (d) ->
		main.post('/service/rules/getlog/'+d.id)
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
		window.location.href = '/service/rules/getdatalog/'+d.id

	clearLog = (d) ->
		main.post('/service/rules/clearlog/'+d.id)
			.done () ->
				main.setInfo true, 'Log deleted!'
				showLog(d)

	clearDataLog = (d) ->
		main.post('/service/rules/cleardatalog/'+d.id)
			.done () ->
				main.setInfo true, 'Data Log deleted!'

window.addEventListener 'load', fOnLoad, true
