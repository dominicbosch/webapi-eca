'use strict';

fOnLoad = () ->
	failHandler = ( err ) ->
		if err.status is 401
			window.location.href = '/'
		if err.responseText is ''
			err.responseText = 'No Response from Server!'
		main.setInfo false, err.responseText

	updateUserList = () ->
		d3.selectAll('#users *').remove()
		$.post( '/service/user/getall' )
			.done ( arrUsers ) ->
				for name, oUser of arrUsers
					$( '#users' ).append $ """
						<tr>
							<td><div class="del" title="Delete User" data-userid="#{ oUser.id }" data-username="#{ oUser.username }"></div></td>
							<td>#{ if oUser.isAdmin then '<img title="Administrator"
								src="/images/admin.png">' else '' }</td>
							<td class="highlight">#{ oUser.username }</td>
							<td>Change Password:</td>
							<td><input type="password" data-userid="#{ oUser.id }" data-username="#{ oUser.username }"></td>
						</tr>
					"""

				$( '#users .del' ).click () ->
					if confirm 'Do you really want to delete user "' + $(this).attr('data-username')  + '"' 
						data = 
							userid: $(this).attr('data-userid')
							username: $(this).attr('data-username')
						$.post( '/service/admin/deleteuser', data )
							.done ( msg ) ->
								main.setInfo true, msg
								updateUserList()
							.fail failHandler

				$( '#users input' ).keypress ( e ) ->
					if e.which is 13
						if confirm 'Do you really want to change user "'+$(this).attr('data-username')+'"\'s password?' 
							hp = CryptoJS.SHA3 $(this).val(), outputLength: 512
							data = 
								userid: $(this).attr('data-userid')
								newpassword: hp.toString()
							$.post( '/service/user/forcepasswordchange', data )
								.done ( msg ) ->
									main.setInfo true, msg
								.fail failHandler

	requestModuleList = () ->
		$.post( '/service/modules/get' )
			.done updateModuleList

	updateModuleList = ( arrModules ) ->
		dMods = d3.select '#modules'
		dMods.selectAll('*').remove()
		for name, oModule of arrModules
			tr = dMods.append 'tr'
			tr.append('td').append('input')
				.attr('type', 'checkbox').attr('title', 'Allowed')
				.attr('data-module', oModule.name).property 'checked', oModule.allowed

			tr.append('td').classed('highlight', true).text oModule.name
			tr.append('td').classed('highlight', true).text '('+oModule.version+')'
			tr.append('td').text oModule.description

		$( '#modules input' ).click () ->
			dThis = d3.select this
			strAllowed = if dThis.property('checked') then 'allow' else 'forbid'
			if confirm 'Are you sure you want to ' + strAllowed + ' the module "' + dThis.attr('data-module')  + '"?' 
				$.post('/service/modules/'+strAllowed,  module: dThis.attr('data-module'))
					.done (msg) ->
						main.setInfo true, msg
						requestModuleList()
					.fail (err) ->
						dThis.property 'checked', not dThis.property 'checked'
						failHandler(err)


	updateUserList()
	requestModuleList()

	$( '#but_submit' ).click () ->
		hp = CryptoJS.SHA3 $( '#pw' ).val(), outputLength: 512
		data = 
			username: $( '#user' ).val()
			password: hp.toString()
			isAdmin: $( '#admin' ).is ':checked'

		$.post( '/service/admin/createuser', data )
			.done ( msg ) ->
				main.setInfo true, msg
				updateUserList()
			.fail failHandler

	$('#refresh').click () ->
		d3.select('#refresh').classed 'spin', true

		$.post('/service/modules/reload')
			.done ( arrModules ) ->
				updateModuleList arrModules
				main.setInfo true, 'Allowed Modules list updated!'
				d3.select('#refresh').classed 'spin', false
			.fail (err) ->
				d3.select('#refresh').classed 'spin', false
				failHandler err
window.addEventListener 'load', fOnLoad, true
