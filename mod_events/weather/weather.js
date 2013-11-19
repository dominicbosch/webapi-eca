
var urlService = 'http://api.openweathermap.org/data/2.5/weather',
  credentials,
  old_temp;

function loadCredentials(cred) {
  if(!cred || !cred.key) {
    console.error('ERROR in Weather EM: Weather event module credentials file corrupt');
  } else {
    credentials = cred;
    console.log('Successfully loaded credentials for Weather EM');
  }
}

function tempRaisesAbove(prop, degree) {
  needle.get(urlService + '?APPID=' + credentials.key + '&q=Basel',
    function(error, response, body) { // The callback
      if (!error) { //) && response.statusCode == 200) {
        if(args && args.success) args.success(body);
      } else {
        if(args && args.error) args.error(error, response, body);
        else console.error('Error during Weather EM tempRaisesAbove: ' + error.message);
      }
    }
  );
}

exports.tempRaisesAbove = tempRaisesAbove;
exports.loadCredentials = loadCredentials;
