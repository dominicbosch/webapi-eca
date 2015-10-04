'use strict';

fOnLoad = () ->
	failHandler = ( err ) ->
		if err.status is 401
			window.location.href = '/'
		if err.responseText is ''
			err.responseText = 'No Response from Server!'
		main.setInfo false, err.responseText

	updateUserList = () ->
		$( '#users *' ).remove()
		$.post( '/service/user/getall' )
			.done ( arrUsers ) ->
				for name, oUser of arrUsers
					$( '#users' ).append $ """
						<tr>
							<td><img class="del" title="Delete User"
								src="/images/red_cross_small.png" data-userid="#{ oUser.id }" data-username="#{ oUser.username }"></td>
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

	updateUserList()

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

window.addEventListener 'load', fOnLoad, true
