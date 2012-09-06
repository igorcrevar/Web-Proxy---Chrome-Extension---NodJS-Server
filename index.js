window.onload = function(e) {   
	function populateConvertedUrl() {
		var url = document.getElementById("type_url").value;
		var newUrl = chrome.extension.getBackgroundPage().getRedirectUrl(url);
		console.log('Converted url ', newUrl);
		document.getElementById("converted_url").value = newUrl;
		return newUrl;
	}
	
	document.getElementById("convert_button").onclick = function() {
		populateConvertedUrl();
	};
	
	document.getElementById("open_in_new_tab_button").onclick = function() {	
		var actionUrl = populateConvertedUrl();
		chrome.tabs.create({ url: actionUrl });
	};
}