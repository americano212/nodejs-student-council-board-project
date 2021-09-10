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
let bcrypt = require('bcrypt-nodejs');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
// 로그인 상태를 유지하기 위해 express-session을 사용하였습니다
var session = require('express-session');
var MySQLstore = require('express-mysql-session')(session);

var db_config  = require('./config/db-config.json');

// database
const sb = mysql.createConnection({
    host     : db_config.host,
    user     : db_config.user,
    password : db_config.password,
    database : db_config.database,
    dateStrings : 'date'
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


app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));
// express-session 하겠다는 것
app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: true,
    cookie : {
        maxAge : 1000 * 60 * 60
    }
}));

//function
function authIsOwner(req,res) {
    if (req.session.is_login){
        return true;
    }
    else{
        return false;
    }
}


// Routes
app.get('/', (req, res) => {
    console.log(req.session)
    var auth = authIsOwner(req,res);
    res.render('index', {check_login : auth});
})

app.get('/login', (req, res) => {
    var auth = authIsOwner(req,res);
    res.render('login', {check_login : auth});
});

app.post('/login', (req, res) => {
    var loginID = req.body.id_number;
    var loginPW = req.body.pw;
    var loginSQL = 'SELECT * FROM sbuser WHERE u_studentID = ?';
    sb.query(loginSQL, loginID, function(err, rows, fields){
        if (err) {
            console.log('err : ' + err);
        }
        else {
             console.log(rows);
             if (rows[0]!=undefined){
                 if (bcrypt.compareSync(loginPW, rows[0].u_password)){
                     console.log('로그인 성공');
                     req.session.is_login = true;
                     req.session.studentID = loginID;
                     req.session.save(function(){
                         return res.redirect('/');
                     });

                 }
                 else{
                     console.log('패스워드 일치하지 않음');
                     res.send("<script>alert('패스워드 일치하지 않음');location.href='/login';</script>");
                 }
             }
             else{
                 console.log(rows[0]);
                 console.log('학번을 다시 확인해주세요 ');
                 res.send("<script>alert('학번을 다시 확인해주세요 ');location.href='/login';</script>");
             }
        }
    });

});

app.get('/logout',(req,res) => {
    console.log('logout');
    if (req.session.is_login){
        req.session.destroy(function(err){
            if(err) throw err;
            res.redirect('/');
        })
    }
    else{
        console.log('로그인 상태가 아닌데 로그아웃 호출');
        res.redirect('/');
    }
})
/*app.get('/register', (req, res) => {
    res.render('register');
})*/
var registerRouter = require('./public/js/register');
app.use('/register', registerRouter);

app.get('/write', (req, res) => {
    var auth = authIsOwner(req,res);
    res.render('write', {check_login : auth});
})

app.post('/write', (req,res) => {
    const post = req.body;
    const sql = 'INSERT INTO tblboard (b_title,b_type,b_content,b_created,b_writer_seq,b_status) VALUES';
    const sqlValue = `("${post.title}","${post.text_type}","${post.description}",NOW(),0,0);`;

    sb.query(sql+sqlValue,req.body,function(err,result,fields){
        if (err) throw err;
        console.log(result);
        res.redirect('/board');
    });
});

app.get('/board', (req, res) => {
    var auth = authIsOwner(req,res);
    const sql = "SELECT b_seq,b_title,b_created,b_hit,b_like FROM tblboard ORDER BY b_seq DESC";
    sb.query(sql,function(err,result,fields){
        if(err) throw err;
        res.render('board',{contents : result, check_login : auth});
    });
});

app.get('/detail/:id', (req,res) => {
    var auth = authIsOwner(req,res);
    const sql = "SELECT * FROM tblboard WHERE b_seq = ?";
    sb.query(sql,[req.params.id],function(err,result,fields){
        if(err) throw err;
        res.render('detail',{contents : result[0], check_login : auth});
        console.log(result[0]);
    });
});

app.get('/edit/:id', (req,res) => {
    var auth = authIsOwner(req,res);
    const sql = "SELECT * FROM tblboard WHERE b_seq = ?";
    sb.query(sql,[req.params.id],function(err,result,fields){
        if(err) throw err;
        res.render('edit',{contents : result[0], check_login : auth});
        console.log(result[0]);
    });
});

app.post('/edit/:id', (req,res) => {

  const post = req.body;
  var type = post.text_type
  var id = req.params.id;
  const sql = 'UPDATE tblboard SET b_title=?, b_type=?, b_content=? WHERE b_seq=?';

  sb.query(sql,[post.title,type,post.description, id],function(err,result,fields){
      if (err) throw err;
      console.log(result);
      res.redirect('/board');
  });
});

// Port Setting
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
