var winston = require('winston'); // 로그 처리 모듈
var winstonDaily = require('winston-daily-rotate-file'); // 로그 일별 처리 모듈
var moment = require('moment'); // 시간 처리 모듈

function timeStampFormat(){
    return moment().fotmat('YYYY-MM-DD HH:mm:ss.SSS ZZ');
    // ex) '2020-12-06 13:20:34.500 +0900'
}

var logger = winston.createLogger({
    levels: winston.config.syslog.levels,
    transports : [
        new (winstonDaily)({
            name : 'info-file',
            filename : './log/server',
            datePattern : 'YYYY-MM-DD',
            colorize : false,
            maxsize : 50000000,
            maxFiles : 1000,
            level : 'info',
            showLevel : true,
            json : false,
            timestamp : timeStampFormat
        }),
        new (winston.transports.Console)({
            name : 'debug-console',
            colorize : true,
            level : 'debug',
            showLevel : true,
            json : false,
            timestamp : timeStampFormat
        })
    ],
    exceptionHandlers : [
        new (winstonDaily)({
            name : 'exception-file',
            filename : './log/exception',
            datePattern : 'YYYY-MM-DD',
            colorize : false,
            maxsize : 50000000,
            maxFiles : 1000,
            level : 'error',
            showLevel : true,
            json : false,
            timestamp : timeStampFormat
        }),
        new (winston.transports.Console)({
            name : 'exception-console',
            colorize : true,
            level : 'debug',
            showLevel : true,
            json : false,
            timestamp : timeStampFormat
        })
    ]
});

module.exports = logger
