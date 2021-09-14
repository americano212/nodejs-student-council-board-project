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
var requestIp = require('request-ip');
var db_config  = require('./config/db-config.json');
var admin_config  = require('./config/admin-config.json');
const { smtpTransport } = require('./config/email');

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
    },
    store : new MySQLstore({
        host     : db_config.host,
        user     : db_config.user,
        password : db_config.password,
        database : db_config.database
    })
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
    const sql = "SELECT b_seq,b_title,b_created,b_hit,b_like,b_type,b_status FROM tblboard WHERE b_status IN(1) ORDER BY b_seq DESC limit 5";
    console.log(requestIp.getClientIp(req));
    sb.query(sql,function(err,result,fields){
        if(err) throw err;

        res.render('index',{contents : result, check_login : auth});
    });
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
                     req.session.u_seq = rows[0].u_seq;
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

var generateRandom = function (min, max) {
    var ranNum = Math.floor(Math.random()*(max-min+1)) + min;
    return ranNum;
};

var check_number,sendEmail;
app.get('/mailsend', (req, res) => {
    console.log("메일 발송 준비");
    const number = generateRandom(111111,999999);
    sendEmail = req.query.email_addr;
    req.session.email_addr = sendEmail;
    const mailOptions = {
        from: "wq0212@naver.com",
        to: sendEmail+"@sogang.ac.kr",
        subject: "[공학부 학생회]인증 관련 이메일 입니다",
        text: "오른쪽 숫자 6자리를 입력해주세요 : " + number
    };
    console.log(mailOptions)
    const result = smtpTransport.sendMail(mailOptions, (error, responses) => {
        if (error) {
            console.log("email fail");

        } else {
          console.log("email success");

        }
        smtpTransport.close();
    });
    let checkemail = new Object();
    checkemail.number = number;
    check_number = number;
    res.send("<script>alert('메일을 전송했습니다.');</script>");
})

app.get('/mailcheck',(req,res) => {
    console.log(req.query);
    console.log(check_number);
    if(check_number==undefined){
        res.send("<script>alert('메일주소를 입력하고, 인증번호를 먼저 전송해주세요.');</script>");
    }
    else if(check_number!=req.query.email_code){
        res.send("<script>alert('잘못된 코드입니다. 지속된다면 관리자에 문의주세요.');</script>");
    }
    else{
        req.session.is_email = true;
        res.send("<script>alert('인증성공');</script>");
    }

});

app.get('/notice', (req, res) => {
    console.log(req.session)
    var auth = authIsOwner(req,res);
    res.render('notice', {check_login : auth});
})

app.get('/mypage', (req, res) => {
    var auth = authIsOwner(req,res);
    var url = require('url');
    var queryData = url.parse(req.url, true).query;
    if(!queryData.page){
      queryData.page = 1;
    }
    const sql1 = "SELECT b_seq,b_title,b_created,b_hit,b_like,b_type FROM tblboard WHERE b_status NOT IN(4) AND b_writer_seq = ";
    const sqlValue = `"${req.session.u_seq}"`;
    const sql2 = " ORDER BY b_seq DESC";
    if (auth){
        sb.query(sql1+sqlValue+sql2,function(err,result,fields){
            if(err) throw err;
            res.render('mypage',{contents : result, check_login : auth, contents_len: result.length, page : queryData.page});
        });
    }else{
        res.send("<script>alert('로그인해야 이용하실 수 있습니다.');location.href='/login';</script>");
    }

});

app.get('/write', (req, res) => {
    var auth = authIsOwner(req,res);
    if (auth){
        res.render('write', {check_login : auth});
    }
    else{
        res.send("<script>alert('로그인해야 글쓰기가 가능합니다.');location.href='/login';</script>");
    }
})

app.post('/write', (req,res) => {
    const post = req.body;
    const sql = 'INSERT INTO tblboard (b_title,b_type,b_content,b_created,b_writer_seq,b_status) VALUES';
    const sqlValue = `("${post.title}","${post.text_type}","${post.description}",NOW(),"${req.session.u_seq}",0);`;

    sb.query(sql+sqlValue,req.body,function(err,result,fields){
        if (err) throw err;
        console.log(result);
        res.redirect('/board');
    });
});

app.get('/board', (req, res) => {
    var auth = authIsOwner(req,res);
    var url = require('url');
    var queryData = url.parse(req.url, true).query;
    if(!queryData.page){
      queryData.page = 1;
    }
    const sql = "SELECT b_seq,b_title,b_created,b_hit,b_like,b_type,b_status FROM tblboard WHERE b_status NOT IN(4) ORDER BY b_seq DESC";
    sb.query(sql,function(err,result,fields){
        if(err) throw err;
        res.render('board',{contents : result, check_login : auth, contents_len : result.length, page : queryData.page});
    });
});

app.get('/detail/:id', (req,res) => {
    var auth = authIsOwner(req,res);
    const sql = "SELECT * FROM tblboard WHERE b_seq = ?";
    const sql_reply = "SELECT * FROM tblreply WHERE r_content_seq = ?";
    const sql_hitup = "UPDATE tblboard SET b_hit = b_hit + 1 WHERE b_seq = ?";
    sb.query(sql,[req.params.id],function(err,result,fields){
        sb.query(sql_reply,[req.params.id],function(err,result_reply,fields){
            if(err) throw err;
            var is_owner = false;
            if (result[0].b_status == 4){
                res.send("<script>alert('삭제된 글입니다.');location.href='/board';</script>");
            }
            else{
                if (req.session.u_seq !=undefined){
                    if (req.session.u_seq == result[0].b_writer_seq){
                        is_owner = true;
                    }
                }
                if(is_owner==false && result[0].b_status != 1){
                    res.send("<script>alert('승인되지 않은 글은 본인만 열람할 수 있습니다.');location.href='/board';</script>");
                }
                else{
                    sb.query(sql_hitup,[req.params.id],function(err,result_hit,fields){});
                    res.render('detail',{contents : result[0], check_login : auth, is_owner : is_owner, replys : result_reply, self_seq : req.params.id});
                    console.log(result[0]);
                }
            }
        });
    });
});

app.post('/detail/:id', (req,res) => {
    var auth = authIsOwner(req,res);
    const reply = req.body.reply;
    var id = req.params.id;

    const sql = 'INSERT INTO tblreply (r_content_seq,r_writer_seq,r_content,r_created) VALUES';
    const sqlValue = `("${id}","${req.session.u_seq}","${reply}",NOW());`;
    if(auth){
        sb.query(sql+sqlValue,function(err,result,fields){
            if (err) throw err;
            console.log(result);
            res.redirect(`/detail/${id}`);
        });
    }
    else{
        res.send("<script>alert('로그인 하셔야 댓글 작성이 가능합니다.');location.href='/board';</script>");
        res.redirect(`/detail/${id}`);
    }
});

app.post('/detail/:id', (req,res) => {
    var auth = authIsOwner(req,res);
    const reply = req.body.reply;
    var id = req.params.id;

    const sql = 'INSERT INTO tblreply (r_content_seq,r_writer_seq,r_content,r_created) VALUES';
    const sqlValue = `("${id}","${req.session.u_seq}","${reply}",NOW());`;
    if(auth){
        sb.query(sql+sqlValue,function(err,result,fields){
            if (err) throw err;
            console.log(result);
            res.redirect(`/detail/${id}`);
        });
    }
    else{
        res.send("<script>alert('로그인 하셔야 댓글 작성이 가능합니다.');location.href='/board';</script>");
        res.redirect(`/detail/${id}`);
    }
});

app.get('/edit/:id', (req,res) => {
    var auth = authIsOwner(req,res);
    const sql = "SELECT * FROM tblboard WHERE b_seq = ?";
    sb.query(sql,[req.params.id],function(err,result,fields){
        if(err) throw err;
        if (auth){
            if (req.session.u_seq == result[0].b_writer_seq){
                res.render('edit',{contents : result[0], check_login : auth});
                console.log(result[0]);
            }else{
                res.send("<script>alert('본인글만 접근할 수 있습니다.');location.href='/';</script>");
            }
        }else{
            res.send("<script>alert('로그인해야 접근가능합니다.');location.href='/login';</script>");
        }

    });
});

app.post('/edit/:id', (req,res) => {

  const post = req.body;
  var type = post.text_type;
  var id = req.params.id;

  const sql = 'UPDATE tblboard SET b_title=?, b_type=?, b_content=? WHERE b_seq=?';

  sb.query(sql,[post.title,type,post.description, id],function(err,result,fields){
      if (err) throw err;
      console.log(result);
      res.redirect('/board');
  });
});

app.get('/delete/:id', (req,res) => {

    var auth = authIsOwner(req,res);
    const sql = "UPDATE tblboard SET b_status = 4 WHERE b_seq = ?;";
    const sql1 = "SELECT * FROM tblboard WHERE b_seq = ?";
    sb.query(sql1,[req.params.id],function(err,result1,fields){
        if (auth || req.session.is_admin){
            if (req.session.u_seq == result1[0].b_writer_seq || req.session.is_admin){
                sb.query(sql,[req.params.id],function(err,result,fields){
                    if (err) throw err;
                    console.log(result);
                    res.redirect('/board');
                });
                console.log()
            }else{
                res.send("<script>alert('본인글만 삭제할 수 있습니다.');location.href='/';</script>");
            }
        }else{
            res.send("<script>alert('로그인해야 접근가능합니다.');location.href='/login';</script>");
        }
    });
});

app.get('/admin', (req,res) => {
    console.log('admin 페이지 접속 감지');
    res.render('admin');
});

app.post('/admin', (req,res) => {
    const post = req.body;
    req.session.is_admin = false;
    if (post.a_id == admin_config.admin_id && post.a_pw == admin_config.admin_pw){
        req.session.is_admin = true;
        res.redirect('/adminpage');
    }else{
        res.send("<script>alert('잘못된 관리자입니다.');location.href='/admin';</script>");
    }
});

app.get('/adminpage', (req,res) => {
    if (req.session.is_admin){
        console.log('adminpage 페이지 접속하였습니다.');
        const sql = "SELECT * FROM tblboard ORDER BY b_seq DESC";
        sb.query(sql,function(err,result,fields){
            if(err) throw err;
            res.render('adminpage',{contents : result});
        });
    }else{
        res.send("<script>alert('잘못된 관리자입니다.');location.href='/admin';</script>");
    }
});

app.get('/admindetail/:id', (req,res) => {
    const sql = "SELECT * FROM tblboard WHERE b_seq = ?";
    if (req.session.is_admin){
        sb.query(sql,[req.params.id],function(err,result,fields){
            if(err) throw err;

            res.render('admindetail',{contents : result[0]});
            console.log(result[0]);
        });
    }else{
        res.send("<script>alert('잘못된 관리자입니다.');location.href='/admin';</script>");
    }
});
app.get('/open/:id', (req,res) => {
    const sql = "UPDATE tblboard SET b_status = 1 WHERE b_seq = ?;";
    if (req.session.is_admin){
        sb.query(sql,[req.params.id],function(err,result,fields){
            if(err) throw err;
            res.redirect('/adminpage');
        });
    }else{
        res.send("<script>alert('잘못된 관리자입니다.');location.href='/admin';</script>");
    }
});

app.get('/unopen/:id', (req,res) => {
    const sql = "UPDATE tblboard SET b_status = 0 WHERE b_seq = ?;";
    if (req.session.is_admin){
        sb.query(sql,[req.params.id],function(err,result,fields){
            if(err) throw err;
            res.redirect('/adminpage');
        });
    }else{
        res.send("<script>alert('잘못된 관리자입니다.');location.href='/admin';</script>");
    }
});

app.get('/adminlogout',(req,res) => {
    console.log('logout');
    if (req.session.is_admin){
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

app.use(function(req, res, next) {
    res.status(404).send("<script>alert('잘못된 접근입니다.[404]');location.href='/';</script>");
});


// Port Setting
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
