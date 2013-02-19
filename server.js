var express = require('express'),
    fs = require('fs')
    app = express.createServer();

app.get('/BingMap.js', function(req, res) {
    fs.readFile(__dirname + '/public/BingMap.js', 'utf8', function(err, text){
        res.send(text);
    });
});

app.get('/:url', function(req, res) {
    fs.readFile(__dirname + '/public/example/'+req.params.url, 'utf8', function(err, text){
        res.send(text);
    });
});

app.listen(process.env.PORT || 81);
console.log('ready')