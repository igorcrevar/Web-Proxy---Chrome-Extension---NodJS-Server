function getRedirectUrl(url) {
	var patterns = [
		new RegExp('^((?:https?:\/\/)?(?:www\.)?facebook.com)(.*)$', 'i'),
		new RegExp('^((?:https?:\/\/)?(?:www\.)?fbcdn-profile.*?\.net)(.*)$', 'i'),
		new RegExp('^((?:https?:\/\/)?(?:www\.)?fbcdn-sphotos.*?\.net)(.*)$', 'i')
	];
	
	for (var i in patterns) {
		var pattern = patterns[i];
		if (url.match(pattern)) {
			console.log('matched ' + url + ' pattern ' + pattern);
			url = url.replace(pattern, function (fullStr, part1, part2) {
				var encodedPart1 = encodeURIComponent(part1);
				var encodedPart2 = encodeURIComponent(part2);
				return 'http://localhost:9615/?path=' + encodedPart2 + '&domain=' + encodedPart1;
			});
			
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


