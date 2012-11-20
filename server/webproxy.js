var maximumSize = 256000;
var maximumRedirections = 8;

var utils = require('./utils').utils;
var WebConstructor = require('./web').WebConstructor;
var web;

var invoke = function(req, res) {
	if (!web) {
		throw "web object not created. Call init func first!";
	}
	var redirectsCount = 0;
	var parsedInput = require('url').parse(req.url, true);
	
	var options = {
		host: parsedInput.query.domain,
		path: parsedInput.query.path || '/',
		method: req.method || 'get', //default is get
		headers: req.headers
	};

	if (!options.host) {
		return web.responseError(res, "Called without host parameter", true);
	}
	
	//domain is passed encripted with base64 because of firewalls and keywords blocking!
	options.host = new Buffer(options.host, 'base64').toString('ascii');
	options.headers = req.headers;
	//should convert path too!
	if (req.method.toLowerCase() == 'post') {
		web.readRequestBody(req, function(body, errorCode){
			if (!errorCode) {
				options.method = 'post';
				doResponse(body);
			}
			else {
				web.responseError(res, errorCode, true);
			}
		}, maximumSize);
    }
	else {
		doResponse(false);
	}
	
	function doRedirect(location) {
		if (redirectsCount++ === maximumRedirections)
		{
			return web.responseError(res, 'to many redirections', true);
		}
		
		var patt = /((?:https?:\/\/)?[^\/]+)(.*)/i;
		var result = patt.exec(location);
		options.host = result[1];
		options.path = result[2];
	
		return doResponse(false); 
	}		
	
	function doResponse(body) {
		var isHeaderOutputed = false;

		function outputHeader(response) {
			if (!isHeaderOutputed) {
				var cookies = response.headers['set-cookie'];
				//cookies are from our application, not proxied app
				//connect should populate our app session cookies on writeHead
				response.headers['set-cookie'] = []; // req.session.cookie; 
				//console.log('hej ' + JSON.stringify(response.headers));
				res.writeHead(response.statusCode, response.headers);
				isHeaderOutputed = true;
			}
		}

		//populate options
		var protocolType = utils.populateOptions(options);
		
		var notifyObj = new process.EventEmitter();
		delete options.headers.cookie; //delete original cookie from user		
		//todo: get cookies from mongodb
		web.invoke(protocolType, options, body, notifyObj);
		
		notifyObj.on('error', function(message) {
			web.responseError(res, message, isHeaderOutputed);
			isHeaderOutputed = true;
		});

		notifyObj.on('data', function(chunk, response) {
			outputHeader(response);
			res.write(chunk);
		});

		notifyObj.on('end', function(response) {
			outputHeader(response);
			res.end();
		});

		notifyObj.on('redirect', function(response) {
			console.log('redirect ' + response.statusCode + " " + response.headers.location)
			doRedirect(response.headers.location);
		});
	}
}

var create = function() {
	var obj = {};
	obj.init = function(http, https) {
		web = new WebConstructor(http, https)	
	}
	obj.invoke = invoke;
	return obj;
}

exports.create = create;