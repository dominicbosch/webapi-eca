lastCheck = ""
lastCheckObj = {}

exports.detectedChange = ( url ) ->
	# needle.get url, ( err, resp, body ) ->
		# log err
		# log 'got body'
	conf =
		url: url
		scripts: ['http://code.jquery.com/jquery-1.6.min.js']
		done: ( err, window ) ->
			log 'jsenv'
			$ = window.jQuery
			log $ is null
			log $
			nbody = $ 'body'
			log 'nbody'
			log nbody
			try
				differences = deepdiff lastCheckObj, nbody
				log JSON.stringify differences
				lastCheckObj = nbody
			catch err
				log err
	jsdom.env conf 

# console.log(JSON.stringify(elementToObj(document.getElementById('foo'))));
    
# function elementToObj(el) {
#     var child, children, i, info = {};

#     if (el.nodeType === 3) {
#         return (el.nodeValue.trim()) ? el.nodeValue : false;
#     } else if (el.nodeType === 1) {
#         info.id = el.id || '';
#         info.className = el.className || '';
        
#         info.type = el.tagName.toLowerCase();
#         info.children = [];
#         children = el.childNodes;
#         for (i = 0; i < children.length; i++) {
#             child = elementToObj(children[i]);
#             if (child && /^\S*$/.test(child.contents)) {
#                 info.children.push(child);
#             }
#         }
        
#         return info;
#     }
    
#     return false;
# }
