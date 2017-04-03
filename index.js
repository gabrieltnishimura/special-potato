var express = require('express');
var request = require('request');
var http = require('http');
var querystring = require('querystring');
var async = require('async');
var app = express();
var config, t1, t2, t3, t4;

app.listen(3000, function () {
    console.log('Node Broker app listening on port 3000!');
});

app.get('/single/:env', function (req, res) {
    try {
        config = require('./environments/'+req.params.env+'.json');
        getMultiticket(function(multiticket) {
            t1 = new Date().getTime();
            getOneQuestionsList(multiticket, 'viagem-objetivo', function(list) {
                t2 = new Date().getTime();
                var o = JSON.parse(list);
                t3 = new Date().getTime();
                getOneQuestionDetail(multiticket, o, function() {
                    t4 = new Date().getTime();
                    res.send('['+req.params.env+'] List to	ok ' + (t2-t1) + ' ms, One took ' + (t4-t3) + ' ms');
                });
            });
        });
    } catch (err){
        console.log(err);
        res.send(req.params.env +' environment not found.');
    }
});

app.get('/multiple/:env', function (req, res) {
    try {
        config = require('./environments/'+req.params.env+'.json');
        getMultiticket(function(multiticket) {
            t1 = new Date().getTime();
            getAllQuestionsList(multiticket, function(list) {
                t2 = new Date().getTime();
                var o = JSON.parse(list);
                t3 = new Date().getTime();
                getAllQuestionsDetail(multiticket, o, function() {
                    t4 = new Date().getTime();
					res.send('['+req.params.env+'] List took ' + (t2-t1) + ' ms, Each took ' + (t4-t3) + ' ms');
                });
            });
        });
    } catch (err){
        console.log(err);
        res.send(req.params.env +' environment not found.');
    }
});

function getMultiticket(callback) {
    request.post({  url: 'http://'+ config.url +':'+ config.port +'/cas/v1/tickets', form: { username: config.username, password: config.password }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, function (e, r, body) {
        var tgt = body.split('7003/cas/v1/tickets/')[1].split('" method="POST"')[0];
        request.post({  url:  'http://'+config.url+':'+config.port+'/cas/v1/tickets/'+tgt, form: { service: '*' }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }}, function (e, r, body) {
            callback(body);
        });
    });
}

function getOneQuestionsList(multiticket, slug, callback) {
    http.get({
        host: config.url, port: config.port,
        path: '/sites/REST/sites/WPS/types/Pergunta/search?field:name:equals='+slug+'&multiticket='+multiticket,
        headers: {'Accept': 'application/json'}
    }, function(response) {
        var body = '';
        response.on('data', function(d) {body += d;});
        response.on('end', function() {
            callback(body);
        });
    });
}

function getOneQuestionDetail(multiticket, o, callback) {
    http.get({ 	host: config.url, port: config.port,
                path: '/sites/REST/resources/v1/aggregates/WPS/Pergunta/'+o.assetinfo[0].id.split(':')[1]+'?multiticket='+multiticket+'&assetDepth=all&fields=!*(template,updatedby,status,fwtags,enddate,fw_uid,createddate,Webreference,description,Publist,startdate,Dimension-parent,path,SegRating,renderid,filename,updateddate,Dimension,createdby,externaldoctype,Relationships)&fields=!Link(parents)&links=%22%22',
                headers: {'Accept': 'application/json'}
        }, function(response) {
            var eachBody = '';
            response.on('data', function(d) {eachBody += d;});
            response.on('end', function() {
                callback(null);
        });
    });
}

function getAllQuestionsList(multiticket, callback) {
    http.get({
        host: config.url, port: config.port,
        path: '/sites/REST/sites/WPS/types/Pergunta/search?multiticket='+multiticket,
        headers: {'Accept': 'application/json'}
    }, function(response) {
        var body = '';
        response.on('data', function(d) {body += d;});
        response.on('end', function() {
            callback(body);
        });
    });
}

function getAllQuestionsDetail(multiticket, o, outerCallback) {
    async.eachSeries(o.assetinfo, function iteratee(item, callback) {
        http.get({ 	host: config.url, port: config.port,
                    path: '/sites/REST/resources/v1/aggregates/WPS/Pergunta/'+item.id.split(':')[1]+'?multiticket='+multiticket+'&assetDepth=all&fields=!*(template,updatedby,status,fwtags,enddate,fw_uid,createddate,Webreference,description,Publist,startdate,Dimension-parent,path,SegRating,renderid,filename,updateddate,Dimension,createdby,externaldoctype,Relationships)&fields=!Link(parents)&links=%22%22',
                    headers: {'Accept': 'application/json'}
            }, function(response) {
            var eachBody = '';
            response.on('data', function(d) {eachBody += d;});
            response.on('end', function() {
                var each = JSON.parse(eachBody);
                callback(null);
            });
        });
    }, function done() {
        outerCallback(null);
    });
}
