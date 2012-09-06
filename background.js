function getRedirectUrl(url) {
	var patterns = [
		new RegExp('(https?:\/\/www.facebook.com)(.*)', 'i'),
		new RegExp('(https?:\/\/fbcdn-profile(?:.*?)\.net)(.*)', 'i'),
		new RegExp('(https?:\/\/fbcdn-sphotos(?:.*?)\.net)(.*)', 'i')
	];
	
	for (var i in patterns) {
		var pattern = patterns[i];
		if (url.match(pattern)) {
			url = url.replace(pattern, function(fullMatch, base, pathAndQuery) {
				return pathAndQuery;
			});
			
			var encodedPart = encodeURIComponent(url);
			console.log(url+' '+encodedPart);
			url = 'http://google.com/path?query=' + encodedPart;
			return url;
		}
	}
	
	return false;
}

chrome.webRequest.onBeforeRequest.addListener(
	function (request) {
		var url = request.url;
		console.log('onBeforeRequest ', url);
		var newUrl = getRedirectUrl(url);
		if (newUrl) {
			console.log('onBeforeRequest redirect url ', newUrl);
			return { redirectUrl: newUrl }
		}
	},
	{
		urls: ["<all_urls>"]
	},
	["blocking"]
);

// add listener for all tabs
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    var safesite = false;
	//if loading content from url 
    if (changeInfo === "loading") {
		var newUrl = getRedirectUrl(tab.url);
		if (newUrl) {
			console.log('onBeforeRequest redirect url ', newUrl);
			//redirect to another url instead
			chrome.tabs.update(tabId, { url: newUrl });
		}
    }
});


