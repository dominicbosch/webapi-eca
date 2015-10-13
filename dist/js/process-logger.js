'use strict';

// 	[os](http://nodejs.org/api/os.html) and
var os = require('os');

module.exports = function(sendStats, startIndex) {
	sendStats({
		cmd: 'startup',
		timestamp: (new Date()).getTime()
	});
	// measure every minute. min/max average over two hours (120 data points averaged),
	// 100 data points overall -> 1.5 weeks of data displayed
	var dataIndex = startIndex;
	var currI = 0;
	var oCumulated;

	function resetMetric(metric) {
		metric.max = null;
		metric.min = null;
		metric.sum = null;
	}
	function updateMetric(metric, data) {
		if(metric.max === null) {
			metric.max = metric.min = data;
		} else {
			metric.max = data > metric.max ? data : metric.max;
			metric.min = data < metric.min ? data : metric.min;
		}
		metric.sum += data;
	}
	function getMetric(metric) {
		return {
			max: metric.max,
			min: metric.min,
			avg: metric.sum/currI
		}
	}
	function resetLog() {
		oCumulated = {
			heapTotal: {},
			heapUsed: {},
			rss: {},
			loadavg: {}
		};
		resetMetric(oCumulated.heapTotal);
		resetMetric(oCumulated.heapUsed);
		resetMetric(oCumulated.rss);
		resetMetric(oCumulated.loadavg);
	}
	function updateLog() {
		if(currI++ > 120) {
			resetLog();
			currI = 1;
			dataIndex++;
		}
		if(dataIndex >= 100) dataIndex = 0;

		let mem = process.memoryUsage();
		updateMetric(oCumulated.heapTotal, mem.heapTotal);
		updateMetric(oCumulated.heapUsed, mem.heapUsed);
		updateMetric(oCumulated.rss, mem.rss);
		updateMetric(oCumulated.loadavg, os.loadavg()[0]);
		sendStats({
			cmd: 'stats',
			data: {
				index: dataIndex,
				timestamp: (new Date()).getTime(),
				heapTotal: getMetric(oCumulated.heapTotal),
				heapUsed: getMetric(oCumulated.heapUsed),
				rss: getMetric(oCumulated.rss),
				loadavg: getMetric(oCumulated.loadavg)
			}
		});
	}
	resetLog();
	updateLog();
	dataIndex++;
	setInterval(updateLog, 1*1000); // We are exhaustively sending stats to the parent
}
