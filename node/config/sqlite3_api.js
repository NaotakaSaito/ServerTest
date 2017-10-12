
var util = require("util");
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
var async = require('async');

// data_type =
//	{
//		key1: type1,
//		key2: type2,
//		key3: type3,
//	}
//	(ex)
//	var data_type = {
//		id: 'integer PRIMARY KEY AUTOINCREMENT',
//		data: 'TEXT',
//	};
//
function getDataArray(mode,key,data) {
	var result;
	console.log(data);
	switch(mode) {
	case 'add':
		var ar = [];
		result = [];
		if (data instanceof Array){
			for(var i = 0; i < data.length; i++){
				var row = [];
				if(data[i] instanceof Array){
					for (var j=0;j< key.length; j++) {
						row.push(data[i][j]);
					}
				} else {
					for (var j=0;j< key.length; j++) {
						row.push(data[i][key[j]]);
					}
				}
				ar.push(row);
			}
		} else {
			var row = [];
			for (var j=0;j< key.length; j++) {
				console.log('data[key[j]]', j, key[j],data[key[j]],data);
				row.push(data[key[j]])
			}
			ar.push(row);
		}
		result = {
			key: key,
			data: ar
		}
		break;
	case 'edit':
		result = [];
		for (var i=0;i< key.length; i++) {
			result[key[i]] = data[key[i]];
		}
		break;
	case 'csv':
		var ar = data.replace(/\r/g,"").split('\n');
		var csv = [];
		for(var i=0;i<ar.length;i++){
			csv.push(ar[i].split(','));
		}
		var ar = [];
		for(var i = 0; i < csv.length; i++){
			var row = [];
			if(csv[i]=="") break;
			for (var j=0;j< key.length; j++) {
				row.push(csv[i][j]);
			}
			ar.push(row);
		}
		console.log('ar',ar);
		result = {
			key: key,
			data: ar
		}
		break;
	}
	console.log({func: 'getDataArray',result:result});
	return result;
}
function create(db,table,type,callback){
	var msg = [];
	for (key in type) {
		msg.push(key + ' ' + type[key]);
	}
	var createtable = 'create table '+table+'('+msg.join(',')+')';
	console.log({func:'createTable',msg: createtable});
	db.run(createtable,function(err,res){
		if((callback != undefined) && (callback != null)) callback(err,res);
	});
}

function drop(db,table,callback){
	var drop = 'drop table '+table;
	db.run(drop,function(err,res){
		console.log({func:'drop',err:err,res:res});
		if((callback != undefined) && (callback != null))callback(err,res);
	});
}

//	example of conditions
//	condition = [
//		'id=0',
//		'id=10',
//		'id=11',
//		'data=12345'
//	]
function delRow(db,table,conditions,callback){
	if( conditions instanceof Array){
		var delt = 'DELETE FROM '+table+' WHERE '+ conditions.join(' OR ');
		console.log({func:'delRow',msg: delt});
		db.run(delt,function(err,res){
			if((callback != undefined) && (callback != null)) callback(err,res);
		});
	} else {
		var str = 'id must be Array';
		console.error('[delRow] @ sqlite3_api: '+str);
		if((callback != undefined) && (callback != null)) {
			callback(str,null);
		}
	}
}

function editRow(db,table,condition,data,callback){
	var value = [];
	for( key in data ) {
		if(typeof data[key] == 'string') {
			value.push(key +"='"+data[key]+"'");
		} else {
			value.push(key +'='+data[key]);
		}
	}
	var update = 'UPDATE '+table+' SET ' + value.join(',') +' WHERE '+condition;
	db.run(update,function(err,res){
		console.log({func:'editRow',err:err,res:res});
		if((callback != undefined) && (callback != null))callback(err,res);
	});
}
function addRow(db,table,data,callback){
	var ar = [];
	var insert;
	var tmp = data.data;
	console.log(tmp);
	var values = [];
	for(var i=0; i < tmp.length; i++) {
		for(var j=0;j<tmp[i].length;j++) {
			if(typeof tmp[i][j] == 'string'){
				tmp[i][j] = "'"+tmp[i][j]+"'"
			}
		}
		values.push('('+ tmp[i].join(',')+')');
	}
	console.log(values);
	if(data.key instanceof Array) {
		var insert = 'insert or ignore into '+table+'('+ data.key.join(',') +')'+ ' values ' + values.join(',');
	} else {
		var insert = 'insert or ignore into '+table+' values ' + values.join(',');
	}
	console.log({func: 'addRow',msg: insert});
	db.serialize(function () {
		db.run(insert,function(err,res){
			console.log({func:'addRow',err:err,res:res});
			if((callback != undefined) && (callback != null)) callback(err,res);
		});
	});
}
function get(db,table,callback){
	db.all('select * from '+table, function (err, res) {
		console.log({func:'get',err:err,res:res});
		if((callback != undefined) && (callback != null))callback(err,res);
	});
}
function getJqgridTable(db,table,query,callback){
	db.all('select * from '+table, function (err, res) {
		console.log({func:'getJqgridTable',err:err,res:res});
		if(err == null){
			var lines = res.length;
			var limit = parseInt(query.rows);
			var total = Math.ceil(lines/limit);
			var page = isNaN(query.page) ? total : parseInt(query.page);
			page = page > total ? total : page;
			page = page == 0 ? 1 : page;
			var st_index = limit*(page-1);
			var end_index = limit*(page);
			if (end_index>lines) {end_index=lines};
			var rows = [];
			for(var index = st_index; index < end_index; index++){
				var ar = [];
				for(key in res[index]) {
					ar.push(res[index][key]);
				}
				rows.push({
					'id': res[index].id,
					'cell': ar
				});
			}
			var result = {
				total:		total,
				page:		page,
				records:	lines,
				rows:		rows
			};
		}
		if((callback != undefined) && (callback != null))callback(err,result);
	});
};

module.exports ={
	getDataArray: getDataArray,
	create : create,
	drop : drop,
	delRow : delRow,
	editRow : editRow,
	addRow : addRow,
	get : get,
	getJqgridTable : getJqgridTable,
};
