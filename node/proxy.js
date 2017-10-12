$ vi proxy.js

var http = require('http');
var httpProxy = require('http-proxy');

var apacheProxy = new httpProxy.createProxyServer({
    target: {
    host: 'localhost',
    port: 8080
}});

var nodeProxy = new httpProxy.createProxyServer({
    target: {
    host: 'localhost',
    port: 8081
}});

var server = http.createServer(function ( req, res ) {
    if (req.headers.host == 'example.com' || req.headers.host == 'apache.example.com') {
        apacheProxy.web( req, res );
    } else if (req.headers.host == 'node.example.com') {
        nodeProxy.web( req, res );
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(80, function(){
  process.setuid(500); //上記で設定したユーザID
});
console.log('It Works!');

