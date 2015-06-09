'use strict';

fOnLoad = () ->
	updateUserList = () ->
		$( '#users *' ).remove()
		$.post( '/service/user/getall' )
			.done ( arrUsers ) ->
				for user in arrUsers
					$( '#users' ).append $ """
						<tr>
							<td><img class="del" title="Delete User" src="/images/red_cross_small.png"></td>
							<td><kbd>#{ user }</kbd></td>
							<td>Change Password:</td>
							<td><input type="password"></td>
						</tr>
					"""
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
			.fail ( err ) ->
				if err.status is 401
					window.location.href = '/'
				if err.responseText is ''
					err.responseText = 'No Response from Server!'
				main.setInfo false, err.responseText

window.addEventListener 'load', fOnLoad, true
