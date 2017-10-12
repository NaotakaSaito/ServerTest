
var url = require('url');
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
var async = require('async');

var DEFAULT_FILE = 'config/index.html'

var promise = Promise.resolve();
var header = {
	'content-Type': 'text/html',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
};

//拡張子を抽出
function getExtension(fileName) {
	var fileNameLength = fileName.length;
	var dotPoint = fileName.indexOf('.', fileNameLength - 5 );
	var extn = fileName.substring(dotPoint + 1, fileNameLength);
	return extn;
}

//content-type を指定
function getContentType(fileName) {
	var extentsion = getExtension(fileName).toLowerCase();
	var contentType = {
		'html': 'text/html',
		'htm' : 'text/htm',
		'css' : 'text/css',
		'js' : 'text/javaScript; charset=utf-8',
		'json' : 'application/json; charset=utf-8',
		'xml' : 'application/xml; charset=utf-8',
		'jpeg' : 'image/jpeg',
		'jpg' : 'image/jpg',
		'gif' : 'image/gif',
		'png' : 'image/png',
		'mp3' : 'audio/mp3',
	};
	var contentType_value = contentType[extentsion];
	if(contentType_value === undefined){
		contentType_value = 'text/plain';
	}
	return contentType_value;
}
function delDatabase(db){
	return new Promise(function(resolve,reject){
		fs.unlink(db, function (err) {
			resolve(true);
		});
	});
}
function createTable(db,table){
	return new Promise(function(resolve,reject){
		var createtable = 'create table '+table+'(id integer PRIMARY KEY AUTOINCREMENT,'+table+' text)';
		db.run(createtable,function(err,res){
			resolve(true);
		});
	});
}
function delTable(db,table){
	return new Promise(function(resolve,reject){
		var drop = 'drop table '+table;
		db.run(drop,function(err,res){
			console.log({func:'drop',err:err,res:res});
			resolve(true);
		});
	});
}
function delRow(db,table,query,id){
	var array = id.split(',');
	var lines=[];
	for(var i=0;i<array.length;i++){
		lines.push('id = '+array[i]);
	}
	return new Promise(function(resolve,reject){
		var delt = 'DELETE FROM '+table+' WHERE '+ lines.join(' OR ');
		db.run(delt,{},function(err,res){
			resolve(true);
		});
	});
}
function editRow(db,table,query,id,data){
	return new Promise(function(resolve,reject){
		var update = 'UPDATE '+table+' SET ' + table +' = $d WHERE id=$id';
		db.run(update,{$d:data, $id:id},function(err,res){
			resolve(true);
		});
	});
}
function addRow(db,table,data){
	return new Promise(function(resolve,reject){
		console.log({db:db,table:table,data:data});
		var insert = 'insert or ignore into '+table+'('+table+')' + ' values ' + data;
		console.log(insert);
		db.serialize(function () {
			db.run(insert,function(err,res){
				console.log({func:'add',err:err,res:res});
				resolve(true);
			});
		});
	});
}
function getTable(db,table,record){
	return new Promise(function(resolve,reject){
		db.all('select * from '+table, function (err, res) {
			console.log(res);
		});
	});
}
function getJqgridTable(db,table,query){
	return new Promise(function(resolve,reject){
		db.all('select * from '+table, function (err, res) {
			console.log({func:'get',err:err,res:res});
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
				rows.push({
					'id': res[index].id,
					'cell': [res[index].id,res[index][table]]
				});
			}
			var result = {
				total:		total,
				page:		page,
				records:	lines,
				rows:		rows
			};
			resolve(result);
		});
	});
};
function http_post(path,query,data,res){
	//Web サーバーのロジック
	if(path.length!=2){
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.write('url error\n');
		res.end();
		return;
	}
	var dbpath = './db/'+query.user+".sqlite3";
	switch(data.oper){
	case 'add':
		var db = new sqlite3.Database(dbpath);
		var table = data.table;
		addRow(db,query.table,'(\''+data[query.table]+'\')')
		.then(function(result){
			res.writeHead(200, header);
			res.end();
		});
		break;
	case 'edit':
		var db = new sqlite3.Database(dbpath);
		var table = data.table;
		editRow(db,query.table,query,data.id,data[query.table])
		.then(function(result){
			res.writeHead(200, header);
			res.end();
		});
		break;
	case 'del':
		var db = new sqlite3.Database(dbpath);
		var table = data.table;
		delRow(db,query.table,data.id)
		.then(function(result){
			res.writeHead(200, header);
			res.end();
		});
		break;
	case 'new':
		delDatabase(dbpath).then(function(result) {
			var db = new sqlite3.Database(dbpath);
			db.serialize(function () {
				createTable(db,'name')
				.then(createTable(db,'machine')
				.then(createTable(db,'reason')
				.then(function(){
					res.writeHead(200, header);
					res.end();
				})));
			});
		});
		break;
	case 'upload':
		var name,machine,reason;
		var db = new sqlite3.Database(dbpath);
		var record = JSON.parse(data.data);
		process.on('unhandledRejection', console.dir);
		async.series([
			function (callback){
				delTable(db,'name')
				.then(delTable(db,'machine')
				.then(delTable(db,'reason')
				.then(callback(null,true))));
			},
			function (callback) {
				db.serialize(function () {
					createTable(db,'name')
					.then(createTable(db,'machine')
					.then(createTable(db,'reason')
					.then(callback(null,true))));
				});
			},
			function(callback){
				var ar = [];
				for(var i=0; i< record.name.length;i++){
					ar.push( '\(\''+ record.name[i]+'\'\)');
				};
				name = ar.join(",");
				var ar = [];
				for(var i=0; i< record.machine.length;i++){
					ar.push( '\(\''+ record.machine[i]+'\'\)');
				};
				machine = ar.join(",");
				var ar = [];
				for(var i=0; i< record.reason.length;i++){
					ar.push( '\(\''+ record.reason[i]+'\'\)');
				};
				reason = ar.join(",");
				setTimeout(function(){
					console.log('2');
					callback(null,true);
				},10)
			},
			function(callback){
				addRow(db,'name',name)
				.then(function(result){
					console.log('3');
					callback(null,true);
				});
			},
			function(callback){
				addRow(db,'machine',machine)
				.then(function(result){
					console.log('4');
					callback(null,true);
				});
			},
			function(callback){
				addRow(db,'reason',reason)
				.then(function(result){
					console.log('5');
					callback(null,true);
				});
			},
			],function(err,result){
				res.writeHead(200, header);
				res.end();
		});
		break;
	case 'download':
		var dbpath = './db/'+query.user+".sqlite3";
		var db = new sqlite3.Database(dbpath);
		var name,machine,reason;
		db.serialize(function () {
			getTable(db,'name',name)
			.then(getTable(db,'machine',machine)
			.then(getTable(db,'reason',reason)
			.then(function(){
				console.log({name:name,machine:machine,reason:reason});
			})));
		});
		break;
	}
}
function http_get(path,query,res){
	//Web サーバーのロジック
	console.log({path:path,query:query});
	if(path.length!=2){
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.write('url error\n');
		res.end();
		return;
	}
	var requestedFile =  path[1] === "" ? DEFAULT_FILE: path.join('/');
	switch(query.cmd){
	case 'get':
		var dbpath = './db/'+query.user+".sqlite3";
		var db = new sqlite3.Database(dbpath);
		getJqgridTable(db,query.table,query)
		.then(function(result){
			res.writeHead(200, header);
			res.end(JSON.stringify(result));
		});
		break;
	default:
		fs.readFile(requestedFile,'binary', function (err, data) {
				if(err){
					res.writeHead(404, {'Content-Type': 'text/plain'});
					res.write('not found\n');
					res.end();
				}else{
					res.writeHead(200, {'Content-Type': getContentType(requestedFile),'Connection': 'close'});
					res.write(data, "binary");
					res.end();
				}
		});
		break;
	}
}

module.exports ={
	http_get: http_get,
	http_post: http_post
}
