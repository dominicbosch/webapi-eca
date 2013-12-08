'use strict';

/**
 * ProBinder ACTION MODULE
 */

var urlService = 'https://probinder.com/service/',
  credentials = null;

function loadCredentials(cred) {
  if(!cred || !cred.username || !cred.password) {
    console.error('ERROR: ProBinder AM credentials file corrupt');
  } else {
    credentials = cred;
    console.log('Successfully loaded credentials for ProBinder AM');
  }
}

/**
 * Reset eventually loaded credentials
 */
function purgeCredentials() {
  credentials = null;
};

/**
 * Verify whether the arguments match the existing credentials.
 * @param {String} username the username
 * @param {String} password the password
 */
function verifyCredentials(username, password) {
  if(!credentials) return false;
  return credentials.username === username
    && credentials.password === password;
};

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
    console.error('ERROR in ProBinder AM call: Too few arguments!');
    return null;
  }
	if(credentials){
    needle.post(urlService + args.service + '/' + args.method,
      args.data,
      credentials,
      function(error, response, body) { // The callback
        if(!error && response && response.statusCode == 200) {
          if(args && args.success) args.success(body);
        } else {
          if(args && args.error) args.error(error, response, body);
          else console.error('Error during ProBinder AM call: ' + error.message);
        }
      }
    );
	} else console.error('ERROR ProBinder AM: request or credentials object not ready!');
};

/**
 * Calls the user's unread content service.
 * @param {Object} [args] the optional object containing the success
 *    and error callback methods
 * @param {function} [args.succes] refer to call function
 * @param {function} [args.error] refer to call function
 */
function getUnreadContents(args) {
  if(!args) args = {};
  call({
    service: '36',
    method: 'unreadcontent',
    success: args.success,
    error: args.error
  });
};

/**
 * Calls the content get service with the content id and the service id provided. 
 * @param {Object} args the object containing the service id and the content id,
 *    success and error callback methods
 * @param {String} args.serviceid the service id that is able to process this content
 * @param {String} args.contentid the content id
 * @param {function} [args.succes] to be called on success, receives the service, content
 *    and user id's along with the content
 * @param {function} [args.error] refer to call function
 */
function getContent(args){
  if(!args || !args.serviceid || !args.contentid) {
    console.error('ERROR in ProBinder AM getContent: Too few arguments!');
    return null;
  }
  call({
    service: '2',
    method: 'get',
    data: { id: args.contentid, service: args.serviceid },
    success: args.success,
    error: args.error
  });
}

/**
 * Does everything to post something in a binder
 * @param {Object} args the object containing the content
 * @param {String} args.content the content to be posted
 */
function newContent(args){
  if(!args) args = {};
  if(!args.content) args.content = 'Rule#0 says you received a new mail!';
  call({
    service: '27',
    method: 'save',
    data: {
      companyId: '961',
      context: '17936',
      text: args.content
    }
  });
}

/**
 * Does everything to post a file info in a binder tabe
 * @param {Object} args the object containing the content
 * @param {String} args.service the content service
 * @param {String} args.id the content id
 */
function makeFileEntry(args){
  if(!args || !args.service || !args.id) {
    console.error('ERROR in ProBinder AM makeFileEntry: Too few arguments!');
    return null;
  }
  getContent({
    serviceid: args.service,
    contentid: args.id,
    success: function(data) {
      call({
        service: '27',
        method: 'save',
        data: {
          companyId: '961',
          context: '17936',
          text: 'New file (' + data.title + ') in tab \"' + data.context[0].name 
            + '\", find it <a href=\"https://probinder.com/file/' + data.fileIds[0] + '\">here</a>!'
        }
      });
    }
  });
}

/**
 * Does everything to post something in a binder
 * @param {Object} args the object containing the content
 * @param {String} args.content the content to be posted
 */
function setRead(args){
  call({
    service: '2',
    method: 'setread',
    data: {
      id: args.id
    }
  });
}

exports.loadCredentials = loadCredentials;
exports.purgeCredentials = purgeCredentials;
exports.verifyCredentials = verifyCredentials;
exports.call = call;
exports.getUnreadContents = getUnreadContents;
// exports.getBinderTabContents = getBinderTabContents;
exports.getContent = getContent;
exports.newContent = newContent;
exports.makeFileEntry = makeFileEntry;
exports.setRead = setRead;
  
