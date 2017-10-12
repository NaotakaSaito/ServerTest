var http = require('http');
var url = require('url');
qs = require('querystring');
var fs = require('fs');
var config = require('./config/index');
//var config = require('./config/config');
var DEFAULT_FILE= 'index.html';

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
	default:
		var requestedFile = path.join('/');
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

server.listen(80);

