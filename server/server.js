var http = require('http');
var https = require("https");
var serverPort = 3013;

http.createServer(function (req, res) {
	console.log('requested full url ' + req.url);
	
	var parsedInput = require('url').parse(req.url, true);

	var realDomain = parsedInput.query['domain'];
	var realPath = parsedInput.query['path'];
	
	if (!realDomain) {
		return;
	}
	if (!realPath) {
		realPath = '/';
	}

	console.log('accepted full url ' + req.url);
	
	//strip prefix http or https
	var protocolObject = http;
	var protocolPort = 80;
	var protocolType = 'http';
	realDomain = realDomain.replace(/(https?):\/\/(?::(\d+))?/i, function (fullMatch, protocol, port) {
		protocolType = protocol.toLowerCase();
		protocolObject = protocolType === 'http' ? http : https;
		if (port) {
			protocolPort = port;
		}
		return '';
	});

	console.log(realDomain + '  type = ' + protocolType + '  port = ' + protocolPort + '  path = ' + realPath);
	
	var options = {
		host: realDomain,
		port: protocolPort,
		path: realPath,
		method: 'GET',
	};

	var headers = {};
	for (var headerName in req.headers) {
		if (headerName != 'host' && headerName != 'referer') {
			headers[headerName] = req.headers[headerName]; 
		}
	}
	
	options.headers = headers;
	
	var request = http.request(options, function(response) {
		var isSend = false;
		response.on('end', function() {	
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
		res.writeHead(404, {});
		res.end();
	});
	
	request.end();
	
}).listen(serverPort);

console.log('waiting on ' + serverPort);