var backgroundObject = (function() {
	var patterns, redirectUrlBase, isAutomaticRedirectEnabled = true;
	//if url is relative and open in same tab tabUrlMap will help to redirect url too real url
	var tabUrlMap = [];
	//for relative urls we remember last valid redirected url. 
	//this doesnt support surfing on two or more sites at the same time and opening pages in new tab :(
	var lastValidDomainBeforeRedirection; 

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
		isAutomaticRedirectEnabled = localStorage["automatic_redirect_enabled"] === 'true' ? true : false;
	}
	
	obj.isAutomaticRedirectEnabled = function() { return isAutomaticRedirectEnabled; }
	
	obj.addToPatterns = function(str, isDomain) {
		if (!isDomain) {
			var parsed = this.parse(str);
			if (!parsed || parsed.length !== 3) {
				//is not valid url
				return false;
			}
			str = parsed[1];
		}		
		//check if not already added
		for (var i in patterns) {
			if (patterns[i] === str) {
				return false;
			}
		}
		patterns.push(str);
		console.log("new pattern " + str);
		return true;
	}

	obj.isPatternMatched = function(domain) {
		for (var i in patterns) {
			var pattern = patterns[i];
			if (domain.match(pattern)) {
				return true;
			}
		}
		return false;
	}
	
	obj.isRedirectBase = function(str) {
		return str.indexOf(redirectUrlBase) === 0;
	}

	obj.isContainsDomainAndPath = function(url) {
		return url.indexOf('/?domain=') !== -1 && url.indexOf('&path=') !== -1;
	}

	obj.getPathFromAlreadyRedirectedUrl = function(url) {
		return url.substr(redirectUrlBase.length);
	}
	
	obj.getDirFromPathWithFileOnTheEnd = function(path) {
		if (path) {
			var lastSlash = path.lastIndexOf('/'); //must contains slash and not on the first place
			if (lastSlash > 0) {
				var pos = path.indexOf('?');
				if (pos === -1) {
					pos = path.indexOf('&'); //first &
				}
				if (pos === -1) {
					pos = path.length;
				}
				if  ((pos > 4 && path.charAt(pos - 4) == '.') || //case like .php
					(path > 5 && path.charAt(pos - 5) == '.')) { //case like .php5
					return path.substr(0, lastSlash);
				}
			}
		}		
		return false;
	}
	
	obj.getRedirectUrl = function (url, isMainFrame, tabId) {
		//not already redirected url (not begins with redirectUrlBase and does nto contains path and domain keys in query)
		//is url start with redirectUrlBase 
		if (!this.isRedirectBase(url))
		{
			//try to retrieve dynamic redirect url
			var parsed = this.parse(url);
			if (parsed && parsed.length === 3 && this.isPatternMatched(parsed[1])) {
				//only remember domain before redirection if its main frame
				if (isMainFrame) {
					var relUrlData = { domain: parsed[1], path: this.getDirFromPathWithFileOnTheEnd(parsed[2]) };
					tabUrlMap[tabId] = relUrlData; 
					lastValidDomainBeforeRedirection = relUrlData;
				}
			
				var newUrl = this.getRedirectUrlForDomainPath(parsed[1], parsed[2]);			
				//console.log('matched ' + url + ' pattern ' + pattern + ' newUrl = ' + newUrl);
				return newUrl;
			}
		}
		//its begins with redirectUrlBase but does not contains &path= and &domain <-> its relative url for already redirected site
		else if (!this.isContainsDomainAndPath(url)) {
			var relUrlData = (tabId !== void 0 ? tabUrlMap[tabId] : 0) || lastValidDomainBeforeRedirection;
			if (relUrlData) {
				//update lastValidDomainBeforeRedirection! 
				lastValidDomainBeforeRedirection = relUrlData;
				var path = this.getPathFromAlreadyRedirectedUrl(url);	
				if (relUrlData.path) {
					path = relUrlData.path + path;
				}
				console.log('base url change = ' + relUrlData.domain + "  " + path);
				var newUrl = this.getRedirectUrlForDomainPath(relUrlData.domain, path);
				return newUrl;
			}
		}
		
		return false;
	}

	//init/refresh settings for the first time
	obj.refreshSettings();
	return obj;
})();

chrome.webRequest.onBeforeRequest.addListener(
	function (details) {
		if (backgroundObject.isAutomaticRedirectEnabled()) {
			var newUrl = backgroundObject.getRedirectUrl(details.url, details.type === 'main_frame', details.tabId);
			if (newUrl) {
				return { redirectUrl: newUrl }
			}
		}
	},
	{
		urls: ["<all_urls>"]
	},
	["blocking"]
);