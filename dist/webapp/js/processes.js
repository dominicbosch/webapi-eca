$(document).ready(function() {
	var svg = d3.select('#processes-svg');
	svg.size('600', '300');
	// svg.attr('width', '600').attr('height', '300');
	svg.append('circle').attr('r', '50').attr('cx', '50').attr('cy', '100');
	var myFirebaseRef = new Firebase("https://<YOUR-FIREBASE-APP>.firebaseio.com/");
	myFirebaseRef.child("location/city").on("value", function(snapshot) {
		console.log(snapshot.val());  // Alerts "San Francisco"
	});
});