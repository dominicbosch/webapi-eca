'use strict';

fOnLoad = () ->
	fErrHandler = (errMsg) ->
		(err) ->
			if err.status is 401
				window.location.href = '/'
			else
				$('#log_col').text ""
				fDelayed = () ->
					if err.responseText is ''
						msg = 'No Response from Server!'
					else
						try
							oErr = JSON.parse err.responseText
							msg = oErr.message
					$('#info').text errMsg + msg
					$('#info').attr 'class', 'error'
				setTimeout fDelayed, 500

	fFetchRules = () ->
		$.post('/service/rules/getall')
			.done fUpdateRuleList
			.fail fErrHandler 'Did not retrieve rules! '

	fUpdateRuleList = (data) ->
		$('#tableRules tr').remove()
		if data.length is 0
			$('#tableRules').html '<tr><td><h4>You don\'t have any rules!</h4></td></tr>'
		else
			for ruleName in data
				$('#tableRules').append  $ """<tr>
					<td><img class="del" title="Delete Rule" src="images/red_cross_small.png"></td>
					<td><img class="edit" title="Edit Rule" src="images/edit.png"></td>
					<td><img class="log" title="Show Rule Log" src="images/logicon.png"></td>
					<td><div>#{ ruleName }</div></td>
				</tr>"""

	fFetchRules()

	$('#tableRules').on 'click', 'img.del', () ->
		ruleName = $('div', $(this).closest('tr')).text()
		if confirm  "Do you really want to delete the rule '#{ ruleName }'?"
			$('#log_col').text ""
			data =
				body: JSON.stringify
					id: ruleName
			$.post('/usercommand/delete_rule', data)
				.done fFetchRules
				.fail fErrHandler 'Could not delete rule! '

	$('#tableRules').on 'click', 'img.edit', () ->
		ruleName = $('div', $(this).closest('tr')).text()
		window.location.href = 'forge?page=forge_rule&id=' + encodeURIComponent ruleName

	$('#tableRules').on 'click', 'img.log', () ->
		console.warn 'TODO open div over whole page with log in editor'
		ruleName = $('div', $(this).closest('tr')).text()
		data =
			body: JSON.stringify
				id: ruleName
		$.post('/usercommand/get_rule_log', data)
			.done (data) ->
				ts = (new Date()).toISOString()
				log = data.message.replace new RegExp("\n", 'g'), "<br>"
				$('#log_col').html "<h3>#{ ruleName } Log:</h3> <i>(updated UTC|#{ ts })</i><br/><br/>#{ log }"
			.fail fErrHandler 'Could not get rule log! '

window.addEventListener 'load', fOnLoad, true
