var http = require('http');
var fs = require('fs');
var url = require('url');
var mysql = require('mysql');
const express = require('express');
const app = express();
const port = 3000
var path = require('path');
const ejs = require('ejs');
const bodyParser = require('body-parser');

var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
// 로그인 상태를 유지하기 위해 express-session을 사용하였습니다
let session = require('express-session');



// database
const sb = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12341234!',
    database: 'test'
});

sb.connect(function(err){
    if (err) throw err;
    console.log('Connected DBDB');
});


// setting
app.use(express.static(__dirname+'/public'));
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()) // for parsing application/json

// Routes
app.get('/', (req, res) => {
    res.render('index');
})

app.get('/login', (req, res) => {
    res.render('login');
})

/*app.get('/register', (req, res) => {
    res.render('register');
})*/
var registerRouter = require('./public/js/register');
app.use('/register', registerRouter);

app.get('/write', (req, res) => {
    res.render('write');
})

app.post('/write', (req,res) => {
    const post = req.body;
    const sql = 'INSERT INTO tblboard (b_title,b_type,b_content,b_created,b_modified,b_writer_seq,b_status) VALUES';
    const sqlValue = `("${post.title}","${post.text_type}","${post.description}",NOW(),NOW(),0,0);`;

    sb.query(sql+sqlValue,req.body,function(err,result,fields){
        if (err) throw err;
        console.log(result);
        res.send('글이 작성되었습니다.');
    });
});

app.get('/board', (req, res) => {
    const sql = "SELECT * FROM tblboard";
    sb.query(sql,function(err,result,fields){
        if(err) throw err;
        res.render('board',{contents : result});
    });
});

app.get('/detail/:id', (req,res) => {

    const sql = "SELECT * FROM tblboard WHERE b_seq = ?";
    sb.query(sql,[req.params.id],function(err,result,fields){
        if(err) throw err;
        res.render('detail',{contents : result[0]});
        console.log(result[0]);
    });
});
// Port Setting
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})



app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));
// exprees-session 하겠다는 것
app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: true,
}))


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
