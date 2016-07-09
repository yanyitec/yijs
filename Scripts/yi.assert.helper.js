(function($assert){
var test = $assert.test;
var findTestScript = function(elem){
	if(!elem) elem = document.body;
	for(var j=elem.childNodes.length-1;j>=0;j--){
		var sub = elem.childNodes[j];
		if(!sub.tagName) continue;
		if(sub.tagName==='SCRIPT' && sub.getAttribute("subtype")==='test')return sub;
		var testScript = findTestScript(sub);
		if(testScript)return testScript;
	}
}
$assert.scope = function(tester){
	var script = findTestScript(document.body);
	var rawCode = script.innerHTML;
	var li = script.parentNode;
	var code = $assert.clearCode(rawCode);
	li.innerHTML = "<h3>示例代码(Sample code)</h3><pre class='code'>" + code + "</pre>";
	var logger = yi.log.Logger.create("yi.log.HtmlLogger");
	logger.trace(true);
	var assert = yi.assert.Assert.create(logger);
	var p = li.parentNode;
	var li = document.createElement("li");
	li.innerHTML = "<h3>运行结果(Execute result)</h3>";
	li.appendChild(logger.element);
	//logger.element.style.height="100px";
	//logger.element.style.overflow = "auto";
	p.appendChild(li);
	tester.call(assert,assert,function(){assert.log.apply(assert,arguments);});
	//return $assert.caches[codeid] = assert;
}
})(yi.assert);


