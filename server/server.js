var http = require('http');
var https = require("https");
var serverPort = 9615;

http.createServer(function (req, res) {
	console.log('requested full url ' + req.url);
	var parsedInput = require('url').parse(req.url, true);

	var realDomain = parsedInput.query['domain'];
	var realPath = parsedInput.query['path'];

	if (!realDomain || !realPath) {
		return;
	}

	//strip prefix http or https
	var protocolObject = http;
	var protocolPort = 80;
	var protocolType = 'http';
	realDomain = realDomain.replace(/(https?):\/\/(?::(\d+))?/i, function (fullMatch, protocol, port) {
		console.log('parsed input!');
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
		headers: req.headers
	};

	var proxyCallRequest = protocolObject.request(options, function(proxyCallResponse) {
		var output = '';
		var statusCode = proxyCallResponse.statusCode;
		var headers = proxyCallResponse.headers;
		
		console.log('STATUS: ' + statusCode);
		console.log('HEADERS: ' + JSON.stringify(headers));
		
		proxyCallResponse.on('data', function (chunk) {
			output += chunk;
		});
				
		proxyCallResponse.on('end', function() {		
			//res.setEncoding('utf8');
			//res.statusCode = statusCode;
            //res.send(result);			
			res.writeHead(statusCode, headers);
			res.write(output);
			res.end();
		});
	
	});
	
	proxyCallRequest.on('error', function(err) {
			res.send('error: ' + err.message);
	});
	
	proxyCallRequest.end();
}).listen(serverPort);

console.log('waiting on ' + serverPort);