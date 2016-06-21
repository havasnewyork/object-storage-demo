var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');

var request = require('request');
var parted = require('parted');

var app = express();

var bluemix = require('./config/bluemix');
var services = require('./services.json');

var auth = bluemix.getServiceCreds('objectstorage', services);

auth.secret = "Basic " + Buffer(auth.username + ":" + auth.password).toString("base64");
app.set('storage-auth', auth);

var userslug = 'demo-container'; // THIS IS A USER - can be for your app or per-user
var container = 'testfiles'; // this is a container - aka "folder"
app.set('storage-userslug', userslug);
app.set('storage-container', container);

request({
    url: auth.auth_uri + '/' + userslug,
    headers: {
        'accept': 'application/json',
        'Authorization': auth.secret
    },
    timeout: 100000,
    method: 'GET'
}, function(err, res){
    if (err) return console.warn('error authorizing to service', err);
    // extract token and storage url headers and cache them for this user
    var auth = {
        "token": res.headers['x-auth-token'],
        "url": res.headers['x-storage-url']
    }
    app.set('storage-auth-' + userslug, auth);

    console.log('we got authentication:', auth);

    request({
        url: auth.url + '/' + container,
        headers: {
            'accept': 'application/json',
            'X-Auth-Token': auth.token
        },
        timeout: 100000,
        method: 'PUT'
    }, function(err, result){
        console.log('container put:', err, typeof result);
    });

});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(parted({
  // memory usage limit per request
  limit: 30 * 1024,
  // enable streaming for json/qs
  stream: true
}));

app.use('/', routes);


app.use('/docs', require('./routes/docs'));

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


app.set('port', process.env.VCAP_APP_PORT || process.env.PORT || 3000);

var server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});

