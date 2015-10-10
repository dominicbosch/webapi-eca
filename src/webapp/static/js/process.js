'use strict';

$(document).ready(function() {

	var svg = d3.select('#processes-svg'),
		margin = {top: 20, right: 50, bottom: 30, left: 50},
		width = parseFloat(svg.style('width'))-margin.left-margin.right,
		height = parseFloat(svg.style('height'))-margin.top-margin.bottom,
		memMax = 0, cpuMax = 0, 
		scaleX, scaleY;

	var canvas = svg.append('g')
		.attr('transform', 'translate('+margin.left+','+margin.top+')');

	var username = svg.attr('data-user');
	var isAdmin = svg.attr('data-admin') === 'true';

	var formatMBs = (d) => d3.format(',.0f')(d/1024/1024);

	function getValue(d, arr) {
		for(let i = 0; i < arr.length; i++) {
			d = d[arr[i]];
		}
		return d;
	}
	function lineFunc(arrProperty) {
		return d3.svg.line()
			.x((d) => scaleX(d.timestamp))
			.y((d) => scaleY(getValue(d, arrProperty)))
			.interpolate('basis-open'); // cardinal|basis-open|step
	}

	function interpolateCPU(d) { return d*memMax/cpuMax }
	function lineCPU(arrProperty) {
		return d3.svg.line()
			.x((d) => scaleX(d.timestamp))
			.y((d) => scaleY(interpolateCPU(getValue(d, arrProperty))))
			.interpolate('basis-open'); // cardinal|basis-open
	}
	function displayUser(arrData) {
		// Relink the array so the path gets linked right
		let arr = arrData.splice(arrData.index+1);
		let a = arrData = arr.concat(arrData);

		memMax = d3.max(
			arrData.map((d) => [d.heapTotal.max, d.heapUsed.max, d.rss.max]),
			(d) => d3.max(d)
		);
		cpuMax = d3.max(arrData, (d) => d.loadavg.max);
		scaleX = d3.time.scale().range([0, width])
			.domain([a[0].timestamp, a[a.length-1].timestamp]);
		scaleY = d3.scale.linear().range([height, 0])
			.domain([0, memMax]);
		let scaleYCPU = d3.scale.linear().range([height, 0])
			.domain([0, cpuMax]);
		let xAxis = d3.svg.axis().scale(scaleX);//.orient('bottom'),
		let yAxis = d3.svg.axis().scale(scaleY).tickFormat(formatMBs).orient('right');
		let yAxisCPU = d3.svg.axis().scale(scaleYCPU)
			.tickFormat(d3.format('%.0')).orient('left');

		canvas.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,'+height+')')
				.text('Time')
			.call(xAxis);

		canvas.append('g')
			.attr('transform', 'translate('+width+',0)')
			.attr('class', 'y axis')
			.call(yAxis)
			.append('text')
				.attr('transform', 'translate(30,20)rotate(-90)')
				.style('text-anchor', 'end')
				.text('Memory Usage (MB)');

		canvas.append('g')
			.attr('class', 'y axis load')
			.call(yAxisCPU)
			.append('text')
				.attr('transform', 'translate(-40,20)rotate(-90)')
				.style('text-anchor', 'end')
				.text('CPU Usage (%)');

		 // stroke-dasharray='5,5' d='M5 20 l215 0' />
		 //    <path stroke-dasharray='10,10' d='M5 40 l215 0' />
		 //    <path stroke-dasharray='20,10,5,5,5,10'

		canvas.append('path').datum(a)
			.attr('class', 'line heapTotal')
			.attr('stroke-linecap', 'round')
			.attr('d', lineFunc(['heapTotal', 'avg']));
		canvas.append('path').datum(a)
			.attr('class', 'line heapTotal')
			.attr('stroke-linecap', 'round')
			.attr('stroke-dasharray', '1,1')
			.attr('d', lineFunc(['heapTotal', 'min']));
		canvas.append('path').datum(a)
			.attr('class', 'line heapTotal')
			.attr('stroke-linecap', 'round')
			.attr('stroke-dasharray', '5,5')
			.attr('d', lineFunc(['heapTotal', 'max']));

		canvas.append('path').datum(a)
			.attr('class', 'line heapUsed')
			.attr('stroke-linecap', 'round')
			.attr('d', lineFunc(['heapUsed', 'avg']));
		canvas.append('path').datum(a)
			.attr('class', 'line heapUsed')
			.attr('stroke-linecap', 'round')
			.attr('stroke-dasharray', '1,1')
			.attr('d', lineFunc(['heapUsed', 'min']));
		canvas.append('path').datum(a)
			.attr('class', 'line heapUsed')
			.attr('stroke-linecap', 'round')
			.attr('stroke-dasharray', '5,5')
			.attr('d', lineFunc(['heapUsed', 'max']));

		canvas.append('path').datum(a)
			.attr('class', 'line rss')
			.attr('stroke-linecap', 'round')
			.attr('d', lineFunc(['rss', 'avg']));
		canvas.append('path').datum(a)
			.attr('class', 'line rss')
			.attr('stroke-linecap', 'round')
			.attr('stroke-dasharray', '1,1')
			.attr('d', lineFunc(['rss', 'min']));
		canvas.append('path').datum(a)
			.attr('class', 'line rss')
			.attr('stroke-linecap', 'round')
			.attr('stroke-dasharray', '5,5')
			.attr('d', lineFunc(['rss', 'max']));

		canvas.append('path').datum(a)
			.attr('class', 'line load')
			.attr('stroke-linecap', 'round')
			.attr('d', lineCPU(['loadavg', 'avg']));
		canvas.append('path').datum(a)
			.attr('class', 'line load')
			.attr('stroke-linecap', 'round')
			.attr('stroke-dasharray', '1,1')
			.attr('d', lineCPU(['loadavg', 'min']));
		canvas.append('path').datum(a)
			.attr('class', 'line load')
			.attr('stroke-linecap', 'round')
			.attr('stroke-dasharray', '5,5')
			.attr('d', lineCPU(['loadavg', 'max']));

	}

	var fb = new Firebase('https://boiling-inferno-7829.firebaseio.com/');
	fb.child('webapi-eca-laptop').once('value', function(snapshot) {
		displayUser(snapshot.val()[username].data);
	});
});
