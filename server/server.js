var http = require('http');

http.createServer(function (req, res) {
	var realUrl = req.url;
	console.log(realUrl + ' requested');
	var options = {
		host: 'https://facebook.com',
		port: 80,
		path: realUrl,
		method: 'GET'
	};
	
	var req = http.request(options, function(res) {
		console.log('STATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('BODY: ' + chunk);
		});
	});

}).listen(9615);