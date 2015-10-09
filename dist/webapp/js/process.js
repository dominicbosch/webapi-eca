'use strict';

$(document).ready(function() {

	var margin = {top: 20, right: 20, bottom: 30, left: 80},
		width = 960 - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;

	// var parseDate = d3.time.format('%d-%b-%y').parse;

	var svg = d3.select('#processes-svg')
		.attr('width', width + margin.left + margin.right)
		.attr('height', height + margin.top + margin.bottom)
		.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	var username = svg.attr('data-user');
	var isAdmin = svg.attr('data-admin') === 'true';

	console.log(username, isAdmin);


	var fb = new Firebase('https://boiling-inferno-7829.firebaseio.com/');
	fb.child('webapi-eca-laptop').once('value', function(snapshot) {
		var oSnap = snapshot.val();
		console.log(oSnap);
		var arrUsernames = Object.keys(oSnap);

		var arrtime = [];
		for(let el in oSnap) {

			// Relink the array so the path gets linked right
			let arr = oSnap[el].data.splice(oSnap[el].index+1);
			let a = oSnap[el].data = arr.concat(oSnap[el].data);

			let i = 0
			let step = 1;
			// let step = a.length % 100;
			let arrDisplay = [];
			while(i < a.length) {
				arrDisplay.push(a[i]);
				i += step;
			}
			arrtime.push(a[0].timestamp);
			arrtime.push(a[a.length-1].timestamp);

			svg.append('path').attr('class', 'line').datum(arrDisplay);
			// svg.append('path').attr('class', 'line').datum(a);
			// updateUserGraph(el, graph);
		}


 // stroke-dasharray='5,5' d='M5 20 l215 0' />
 //    <path stroke-dasharray='10,10' d='M5 40 l215 0' />
 //    <path stroke-dasharray='20,10,5,5,5,10'


	var maxMem = isAdmin ? 200 : 20;
	var x = d3.time.scale().range([0, width]).domain(d3.extent(arrtime)),
		y = d3.scale.linear().range([height, 0]).domain([0, maxMem*1024*1024]),
		xAxis = d3.svg.axis().scale(x),//.orient('bottom'),
		yAxis = d3.svg.axis().scale(y).orient('left');

	svg.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0,' + height + ')')
		.text('Time')
		.call(xAxis);

	svg.append('g')
		.attr('class', 'y axis')
		.call(yAxis)
		.append('text')
		.attr('transform', 'rotate(-90)')
		.attr('y', 6)
		.attr('dy', '.71em')
		.style('text-anchor', 'end')
		.text('Memory Usage');

		console.log(arrtime);
		// x.domain(d3.extent(arrtime));
		console.log(d3.extent(arrtime));
		console.log(x);

	var line = d3.svg.line()
		.x(function(d) { return x(d.timestamp); })
		.y(function(d) { return y(d.memory.heapUsed); })
		// .interpolate('step');
		// .interpolate('cardinal');
		.interpolate('basis-open');
		// .y(function(d) { return y(d.memory.heapUsed); });

		d3.selectAll('path.line').attr('d', line);
	});
	// function updateUserGraph(username, graph) {

	// 	fb.child('webapi-eca-laptop/'+username+'/latest').on('value', function(latest) {
	// 		var oData = latest.val();
	// 		// x.domain(d3.extent(arrtime.concat([oSnap.timestamp])));
	// 		var dat = graph.datum();
	// 		dat.push(oData);
	// 		graph.datum(dat)
	// 			.transition().duration(10100).ease('linear')
	// 			.attr('d', line);
	// 	});
	// }
});
