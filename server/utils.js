function Utils() {

}

Utils.prototype.populateOptions = function(options) {
	var protocolType = 'http';
	options.host = options.host.replace(/(https?):\/\//i, function (fullMatch, protocol) {
		protocolType = protocol.toLowerCase();		
		return '';
	}).replace(/(?::(\d+))/i, function (fullMatch, port) {
		options.port = port;
		return '';
	});

	return protocolType;
}

exports.utils = new Utils();