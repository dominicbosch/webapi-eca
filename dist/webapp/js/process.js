'use strict';

$(document).ready(function() {
	main.post('/service/user/worker/memsize')
		.done(function(memsize) {
			console.log('Current memsize set to '+memsize+'MB')
		}).fail(function(e) {
			console.log(e);
		});

	var selectBox = d3.select('#usernames'),
		button = d3.select('#workerbutton'),
		svg = d3.select('#processes-svg'),
		margin = {top: 20, right: 50, bottom: 50, left: 50},
		width = parseFloat(svg.style('width'))-margin.left-margin.right,
		height = parseFloat(svg.style('height'))-margin.top-margin.bottom,
		memMax = 0, cpuMax = 0,
		suspendUpdates = false,
		xAxis, yAxis, yAxisCPU, scaleX, scaleY, allData;

	selectBox.on('change', (el) => {
		button.attr('disabled', 'disabled');
		updateButton();
		suspendUpdates = true;
		displayUser(selectBox.node().value);
	});

	button.on('click', function(el) {
		var cmd = (button.text() === 'Stop Worker') ? 'kill' : 'start'
		if(cmd==='start' || confirm('Do you really want to kill this process?')) {
			button.attr('disabled', 'disabled');
			main.post('/service/user/worker/state/'+cmd, { username: selectBox.node().value })
				.done(updateButton)
				.fail(function(err) {
					alert(err.responseText);
					button.attr('disabled', null);
				});
		}
	});

	var canvas = svg.append('g')
		.attr('transform', 'translate('+margin.left+','+margin.top+')');

	var gStates = canvas.append('g').attr('class', 'state');
	var gPath = canvas.append('g');

	var username = svg.attr('data-user');
	var isAdmin = svg.attr('data-admin') === 'true';
	var systemname = svg.attr('data-system');


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

	function lineCPU(arrProperty) {
		return d3.svg.line()
			.x(function(d){ return scaleX(d.timestamp) })
			.y(function(d){ return scaleY(getValue(d, arrProperty)*memMax/cpuMax) })
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
			.text('Time').attr('class', 'axislabel');

	canvas.append('g')
		.attr('class', 'y axis mem')
		.append('text')
			.attr('transform', 'translate(30,20)rotate(-90)')
			.style('text-anchor', 'end')
			.text('Memory Usage (MB)');

	gStates.append('g').attr('class', 'shutdown');
	gStates.append('g').attr('class', 'startup');

	function displayUser(username) {
		var oData = allData[username];
		var arrData = oData.data;

		var arrStartups = Object.keys(oData.startup || [])
			.map(function(key) { return oData.startup[key] });
		var arrShutdowns = Object.keys(oData.shutdown || [])
			.map(function(key) { return oData.shutdown[key] });
		var arrTs = arrData.map(function(d) { return d.timestamp })
			// .concat(arrStartups)
			// .concat(arrShutdowns)
			;
		// arrTs.push((new Date()).getTime());

		memMax = d3.max(
			arrData.map(function(d){ return [d.heapTotal.max, d.heapUsed.max, d.rss.max] }),
			function(d){ return d3.max(d) }
		);
		cpuMax = d3.max(arrData, function(d) { return d.loadavg.max });

		scaleX = d3.time.scale().range([0, width])
			.domain(d3.extent(arrTs));

		scaleY = d3.scale.linear().range([height, 0])
			.domain([0, memMax]);

		var scaleYCPU = d3.scale.linear().range([height, 0])
			.domain([0, cpuMax]);

		xAxis = d3.svg.axis().scale(scaleX);//.orient('bottom'),
		yAxis = d3.svg.axis().scale(scaleY).tickFormat(formatMBs).orient('right');
		yAxisCPU = d3.svg.axis().scale(scaleYCPU)
			.tickFormat(d3.format('%.0')).orient('left');

		// Display startups
		var d3s = d3.selectAll('.startup').selectAll('line').data(arrStartups);
		d3s.exit().remove();
		d3s.enter().append('line')
			.attr('x1', 0).attr('x2', 0).attr('y1', -15).attr('y2', height+5)
			.attr('transform', 'translate(-100,0)');

		d3s = d3.selectAll('.shutdown').selectAll('line').data(arrShutdowns);
		d3s.exit().remove();
		d3s.enter().append('line')
			.attr('x1', 0).attr('x2', 0).attr('y1', -5).attr('y2', height+15)
			.attr('transform', 'translate(-100,0)');
	
		gPath.selectAll('path').datum(arrData);
		updateGraph();
	}
	
	function updateButton() {
		main.post('/service/user/worker/get', { username: selectBox.node().value })
			.done(function(oWorker) {
				if(oWorker) {
					button.text((!oWorker.pid) ? 'Start Worker' : 'Stop Worker');
					if((oWorker.pid && button.text() === 'Stop Worker') 
					|| !oWorker.pid && button.text() === 'Start Worker') {
						button.attr('disabled', null);
					}
				}
			})//.fail(() => console.log('failed'));
	}
	function updateGraph() {
		width = parseFloat(svg.style('width'))-margin.left-margin.right;
		scaleX.range([0, width]);
		xAxis.scale(scaleX);

		var d3State;
		// If a new name is selected we want smooth axis transformation
		if(suspendUpdates) {
			d3State = d3.transition().duration(700)
				.each('end', function() { suspendUpdates = false; });
		} else {
			d3State = d3;
		}
		d3State.selectAll('.x.axis').call(xAxis)
			.selectAll('text.axislabel').attr('transform', 'translate('+width/2+',40)');

		d3State.selectAll('.y.axis.mem').call(yAxis).attr('transform', 'translate('+width+',0)');
		d3State.selectAll('.y.axis.load').call(yAxisCPU);

		d3.selectAll('path.heapTotal.avg').attr('d', lineFunc(['heapTotal', 'avg']));
		d3.selectAll('path.heapTotal.min').attr('d', lineFunc(['heapTotal', 'min']));
		d3.selectAll('path.heapTotal.max').attr('d', lineFunc(['heapTotal', 'max']));

		d3.selectAll('path.heapUsed.avg').attr('d', lineFunc(['heapUsed', 'avg']));
		d3.selectAll('path.heapUsed.min').attr('d', lineFunc(['heapUsed', 'min']));
		d3.selectAll('path.heapUsed.max').attr('d', lineFunc(['heapUsed', 'max']));

		d3.selectAll('path.rss.avg').attr('d', lineFunc(['rss', 'avg']));
		d3.selectAll('path.rss.min').attr('d', lineFunc(['rss', 'min']));
		d3.selectAll('path.rss.max').attr('d', lineFunc(['rss', 'max']));

		d3.selectAll('path.load.avg').attr('d', lineCPU(['loadavg', 'avg']));
		d3.selectAll('path.load.min').attr('d', lineCPU(['loadavg', 'min']));
		d3.selectAll('path.load.max').attr('d', lineCPU(['loadavg', 'max']));

		d3State.selectAll('g.state line').attr('transform', function(d) {
			return 'translate('+scaleX(d)+',0)'
		})
	};

	var fb = new Firebase('https://boiling-inferno-7829.firebaseio.com/');
	function fetchData(firsttime) {
		var firsttime = true;
		fb.child(systemname).on('value', function(snapshot) {
			if(!suspendUpdates) {
				allData = snapshot.val();
				var sel = selectBox.node().value || username;
				selectBox.selectAll('*').remove();
				for(var prop in allData) {
					var arr = allData[prop].data;
					// Relink the array so the path gets linked right
					allData[prop].data = arr.splice(arr.index+1).concat(arr);
					selectBox.append('option').attr('value', prop).text(prop);
				}
				selectBox.select('[value="'+sel+'"]').property('selected', true);
				displayUser(sel);
				
				if(isAdmin) selectBox.style('display', 'inline');
				if(firsttime) {
					window.onresize = updateGraph;
					updateButton();
					firsttime = false;
				}
				svg.style('visibility', 'visible');
				d3.selectAll('.loading').style('visibility', 'hidden');
			}
		});
	}
	fetchData(true);
});
