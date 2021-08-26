var http = require('http');
var fs = require('fs');
var url = require('url');

var app = http.createServer(function(request,response){
    var _url = request.url;
    if (_url == '/favicon.ico'){
        return response.writeHead(404);
    }
    if(_url == '/'){
        _url = '/index.html';
    }
    else if (_url == '/login') {
        _url = '/index.html';
    }
    else if (_url == '/register') {
        _url = '/index.html';
    }
    else if (_url == '/board') {
        _url = '/index.html';
    }
    else if (_url == '/notice') {
        _url = '/index.html';
    }
    else if (_url == '/write') {
        _url = '/index.html';
    }
    else if (_url == '/mypage') {
        _url = '/index.html';
    }
    response.writeHead(200);
    response.end(fs.readFileSync(__dirname + _url));
});

app.listen(3000);
