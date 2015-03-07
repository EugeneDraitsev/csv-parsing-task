var express = require('express');
var router = express.Router();
var util = require("util");
var fs = require("fs");

router.post("/", function(req, res, next){
    if (req.files) {
        console.log(util.inspect(req.files));
        if (req.files.file.size === 0) {
            return next(new Error("Hey, first would you select a file?"));
        }
        fs.exists(req.files.file.path, function(exists) {
            if(exists) {
                res.send('File uploaded to: ' + req.files.file.path + ' - ' + req.files.file.size + ' bytes');
                res.end("Got your file!");
            } else {
                res.end("Well, there is no magic for those who don’t believe in it!");
            }
        });
    }
});
module.exports = router;