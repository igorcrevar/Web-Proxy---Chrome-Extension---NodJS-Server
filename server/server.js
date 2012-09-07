var http = require('http');
var port = 9615;

http.createServer(function (req, res) {
	console.log('requested full url ' + req.url);
	var parsedInput = require('url').parse(req.url, true);
	
	var realDomain = parsedInput.query['domain'];
	var realPath = parsedInput.query['path'];
	
	if (!realDomain || !realPath) {
		return;
	}
	
	//strip prefix http or https
	realDomain = realDomain.replace(/(?:https?:\/\/)/i, '');
	
	console.log(realDomain + ' requested with ' + realPath);
	
	var options = {
		host: realDomain,
		port: 80,
		path: realPath,
		method: 'GET'
	};
	
	http.request(options, function(proxyCallRes) {
		var statusCode = proxyCallRes.statusCode;
		var headers = proxyCallRes.headers;
		
		console.log('STATUS: ' + statusCode);
		console.log('HEADERS: ' + JSON.stringify(headers));
		
		//res.setEncoding('utf8');
		res.writeHead(statusCode, headers);
			
		proxyCallRes.on('data', function (chunk) {
			//res.write(chunk);
			console.log(chunk);
		});
		
		proxyCallRes.on('end', function() {
			res.end();
		});
	}).end();
}).listen(port);

console.log('waiting on ' + port);