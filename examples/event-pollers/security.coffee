#
# Security EVENT POLLER
# ---------------------
#
# Informs about security breaches.
#
# Will emit events of the form:
# [
#     {
#         "Title": "Adobe",
#         "Name": "Adobe",
#         "Domain": "adobe.com",
#         "BreachDate": "2013-10-4",
#         "AddedDate": "2013-12-4T00:12Z",
#         "PwnCount": 152445165,
#         "Description": "The big one. In October 2013, 153 million accounts were breached with each containing an internal ID, username, email, <em>encrypted</em> password and a password hint in plain text. The password cryptography was poorly done and <a href=\"http://stricture-group.com/files/adobe-top100.txt\"> many were quickly resolved back to plain text</a>. The unencrypted hints also <a href=\"http://www.troyhunt.com/2013/11/adobe-credentials-and-serious.html\">disclosed much about the passwords</a> adding further to the risk that hundreds of millions of Adobe customers already faced.",
#         "DataClasses": [
#             "Email addresses",
#             "Password hints",
#             "Passwords",
#             "Usernames"
#         ]
#     },
#     [...]
# ]

oAccountBreaches = {}
exports.breachedAccount = ( account ) ->
	needle.get "https://haveibeenpwned.com/api/v2/breachedaccount/#{ account }", ( err, resp, body ) ->
		for oBreach in body
			myId = oBreach.Title + "_" + oBreach.AddedDate
			if not oAccountBreaches[ myId ]
				oAccountBreaches[ myId ] = oBreach
				pushEvent oBreach

oBreaches = {}
exports.newBreachedSite = () ->
	needle.get 'https://haveibeenpwned.com/api/v2/breaches', ( err, resp, body ) ->
		for oBreach in body
			myId = oBreach.Title + "_" + oBreach.AddedDate
			if not oBreaches[ myId ]
				oBreaches[ myId ] = oBreach
				pushEvent oBreach
