

### 
Robert ACTION DISPATCHER
-------------------------

This is a customized module, made for Robert Frank to automatically create
courses binders and prefill them with data.

This module requires user-specific parameters:

- binderUsername
- binderPassword
- importIoUserGuid
- importIoApikey
###
credentials =
	username: params.binderUsername
	password: params.binderPassword

io = new importio params.userGuid, params.apikey, "query.import.io"

companyId = 961 # the company where all the binders are supposed to be

oSemesterCourses =
	"FS14":
		# "BSC2": 
		# 	"BASIC": [
		# 		"FS14 - CS108"
		# 		"FS14 - CS202"
		# 		"FS14 - CS206"
		# 	]
		"BSC4": 
			"BASIC": [
				"FS14 - CS109"
				"FS14 - CS262"
			]
			# "CI": [
			# 	"FS14 - CS231"
			# ]
			"DS": [
				"FS14 - CS212"
				"FS14 - CS243"
			]
		# "BSC6": 
		# 	"BASIC": [
		# 		"FS14 - CS252"
		# 	]
		# 	"CI": [
		# 		"FS14 - CS205"
		# 	]
		# 	"DS": [
		# 		"FS14 - CS263"
		# 	]
		# "MSC2": 
		# 	"BASIC": [
		# 		"FS14 - CS305"
		# 		"FS14 - CS311"
		# 		"FS14 - CS322"
		# 		"FS14 - CS323"
		# 		"FS14 - CS331"
		# 	]

oPages =
	"FS14 - CS108": "http://informatik.unibas.ch/index.php?id=fs14_cs108"
	"FS14 - CS109": "http://informatik.unibas.ch/index.php?id=205"
	"FS14 - CS202": "http://informatik.unibas.ch/index.php?id=206"
	"FS14 - CS205": "http://informatik.unibas.ch/index.php?id=207"
	"FS14 - CS212": "http://informatik.unibas.ch/index.php?id=209"
	"FS14 - CS231": "http://informatik.unibas.ch/index.php?id=cs231_fs14"
	"FS14 - CS206": "http://informatik.unibas.ch/index.php?id=208"
	"FS14 - CS243": "http://informatik.unibas.ch/index.php?id=211"
	"FS14 - CS252": "http://informatik.unibas.ch/index.php?id=212"
	"FS14 - CS262": "http://informatik.unibas.ch/index.php?id=213"
	"FS14 - CS263": "http://informatik.unibas.ch/index.php?id=214"
	"FS14 - CS305": "http://informatik.unibas.ch/index.php?id=215"
	"FS14 - CS311": "http://informatik.unibas.ch/index.php?id=216"
	"FS14 - CS322": "http://informatik.unibas.ch/index.php?id=217"
	"FS14 - CS323": "http://informatik.unibas.ch/index.php?id=218"
	"FS14 - CS331": "http://informatik.unibas.ch/index.php?id=219"
	"FS14 - CS552": "http://informatik.unibas.ch/index.php?id=220"
	"FS14 - CS553": "http://informatik.unibas.ch/index.php?id=221"


# Try to connect to import.io
isConnected = false
isConnecting = false
tryToConnect = ( numAttempt, cb ) ->
	fDelayed =  ( numAttempt, cb ) ->
		() ->
			tryToConnect numAttempt, cb
	if isConnected
		cb true
	else if isConnecting
		setTimeout fDelayed( numAttempt, cb ), 20
	else
		isConnecting = true
		io.connect ( connected ) ->
			if connected
				isConnected = true
				isConnecting = false
				cb true
			else
				log "Unable to connect, attempting again... ##{ numAttempt++ }"
				if numAttempt is 5
					cb false
				else
					tryToConnect numAttempt, cb

#
# The standard callback can be used if callback is not provided, e.g. if
# the function is called from outside
#
standardCallback = ( funcName ) ->
	( err, resp, body ) ->
		if err
			log "ERROR: During function '#{ funcName }'"
		else
			if resp.statusCode is 200
				log "Function '#{ funcName }' ran through without error"
			else
				log "ERROR: During function '#{ funcName }': #{ body.error.message }"

semaphore = 0
arrRequests = []
idReq = 0
callService = ( args ) ->
	if not args.service or not args.method
		log 'ERROR in call function: Missing arguments!'
	else if semaphore++ > 0
		arrRequests.push args
		log 'Deferring calls because we get very busy! Queue size: ' + semaphore
	else
		issueRequest( args )()

issueRequest = ( args ) ->
	() ->
		if not args.callback
			args.callback = standardCallback 'call'
		url = 'https://probinder.com/service/' + args.service + '/' + args.method
		needle.request 'post', url, args.data, credentials, ( err, resp, body ) ->
			if --semaphore > 0
				setTimeout issueRequest( arrRequests[ idReq++ ] ), 5
			else
				arrRequests = []
				idReq = 0
				log 'All work done, queue empty again!'
			args.callback err, resp, body

queryImportIO = ( inputParams, cb ) ->
	tryToConnect 0, ( connected ) ->
		if not connected
			log 'ERROR: Cannot execute query because connection failed!'
		else
			data = []
			io.query inputParams, ( finished, msg ) ->
				if msg.type is "MESSAGE"
					data = data.concat msg.data.results
				if finished
					cb data

fetchContentFieldFromQuery = ( data, arrFields ) ->
	for oResults in data
		if arrFields.indexOf( oResults.identifier ) > -1
			return oResults.content

fProcessCourse = ( semester, course ) ->
	( data ) ->
		oCourse =
			teacher: fetchContentFieldFromQuery data, [ 'Dozent', 'Lecturer' ]
			assistants: fetchContentFieldFromQuery data, [ 'Assistenten', 'Assistants' ]
			tutors: fetchContentFieldFromQuery data, [ 'Tutoren', 'Tutors' ]
			lectureid: fetchContentFieldFromQuery data, [ 'Vorlesungsverzeichnis Nr.', 'Lectures List No.' ]
			lecture: fetchContentFieldFromQuery data, [ 'Vorlesung', 'Lecture' ]
			exercises: fetchContentFieldFromQuery data, [ 'Übungen', 'Exercises' ]
			exam: fetchContentFieldFromQuery data, [ 'Prüfung', 'Exam' ]
			credits: fetchContentFieldFromQuery data, [ 'Kreditpunkte', 'Credit Points' ]
			start: fetchContentFieldFromQuery data, [ 'Startveranstaltung', 'Starting Date' ]
			description: fetchContentFieldFromQuery data, [ 'Kurzbeschreibung', 'Content' ]
			prerequisites: fetchContentFieldFromQuery data, [ 'Voraussetzungen', 'Prerequisites' ]
			audience: fetchContentFieldFromQuery data, [ 'Zielpublikum', 'Audience' ]

		callService
			service: 'category'
			method: 'create'
			data:
				company_id: companyId
				name: "#{ course }"
				description: oCourse.description || ''
			callback: ( err, resp, body ) ->
				if body.error
					log body.error.message
				else
					setupBinder body.id, oCourse

setupBinder = ( categoryId, oCourse ) ->
	fSetupAdmin = ( oCourse ) ->
		( err, resp, body ) ->
			if body.error
				log body.error.message
			else
				if oCourse.start
					createText body.id, oCourse.start
					createHeading body.id, 'First Lecture', 0

				if oCourse.exam
					createText body.id, oCourse.exam
					createHeading body.id, 'Exam', 0

				if oCourse.credits
					createText body.id, oCourse.credits
					createHeading body.id, 'Credit Points', 0

				if oCourse.prerequisites
					createText body.id, oCourse.prerequisites
					createHeading body.id, 'Prerequisites', 0

				if oCourse.audience
					createText body.id, oCourse.audience
					createHeading body.id, 'Audience', 0

				if oCourse.tutors
					createText body.id, oCourse.tutors
					createHeading body.id, 'Tutors', 0

				if oCourse.assistants
					createText body.id, oCourse.assistants
					createHeading body.id, 'Assitants', 0

				if oCourse.teacher
					createText body.id, oCourse.teacher
					createHeading body.id, 'Teacher', 0

	callService
		service: 'context'
		method: 'create'
		data:
			category_id: categoryId
			name: "Administratives"
			description: 'Vorlesungsverzeichnis: ' + oCourse.lectureid || "()"
		callback: fSetupAdmin oCourse

	desc = ''
	if oCourse.start
		desc = 'Starting date: ' + oCourse.start
	if oCourse.lecture
		desc += "\n" + oCourse.lecture
	callService
		service: 'context'
		method: 'create'
		data:
			category_id: categoryId
			name: "Lecture"
			description: desc
		callback: ( err, resp, body ) ->
			if body.error
				log body.error.message

	callService
		service: 'context'
		method: 'create'
		data:
			category_id: categoryId
			name: "Exercises"
			description: oCourse.exercises || ''
		callback: ( err, resp, body ) ->
			if body.error
				log body.error.message

createHeading = ( contextId, title, level ) ->
	callService
		service: 'heading'
		method: 'save'
		data:
			companyId: companyId
			context: contextId
			title: title
			level: level
	

createText = ( contextId, text ) ->
	callService
		service: 'text'
		method: 'save'
		data:
			companyId: companyId
			context: contextId
			text: text
	

exports.createCourse = ( semester, course ) ->
	if oPages[ course ]
		params =
			input: "webpage/url": oPages[ course ]
			connectorGuids: [ "9b444fc8-02f5-4714-b5c1-f5848e3c2246" ]
		queryImportIO params, fProcessCourse semester, course

exports.createSemester = ( semester ) ->
	oSem = oSemesterCourses[ semester ]
	if oSem
		for studies, oStudies of oSem
			for module, oModule of oStudies
				exports.createCourse semester, course for course in oModule
	else
		log 'No definitions found for semester ' + semester
	

# Expects

# - semester
# - studies
# - major
# - useraccount
exports.newStudent = ( obj ) ->
	log 'Got new user object: ' + typeof obj
	log JSON.stringify obj, undefined, 2

	if not obj.useraccount
		log "ProBinder User Account missing!"
		return

	if not obj.semester or not obj.studies
		log "semester or studies attribute missing in student object!"
		return

	if not oSemesterCourses[ obj.semester ] or not oSemesterCourses[ obj.semester ][ obj.studies ]
		log "Requested semester or studies not defined internally!"
		return

	oSem = oSemesterCourses[ obj.semester ][ obj.studies ]
	fLinkUserToCourse = ( oSemester, userId ) ->
		( err, obj ) ->
			if not err
				log "Adding user #{ userId } to #{ obj.name }"
				callService
					service: 'category'
					method: 'adduser'
					data:
						category_id: obj.id
						user_id: userId
					callback: ( err, resp, body ) ->
						if body.error
							log body.error.message
						else
							log "User #{ userId } added to binder #{ obj.name }"

	searchCourseBinders oSem[ 'BASIC' ], fLinkUserToCourse oSem, obj.useraccount
	if obj.major
		searchCourseBinders oSem[ obj.major ], fLinkUserToCourse oSem, obj.useraccount

searchCourseBinders = ( arrCourses, cb ) ->
	if arrCourses
		fCheckName = ( arrCourses, cb ) ->
			( err, resp, body ) ->
				if err
					cb err
				else
					for oBinder in body
						if arrCourses.indexOf( oBinder.name ) > -1
							cb null, oBinder
		callService
			service: 'company'
			method: 'binders'
			data:
				company_id: companyId
			callback: fCheckName arrCourses, cb
