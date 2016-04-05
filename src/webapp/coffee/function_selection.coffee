'use strict';

isEventTrigger = false
strPublicKey = ''
arrAllFunctions = null
arrSelectedFunctions = []

updateParameterList = () ->
	visibility = if arrSelectedFunctions.length > 0 then 'visible' else 'hidden'
	d3.select('#selectedFunctions').style('visibility', visibility)
	
	d3Rows = d3.select('#selectedFunctions')
		.selectAll('.firstlevel').data(arrSelectedFunctions, (d) -> d.id)

	d3Rows.exit().transition().style('opacity', 0).remove()
	d3New = d3Rows.enter().append('div').attr 'class', (d) ->
		'row firstlevel flid'+d.id

	# The main module container
	dModule = d3New.append('div').attr('class', 'col-sm-6')
	dModule.append('h4').text((d) -> d.name)
	dModule.each (d) -> 
		for key, encrypted of d.globals
			nd = d3.select(this).append('div').attr('class', 'row glob')
			nd.append('div').attr('class', 'col-xs-3 key').text(key)
			nd.append('div').attr('class', 'col-xs-9 val')
				.append('input')
					.attr('class', 'inp_'+key)
					.attr('type', if encrypted then 'password' else 'text')
				.on 'change', () -> d3.select(this).attr('changed', 'yes')

	funcs = d3Rows.selectAll('.functions').data((d) -> d.arr);
	funcs.exit().transition().style('opacity', 0).remove();
	newFuncs = funcs.enter().append('div').attr('data-fid', (d, i) -> i)
		.attr('class', (d, i) -> 'functions col-sm-6 fid'+i)
		.append('div').attr('class', 'row')
	title = newFuncs.append('div').attr('class', 'col-sm-12')
	title.append('img').attr('src', '/images/del.png').attr('class', 'icon del')
		.on 'click', removeFunction
	title.append('span').text((d) -> d.name)
	funcParams = newFuncs.selectAll('.notexisting').data((d) -> d.args)
		.enter().append('div').attr('class', 'col-sm-12 arg')
		.append('div').attr('class', 'row')
	funcParams.append('div').attr('class', 'col-xs-3 key').text((d) -> d)
	funcParams.append('div').attr('class', 'col-xs-9 val').append('input')
		.attr('type', 'text').attr('class', (d) -> 'arg_'+d)


removeFunction = (d) ->
	d3t = d3.select(this);
	# Find module from which to delete the action
	arrSel = arrSelectedFunctions.filter((o) -> o.id is d.modid)[0]
	id = arrSel.arr.map((o) -> o.funcid).indexOf(d.funcid);
	arrSel.arr.splice id, 1

	if arrSel.arr.length is 0
		# module empty, find and delete it
		id = arrSelectedFunctions.map((o) -> o.id).indexOf(d.modid);
		arrSelectedFunctions.splice id, 1

	updateParameterList()

window.functions =
	init: (isET, pubkey) ->
		strPublicKey = pubkey
		isEventTrigger = isET
		if isEventTrigger
			name = 'Event Trigger'
		else
			name = 'Action'

		d3.select('#functionList').html """
			<h3>Available #{name}s</h3>
			<table class="mystyle">
				<thead><tr>
					<th>Module</th>
					<th>Owner</th>
					<th>#{name} Function</th>
				</tr></thead>
				<tbody></tbody>
			</table>"""
			
	fillList: (arr) ->
		arrAllFunctions = arr
		if arr.length > 0
			d3.select('#functionEmpty').style('display', 'none');
			d3.select('#functionList').style('visibility', 'visible')
				.select('tbody').selectAll('tr').data(arr, (d) -> d?.id)
					.enter().append('tr').each (oMod) ->
						d3This = d3.select(this)
						main.registerHoverInfoHTML d3This.append('td').text(oMod.name), oMod.comment
						d3This.append('td').text((d) -> d.User.username)
						list = d3This.append('td').append('table')
						for func of oMod.functions
							trNew = list.append('tr')
							trNew.append('td').append('button').text if isEventTrigger then 'select' else 'add'
								.attr('onclick', 'functions.add('+oMod.id+', "'+func+'")')
							trNew.append('td').text(func)


			d3sel = d3.select('#actionSection table');
			d3row = d3sel.selectAll('tr').data(arr).enter().append('tr')
			d3row.append('td').text((d) -> d.name)
			d3row.append('td')

	fillExisting: (arr) ->
		# Fill all function module
		for oFunc in arr
			# Fill all functions per function module
			for func in oFunc.functions
				functions.add(oFunc.id, func.name)
				# Fill all values in the function arguments
				for key, val of func.args
					d3.select('.flid'+oFunc.id+' .fid'+func.fid+' .arg_'+key).node().value = val
			
			for key, val of oFunc.globals
				d3.select('.flid'+oFunc.id+' .inp_'+key).node().value = val

	add: (id, funcName) ->
		# only one event trigger function allowed so far
		if isEventTrigger
			arrSelectedFunctions = []
			d3.select('#selectedFunctions .firstlevel').remove()
		oSelMod = arrSelectedFunctions.filter((o) -> o.id is id)[0]
		if not oSelMod
			oAd = arrAllFunctions.filter((d) -> d.id is id)[0]
			oSelMod = 
				id: oAd.id
				currid: 0
				name: oAd.name
				globals: oAd.globals
				functions: oAd.functions
				arr: []
			arrSelectedFunctions.push(oSelMod)
		oSelMod.arr.push
			name: funcName
			modid: oSelMod.id
			funcid: oSelMod.currid++
			args: oSelMod.functions[funcName]
		updateParameterList()

	getSelected: () ->
		# Store all selected functions
		arrFunctions = []
		d3.selectAll('.firstlevel').each (oModule) ->
			oFunction = {
				id: oModule.id,
				globals: {},
				functions: []
			}
			d3module = d3.select(this);
			d3module.selectAll('.glob').each () ->
				d3t = d3.select(this);
				key = d3t.select('.key').text();
				d3val = d3t.select('.val input');
				val = d3val.node().value;
				if val is ''
					d3val.node().focus()
					throw new Error('Please enter a value in all requested fields!')
				if oModule.globals[key] && d3val.attr('changed') is 'yes'
					val = cryptico.encrypt(val, strPublicKey).cipher
				oFunction.globals[key] = val

			d3module.selectAll('.functions').each (dFunc) ->
				d3This = d3.select(this);
				func = {
					fid: d3This.attr('data-fid')
					name: dFunc.name
					args: {}
				}
				d3arg = d3This.selectAll('.arg').each (d) ->
					d3arg = d3.select(this)
					val = d3arg.select('.val input').node().value
					if val is ''
						d3arg.node().focus()
						throw new Error('Please enter a value in all requested fields!')
					func.args[d] = val;

				oFunction.functions.push func
			arrFunctions.push(oFunction);
		return arrFunctions


