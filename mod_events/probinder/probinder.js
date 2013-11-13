'use strict';

var needle = require('needle');

/*
 * ProBinder EVENT MODULE
 */

var request = require('needle'),
  urlService = 'https://probinder.com/service/',
  credentials = null;
  
function loadCredentials(cred) {
  if(!cred || !cred.username || !cred.password) {
    console.error('ERROR: ProBinder EM credentials file corrupt');
  } else {
    credentials = cred;
    console.log('Successfully loaded credentials for ProBinder EM');
  }
}

/**
 * Call the ProBinder service with the given parameters.
 * @param {Object} args the required function arguments object
 * @param {Object} [args.data] the data to be posted
 * @param {String} args.service the required service identifier to be appended to the url
 * @param {String} args.method the required method identifier to be appended to the url
 * @param {function} [args.succes] the function to be called on success,
 *    receives the response body String or Buffer.
 * @param {function} [args.error] the function to be called on error,
 *    receives an error, an http.ClientResponse object and a response body
 *    String or Buffer.
 */
function call(args) {
  if(!args || !args.service || !args.method) {
    console.error('ERROR in ProBinder EM call: Too few arguments!');
    return null;
  }
	if(credentials){
    needle.post(urlService + args.service + '/' + args.method,
      args.data,
      credentials,
      function(error, response, body) { // The callback
        if (!error) { //) && response.statusCode == 200) {
          if(args && args.success) args.success(body);
        } else {
          if(args && args.error) args.error(error, response, body);
          else console.error('ERROR during ProBinder EM call: ' + error.message);
        }
      }
    );
	} else console.error('ProBinder EM request or credentials object not ready!');
};

/**
 * Calls the user's unread content service.
 * @param {Object} [args] the optional object containing the success
 *    and error callback methods
 */
function unread(callback) { //FIXME ugly prop in here
  
  call({
    service: '36',
    method: 'unreadcontent',
    success: function(data) {
      for(var i = 0; i < data.length; i++) callback(null, data[i]);
    }
  });
  
};

exports.loadCredentials = loadCredentials;
exports.call = call;
exports.unread = unread;
  
