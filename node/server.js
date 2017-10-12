var http = require('http');
var url = require('url');
qs = require('querystring');
var fs = require('fs');
var config = require('./config/index');
//var config = require('./config/config');
var DEFAULT_FILE= 'index.html';

function http_post(path,query,data,res){
	switch(path[0]) {
	case 'config':
		config.http_post(path,query,data,res);
		break;
	}
}
function http_get(path,query,res){
	switch(path[0]) {
	case 'config':
		config.http_get(path,query,res);
		break;
	}
}

var connections={};
var connectionCounter=0;
server = http.createServer();
server.on('request', function (req, res) {
	//Web サーバーのロジック
	var uri = url.parse(req.url,true);
	var requestedFile = uri.pathname;
	if(requestedFile.slice(0,1)=='/') {
		requestedFile = requestedFile.slice(1);
	}
	var path = requestedFile.split('/');
	if(req.method=='POST') {
		var body='';
		req.on('data', function (data) {
			body +=data;
		});
		req.on('end',function(){
			var data =  qs.parse(body);
			http_post(path,uri.query,data,res);;
		});
	} else if(req.method=='GET') {
		http_get(path,uri.query,res);;
	}
});

server.on('connection', function (socket) {
		var id = connectionCounter++;
		socket._isIdle = true;
		socket._connectionId = id;
		connections[id] = socket;

		socket.on('close', function() {
				delete connections[id];
		});
		socket.setTimeout(1000);
});

server.listen(8888);

