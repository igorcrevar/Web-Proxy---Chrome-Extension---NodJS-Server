var getBackgroundObject = function() {
	var patternBase = '^((?:https?:\/\/)?(?:[^/]*?)###token###)(.*)$';
	var redirectDomains = localStorage["web_proxy_domains"].split(',');
	var patterns = new Array;
	for (var i = 0; i < redirectDomains.length; ++i) {
		base = redirectDomains[i].trim();
		if (base.length > 0) {
			base = patternBase.replace("###token###", base);	
			patterns[i] = new RegExp(base, 'i');
		}
	}
	
	var redirectUrlBase = localStorage["web_proxy_server"];
	var obj = {};
	
	obj.getRedirectUrl = function (url) {
		var pattern = new RegExp('^((?:https?:\/\/)?(?:[^/]+))(.*)$', 'i');
		url = url.replace(pattern, function (fullStr, part1, part2) {
			var encodedPart1 = encodeURIComponent(part1);
			var encodedPart2 = encodeURIComponent(part2);
			return redirectUrlBase + '/?path=' + encodedPart2 + '&domain=' + encodedPart1;
		});
		
		return url;
	}

	obj.getRedirectUrlIfNeeded = function(url) {
		for (var i in patterns) {
			var pattern = patterns[i];
			if (url.match(pattern)) {
				console.log('matched ' + url + ' pattern ' + pattern);
				url = obj.getRedirectUrl(url);			
				return url;
			}
		}
		
		return false;
	}

	return obj;
};

var backgroundObject = getBackgroundObject();

chrome.webRequest.onBeforeRequest.addListener(
	function (request) {
		var url = request.url;
		console.log('onBeforeRequest ', url);
		var newUrl = backgroundObject.getRedirectUrlIfNeeded(url);
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
	//if loading content from url 
	if (changeInfo === "loading") {
		var newUrl = backgroundObject.getRedirectUrlIfNeeded(tab.url);
		if (newUrl) {
			console.log('onBeforeRequest redirect url ', newUrl);
			//redirect to another url instead
			chrome.tabs.update(tabId, { url: newUrl });
		}
	}
});
