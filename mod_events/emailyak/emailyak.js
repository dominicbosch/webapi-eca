'use strict';

/*
 * EmailYak EVENT MODULE
 */

var credentials = null;

function loadCredentials(cred) {
    if(!cred || !cred.key) {
      console.error('ERROR in EmailYak EM: credentials file corrupt');
    } else {
      credentials = cred;
      console.log('Successfully loaded EmailYak EM credentials');
    }
}

//FIXME every second mail gets lost?
// 1) for http.request options, set Connection:keep-alive 
// 2) set Agent.maxSockets = 1024   (so more connection to play around 
// with ) 
// 3) very critical: DO a timeout for the http.request. 
// 
// e.g. 
// var responseHdr = function (clientResponse) { 
  // if (clientResposne) { 
// 
  // } else { 
    // clientRequest.abort(); 
 // } 
// }; 
// 
// var timeoutHdr = setTimeout(function() { 
        // clientRequest.emit('req-timeout'); 
// }, 5000); // timeout after 5 secs 
// 
// clientRequest.on("req-timeout", responseHdr); 
// clientRequest.on('error', function(e) { 
        // clearTimeout(timeoutHdr); 
        // console.error('Ok.. clientrequest error' + myCounter); 
        // next({err:JSON.stringify(e)}); 
// }); 
function newMail(callback) { //FIXME not beautiful to have to set prop each time here
  needle.get('https://api.emailyak.com/v1/' + credentials.key + '/json/get/new/email/',
    function (error, response, body){
      if (!error && response.statusCode == 200) {
        var mails = JSON.parse(body).Emails;
        for(var i = 0; i < mails.length; i++) callback(mails[i]);
      } else console.error('ERROR in EmailYak EM newMail: ' + error);
    }
  );
}

exports.loadCredentials = loadCredentials;
exports.newMail = newMail;
