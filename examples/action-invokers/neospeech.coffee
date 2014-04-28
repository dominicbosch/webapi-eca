# Neospeech
#
# Converts text to speech and issues an event into th system on completion
#
# Requires user-specific parameters:

# - emailaccount
# - accountid
# - loginkey
# - loginpassword

arrVoices = [
	"TTS_KATE_DB"
	"TTS_PAUL_DB"
	"TTS_JULIE_DB"
	"TTS_NEOBRIDGET_DB"
	"TTS_NEOVIOLETA_DB"
]

arrFormats = [
	"FORMAT_WAV" # (16bit linear PCM Wave)
	"FORMAT_PCM" # (16bit linear PCM)
	"FORMAT_MULAW" # (8bit Mu-law PCM)
	"FORMAT_ALAW" # (8bit A-law PCM)
	"FORMAT_ADPCM" # (4bit Dialogic ADPCM)
	"FORMAT_OGG" # (Ogg Vorbis)
	"FORMAT_8BITWAV" # (8bit unsigned linear PCM Wave)
	"FORMAT_AWAV" # (8bit A-law PCM Wave)
	"FORMAT_MUWAV" # (8bit Mu-law PCM Wave)
]

# 		oResponseCodes =
# 			"0": "success"
# 			"-1": "invalid login"
# 			"-2": "account inactive"
# 			"-3": "account unauthorized"
# 			"-4": "invalid or inactive login key"
# 			"-5": "invalid conversion number lookup"
# 			"-6": "content size is too large (only for “Basic” subscribers)"
# 			"-7": "monthly allowance has been exceeded (only for “Basic” subscribers)"
# 			"-10": "invalid TTS Voice ID"
# 			"-11": "invalid TTS Output Format ID"
# 			"-12": "invalid REST request"
# 			"-13": "invalid or unavailable TTS Sample Rate"
# 			"1": "invalid SSML (not a valid XML document)"
# 			"2": "invalid SSML (SSML content must begin with a “speak” tag)"
# 			"3": "invalid SSML (“lexicon” tag is not supported)"

parseAnswer = ( body ) ->
	arrSelectors = body.match /(\S+)=["']?((?:.(?!["']?\s+(?:\S+)=|[>"']))+.)["']?/g
	oAnswer = {}
	for sel in arrSelectors
		arrSel = sel.split '='
		oAnswer[ arrSel[ 0 ] ] = arrSel[ 1 ].substring 1, arrSel[ 1 ].length - 1 
	oAnswer

# Function arguments:

# - text: the text to be translated into voice
# - idVoice: index of the voice used for conversion from the arrVoices array.
# - idAudioFormat: index of the voice used for conversion from the arrVoices array.
# - sampleRate: 8 or 16 kHz rate
exports.convertTextToSpeech = ( text, idVoice, idAudioFormat, sampleRate, infoEvent ) ->
	idVoice = parseInt( idVoice ) || 0
	if idVoice > arrVoices.length - 1 or idVoice < 0
		idVoice = 0

	idAudioFormat = parseInt( idAudioFormat ) || 0
	if idAudioFormat > arrFormats.length - 1 or idAudioFormat < 0
		idAudioFormat = 0
	
	sampleRate = parseInt( sampleRate ) || 8
	if sampleRate isnt 8 or sampleRate isnt 16
		sampleRate = 8

	oPost =
		method: "ConvertSimple"
		email: params.emailaccount
		accountId: params.accountid
		loginKey: params.loginkey
		loginPassword: params.loginpassword
		voice: arrVoices[ idVoice ]
		outputFormat: arrFormats[ idAudioFormat ]
		sampleRate: sampleRate
		text: text

	needle.post "https://tts.neospeech.com/rest_1_1.php", oPost, ( err, resp, body ) ->
		oAnsw = parseAnswer body
		log 'Conversion order: ' + oAnsw.resultString
		if oAnsw.resultCode is '0'
			pollUntilDone oAnsw.resultCode, params.emailaccount, params.accountid, infoEvent

pollUntilDone = ( conversionNumber, email, accountid, infoEvent ) ->
	oPost =
		method: "GetConversionStatus"
		email: email
		accountId: accountid
		conversionNumber: conversionNumber
	
	needle.post "https://tts.neospeech.com/rest_1_1.php", oPost, ( err, resp, body ) ->
		oAnsw = parseAnswer body
		if oAnsw.resultCode is '0'
			if oAnsw.statusCode is '4' or oAnsw.statusCode is '5'
				pushEvent
					eventname: infoEvent
					body:
						accountid: accountid
						downloadUrl: oAnsw.downloadUrl
			else
				pollUntilDone conversionNumber, email, accountid, infoEvent
		else
			log 'Request failed: ' + oAnsw.resultString
