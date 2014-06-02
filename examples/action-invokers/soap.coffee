###
SOAP example on how to convert convert celsius to fahrenheit via SOAP service
###
exports.convertCelsiusToFahrenheit = ( eventname, celsius ) ->
	url = 'http://www.w3schools.com/Webservices/tempconvert.asmx'
	body = "
		<?xml version=\"1.0\" encoding=\"utf-8\"?>
			<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"
					xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">
			  <soap:Body>
			    <CelsiusToFahrenheit xmlns=\"http://www.w3schools.com/webservices/\">
			      <Celsius>#{ celsius }</Celsius>
			    </CelsiusToFahrenheit>
			  </soap:Body>
			</soap:Envelope>
	"
	options = 
		headers:
			"Content-Type": "text/xml"
			"SOAPAction": "http://www.w3schools.com/webservices/CelsiusToFahrenheit"
	needle.post url, body, options, ( err, resp, body ) ->
		log 'Pushing: ' + eventname
		pushEvent
			eventname: eventname
			body: body

