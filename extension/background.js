var getBackgroundObject = function() {
	function getPatterns()
	{
		if (!localStorage["web_proxy_domains"]) {
			return new Array();
		}
		
		var patternBase = '^((?:https?:\/\/)?###token###)(.*)$';
		var redirectDomains = localStorage["web_proxy_domains"].split("\n");
		var patterns = new Array();
		for (var i = 0; i < redirectDomains.length; ++i) {
			base = redirectDomains[i].trim();
			if (base.length > 0) {
				try {
					base = patternBase.replace("###token###", base);	
					var newPattern = new RegExp(base, 'i');
					patterns[patterns.length] = newPattern;
				}
				catch (e) {
				}				
			}		
		}
				
		return patterns;
	}
	
	var patterns, redirectUrlBase;
	var obj = {};
	
	obj.refreshSettings = function() {
		patterns = getPatterns();
		redirectUrlBase = localStorage["web_proxy_server"];
	}
	
	obj.getRedirectUrl = function (url) {
		var pattern = new RegExp('^((?:https?:\/\/)?(?:[^/]+))(.*)$', 'i');
		url = url.replace(pattern, function (fullStr, domain, path) {
			obj.originalDomain = domain;
			var encodedPart1 = encodeURIComponent(window.btoa(domain));
			var encodedPart2 = encodeURIComponent(path);
			return redirectUrlBase + '/?domain=' + encodedPart1 + '&path=' + encodedPart2;
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

	obj.preParseUrl = function(url) {
		if (obj.originalDomain && url.indexOf(redirectUrlBase) === 0 && url.indexOf('/?domain=') === -1) {
			var rv = obj.originalDomain + "://" + url.substr(redirectUrlBase.length);
			console.log(rv);
			return rv;
		}
		
		return url;
	}
	
	obj.refreshSettings();
	return obj;
};

var backgroundObject = getBackgroundObject();

chrome.webRequest.onBeforeRequest.addListener(
	function (details) {
		var newUrl = backgroundObject.getRedirectUrlIfNeeded(details.url);
		if (newUrl) {
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
	if (changeInfo.status === "loading") {
		var newUrl = backgroundObject.getRedirectUrlIfNeeded(tab.url);
		if (newUrl) {
			//redirect to another url instead
			chrome.tabs.update(tabId, { url: newUrl });
		}
	}
});
