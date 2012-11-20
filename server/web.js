
//local module variables
var http;
var https;

/*
Constructor for Web object
@param: http server object optional
@param: https server object optional
*/
function Web(ahttp, ahttps) {
	http = ahttp || require('http');
	https = ahttps || require('https');
}

//url which is last requested
Web.prototype.lastRequestUrl = '';

/*
Read body from http(s) request
@param: http(s) request - request from where body is read
@param: callback (Buffer, errorCode) 
@param: maximumSize int of body
*/
Web.prototype.readRequestBody = function(request, callback, maximumSize) {
	var buffer = [];
	var bodyLen = 0;
	request.on('data', function (chunk) {
        buffer.push(chunk)
        bodyLen += chunk.length
        if (maximumSize && bodyLen > maximumSize) {
            // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
            request.connection.destroy(); //close connection
            callback(void(0), 413); //error code 413 - HTTP 413 Error Code (Request Entity Too Large)
        }
    });
	
    request.on('end', function () {
		prepareForCallback(buffer);
    });
	
	request.on('close', function() { //TODO: what with trailers?
	});


	function prepareForCallback(buffer) {
        var body = new Buffer(bodyLen);
        var i = 0;
        //copy each part of buffer to body
        buffer.forEach(function (chunk) {
            chunk.copy(body, i, 0, chunk.length);
            i += chunk.length;
        })
        
        console.log(body.toString('ascii'));
        callback(body, 0);
    }
}

Web.prototype.responseError = function(response, error, outputHeader) {
	if (outputHeader) {
		//response.writeHead(200, {}); // { 'Content-Type' : 'text/html' });
	}
	error = error || 'not specified';
	response.write('Error requesting page via proxy! Error code ' + error + ' Last requested url was ' + 
					this.lastRequestedUrl)
	response.end();
}

function getFullUrl(protocolType, host, port, path) {
	return protocolType + '://' + host + (port ? ':' + port : '') + path;
}

Web.prototype.invoke = function(protocolType, options, body, notifyObj) {
	
	var protocolObject = protocolType == 'http' ? http : https;
	
	//remember last requested url
	this.lastRequestedUrl = getFullUrl(protocolType, options.host, options.port, options.path);
	
	//delete some unwwanted headers
	delete options.headers.referer;
	delete options.headers.host;
	delete options.headers.origin;

	console.log(this.lastRequestedUrl); //+ "  " + JSON.stringify(options.headers));
	
	//do request to desired web site
	var request = protocolObject.request(options, function(response) {
		var isEndHappened = false;
		var isRedirectHappened = false;

		//emit end only once (if func is called for end and close)
		function emitEnd() {
			if (!isEndHappened) {
				isEndHappened = true;
				if (!ifRedirectEmitAndReturnTrue()) {
					notifyObj.emit('end', response);
				}
			}
		}

		function ifRedirectEmitAndReturnTrue() {
			if (response.statusCode >= 300 && response.statusCode < 400) {
				//emit only first time
				if (!isRedirectHappened) {
					isRedirectHappened = true;
					notifyObj.emit('redirect', response);
				}
				return true;
			}

			return false;
		}

		response.on('end', function() {	
			//Emitted exactly once for each response. After that, no more 'data' events will be emitted on the response. 
			emitEnd();
		});
			
		response.on('close', function() {
			//Note: 'close' can fire after 'end', but not vice versa.
			//Indicates that the underlaying connection was terminated before response.end() was called or able to flush.
			//Just like 'end', this event occurs only once per response, and no more 'data' events will fire afterwards
		});
		
		response.on('data', function (chunk) {
			if (!ifRedirectEmitAndReturnTrue()) {
				notifyObj.emit('data', chunk, response);
			}
		});
	});
		
	request.on('error', function(err){
		notifyObj.emit('error', err.message);
	});
	
	if (body) {
		request.write(body);
	}
	
	request.end();
}


exports.WebConstructor = Web;