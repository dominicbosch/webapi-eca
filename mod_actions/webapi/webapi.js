'use strict';

/**
 * Call any arbitrary webAPI.
 * @param {Object} args the required function arguments object
 * @param {String} args.url the required webAPI url
 * @param {Object} [args.data] the data to be posted
 * @param {Object} [args.credentials] optional credentials
 * @param {String} [args.credentials.username] optional username
 * @param {String} [args.credentials.password] optional password
 */
function call(args) {
  if(!args || !args.url) {
    console.error('ERROR in WebAPI AM call: Too few arguments!');
    return null;
  }
  needle.post(args.url,
    args.data,
    args.credentials,
    function(error, response, body) {
      if (!error) console.log('Successful webAPI AM call to ' + args.url);
      else console.error('Error during webAPI AM call to ' + args.url
         + ': ' + error.message);
    }
  );
};

exports.call = call;
  
