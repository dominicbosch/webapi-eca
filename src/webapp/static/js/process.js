'use strict';

$(document).ready(function() {

	var margin = {top: 20, right: 20, bottom: 30, left: 50},
		width = 960 - margin.left - margin.right,
		height = 500 - margin.top - margin.bottom;

	// var parseDate = d3.time.format("%d-%b-%y").parse;

	var x = d3.time.scale().range([0, width]),
		y = d3.scale.linear().range([height, 0]),
		xAxis = d3.svg.axis().scale(x).orient("bottom"),
		yAxis = d3.svg.axis().scale(y).orient("left");

	var line = d3.svg.line()
		.x(function(d) { return x(d.timestamp); })
		.y(function(d) { return y(d.memory.heapUsed); });

	var svg = d3.select('#processes-svg')
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var username = svg.attr('data-user');
	var isAdmin = svg.attr('data-admin') === 'true';
	console.log(username, isAdmin);

	var fb = new Firebase("https://boiling-inferno-7829.firebaseio.com/");
	fb.child('webapi-eca-homedesktop').on("value", function(snapshot) {
		var oSnap = snapshot.val();
		var arrUsernames = Object.keys(oSnap);

		var allX = [];
		var allY = [];
		for(let el in oSnap) {
			allX = allX.concat(oSnap[el].map((o) => o.timestamp));
			allY = allY.concat(oSnap[el].map((o) => o.memory.heapTotal));
			allY = allY.concat(oSnap[el].map((o) => o.memory.heapUsed));
			allY = allY.concat(oSnap[el].map((o) => o.memory.rss));
		}
		
		x.domain(d3.extent(allX));
		y.domain([0, d3.max(allY)]);


		svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis);

		svg.append("g")
			.attr("class", "y axis")
			.call(yAxis)
			.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.text("Memory USage");

		svg.append("path")
		.datum(data)
		.attr("class", "line")
		.attr("d", line);


	});
	d3.tsv("data.tsv", function(error, data) {
		if (error) throw error;

		data.forEach(function(d) {
			d.date = parseDate(d.date);
			d.close = +d.close;
		});

		x.domain(d3.extent(data, function(d) { return d.date; }));
		y.domain(d3.extent(data, function(d) { return d.close; }));

		svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis);

		svg.append("g")
			.attr("class", "y axis")
			.call(yAxis)
			.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.text("Price ($)");

		svg.append("path")
		.datum(data)
		.attr("class", "line")
		.attr("d", line);
	});










// 	// https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
// 	var arrColors = [
// 		'steelblue',
// 		'seagreen',
// 		'mediumslateblue',
// 		'salmon',
// 		'orangered',
// 		'goldenrod',
// 		'lightslategrey',
// 		'firebrick',
// 		'deeppink',
// 		'darkkhaki',
// 		'limegreen',
// 		'indigo',
// 		'gray',
// 		'black',
// 		'green'
// 	];

// 	var svg = d3.select('#processes-svg');
// 	var username = svg.attr('data-user');
// 	var isAdmin = svg.attr('data-admin') === 'true';
// 	console.log(username, isAdmin);

// 	// svg.size('600', '300');
// 	// svg.attr('width', '600').attr('height', '300');
// 	// svg.append('circle').attr('r', '50').attr('cx', '50').attr('cy', '100');

// 	// var data = { values: [] };
// 	// data["displayNames"] = ["2xx","3xx","4xx","5xx"];
// 	// data["colors"] = ["green","orange","red","darkred"];
// 	// data["scale"] = "linear";
// 	// data["scale"] = "pow";

// var lineData = [ { "x": 1,   "y": 5},  { "x": 20,  "y": 20},
//                  { "x": 40,  "y": 10}, { "x": 60,  "y": 40},
//                  { "x": 80,  "y": 5},  { "x": 100, "y": 60}];

// //This is the accessor function we talked about above
// var lineFunction = d3.svg.line()
//                          .x(function(d) { return d.x; })
//                          .y(function(d) { return d.y; })
//                          .interpolate("linear");

// //The SVG Container
// var svgContainer = d3.select("body").append("svg")
//                                     .attr("width", 200)
//                                     .attr("height", 200);

// //The line SVG Path we draw
// var lineGraph = svgContainer.append("path")
//                             .attr("d", lineFunction(lineData))
//                             .attr("stroke", "blue")
//                             .attr("stroke-width", 2)
//                             .attr("fill", "none");
// 	var graph,
// 		oData = {};

// 	var fb = new Firebase("https://boiling-inferno-7829.firebaseio.com/");
// 	fb.child('webapi-eca-homedesktop').on("value", function(snapshot) {
// 		var oSnap = snapshot.val();
// 		oData.start = oSnap['admin'].start;
// 		oData.end = oSnap['admin'].end;
// 		let arr = [];
// 		for(let prop in oSnap) arr.push(oSnap[prop].heapUsed);
// 		oData.values = arr;
// 		if(!graph) {
// 			var arrUsernames = Object.keys(oSnap);
// 			oData.colors = arrColors.slice(0, arrUsernames.length);
			
// 			oData.names = arrUsernames;
// 			oData.displayNames = arrUsernames;
// 			// oData.colors = arrColors;
// 			// oData.scale = 'linear';
// 			// oData.values = oSnap['admin'].heapTotal;
// 			oData.step = 10000;

// 			graph = new LineGraph({containerId: 'graph1', data: oData});

// 		}
// 		console.log(oData);
// 		graph.slideData([oData]);
// 	});
});
