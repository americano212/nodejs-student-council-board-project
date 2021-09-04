const mySql = require('mysql')
var db_config  = require('../../config/db-config.json');

const info = {
    host     : db_config.host,
    user     : db_config.user,
    password : db_config.password,
    database : db_config.database
}

let mysql = mySql.createConnection(info)

mysql.connect((error)=> {
    if(error){
        console.log("DB 연동 실패 : ", error)
    }
    else {
        console.log("DB 연동 성공!")
    }
})

module.exports = {
    mysql, info
}
