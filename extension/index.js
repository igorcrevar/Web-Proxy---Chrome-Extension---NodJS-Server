window.onload = function(e) {   
	function populateConvertedUrl(tabId, addToPatterns) {
		var bgObject = chrome.extension.getBackgroundPage().backgroundObject;
		var url = document.getElementById("type_url").value;
		if (addToPatterns) {
			bgObject.addToPatterns(url, false);
		}
		var newUrl = bgObject.getRedirectUrl(url, true, tabId);
		if (newUrl.length < 4 || newUrl.substr(0, 4) != 'http') {
			newUrl = 'http://' + newUrl;
		}		
		return newUrl;
	}
	
	document.getElementById("open_in_new_tab_button").onclick = function() {	
		var newUrl = populateConvertedUrl(void 0, true);
		chrome.tabs.create({ url: newUrl });
	};
	
	document.getElementById("open_in_current_tab_button").onclick = function() {	
		chrome.tabs.query({ active: true, currentWindow : true }, function(tabs) {
			if (tabs.length > 0) {
				var tab = tabs[0];
				var newUrl = populateConvertedUrl(tab.id, true);
				chrome.tabs.update(tab.id, { url: newUrl });
			}
		});
	};
	
	document.getElementById("save_settings_button").onclick = function() {
		var value = document.getElementById("web_proxy_server_domain").value;
		if (value.length < 4 || value.substr(0, 4) != 'http') {
			value = 'http://' + value;
		}
		document.getElementById("web_proxy_server_domain").value = localStorage["web_proxy_server"] = value;
		
		value = document.getElementById("web_proxy_domains").value;
		localStorage["web_proxy_domains"] = value;
	
		chrome.extension.getBackgroundPage().backgroundObject.refreshSettings();
		alert("Settings are saved!");
	};
	
	var value = localStorage["web_proxy_server"];
	if (typeof value != 'string') {
		localStorage["web_proxy_server"] = value = "http://localhost:3013";
	}
	document.getElementById("web_proxy_server_domain").value = value;
	
	value = localStorage["web_proxy_domains"];
	if (typeof value != 'string') {
		//fbcdn-profile.*?\.net fbcdn-sphotos.*?\.net fbcdn-sphotos.*?\.net
		localStorage["web_proxy_domains"] = value = ["[^/]*?facebook.com", "[^/]*?fbcdn[^/]*?\.net"].join("\n");
	}
	document.getElementById("web_proxy_domains").value = value;
	
	chrome.extension.getBackgroundPage().backgroundObject.refreshSettings();
}