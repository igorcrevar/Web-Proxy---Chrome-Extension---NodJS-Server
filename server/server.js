var connect = require('connect'), http = require('http'), https = require('https');
var serverPort = 80;

var webproxy = require('./webproxy').create();
webproxy.init(http, https);

var app = connect()
  .use(connect.cookieParser())
  .use(connect.session({ secret: 'kobac', store: void(0) }))
  .use(function(req, res){  		
  		req.session.view = req.session.view ? req.session.view + 1 : 1;
  		console.log(req.sessionID + " " + req.session.view);	
    	webproxy.invoke(req, res);
  });

http.createServer(app).listen(serverPort);
