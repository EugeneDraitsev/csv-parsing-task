var express = require('express');
var router = express.Router();
var util = require("util");
var parse = require('csv-parse');
var multer = require('multer');
var fs = require("fs");

router.post("/", [multer({dest: './uploads'}), parseFile]);

function parseCSVFile(sourceFilePath, columns, onNewRecord, handleError, done) {
    var source = fs.createReadStream(sourceFilePath),
        result = {};

    var parser = parse({
        delimiter: ',',
        columns: columns
    });

    parser.on("readable", function () {
        var record;
        if (parser.lines === 1) {
            result.columns = [];
            parser.options.columns.forEach(function (column) {
                result.columns.push({name: column, unique: [], notNull: 0, type: 'type'});
            });
        }

        while (record = parser.read()) {
            result.columns.forEach(function (column, index) {
                var column = record[column.name];
                if (column && column !== "") {
                    result.columns[index].notNull++;
                }

                if (result.columns[index].unique.indexOf(column) == -1) {
                    result.columns[index].unique.push(column);
                }
            });
            onNewRecord(record);
        }
    });

    parser.on("error", function (error) {
        handleError(error)
    });

    parser.on("end", function () {
        result.rows = parser.lines;
        result.columns.forEach(function (column, index) {
            column.unique = column.unique.length;
            column.notNull = column.notNull / result.rows;
        });
        done(result);
    });

    source.pipe(parser);
}

//We will call this once Multer's middleware processed the request
//and stored file in req.files.fileFormFieldName

function parseFile(req, res, next) {
    req.setTimeout(600000);
    var filePath = req.files.file.path;
    console.log(filePath);

    function onNewRecord(record) {
        //console.log(record)
    }

    function onError(error) {
        console.log(error)
    }

    function done(result) {
        res.send(result);
        console.log(result);
    }

    var columns = true;
    parseCSVFile(filePath, columns, onNewRecord, onError, done);

}

//function(req, res, next){
//    if (req.files) {
//        console.log(util.inspect(req.files));
//        if (req.files.file.size === 0) {
//            return next(new Error("Hey, first would you select a file?"));
//        }
//        //fs.exists(req.files.file.path, function(exists) {
//        //    if(exists) {
//        //        res.send('File uploaded to: ' + req.files.file.path + ' - ' + req.files.file.size + ' bytes');
//        //        res.end("Got your file!");
//        //    } else {
//        //        res.end("Well, there is no magic for those who don’t believe in it!");
//        //    }
//        //});
//
//        console.log('imma let you finish but blocking the event loop is the best bug of all TIME')
//        res.send('File uploaded to: ' + req.files.file.path + ' - ' + req.files.file.size + ' bytes');
//        res.end("Got your file!");
//        console.log(req.files.file.size);
//    }
//}

module.exports = router;