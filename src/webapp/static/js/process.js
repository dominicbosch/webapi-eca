'use strict';

$(document).ready(function() {

	var selectBox = d3.select('#usernames'),
		button = d3.select('#workerbutton'),
		svg = d3.select('#processes-svg'),
		margin = {top: 20, right: 50, bottom: 50, left: 50},
		width = parseFloat(svg.style('width'))-margin.left-margin.right,
		height = parseFloat(svg.style('height'))-margin.top-margin.bottom,
		memMax = 0, cpuMax = 0, 
		xAxis, yAxis, yAxisCPU, scaleX, scaleY, arrData;

	var canvas = svg.append('g')
		.attr('transform', 'translate('+margin.left+','+margin.top+')');

	var gPath = svg.append('g')
		.attr('transform', 'translate('+margin.left+','+margin.top+')');

	var username = svg.attr('data-user');
	var isAdmin = svg.attr('data-admin') === 'true';


	var formatMBs = function(d) { return d3.format(',.0f')(d/1024/1024) };

	function getValue(d, arr) {
		for(var i = 0; i < arr.length; i++) {
			d = d[arr[i]];
		}
		return d;
	}
	function lineFunc(arrProperty) {
		return d3.svg.line()
			.x(function(d){ return scaleX(d.timestamp) })
			.y(function(d){ return scaleY(getValue(d, arrProperty)) })
			.interpolate('basis'); // cardinal|basis-open|step
	}

	function interpolateCPU(d) { return d*memMax/cpuMax }
	function lineCPU(arrProperty) {
		return d3.svg.line()
			.x(function(d){ return scaleX(d.timestamp) })
			.y(function(d){ return scaleY(interpolateCPU(getValue(d, arrProperty))) })
			.interpolate('basis'); // cardinal|basis-open
	}
	function appendLineToGraph(type, pathFunc, dash) {
		gPath.append('path')
			.attr('class', 'line '+type)
			.attr('stroke-linecap', 'round')
			.attr('stroke-dasharray', dash);
	}

	appendLineToGraph('heapTotal avg', lineFunc(['heapTotal', 'avg']));
	appendLineToGraph('heapTotal min', lineFunc(['heapTotal', 'min']), '1,1');
	appendLineToGraph('heapTotal max', lineFunc(['heapTotal', 'max']), '5,5');

	appendLineToGraph('heapUsed avg', lineFunc(['heapUsed', 'avg']));
	appendLineToGraph('heapUsed min', lineFunc(['heapUsed', 'min']), '1,1');
	appendLineToGraph('heapUsed max', lineFunc(['heapUsed', 'max']), '5,5');

	appendLineToGraph('rss avg', lineFunc(['rss', 'avg']));
	appendLineToGraph('rss min', lineFunc(['rss', 'min']), '1,1');
	appendLineToGraph('rss max', lineFunc(['rss', 'max']), '5,5');

	if(isAdmin) {
		appendLineToGraph('load avg', lineCPU(['loadavg', 'avg']));
		appendLineToGraph('load min', lineCPU(['loadavg', 'min']), '1,1');
		appendLineToGraph('load max', lineCPU(['loadavg', 'max']), '5,5');

		canvas.append('g')
			.attr('class', 'y axis load')
			.append('text')
				.attr('transform', 'translate(-40,20)rotate(-90)')
				.style('text-anchor', 'end')
				.text('CPU Usage (%)');
	} else {
		d3.selectAll('span.legend.load').style('display', 'none');
	}

	canvas.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0,'+height+')')
		.append('text')
			.text('Time').attr('class', 'label');

	canvas.append('g')
		.attr('class', 'y axis mem')
		.append('text')
			.attr('transform', 'translate(30,20)rotate(-90)')
			.style('text-anchor', 'end')
			.text('Memory Usage (MB)');


	function displayUser(arr) {
		arrData = arr;
		// Relink the array so the path gets linked right

		memMax = d3.max(
			arrData.map(function(d){ return [d.heapTotal.max, d.heapUsed.max, d.rss.max] }),
			function(d){ return d3.max(d) }
		);
		cpuMax = d3.max(arrData, function(d){ return d.loadavg.max });
		scaleX = d3.time.scale().range([0, width])
			.domain([arrData[0].timestamp, arrData[arrData.length-1].timestamp]);

		scaleY = d3.scale.linear().range([height, 0])
			.domain([0, memMax]);

		var scaleYCPU = d3.scale.linear().range([height, 0])
			.domain([0, cpuMax]);

		xAxis = d3.svg.axis().scale(scaleX);//.orient('bottom'),
		yAxis = d3.svg.axis().scale(scaleY).tickFormat(formatMBs).orient('right');
		yAxisCPU = d3.svg.axis().scale(scaleYCPU)
			.tickFormat(d3.format('%.0')).orient('left');

		updateGraph();
	}
	
	function updateButton() {
		console.log('updating button');
		$.post('/service/user/worker/get', { username: selectBox.node().value })
			.done(function(oWorker) {
				if(oWorker) {
					if(oWorker.pid) button.attr('disabled', null);
					else button.text('Stop Worker');
				}
			});
	}
	button.on('click', function(el) {
		button.attr('disabled', 'disabled');
		if(button.text() === 'Stop Worker') {
			$.post('/service/user/worker/kill', { username: selectBox.node().value })
				.done(() => updateButton())
				.fail(() => updateButton());
		} else {
			button.text('Stop Worker');
		}
	});

	var fb = new Firebase('https://boiling-inferno-7829.firebaseio.com/');
	fb.child('webapi-eca-laptop').once('value', function(snapshot) {
		let oData = snapshot.val();
		for(let prop in oData) {
			let arr = oData[prop].data;
			oData[prop].data = arr.splice(arr.index+1).concat(arr);
			selectBox.append('option').attr('value', prop).text(prop);
		}
		selectBox.on('change',(el) => {
			button.attr('disabled', 'disabled');
			updateButton();
			displayUser(oData[selectBox.node().value].data)
		});
		displayUser(oData[username].data);
		
		if(isAdmin) selectBox.style('display', 'inline');

	});

	function updateGraph() {
		width = parseFloat(svg.style('width'))-margin.left-margin.right;
		scaleX.range([0, width]);
		xAxis.scale(scaleX);
		
		gPath.selectAll('path').datum(arrData);

		d3.selectAll('.x.axis').transition().call(xAxis)
			.selectAll('text.label').attr('transform', 'translate('+width/2+',40)');

		d3.selectAll('.y.axis.mem').transition().call(yAxis).attr('transform', 'translate('+width+',0)');
		d3.selectAll('.y.axis.load').transition().call(yAxisCPU);

		d3.selectAll('path.heapTotal.avg').transition().attr('d', lineFunc(['heapTotal', 'avg']));
		d3.selectAll('path.heapTotal.min').transition().attr('d', lineFunc(['heapTotal', 'min']));
		d3.selectAll('path.heapTotal.max').transition().attr('d', lineFunc(['heapTotal', 'max']));

		d3.selectAll('path.heapUsed.avg').transition().attr('d', lineFunc(['heapUsed', 'avg']));
		d3.selectAll('path.heapUsed.min').transition().attr('d', lineFunc(['heapUsed', 'min']));
		d3.selectAll('path.heapUsed.max').transition().attr('d', lineFunc(['heapUsed', 'max']));

		d3.selectAll('path.rss.avg').transition().attr('d', lineFunc(['rss', 'avg']));
		d3.selectAll('path.rss.min').transition().attr('d', lineFunc(['rss', 'min']));
		d3.selectAll('path.rss.max').transition().attr('d', lineFunc(['rss', 'max']));

		d3.selectAll('path.load.avg').transition().attr('d', lineCPU(['loadavg', 'avg']));
		d3.selectAll('path.load.min').transition().attr('d', lineCPU(['loadavg', 'min']));
		d3.selectAll('path.load.max').transition().attr('d', lineCPU(['loadavg', 'max']));
	};
	window.onresize = updateGraph;
});
