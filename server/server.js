var http = require('http');
var https = require("https");
var qs = require('querystring');
var serverPort = 3013;
var maximumSize = 256000;

http.createServer(function (req, res) {
	var parsedInput = require('url').parse(req.url, true);
	
	var options = {
		host: parsedInput.query['domain'],
		path: parsedInput.query['path'] || '/' 
	};
	
	function responseWithCode(code) {
		code = code || 404; //default is 404 - not found
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
		//options.headers.cookies = //TODO; how???!?
	
		//do request to desired web site
		var request = http.request(options, function(response) {
			var isSend = false;
			response.on('end', function() {	
				if (!isSend) {
					isSend = true;
					res.writeHead(response.statusCode, response.headers);
				}
				
				res.end();
			});
			
			response.on('close', function() {	
				if (!isSend) {
					isSend = true;
					res.writeHead(response.statusCode, response.headers);
				}
				
				res.end();
			});
			
			response.on('data', function (chunk) {
				if (!isSend) {
					isSend = true;
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
		console.log(protocolType + " :// " + options.host + (options.port ? " :" + options.port : "") + " " + options.path); 		
	}
	
	function doResponseFull(body) {
		if (!options.host) {
			console.log("Called without host parameter - " + options.path);
			return responseWithCode();
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