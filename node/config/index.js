
var url = require('url');
var fs = require('fs');
var sqlite3 = require('sqlite3').verbose();
var sq = require('./sqlite3_api');
var async = require('async');

var DEFAULT_FILE = 'config/index.html';
var data_type = {
	name: {
		key: ['id','data'],
		type:{
			id: 'integer PRIMARY KEY AUTOINCREMENT',
			data: 'TEXT'
		}
	},
	machine: {
		key: ['id','addr','data'],
		type:{
			id: 'integer PRIMARY KEY AUTOINCREMENT',
			addr: 'TEXT',
			data: 'TEXT'
		}
	},
	reason: {
		key: ['id','data'],
		type: {
			id: 'integer PRIMARY KEY AUTOINCREMENT',
			data: 'TEXT'
		}
	},
	test: {
		key: ['id','data','d1','d2'],
		type: {
			id: 'integer PRIMARY KEY AUTOINCREMENT',
			data: 'TEXT',
			d1: 'TEXT',
			d2: 'TEXT',
		}
	}
};

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
		var table = query.table;
		var key = data_type[table].key.slice(1);
		sq.addRow(db,table,sq.getDataArray('add',key,data),function(err,sq_res){
			if(err) {
				res.writeHead(404, header);
				res.write(JSON.stringify(err));
				res.end();
			} else {
				res.writeHead(200, header);
				res.end();
			}
		});
		break;
	case 'edit':
		var db = new sqlite3.Database(dbpath);
		var table = query.table;
		var key = data_type[table].key.slice(1);
		var condition = 'id = '+data.id;
		sq.editRow(db,table,condition, sq.getDataArray('edit',key,data),function(err,sq_res){
			if(err) {
				res.writeHead(404, header);
				res.write(JSON.stringify(err));
				res.end();
			} else {
				res.writeHead(200, header);
				res.end();
			}
		});
		break;
	case 'del':
		var db = new sqlite3.Database(dbpath);
		var table = query.table;
		var condition = data.id.split(',');
		for(var i=0;i<condition.length;i++){
			condition[i] = data_type[table].key[0] + '=' + condition[i];
		}
		console.log(condition);
		sq.delRow(db,query.table,condition,function(err,sq_res){
			if(err) {
				res.writeHead(404, header);
				res.write(JSON.stringify(err));
				res.end();
			} else {
				res.writeHead(200, header);
				res.end();
			}
		});
		break;
	case 'get':
		var dbpath = './db/'+query.user+".sqlite3";
		var db = new sqlite3.Database(dbpath);
		sq.get(db,query.table,function(err,sq_res){
			if(err) {
				res.writeHead(404, header);
				res.write(JSON.stringify(err));
				res.end();
			} else {
				res.writeHead(200, header);
				res.end(JSON.stringify(sq_res));
			}
		});
		break;
	case 'create':
		var db = new sqlite3.Database(dbpath);
		var table = data.table;
		sq.create(db,table,data_type[table].type,function(err,sq_res){
			if(err) {
				res.writeHead(404, header);
				res.write(JSON.stringify(err));
				res.end();
			} else {
				res.writeHead(200, header);
				res.end(JSON.stringify({msg: 'success to create table'}));
			}
		});
		break;
	case 'drop':
		var db = new sqlite3.Database(dbpath);
		var table = data.table;
		console.log({func:'drop',table:table});
		sq.drop(db,table,function(err,sq_res){
			if(err) {
				res.writeHead(404, header);
				res.write(JSON.stringify(err));
				res.end();
			} else {
				res.writeHead(200, header);
				res.end(JSON.stringify({msg: 'success to delete table'}));
			}
		});
		break;
	case 'upload':
		var db = new sqlite3.Database(dbpath);
		var table = data.table;
		console.log({func:'upload',file:data.data,table:data.table,type:data_type[table].type});
		process.on('unhandledRejection', console.dir);
		async.series([
			function (callback){	// delete name table
				sq.drop(db,table,function(err,res){callback(null,true);})
			},
			function (callback) {	// create name table
				console.log(data_type[table])
				sq.create(db,table,data_type[table].type,function(err,res){callback(null,true);})
			},
			function(callback){
				sq.addRow(db,table,sq.getDataArray('csv',data_type[table].key.slice(1),data.data),function(err,sq_res){
					if(err){
						res.writeHead(404, header);
						res.end(JSON.stringify(err));
					} else {
						res.writeHead(200, header);
						res.end(JSON.stringify({msg: 'upload success'}));
					}
				});
			}
		]);
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
		sq.get(db,query.table,function(err,sq_res){
			if(err) {
				res.writeHead(404, header);
				res.write(JSON.stringify(err));
				res.end();
			} else {
				res.writeHead(200, header);
				res.end(JSON.stringify(sq_res));
			}
		});
		break;
	case 'jqgrid':
		var dbpath = './db/'+query.user+".sqlite3";
		var db = new sqlite3.Database(dbpath);
		sq.getJqgridTable(db,query.table,query, function(err,sq_res){
			if(err) {
				res.writeHead(404, header);
				res.write(JSON.stringify(err));
				res.end();
			} else {
				res.writeHead(200, header);
				res.end(JSON.stringify(sq_res));
			}
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
