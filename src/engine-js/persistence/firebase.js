'use strict';
// # Firebase DB Connection Module
// 
// **Loads Modules:**

// - [Logging](logging.html)
var log = require('../logging'),

	Firebase = require('firebase');

exports.init = (conf) => {
	fb = new Firebase("https://<YOUR-FIREBASE-APP>.firebaseio.com");

}
fb.createUser({
email    : "bobtony@firebase.com",
password : "correcthorsebatterystaple"
}, function(error, userData) {
if (error) {
console.log("Error creating user:", error);
} else {
console.log("Successfully created user account with uid:", userData.uid);
}
});