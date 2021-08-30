var http = require('http');
var fs = require('fs');
var url = require('url');
var mysql = require('mysql');
const express = require('express')
const app = express()
const port = 3000
var path = require('path');

app.use(express.static(path.join(__dirname,'/')));

app.get('/', function(req, res){
    return res.sendFile(__dirname+'/index.html')
})

app.get('/login', function(req, res){
    return res.sendFile(__dirname+'/login.html')
})

app.get('/register', function(req, res){
    return res.sendFile(__dirname+'/register.html')
})

app.get('/board', function(req, res){
    return res.sendFile(__dirname+'/board.html')
})


app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})


/*
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

    }
    response.writeHead(200);
    response.end(fs.readFileSync(__dirname + _url));
});

app.listen(3000);
*/
