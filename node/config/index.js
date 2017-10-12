
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
	}
}
function http_get(path,query,res){
	//Web サーバーのロジック
	if(path.length!=2){
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.write('url error\n');
		res.end();
		return;
	}
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
		console.log('jqgrid');
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
	}
}

module.exports ={
	http_get: http_get,
	http_post: http_post
}
