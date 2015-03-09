var express = require('express');
var router = express.Router();
var parse = require('csv-parse');
var fs = require("fs");
var stream = require('stream');
var Monitor = require('monitor').start();
var processMonitor = new Monitor({probeClass: 'Process'});
processMonitor.connect();
var results = [];


router.post("/", function (req, res) {
    req.setTimeout(600000);
    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
        var readable = file;
        function onDone(result) {
            results.unshift(result);
            res.send(result);
        }

        function onError(error) {
            res.writeHead(502, {Connection: 'close', Location: '/'});
            res.end();
        }

        readable.on('data', function (chunk) {
            readable.pause();
            setTimeout(function() {
                readable.resume();
            }, 50);
        });

        parseCSVFile(file, filename, onDone, onError);
    });

});

router.get('/', function (req, res) {
    res.send(results);
});

function parseCSVFile(stream, filename, onDone, onError) {
    var source = stream,
        result = {filename: filename, begin: Date.now(), monitorStat: []};

    pushMonitorStat(result.monitorStat, result.begin);

    var parser = parse({
        delimiter: ',',
        columns: true
    });

    parser.on("readable", function () {
        var record;
        if (parser.lines > 0 && !result.columns) {
            result.columns = [];
            parser.options.columns.forEach(function (column, index) {
                result.columns.push({
                    name: column,
                    unique: [],
                    notNull: 0,
                    type: checkType(parser.line[index])
                });
            });
        }

        if (parser.lines % 1000 === 0) {
            pushMonitorStat(result.monitorStat);
        }

        if (record = parser.read()) {
            result.columns.forEach(function (column, index) {
                var column = record[column.name];
                if (column && column !== "") {
                    result.columns[index].notNull++;
                }

                if (result.columns[index].unique.indexOf(column) == -1) {
                    result.columns[index].unique.push(column);
                }
            })
        }

    });

    parser.on("error", function (error) {
        parser.end();
        onError(error);
    });

    parser.on("end", function () {
        result.rows = parser.lines;
        result.columns.forEach(function (column, index) {
            column.unique = column.unique.length;
            column.notNull = column.notNull / result.rows;
        });
        result.end = Date.now();
        pushMonitorStat(result.monitorStat, result.end);
        result.monitorStat = finalizeStat(result.monitorStat);
        onDone(result);
    });

    source.pipe(parser);
}

function checkType(value) {
    //select integers only
    var intRegex = /[0-9 -()+]+$/;
    //match ints and floats/decimals
    var floatRegex = /[-+]?(\d*[.])?\d+/;
    //match any ip address
    var ipRegex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\b/;
    //match date in format MM/DD/YYYY
    var dateMMDDYYYRegex = /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/;
    //match email address
    var emailRegex = /\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/;

    if (dateMMDDYYYRegex.test(value)) {
        return 'date';
    }
    if (ipRegex.test(value)) {
        return 'ip';
    }

    if (emailRegex.test(value)) {
        return 'email';
    }
    if (intRegex.test(value)) {
        return 'integer';
    }
    if (floatRegex.test(value)) {
        return 'floatRegex';
    }
    return 'string';
}


function pushMonitorStat(stat, date) {
    stat.push(
        {
            date: date ? date : Date.now(),
            heap: processMonitor.get('heapUsed'),
            totalHeap: processMonitor.get('heapTotal')
        });
    if (stat.length > 5000) {
        stat.shift();
    }
}

function finalizeStat (stats) {
    if (stats.length > 100) {
        var slicer = Math.round(stats.length/100) + 1,
            temp = [];
        stats.forEach(function (item, index) {
            if (index % slicer == 0) {
                temp.push(item);
            }
        });
        stats = temp;
    }
    return stats;
}

module.exports = router;