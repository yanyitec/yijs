(function(Global,document,yi,undefined){
var toDom = yi.toDom = function(o,exists){
	var t = typeof o;
	exists || (exists=[]);
	if(t==="object" || t==='function'){
		if(o===null){
			var elem = document.createElement("span");
			elem.innerHTML = "null";elem.className = "object null";
			return elem;
		}
		//去重
		for(var i=0,j=exists.length;i<j;i++){
			if(exists[i]===o){
				var e = document.createElement("span");
				e.className="cuit";
				e.innerHTML = "[cuit ref]";
				return e;
			}
		}
		exists.push(o);
		var elem = document.createElement("table");
		if(Object.toString.call(o)===='[object Array]') elem.className = "object array";
		else if(t==='function') elem.className = "function";
		else elem.className = "object";
		var hd = document.createElement("thead");
		var html ="<tr><th colspan='2'><div>" + t.toString() + "</div></th></tr>";
		hd.innerHTML = html;
		var bd = document.createElement("tbody");
		bd.style.display="none";
		bd.className ="members";
		for(var n in o){
			var val = o[n];
			var valElem = toDom(val,exists);
			var nameElem=document.createElement("span");
			var preElem;
			if(valElem.tagName==='TABLE'){
				preElem = document.createElement("span");
				preElem.innerHTML = "+";
				preElem.onclick = function(){
					var nameElem = this.parentNode;
					var nameTd = nameElem.parentNode;
					var valueTd = nameTd.nextSibling;
					var valueTbody = valueTd.firstChild.lastChild;
					if(this.innerHTML == '-') {
						valueTbody.style.display="none";
						this.innerHTML == "+";
					}else {
						valueTbody.style.display="table";
						this.innerHTML == "-";
					}
				}
				nameElem.appendChild(preElem);
			}else {
				preElem = document.createElement("span");
				preElem.innerHTML = "&nbsp;";
			}
			nameElem.appendChild(preElem);
			var nameTextElem = document.createElement("span");
			nameTextElem.innerHTML = htmlEncode(n);
			nameElem.appendChild(nameTextElem);
			var tr = document.createElement("tr");
			var nameTd = document.createElement("td");
			nameTd.appendChild(nameElem);tr.appendChild(nameTd);
			var valueTd = document.createElement("td");
			valueTd.appendChild(valElem);tr.appendChild(valueTd);
			bd.appendChild(tr);
		}
		elem.appendChild(hd);
		elem.appendChild(bd);
		return elem;
	}else {
		var elem = document.createElement("span");
		if(t==='undfined'){
			elem.innerHTML = "undefined";
			elem.className = "undefined";
		}else if(t==='number'){
			elem.innerHTML = o.toString();
			elem.className = "number";
		}else if(t==='string'){
			elem.innerHTML = htmlEncode(o);
			elem.className = "string";
		}
		return elem;
	}
}
var htmlEncode = function(txt){
	return txt.replace(/&/g,"&amp").replace(/ /g,"&nbsp;").replace(/\t/g,"&nbsp;&nbsp;&nbsp;&nbsp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br />");
}
})(window,document,yi);