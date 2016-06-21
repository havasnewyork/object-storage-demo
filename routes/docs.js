var express = require('express');
var router = express.Router();

var request = require('request');
var fs = require('fs');

function getConfig(req) {
    var userslug = req.app.get('storage-userslug');
    var container = req.app.get('storage-container');
    var auth = req.app.get('storage-auth-' + userslug);
    return {auth: auth, userslug: userslug, container: container};
}

// GET /docs >> List objects in a container
router.get('/', function(req, res) {

    var config = getConfig(req);

    request({
        url: config.auth.url + '/' + config.container, 
        headers: {
            'accept': 'application/json',
            'X-Auth-Token': config.auth.token
        },
        timeout: 100000,
        method: 'GET'
    }, function(err, results){
        if (err) return res.render('index', { title: 'DOC LISTING', docs: [], err: err });
        console.log(results.body);
        res.render('index', { title: 'DOC LISTING', docs: JSON.parse(results.body) });
    });
    // res.render('index', { title: 'DOC LISTING', docs: [] });
});


// POST /docs >> Upload a file to the default user + container, using the filename
router.post('/', function(req, res) {
    var config = getConfig(req);

    // req.files object - provided by parted library

    // sanity check
    if (!req.files.upload) return res.redirect('/docs');
    // get the safe, unique filename:
    var filename = req.files.upload.name;
    var filepath = req.files.upload.path.split('/');
    filepath = filepath[filepath.length - 1];
    // make our PUT api request
    request({
        url: config.auth.url + '/' + config.container + '/' + filepath,
        headers: {
            'accept': 'application/json',
            'X-Auth-Token': config.auth.token
        },
        body: fs.readFileSync(req.files.upload.path), // just for simplicity - production should async
        timeout: 100000,
        method: 'PUT'
    }, function(err, results){
        if (err) return console.log('got an error:', err);
        console.log(results.statusCode); // todo error handling / display status to user
        res.redirect('/docs');
    });
});


// GET /docs/filename >> Request file from API and stream to the browser response
router.get('/:docname', function(req, res) {
    var config = getConfig(req);

    var filename = req.params.docname;

    request({
        url: config.auth.url + '/' + config.container + '/' + filename,
        headers: {
            'X-Auth-Token': config.auth.token
        },
        timeout: 100000,
        method: 'get'
    })
    .on('error', function(err){
        console.log('req err:', err);
    })
    .pipe(res);

});

module.exports = router;
