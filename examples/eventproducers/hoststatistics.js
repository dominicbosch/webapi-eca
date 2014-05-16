// Generated by CoffeeScript 1.7.1
(function() {
  var arrPings, err, fPollHosts, fPushEvent, fs, histData, i, ips, needle, oSum, oTmp, ping, pingTime, remoteUrl, session, strObj, _i, _len;

  fs = require('fs');

  ping = require('net-ping');

  needle = require('needle');

  remoteUrl = "localhost:8125";

  fPushEvent = function(evt) {
    return needle.post(remoteUrl + '/measurements', evt, function(err, resp, body) {
      console.log(err);
      console.log(body);
      if (err || resp.statusCode !== 200) {
        return console.log('Error in pushing event!');
      } else {
        return console.log('Successfully posted an event');
      }
    });
  };

  try {
    histData = fs.readFileSync('histoappend.json', 'utf8');
  } catch (_error) {
    err = _error;
    console.error(err);
    console.error("Error reading historical data file");
    process.exit();
  }

  session = ping.createSession({
    retries: 2
  });

  oSum = {};

  if (histData) {
    arrPings = histData.split("\n");
    try {
      for (i = _i = 0, _len = arrPings.length; _i < _len; i = ++_i) {
        strObj = arrPings[i];
        if (strObj !== '') {
          oTmp = JSON.parse(strObj);
          oSum[oTmp.timestamp] = {
            sum: oTmp.sum
          };
        }
      }
      if (oTmp) {
        fPushEvent({
          currentlyon: oSum[oTmp.timestamp].sum,
          pingtimes: oSum
        });
      }
    } catch (_error) {
      err = _error;
      console.log('Error parsing histo data');
      console.log(err);
    }
  }

  console.log(oSum);

  i = 255;

  ips = [];

  pingTime = (new Date()).toISOString();

  fPollHosts = function() {
    var oPing;
    i++;
    console.log("Pinging 131.152.85." + i);
    session.pingHost("131.152.85." + i, function(err, target, sent, rcvd) {
      if (!err) {
        return ips.push(target);
      }
    });
    if (i === 255) {
      i = -1;
      console.log("All ping requests returned (" + ips.length + " answered), pushing event into the system and starting again at 0");
      oSum[pingTime] = {
        sum: ips.length
      };
      fPushEvent({
        eventname: 'uptimestatistics',
        payload: JSON.stringify({
          currentlyon: ips.length,
          pingtimes: oSum
        })
      });
      oPing = {
        timestamp: pingTime,
        ips: ips,
        sum: ips.length
      };
      fs.appendFile('histoappend.json', JSON.stringify(oPing) + "\n", 'utf8');
      pingTime = (new Date()).toISOString();
      ips = [];
    }
    return setTimeout(fPollHosts, 7000);
  };

  fPollHosts();

}).call(this);
