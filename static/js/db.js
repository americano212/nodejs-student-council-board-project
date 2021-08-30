const mySql = require('mysql')

const info = {
    host: 'localhost',
    user: 'root',
    password: '12341234!',
    port:  3306 ,
    database: 'sb'
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
