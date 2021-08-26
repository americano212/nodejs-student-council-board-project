var http = require('http');
var fs = require('fs');
var url = require('url');
var mysql = require('mysql');
var template = require('./static/js/template.js');

var db = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    password : 'qw0212',
    database : 'test'
});
db.connect();

var app = http.createServer(function(request,response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;
    if (pathname == '/favicon.ico'){
        return response.writeHead(404);
    }
    if(pathname == '/'){
        _url = '/index.html';
    }
    else if (pathname == '/login') {
        _url = '/login.html';
    }
    else if (pathname == '/register') {
        _url = '/register.html';
    }
    else if (pathname == '/board') {
        _url = '/board.html';
        db.query(`SELECT * FROM tblBoard`,function(error, contents){
            var title = '';
            var list = template.list(contents);
            var html = template.HTML(title,list,``,``);
        });
    }
    else if (pathname == '/notice') {
        _url = '/index.html';
    }
    else if (pathname == '/write') {
        _url = '/index.html';
    }
    else if (pathname == '/mypage') {
        _url = '/index.html';
    }
    response.writeHead(200);
    response.end(fs.readFileSync(__dirname + _url));
});

app.listen(3000);
