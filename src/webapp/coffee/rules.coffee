'use strict';

fOnLoad = () ->
	fetchRules = () ->
		main.post('/service/rules/get')
			.done fUpdateRuleList
			.fail (err) ->
				main.setInfo false, 'Did not retrieve rules: '+err.responseText

	fUpdateRuleList = (data) ->
		console.log(data);
		$('#tableRules tr').remove()
		if data.length is 0
			parent = $('#tableRules').parent()
			$('#tableRules').remove()
			parent.append $ "<h3 class=\"empty\">You don't have any rules! 
				<a href=\"/views/rules_create\">Create One first!</a></h3>"
		else
			for ruleName in data
				$('#tableRules').append  $ """<tr>
					<td><img class="icon del" src="/images/del.png" title="Delete Rule"></td>
					<td><img class="icon edit" src="/images/edit.png" title="Edit Rule"></td>
					<td><img class="icon log" src="/images/log.png" title="Show Rule Log"></td>
					<td><div>#{ ruleName }</div></td>
				</tr>"""

	fetchRules()

	$('#tableRules').on 'click', '.del', () ->
		ruleName = $('div', $(this).closest('tr')).text()
		if confirm  "Do you really want to delete the rule '#{ ruleName }'?"
			$('#log_col').text ""
			data =
				body: JSON.stringify
					id: ruleName
			main.post('/usercommand/delete_rule', data)
				.done fetchRules
				.fail (err) ->
					main.setInfo false, 'Could not delete rule: '+err.responseText

	$('#tableRules').on 'click', '.edit', () ->
		ruleName = $('div', $(this).closest('tr')).text()
		window.location.href = 'forge?page=forge_rule&id=' + encodeURIComponent ruleName

	$('#tableRules').on 'click', '.log', () ->
		console.warn 'TODO open div over whole page with log in editor'
		ruleName = $('div', $(this).closest('tr')).text()
		data =
			body: JSON.stringify
				id: ruleName
		main.post('/usercommand/get_rule_log', data)
			.done (data) ->
				ts = (new Date()).toISOString()
				log = data.message.replace new RegExp("\n", 'g'), "<br>"
				$('#log_col').html "<h3>#{ ruleName } Log:</h3> <i>(updated UTC|#{ ts })</i><br/><br/>#{ log }"
			.fail (err) ->
				main.setInfo false, 'Could not get rule log: '+err.responseText

window.addEventListener 'load', fOnLoad, true
