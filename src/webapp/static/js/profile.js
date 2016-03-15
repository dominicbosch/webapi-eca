function fOnLoad() {
	function comparePWs() {	
		var pn = $('#pwnew').val();
		var pv = $('#pwnewverify').val();
		if(pn!=='' && pv !== '') {
			if(pn!==pv) {
				main.setInfo(false, "Passwords do not match!");
			} else {
				main.setInfo(true, "Passwords match!");
			}
		}
	}

	function submit() {
		if($('#pwnew').val() === $('#pwnewverify').val()) {	
			var op = CryptoJS.SHA3($('#pwcurrent').val(), {outputLength: 512});
			var np = CryptoJS.SHA3($('#pwnew').val(), {outputLength: 512});
			var data = {	
				oldpassword: op.toString(),
				newpassword: np.toString()
			};
			main.post('/service/user/passwordchange', data)
				.done(function(data) { main.setInfo(true, data) })
				.fail(function(err) { main.setInfo(false, err.responseText) });
		}
	}
	
	$('input').keypress(function(e) {
		if(e.which === 13) submit();
	});
	$('#pwnewverify').on('input', comparePWs);
	$('#pwnew').on('input', comparePWs);
	$('#submit').click(submit);

	// FIXME worker log needs to be deleted too
	main.post('/service/worker/get', { username: $('#log_col').attr('data-username') })
		.done(function(data) {
			d3.select('#log_col')
				.style('visibility', 'visible')
				.select('ul').selectAll('li').data(data.log.reverse())
					.enter().append('li').text(function(d) { return d })
		})
		.fail(function(err) { main.setInfo(false, err.responseText) });
}

	

window.addEventListener('load', fOnLoad, true);
