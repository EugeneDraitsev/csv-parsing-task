var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var users = require('./routes/users');
var uploads = require('./routes/uploads')
var multer = require('multer');
var Monitor = require('monitor').start();
var processMonitor = new Monitor({probeClass: 'Process'});
processMonitor.connect();

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//app.use(multer(
//    {
//        inMemory: true,
//        dest: "./uploads/",
//        onFileUploadStart: function (file, req, res) {
//            console.log(file.fieldname + ' is starting ...')
//        },
//        onFileUploadData: function (file, data, req, res) {
//            //console.log(data.length + ' of ' + file.fieldname + ' arrived')
//        },
//        onFileUploadComplete: function (file, req, res) {
//            console.log(file.fieldname + ' uploaded to  ' + file.path + ' used: ' +  processMonitor.get('heapUsed')/1024/1024 + ' MB memory');
//            //fs.unlink('./' + file.path, function () {
//            //    console.log(file.fieldname + ' unlinked from ' + file.path + ' used: ' + processMonitor.get('heapUsed') / 1024 / 1024 + ' MB memory');
//            //});
//        },
//        onParseStart: function () {
//            console.log('Form parsing started at: ', new Date())
//        },
//        onParseEnd: function (req, next) {
//            console.log('Form parsing completed at: ', new Date());
//            next();
//        }
//    }
//));

app.use('/users', users);
app.use('/uploads', uploads);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;