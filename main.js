var http = require('http');
var fs = require('fs');
var url = require('url');
var mysql = require('mysql');
const express = require('express')
const app = express()
const port = 3000
var path = require('path');
const ejs = require('ejs');

// setting
app.use(express.static(path.join(__dirname,'/')));
app.set('view engine', 'ejs');
app.set('views', './views');


// Routes
app.get('/', (req, res) => {
    res.render('index');
})

app.get('/login', (req, res) => {
    res.render('login');
})

app.get('/register', (req, res) => {
    res.render('register');
})

app.get('/board', (req, res) => {
    res.render('board');
})

// Port Setting
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
