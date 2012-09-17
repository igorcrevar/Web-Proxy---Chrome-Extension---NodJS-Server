var http = require('http');
var https = require("https");
var serverPort = process.env.port || 8080;
var maximumSize = 256000;
var maximumRedirections = 8;

http.createServer(function (req, res) {
	var redirectsCount = 0;
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
            if (body.length > maximumSize) {
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
	
	function doResponse(body, method, headers) {
		options.method = method || req.method;
		//strip prefix http or https
		var protocolObject = http;
		var protocolType = 'http';
		options.host = options.host.replace(/(https?):\/\//i, function (fullMatch, protocol) {
			protocolType = protocol.toLowerCase();
			protocolObject = protocolType === 'http' ? http : https;
			return '';
		}).replace(/(?::(\d+))/i, function (fullMatch, port) {
			options.port = port;
			return '';
		});
		
		headers = headers || req.headers;
		options.headers = {};
		for (var headerName in headers) {
			var headerName = headerName.toLowerCase();
			if (headerName !== 'host' && headerName !== 'referer' && headerName !== 'max-forwards') {
				options.headers[headerName] = headers[headerName]; 
			}
		}
		options.connection = 'keep-alive';
		//options.headers.cookie = //TODO; how???!?
	
		//do request to desired web site
		var request = http.request(options, function(response) {
			var isSend = false;
			var isRedirected = false;
			
			function outputHeader() {
				if (!isSend && !isRedirected) {
					isSend = true;
					res.writeHead(response.statusCode, response.headers);
				}
			}
			
			function doRedirect() {
				if (redirectsCount === maximumRedirections)
				{
					return responseWithCode(404); //todo: better status code
				}
				
				var patt = /((?:https?:\/\/)?[^\/]+)(.*)/i;
				var result = patt.exec(response.headers.location);
				options.host = result[1];
				options.path = result[2];
				redirectsCount++;
				console.log('Redirect ' + redirectsCount + " " + options.host + " " + options.path);
				doResponse(void 0, 'GET'); 
				return true;
			}
			
			
			response.on('end', function() {	
				if (response.statusCode >= 300 && response.statusCode < 400) {
					doRedirect();
				}
				else {
					outputHeader();
					res.end();
				}
			});
			
			response.on('close', function() {	
				if (!isRedirected) {
					outputHeader();
					res.end();
				}
			});
			
			response.on('data', function (chunk) {
				outputHeader();
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
		console.log(protocolType + " :// " + options.host + (options.port ? " : " + options.port : "") + " " + options.path);
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