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
app.use(bodyParser.urlencoded({ extended: true }));

function authIsOwner(req,res) {
    if (req.session.is_login){
        return true;
    }
    else{
        return false;
    }
}

router.get('/notice1', function (req, res) {
    var auth = authIsOwner(req,res);
    req.session.is_email = false;
    logger.log('info','200 notice1 load');
    return res.render('notice/notice1', { check_login : auth });
});

router.get('/notice2', function (req, res) {
    var auth = authIsOwner(req,res);
    req.session.is_email = false;
    logger.log('info','200 notice2 load');
    return res.render('notice/notice2', { check_login : auth });
});

router.get('/notice3', function (req, res) {
    var auth = authIsOwner(req,res);
    req.session.is_email = false;
    logger.log('info','200 notice3 load');
    return res.render('notice/notice3', { check_login : auth });
});

router.get('/notice4', function (req, res) {
    var auth = authIsOwner(req,res);
    req.session.is_email = false;
    logger.log('info','200 notice4 load');
    return res.render('notice/notice4', { check_login : auth });
});

module.exports = router;
