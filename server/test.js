var http = require('http');

http.createServer(function (req, res) {
		var query = require('url').parse(req.url, true);
        var start = new Date();
		var options = {
			  host: 'www.google.rs',
			  port: 80,
			  path: '/',
			  method: 'GET'
        };
		
		var headers = {};
		for (var headerName in req.headers) {
			if (headerName === 'host') {
				//headers.host = 'www.google.rs';
			}
			else if (headerName != 'referer') {
				headers[headerName] = req.headers[headerName]; 
			}
		}
		
		options.headers = headers;
		
		console.log();
		console.log(JSON.stringify(options.headers));
			
        http.request(options, function(response) {
			var isSend = false;
			response.on('end', function() {	
				console.log(JSON.stringify(response.headers));
				res.end();
			});
			
			response.on('data', function (chunk) {
				if (!isSend) {
					isSend = true;
					res.writeHead(response.statusCode, response.headers);
				}
				
				res.write(chunk);
            });
        }).end();


}).listen(3013);

console.log('Server running at port 3013');