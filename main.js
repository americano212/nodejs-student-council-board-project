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
var logger_mg = require('morgan');
var cookieParser = require('cookie-parser');
// 로그인 상태를 유지하기 위해 express-session을 사용하였습니다
var session = require('express-session');
var MySQLstore = require('express-mysql-session')(session);
var requestIp = require('request-ip');
var db_config  = require('./config/db-config.json');
var admin_config  = require('./config/admin-config.json');
const { smtpTransport } = require('./config/email');

const favicon = require('serve-favicon');

const logger = require('./public/js/Logger');

app.use(favicon(path.join(__dirname,'public','img','favicon.ico')));

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

app.use(bodyParser.urlencoded({ limit:'50mb', extended: true }));
app.use(bodyParser.json({limit:'50mb'})) // for parsing application/json


const axios = require("axios");
axios.default.timeout = 5 * 1000;
process.on("uncaughtException", function(err) { console.error("uncaughtException (Node is alive)", err); });

app.use(logger_mg('dev'));
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
    console.log(req.session);
    logger.log('info',req.session);
    var auth = authIsOwner(req,res);
    const sql = "SELECT b_seq,b_title,b_created,b_hit,b_like,b_type,b_status FROM tblboard2 WHERE b_status IN(1) ORDER BY b_seq DESC limit 5";
    console.log(requestIp.getClientIp(req));
    logger.log('info',requestIp.getClientIp(req));
    sb.query(sql,function(err,result,fields){
        if(err) throw err;
        logger.log('info','200 main page');
        res.render('index',{contents : result, check_login : auth});
    });
})


app.get('/login', (req, res) => {
    var auth = authIsOwner(req,res);
    logger.log('info','200 login page');
    res.render('login', {check_login : auth});
});

app.post('/login', (req, res) => {
    var loginID = req.body.id_number;
    var loginPW = req.body.pw;
    var loginSQL = 'SELECT * FROM sbuser WHERE u_studentID = ?';
    sb.query(loginSQL, loginID, function(err, rows, fields){
        if (err) {
            console.log('err : ' + err);
            logger.log('error','ERR Login'+err);
        }
        else {
             if (rows[0]!=undefined){
                 if (bcrypt.compareSync(loginPW, rows[0].u_password)){
                     console.log('로그인 성공');
                     logger.log('info','200 login success');
                     req.session.is_login = true;
                     req.session.studentID = loginID;
                     req.session.u_seq = rows[0].u_seq;
                     req.session.save(function(){
                         return res.redirect('/');
                     });

                 }
                 else{
                     console.log('패스워드 일치하지 않음');
                     logger.log('error','pw ERR login fail');
                     res.send("<script>alert('패스워드 일치하지 않음');location.href='/login';</script>");
                 }
             }
             else{
                 console.log('학번을 다시 확인해주세요 ');
                 logger.log('error','id ERR login fail');
                 res.send("<script>alert('학번을 다시 확인해주세요 ');location.href='/login';</script>");
             }
        }
    });

});

app.get('/logout',(req,res) => {
    console.log('logout');
    logger.log('info','200 logout success');
    if (req.session.is_login){
        req.session.destroy(function(err){
            if(err){
                logger.log('error','ERR logout fail'+err);
                throw err;
            }
            res.redirect('/');
        })
    }
    else{
        console.log('로그인 상태가 아닌데 로그아웃 호출');
        logger.log('error','ERR logout fail(not Login)');
        res.redirect('/');
    }
})
/*app.get('/register', (req, res) => {
    res.render('register');
})*/
var registerRouter = require('./public/js/register');
app.use('/register', registerRouter);

var noticeRouter = require('./public/js/notice');
app.use('/notice', noticeRouter);


var generateRandom = function (min, max) {
    var ranNum = Math.floor(Math.random()*(max-min+1)) + min;
    return ranNum;
};

var check_number,sendEmail;
app.get('/mailsend', (req, res) => {
    console.log("메일 발송 준비");
    sendEmail = req.query.email_addr;
    logger.log('info','200 Ready Email Send :'+sendEmail);
    req.session.email_addr = sendEmail;
    const sql = "SELECT * from sbuser WHERE u_email = ?";
    sb.query(sql,[sendEmail],function(err,result,fields){
        if(err){
            logger.log('error','ERR cant get email sql :'+err);
            throw err;
        }
        console.log(result);

        if (result[0]!=undefined){
            res.send("<script>alert('이미 가입된 사용자 입니다. 비밀번호를 분실하셨거나, 본인이 가입하지 않았을시 관리자에게 문의주세요');</script>");
        }
        else{
            const number = generateRandom(111111,999999);
            const mailOptions = {
                from: "sg_harang@naver.com",
                to: sendEmail+"@sogang.ac.kr",
                subject: "[공학부 학생회]인증 관련 이메일 입니다",
                text: "오른쪽 숫자 6자리를 입력해주세요 : " + number
            };
            console.log(mailOptions);
            logger.log('info',mailOptions);
            const result = smtpTransport.sendMail(mailOptions, (error, responses) => {
                if (error) {
                    console.log("email fail"+error);
                    logger.log('error','ERR email fail :'+err);
                } else {
                  console.log("email success");
                  logger.log('info',"email success");
                }
                smtpTransport.close();
            });
            let checkemail = new Object();
            checkemail.number = number;
            check_number = number;
            res.send("<script>alert('메일을 전송했습니다.');</script>");
        }
    });


})

app.get('/mailcheck',(req,res) => {
    console.log(req.query);
    console.log(check_number);
    if(check_number==undefined){
        logger.log('error','ERR email fail :'+'no mail_addr');
        res.send("<script>alert('메일주소를 입력하고, 인증번호를 먼저 전송해주세요.');</script>");
    }
    else if(check_number!=req.query.email_code){
        logger.log('error','ERR email fail :'+'input error mail code');
        res.send("<script>alert('잘못된 코드입니다. 지속된다면 관리자에 문의주세요.');</script>");
    }
    else{
        req.session.is_email = true;
        logger.log('info',"email auth success");
        res.send("<script>alert('인증성공');</script>");
    }

});

app.get('/notice', (req, res) => {
    logger.log('info',"200 Notice");
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
    const sql1 = "SELECT b_seq,b_title,b_created,b_hit,b_like,b_type FROM tblboard2 WHERE b_status NOT IN(4) AND b_writer_seq = ";
    const sqlValue = `"${req.session.u_seq}"`;
    const sql2 = " ORDER BY b_seq DESC";
    if (auth){
        sb.query(sql1+sqlValue+sql2,function(err,result,fields){
            if(err){
                logger.log('errer',"ERR Mypage : "+err);
                throw err;
            }
            var hit_sum = 0;
            for (let i = 0; i < result.length; i++) {
                hit_sum = hit_sum + result[i].b_hit;
            }
            logger.log('info',"200 Mypage");
            res.render('mypage',{contents : result, check_login : auth, contents_len: result.length,hit_len : hit_sum, page : queryData.page});
        });
    }else{
        logger.log('errer',"ERR Mypage (not login)");
        res.send("<script>alert('로그인해야 이용하실 수 있습니다.');location.href='/login';</script>");
    }

});

app.get('/write', (req, res) => {
    var auth = authIsOwner(req,res);
    if (auth){
        logger.log('info',"200 Write page");
        res.render('write', {check_login : auth});
    }
    else{
        logger.log('errer',"ERR Write (not login)");
        res.send("<script>alert('로그인해야 글쓰기가 가능합니다.');location.href='/login';</script>");
    }
})

app.post('/write', (req,res) => {
    const post = req.body;
    const desc = post.description;
    const descript = Buffer.from(desc, "utf8").toString('base64');
    const sql = 'INSERT INTO tblboard2 (b_title,b_type,b_content,b_created,b_writer_seq,b_status) VALUES';
    const sqlValue = `("${post.title}","${post.text_type}","${descript}",NOW(),"${req.session.u_seq}",0);`;


    if(!post.title){
        logger.log('errer',"ERR Write (no title)");
        res.send("<script>alert('제목을 입력해주세요.');location.href='/write';</script>");
    }
    else{
      sb.query(sql+sqlValue,req.body,function(err,result,fields){

        if (err){
            logger.log('errer',"ERR Write (large capacity)");
            res.send("<script>alert('텍스트 용량이 너무 커서 게시할 수 없습니다.');location.href='/write';</script>");
            throw err;
        }
        else{
            console.log(result);
            logger.log('info','200 make new writing');
            res.redirect('/board');
        }
      });
    }
});

app.get('/board', (req, res) => {
    var auth = authIsOwner(req,res);
    var url = require('url');
    var queryData = url.parse(req.url, true).query;
    if(!queryData.page){
      queryData.page = 1;
    }
    const sql = "SELECT b_seq,b_title,b_created,b_hit,b_like,b_type,b_status FROM tblboard2 WHERE b_status NOT IN(4) ORDER BY b_seq DESC";
    sb.query(sql,function(err,result,fields){
        if(err){
            logger.log('errer',"ERR Board : "+err);
            throw err;
        }
        logger.log('info','200 Board');
        res.render('board',{contents : result, check_login : auth, contents_len : result.length, page : queryData.page});
    });
});

app.get('/detail/:id', (req,res) => {
    var auth = authIsOwner(req,res);
    const sql = "SELECT * FROM tblboard2 WHERE b_seq = ?";
    const sql_reply = "SELECT * FROM tblreply WHERE r_content_seq = ?";
    const sql_hitup = "UPDATE tblboard2 SET b_hit = b_hit + 1 WHERE b_seq = ?";
    sb.query(sql,[req.params.id],function(err,result,fields){
        sb.query(sql_reply,[req.params.id],function(err,result_reply,fields){
            if(err){
                logger.log('errer',"ERR Detail : "+err);
                throw err;
            }
            var is_owner = false;
            const b_content = Buffer.from(result[0].b_content, "base64").toString('utf8');
            if (result[0].b_status == 4){
                logger.log('errer',"ERR Detail (already delete)");
                res.send("<script>alert('삭제된 글입니다.');location.href='/board';</script>");
            }
            else{
                if (req.session.u_seq !=undefined){
                    if (req.session.u_seq == result[0].b_writer_seq){
                        logger.log('info','200 Detail auth Owner');
                        is_owner = true;
                    }
                }
                if(is_owner==false && result[0].b_status != 1){
                    logger.log('errer',"ERR Detail (not Owner)");
                    res.send("<script>alert('승인되지 않은 글은 본인만 열람할 수 있습니다.');location.href='/board';</script>");
                }
                else{
                    sb.query(sql_hitup,[req.params.id],function(err,result_hit,fields){});
                    logger.log('info','200 Show Detail');
                    res.render('detail',{contents : result[0], check_login : auth, is_owner : is_owner, replys : result_reply, self_seq : req.params.id, description_ : b_content});
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
    var r_s = 0;
    sb.query(`SELECT * from sbuser WHERE u_seq = "${req.session.u_seq}"`,function(err,result,fields){
        if (err){
            logger.log('error','ERR Detail : '+err);
            throw err;
        }

        const sql = 'INSERT INTO tblreply (r_content_seq,r_writer_seq,r_content,r_created,r_status) VALUES';
        if(auth){
            if (result[0].u_status == 7){
                logger.log('info','200 Link Super User');
                r_s = 1;
            }
            const sqlValue = `("${id}","${req.session.u_seq}","${reply}",NOW(),"${r_s}");`;
            if(!reply){
                logger.log('error','ERR Detail (no content on reply)');
                res.send(`<script>alert('내용을 입력해주세요');location.href='/detail/${id}';</script>`);
            }
            else{
              sb.query(sql+sqlValue,function(err,result,fields){
                  if (err){
                      logger.log('error','ERR Detail : '+err);
                      throw err;
                  }
                  console.log(result);
                  logger.log('info','200 Detail Upload');
                  res.redirect(`/detail/${id}`);
              });
            }
        }
        else{
            logger.log('error','ERR Detail (no login)');
            res.send(`<script>alert('로그인 하셔야 댓글 작성이 가능합니다.');location.href='/detail/${id}';</script>`);
        }
    });

});

/*app.get('/sitemap',(req,res) => {
    res.render('sitemap.xml');
});*/
/*app.post('/detail/:id', (req,res) => {
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
});*/

app.get('/edit/:id', (req,res) => {
    var auth = authIsOwner(req,res);
    const sql = "SELECT * FROM tblboard2 WHERE b_seq = ?";
    sb.query(sql,[req.params.id],function(err,result,fields){
        if(err){
            logger.log('error','ERR Edit : '+err);
            throw err;
        }
        if (auth){
            if (req.session.u_seq == result[0].b_writer_seq){
                const b_content = Buffer.from(result[0].b_content, "base64").toString('utf8');
                logger.log('info','200 Edit load success');
                res.render('edit',{contents : result[0], check_login : auth, description_ : b_content});
                console.log(result[0]);
            }else{
                logger.log('error','ERR Edit (not owner)');
                res.send("<script>alert('본인글만 접근할 수 있습니다.');location.href='/';</script>");
            }
        }else{
            logger.log('error','ERR Edit (no login)');
            res.send("<script>alert('로그인해야 접근가능합니다.');location.href='/login';</script>");
        }

    });
});

app.post('/edit/:id', (req,res) => {

  const post = req.body;
  var type = post.text_type;
  var id = req.params.id;
  const descript = Buffer.from(post.description, "utf8").toString('base64');
  const sql = 'UPDATE tblboard2 SET b_title=?, b_type=?, b_content=? WHERE b_seq=?';
  if(!post.title){
      logger.log('error','ERR Edit (no title)');
      res.send("<script>alert('제목을 입력해주세요');location.href='/edit/:id';</script>");
  }
  else{
    sb.query(sql,[post.title,type,descript, id],function(err,result,fields){
        if (err){
            logger.log('error','ERR Edit (large capacity) : '+ err);
            res.send("<script>alert('텍스트 용량이 너무 커서 게시할 수 없습니다.');location.href='/edit/:id';</script>");
            throw err;
        }
        else{
          console.log(result);
          logger.log('info','200 Edit success');
          res.redirect('/board');
        }
    });
  }
});

app.get('/delete/:id', (req,res) => {

    var auth = authIsOwner(req,res);
    const sql = "UPDATE tblboard2 SET b_status = 4 WHERE b_seq = ?;";
    const sql1 = "SELECT * FROM tblboard2 WHERE b_seq = ?";
    sb.query(sql1,[req.params.id],function(err,result1,fields){
        if (auth || req.session.is_admin){
            if (req.session.u_seq == result1[0].b_writer_seq || req.session.is_admin){
                sb.query(sql,[req.params.id],function(err,result,fields){
                    if (err){
                        logger.log('error','ERR DELETE : '+ err);
                        throw err;
                    }
                    console.log(result);
                    logger.log('info','200 DELETE success');
                    res.redirect('/board');
                });
                console.log()
            }else{
                logger.log('error','ERR Edit (not owner)');
                res.send("<script>alert('본인글만 삭제할 수 있습니다.');location.href='/';</script>");
            }
        }else{
            logger.log('error','ERR Edit (no login)');
            res.send("<script>alert('로그인해야 접근가능합니다.');location.href='/login';</script>");
        }
    });
});

app.get('/admin', (req,res) => {
    console.log('admin 페이지 접속 감지');
    logger.log('notice','Admin Page Access');
    res.render('admin');
});

app.post('/admin', (req,res) => {
    const post = req.body;
    req.session.is_admin = false;
    if (post.a_id == admin_config.admin_id && post.a_pw == admin_config.admin_pw){
        req.session.is_admin = true;
        logger.log('notice','Admin login Access success');
        res.redirect('/adminpage');
    }else{
        logger.log('crit','Admin Page Access denied');
        res.send("<script>alert('잘못된 관리자입니다.');location.href='/admin';</script>");
    }
});

app.get('/adminpage', (req,res) => {
    if (req.session.is_admin){
        console.log('adminpage 페이지 접속하였습니다.');

        const sql = "SELECT * FROM tblboard2 ORDER BY b_seq DESC";
        sb.query(sql,function(err,result,fields){
            if(err){
                logger.log('crit','Admin Page : '+ err);
                throw err;
            }
            logger.log('notice','Admin Page Access success');
            res.render('adminpage',{contents : result});
        });
    }else{
        logger.log('crit','Admin Page Access denied');
        res.send("<script>alert('잘못된 관리자입니다.');location.href='/admin';</script>");
    }
});

app.get('/admindetail/:id', (req,res) => {
    const sql = "SELECT * FROM tblboard2 WHERE b_seq = ?";

    if (req.session.is_admin){
        sb.query(sql,[req.params.id],function(err,result,fields){
            if(err){
                logger.log('crit','Admin Detail : '+ err);
                throw err;
            }
            const description_ = Buffer.from(result[0].b_content, "base64").toString('utf8');
            logger.log('notice','Admin Detail Access success');
            res.render('admindetail',{contents : result[0], description_ : description_});
            console.log(result[0]);
        });
    }else{
        logger.log('crit','Admin Detail Access denied');
        res.send("<script>alert('잘못된 관리자입니다.');location.href='/admin';</script>");
    }
});
app.get('/open/:id', (req,res) => {
    const sql = "UPDATE tblboard2 SET b_status = 1 WHERE b_seq = ?;";
    if (req.session.is_admin){
        sb.query(sql,[req.params.id],function(err,result,fields){
            if(err){
                logger.log('crit','Admin Open : '+ err);
                throw err;
            }
            logger.log('notice','Admin Open Access success');
            res.redirect('/adminpage');
        });
    }else{
        logger.log('crit','Admin Open Access denied');
        res.send("<script>alert('잘못된 관리자입니다.');location.href='/admin';</script>");
    }
});

app.get('/unopen/:id', (req,res) => {
    const sql = "UPDATE tblboard2 SET b_status = 0 WHERE b_seq = ?;";
    if (req.session.is_admin){
        sb.query(sql,[req.params.id],function(err,result,fields){
            if(err){
                logger.log('crit','Admin unOpen : '+ err);
                throw err;
            }
            logger.log('notice','Admin unOpen Access success');
            res.redirect('/adminpage');
        });
    }else{
        logger.log('crit','Admin unopen Access denied');
        res.send("<script>alert('잘못된 관리자입니다.');location.href='/admin';</script>");
    }
});

app.get('/adminlogout',(req,res) => {
    console.log('logout');
    if (req.session.is_admin){
        req.session.destroy(function(err){
            if(err){
                logger.log('crit','Admin logout : '+ err);
                throw err;
            }
            logger.log('notice','Admin logout success');
            res.redirect('/');
        })
    }
    else{
        logger.log('crit','Admin logout denied');
        console.log('로그인 상태가 아닌데 로그아웃 호출');
        res.redirect('/');
    }
})

app.use(function(req, res, next) {
    logger.log('error','404 Access denied');
    res.status(404).send("<script>alert('잘못된 접근입니다.[404]');location.href='/';</script>");
});


// Port Setting
app.listen(port, () => {
    logger.log('info','Server Open'+`${port}`);
    console.log(`Example app listening at http://localhost:${port}`)
})
