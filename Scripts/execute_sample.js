

$assert.begin = function(){
	$assert.clear();
	var codeView = $assert.codeView = document.createElement("div");
	codeView.className = "vconsole";
	$assert.log = function(){
		var html = "";
		for(var i=0,j=arguments.length;i<j;i++){
			html += "<div>" + arguments[i] + "</div>";
		}
		codeView.innerHTML += html;
	}
}
$assert.showCode = function(codeid){
	
	var codeElem = document.getElementById(codeid);
	var code = codeElem.innerHTML;
	var resultView = document.createElement("pre");
	var code = $assert.clearCode(code);
	resultView.innerHTML = code;

	var token = codeElem.nextSibling;
	if(token) codeElem.parentNode.insertBefore(codeElem,token);
	else codeElem.parentNode.appendChild(codeElem);
	return codeElem;
}
$assert.end = function(codeid){
	var codeElem = $assert.showCode(codeid);
	var token = codeElem.nextSibling;
	if(token) codeElem.parentNode.insertBefore($assert.codeView,token);
	else codeElem.parentNode.appendChild($assert.codeView);
	return $assert.codeView;
}
