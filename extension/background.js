var backgroundObject = (function() {
	var patterns, redirectUrlBase;
	var obj = {};
	
	function getPatterns()
	{
		if (!localStorage["web_proxy_domains"]) {
			return new Array();
		}
		
		var patternBase = '^((?:https?:\/\/)?###token###)$';
		var redirectDomains = localStorage["web_proxy_domains"].split("\n");
		var patterns = new Array();
		for (var i = 0; i < redirectDomains.length; ++i) {
			base = redirectDomains[i].trim();
			if (base) { //same as base.length > 0
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
	
	obj.parse = function (url) {
		var pattern = /^((?:https?:\/\/)?[^\/]+)(.*)$/;
		var result = pattern.exec(url);
		return result;	
	}
	
	obj.getRedirectUrlForDomainPath = function(domain, path) {
		var domain = domain ? encodeURIComponent(window.btoa(domain)) : ''; //encode domain in base64 and escape
		var path = path ? encodeURIComponent(path) : '';
		
		url = redirectUrlBase + '/?domain=' + domain + '&path=' + path;
		return url;
	}
	
	obj.refreshSettings = function() {
		patterns = getPatterns();
		redirectUrlBase = localStorage["web_proxy_server"];
	}
	
	obj.getRedirectUrl = function (url) {
		var result = obj.parse(url);
		if (result && result.length == 3) {
			return obj.getRedirectUrlForDomainPath(result[1], result[2]);
		}
		
		return url;
	}

	obj.getRedirectUrlIfDomain = function(url) {
		var parsed = obj.parse(url);
		if (parsed && parsed.length == 3) {
			for (var i in patterns) {
				var pattern = patterns[i];
				if (parsed[1].match(pattern)) {
					var newUrl = obj.getRedirectUrlForDomainPath(parsed[1], parsed[2]);			
					//console.log('matched ' + url + ' pattern ' + pattern + ' newUrl = ' + newUrl);
					return newUrl;
				}
			}
		}
		
		return false;
	}
	
	obj.isRedirectBase = function(str) {
		return str.indexOf(redirectUrlBase) === 0;
	}

	obj.isAlreadyRedirectedRelativeUrl = function(url) {
		return url.indexOf(redirectUrlBase) === 0 && url.indexOf('/?domain=') === -1
	}
	
	obj.getPathFromAlreadyRedirectedUrl = function(url) {
		return url.substr(redirectUrlBase.length);
	}
	
	obj.refreshSettings();
	return obj;
})();

//if url is relative and open in same tab tabUrlMap will help to redirect url too real url
var tabUrlMap = [];
//for relative urls we remember last valid redirected url. 
//this doesnt support surfing on two or more sites at the same time :(
var lastValidDomainBeforeRedirection; 

function getRedirectUrl(url, tabId) {
	var newUrl;
	//detect releative url call to our server
	if ((tabId !== void 0) && backgroundObject.isAlreadyRedirectedRelativeUrl(url)) {
		var domain = tabUrlMap[tabId] || lastValidDomainBeforeRedirection;
		if (domain) {
			var path = backgroundObject.getPathFromAlreadyRedirectedUrl(url);				
			newUrl = backgroundObject.getRedirectUrlForDomainPath(domain, path);
			return newUrl;
		}
		
		return false;
	}
		
	//try to retrieve dynamic redirect url
	newUrl = backgroundObject.getRedirectUrlIfDomain(url);
	return newUrl;
}

chrome.webRequest.onBeforeRequest.addListener(
	function (details) {
		
		//only if main frame and url is not already redirected
		if (details.type == 'main_frame' && !backgroundObject.isRedirectBase(details.url)) {
			var parsed = backgroundObject.parse(details.url);
			if (parsed && parsed.length == 3) {
				tabUrlMap[details.tabId] = parsed[1]; 
				lastValidDomainBeforeRedirection = parsed[1];
			}
		}
		
		var newUrl = getRedirectUrl(details.url, details.tabId);
		if (newUrl) {
			return { redirectUrl: newUrl }
		}
	},
	{
		urls: ["<all_urls>"]
	},
	["blocking"]
);