var http = require('http');
var fs = require('fs');
var url = require('url');
var mysql = require('mysql');
const express = require('express');
const app = express();
const port = 3000
var path = require('path');
const ejs = require('ejs');
var router = express.Router();
// db를 사용
var db = require('./db')
let bcrypt = require('bcrypt-nodejs');
var favicon = require('static-favicon');
var logger_mg = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
// 로그인 상태를 유지하기 위해 express-session을 사용하였습니다
let session = require('express-session');
var db_config  = require('../../config/db-config.json');
var MySQLstore = require('express-mysql-session')(session);

const logger = require('./Logger');

app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }))
// get요청시 페이지를 렌더하는데 title에 '회원가입'이라는 변수를 가지고 간다.

function authIsOwner(req,res) {
    if (req.session.is_login){
        return true;
    }
    else{
        return false;
    }
}
app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: true,
    cookie : {
        maxAge : 1000 * 60 * 60
    },
    store : new MySQLstore({
        host     : db_config.host,
        user     : db_config.user,
        password : db_config.password,
        database : db_config.database
    })
}));

function authIsEmail(req,res) {
    if (req.session.is_email){
        return true;
    }
    else{
        return false;
    }
}


router.get('/', function (req, res) {
    var auth = authIsOwner(req,res);
    req.session.is_email = false;
    logger.log('info','200 register page load');
    return res.render('register', { title: '회원가입', check_login : auth });
});

// post요청시 회원가입을 하는 기능을 수행한다.
router.post('/', (req, res, next) => {
    // 사용자가 웹 페이지에서 입력한 id, pw를 id, pw 라는 변수로 저장한다.
    let {name, id_number,major,pw} = req.body;
    let email_addr = req.session.email_addr;
    /*let name = req.body.name;
    let id_number =req.body.id_number;
    let major =req.body.major;
    let pw =req.body.pw;
    let email_addr =req.body.email_addr;*/
    // 비밀번호를 암호화 한다.(bcrypt에서 지원하는 hashSync라는 함수로 암호화)
    pw = bcrypt.hashSync(pw);
    if (authIsEmail(req,res)){
        // db에 저장하는 기능
        let sql = { name,id_number,major, pw,email_addr };
        var check_email = authIsEmail(req,res);
        console.log(check_email);
        console.log(sql);
        logger.log('info','200 register'+sql);
        db.mysql.query('INSERT INTO sbuser (u_name, u_studentID,u_major,u_password,u_email) VALUES(?,?,?,?,?)', [name,id_number,major, pw,email_addr], (err) => {
            // err에서는 입력한 아이디가 이미 db상에서 존재하는 경우에 발생한다.
            if (err) {
                console.log(err);
                logger.log('error','ERR register : (already in DB)' + err);
                res.send("<script>alert('이미 가입된 아이디입니다');location.href='/register';</script>");
                throw err;
            }
            else {
            // 아이디가 db에 저장되어 있지 않는 경우라면 회원가입을 완료한뒤에 로그인페이지로 이동한다.
                logger.log('info','200 register success');
                res.send("<script>alert('회원가입 완료');location.href='/login';</script>");
            }
        })
    }
    else{
        logger.log('error','ERR register : (Not email auth yet)');
        res.send("<script>alert('이메일 인증을 해야 가입하실 수 있습니다.');location.href='/register';</script>");
    }
})

module.exports = router;
