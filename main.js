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
        _url = '/login.html';
    }
    else if (_url == '/register') {
        _url = '/register.html';
    }
    else if (_url == '/board') {
        _url = '/board.html';
    }
    response.writeHead(200);
    response.end(fs.readFileSync(__dirname + _url));
});

app.listen(3000);
