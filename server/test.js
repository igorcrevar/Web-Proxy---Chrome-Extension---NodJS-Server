var http = require('http');
var https = require("https");
var qs = require('querystring');
var serverPort = 3013;
var maximumSize = 256000;


/* sessions */
//will be mongodb
var sessionIndex = 0;
var sessionStore = {};
//TODO: better generation
function getUniqueId() {
	sessionIndex++;
	if (sessionIndex > 65535) {
		sessionIndex = 0;
	}
	
	return sessionIndex;
}

function parseCookies(str) {
	var cookies = {};
	str && str.split(';').forEach(function( cookie ) {
		var parts = cookie.split('=');
		cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
	});
	
	return cookies;
}

function getSessionIdFromCookie(str) {
	var cookies = parseCookies(str);
	return cookies && cookies['SESSION_ID'] ? cookies['SESSION_ID'] : getUniqueId();
}

function getProtocolDomainSession(sessionId) {
	return sessionStore[sessionId] ? sessionStore[sessionId].protocolDomainSession : '';
}

function getCookiesFromSession(sessionId) {
	return sessionStore[sessionId] ? sessionStore[sessionId].cookies : '';
}

function saveSession(sessionId, response, options, protocolType) {
	var cookiesStr = response.headers['set-cookie'] || response.headers['Set-Cookie'];
	
	sessionStore[sessionId] = { cookies: cookiesStr, protocolDomainSession: protocolType + "://" + options.domain + options.path };
	response.headers['set-cookie'] = 'SESSION_ID=' + sessionId;
}
/* end sessions */

http.createServer(function (req, res) {
	var SessionId;
	
	var parsedInput = require('url').parse(req.url, true);
	
	var options = {
		host: parsedInput.query['domain'],
		path: parsedInput.query['path'] ? parsedInput.query['path'] : '/' 
	};
	
	function responseWithCode(code) {
		if (!code) {
			code = 404; //not found default
		}
		res.writeHead(code, {});
		res.end();
		return true;
	}

	function recieveData(callback) {
		var body = '';
        req.on('data', function (data) {
            body += data;
            if (body.length > 1e6) {
                // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                req.connection.destroy();
				responseWithCode(413); //HTTP 413 Error Code (Request Entity Too Large)
            }
        });
		
        req.on('end', function () {
			callback(body, true);
        });
		
		req.on('close', function() { //TODO: what with trailers?
		});
	}
	
	function doResponse(body) {
		options.method = req.method;
		//strip prefix http or https
		var protocolObject = http;
		var protocolType = 'http';
		options.host = options.host.replace(/(https?):\/\/(?::(\d+))?/i, function (fullMatch, protocol, port) {
			protocolType = protocol.toLowerCase();
			protocolObject = protocolType === 'http' ? http : https;
			if (port) {
				options.port = port;
			}
			return '';
		});
	
		var headers = {};
		var cookies = {};
		for (var headerName in req.headers) {
			headerName = headerName.toLowerCase();
			if (headerName != 'host' && headerName != 'referer') {
				headers[headerName] = req.headers[headerName]; 
			}
		}
		options.headers = headers;
		options.headers.cookies = getCookiesFromSession(SessionId);
	
		//do request to desired web site
		var request = http.request(options, function(response) {
			var isSend = false;
			response.on('end', function() {	
				if (!isSend) {
					isSend = true;
					saveSession(SessionId, response, options, protocolType);
					res.writeHead(response.statusCode, response.headers);
				}
				
				res.end();
			});
			
			response.on('close', function() {	
				if (!isSend) {
					isSend = true;
					saveSession(SessionId, response, options, protocolType);
					res.writeHead(response.statusCode, response.headers);
				}
				
				res.end();
			});
			
			response.on('data', function (chunk) {
				if (!isSend) {
					isSend = true;
					saveSession(SessionId, response, options, protocolType);
					res.writeHead(response.statusCode, response.headers);
				}
				
				res.write(chunk);
			});
		});
		
		request.on('error', function(err){
			console.log(err.message);
			responseWithCode();
		});
		
		if (body) {
			request.write(body);
		}
		
		request.end();
		
		console.log();
		console.log('Web proxy call for: ');
		console.log(protocolType + "://" + options.host + (options.port ? ":" + options.port : "") + options.path); 		
	}
	
	function doResponseFull(body) {
		SessionId = getSessionIdFromCookie(req.headers.cookies); //get/set session id
		console.log("SESSION_ID = " + SessionId);
		
		if (!options.host) {
			options.host = getProtocolDomainSession(SessionId);
			if (!options.host) {
				return responseWithCode();
			}
		}
		else {
			//domain is passed encripted with base64 because of firewalls and keywords blocking!
			options.host = new Buffer(options.host, 'base64').toString('ascii');
		}
		
		doResponse(body);
	}
	
	if (req.method.toLowerCase() == 'post') {
		recieveData(function(body, isOk){
			doResponseFull(body);
		});
    }
	else {
		doResponseFull(false);
	}
	
}).listen(serverPort);

console.log('waiting on ' + serverPort);