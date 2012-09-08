var getBackgroundObject = function(patterns, redirectUrlBase) {
	var obj = {};
	
	obj.getRedirectUrl = function (url) {
		var pattern = new RegExp('^((?:https?:\/\/)?(?:www\.)?(?:[^/]+))(.*)$', 'i');
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

//settings are changed here!
var backgroundObject = getBackgroundObject([
		new RegExp('^((?:https?:\/\/)?(?:www\.)?facebook.com)(.*)$', 'i'),
		new RegExp('^((?:https?:\/\/)?(?:www\.)?fbcdn-profile.*?\.net)(.*)$', 'i'),
		new RegExp('^((?:https?:\/\/)?(?:www\.)?fbcdn-sphotos.*?\.net)(.*)$', 'i')
	], 'http://localhost:3013');

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
