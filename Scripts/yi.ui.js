(function(window,document,undefined){
var yi = window.$y,createInstance = yi.createInstance,getStyle = yi.getStyle,setStyle = yi.setStyle;
var disabled = yi.disabled,extend = yi.extend,Deferred = yi.Deferred;
yi.lang = {};
//动画
var animationScheme = new yi.Timer(50);
var Animation = yi.Animation = function(){
	this.init = function(opts){
		this.opts= opts;
		var elem = this.target =  opts.target;
		this.from =this._curr = opts.from || 0;
		this.to = opts.to || 1;
		this.step = opts.step || 0.1;
		var attr = this.attr = opts.attr|| "opacity";
		this._attrValue = getStyle(elem,attr);
		
		return this;
	}
	//播放下一帧，返回false表示播放结束
	this.next =function(){
		if(this._playFunc)return false;
		var val = this._curr += this.step;
		if(val>=this.to){
			setStyle(this.target,this.attr,this.to);
			this.isPlaying = false;
			if(this.opts.finish) this.opts.finish.call(this);
			return false;
		}else {
			setStyle(this.target,this.attr,val);
			return true;
		}

	}
	
	this.play = function(){
		if(this._playFunc)return false;
		setStyle(this.target,this.attr, this._curr = this.from);
		this._playFunc = function(waitor){if(!self.next())return disabled;}
		
		var self = this;
		animationScheme.add(this._playFunc);
	}
	this.isPlaying = function(){return this._playFunc?true:false;}
	this.stop = function(restore){
		if(this._playFunc){
			animationScheme.remove(this._playFunc);this._playFunc=undefined;
			if(restore){setStyle(this.target,this.attr,this._attrValue);}
		}
		
	}
	
}

Animation.enable = true;
//show & hide
var playAnimation  = yi.playAnimation = Animation.play = function(animation){
	if(!Animation.enable)return;
	if(!animation.init || !animation.play){
		animation = animation.$type?createInstance(animation.$type,[]):new Animation();
		animation.init(animation);
	}
	animation.play();
	return animation;
}

var displays = {
	A : "inline",
	SPAN : "inline"
};
var show= yi.show = function(elem,animation){
	var data = elem.yitec || (elem.yitec ={});
	var display = data["@visible-css-display"] || getStyle(elem,"display");
	if(display=="none")display = data["@visible-css-display"] = displays[elem.tagName] || "block";
	elem.style.display = display;
	elem.style.visibility = "visible";
	if(!Yitec.enableAnimation || !animation || data["@visible-show-animation"])return;
	var hide = data["@visible-hide-animation"];
	if(hide) hide.stop(true);
	if(animation===true) animation = show.getAnimation(elem);
	else {
		if(!animation.$type)animation.$type = "Yitec.Animation";
		animation.target = elem;
	}
	data["@visible-show-animation"] = playAnimation(animation);
}
show.getAnimation=function(elem) {
	return {
		target : elem,
		from : 0, 
		to:getStyle(elem,"opacity"),
		step:0.1,
		attr: "opacity",
		$type : "Yitec.Animation"
	};
}
var hide = yi.hide = function(elem,animation){
	var data = elem.yitec || (elem.yitec ={});
	
	if(!Yitec.enableAnimation || !animation){
		elem.style.display = "none";
		return;
	}
	if(data["@visible-hide-animation"])return;
	var show = data["@visible-show-animation"];
	if(show) show.stop(true);
	if(animation===true) animation =  hide.getAnimation(elem);
	else {
		if(!animation.$type)animation.$type = "Yitec.Animation";
		animation.target = elem;
	}
	data["@visible-hide-animation"] = playAnimation(animation);
}
hide.getAnimation=function(elem) {
	return {
		target: elem,
		from :getStyle(elem,"opacity"),
		to:0,
		step:-0.04,
		attr: "opacity",
		$type : "Yitec.Animation"
	};
};

var dragBg = document.createElement("div");dragBg.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;padding:0;margin:0;background-color:#ffffff;opacity:0.005;filter:alpha(opacity=0.5);z-index:999999999;cursor:move;";
var dragable = function(elem,evt,opts){
	evt || (evt = event);
	document.body.appendChild(dragBg);
	var storedPos = getStyle(elem,"position");
	elem.style.position="absolute";
	var left0 = getStyle(elem,"left"),top0 = getStyle(elem,"top");
	var left = parseInt(left0)||0;
	var top = parseInt(top0)||0;
	elem.style.left = left + "px";elem.style.top = top + "px";
	var x0 = evt.clientX || evt.layerX,y0 = evt.clientY || evt.layerY;
	var offsetX,offsetY;
	var onmove = dragBg.onmousemove = function(evt){
		evt ||(evt=event);
		var x = evt.clientX || evt.layerX,y = evt.clientY || evt.layerY;
		offsetX = x - x0;
		offsetY = y-y0;
		elem.style.left = left + x - x0 + "px";
		elem.style.top = top + y -y0 + "px";
		if(opts.ondrag) opts.ondrag.call(elem,offsetX,offsetY);
	}
	dragBg.onmouseout = dragBg.onmouseup = function(evt){
		onmove(evt);
		dragBg.parentNode.removeChild(dragBg);
		if(opts.ondraged) opts.ondraged.call(elem,{
			position: storedPos,
			x0 : left0,y0 : top0,
			offsetX: offsetX,offsetY:offsetY
		});
	}
}
// Mask

var Mask = function(){ 
	this.init = function(opts){
		opts = this.opts = extend({},Mask.opts,opts);
		var box = this.element = document.createElement("div"),self = this,zIndex = opts.zIndex || 8999997;
		var yiData= box.$y || (box.$y = {});
		yiData.mask = this;
		box.style.cssText = "top:0;left:0;width:100%;height:100%;z-index:" + zIndex;
		box.className="yitec-mask";
		box.innerHTML = "<div class='back' style='position:absolute;top:0;left:0;width:100%;height:100%;background-color:"+(opts.backColor||"#666666")+";opacity:"+(this._opacity= opts.opacity|| 0.71)+";filter:alpha(opacity="+(this._opacity * 100)+");z-index:"+(++zIndex)+"'></div><div class='fore' style='position:absolute;z-index:"+(++zIndex)+";text-align:center;'></div>";
		var bg = this.backElement = box.firstChild, fore = this.foreElement = box.lastChild;
		
		var target = this.target = opts.target || document;
		var targetYiData = target.yitec || (target.yitec = {});
		targetYiData.masked = this;
		if(target==document || target ==document.documentElement){
			box.style.position="fixed";
			this._fixBox = function(){
				var x = (box.clientWidth - fore.clientWidth)/2;
				var y = (box.clientHeight - fore.clientHeight)/2;
				if(x<0)x=0;if(y<0)y=0;
				fore.style.left = x + "px";
				fore.style.top = y + "px";
			}
		}else {
			box.style.position="absolute";
			this._fixBox= function(){
				var apos =getPosition(target);
				box.style.width = target.clientWidth + "px";
				box.style.height = target.clientHeight + "px";
				box.style.left = apos.x + "px";box.style.top = apos.y + "px";
				var x = (box.clientWidth - fore.clientWidth)/2;
				var y = (box.clientHeight - fore.clientHeight)/2;
				if(x<0)x=0;if(y<0)y=0;
				fore.style.left = x + "px";
				fore.style.top = y + "px";
			}
		}
		if(opts.content) this.content(opts.content);
		return this;
	}

	this.opacity = function(val){
		if(val===undefined)return this._opacity;
		setStyle(this.backElement,"opacity",this._opacity = val);
		return this;
	}
	
	this.setOpts = function(opts){
		extend(this.opts,opts);
		for(var n in opts) {
			var prop = this[n];
			var val = opts[n];
			if(typeof prop ==='function' && val!==undefined) prop.call(this,val);
		}
		return this;
	}
	

	this.backColor = function(val){
		var opts = this.opts;
		if(val===undefined)return this.backElement.style.backgroundColor;
		this.backElement.style.backgroundColor = this._backColor = val;
		return this;
	}

	this.content = function(content){
		
		if(typeof content=="string") this.foreElement.innerHTML = content;
		else {
			try{
				this.foreElement.appendChild(content);
			}catch(ex){
				this.foreElement.innerHTML = content;
			}
		}
		return this;
	}
	
	
	this.show = function(animation){
		var box = this.element;
		if(box.parentNode)return false;

		var opts = this.opts,self =this;
		document.body.appendChild(box);
		this._fixBox();
		
		if(opts.keepCentre && !opts.dragable){
			this._resize = animationScheme.add(this._fixBox);
		}
		if(Animation.enable && animation)playAnimation(animation===true?Mask.getShowAnimation(this):animation);
		this._visible = true;
		return true;
	}
	this.hide = function(animation){
		var box = this.element,opts = this.opts,self =this;
		if(!box.parentNode)return false;
		if(Animation.enable && animation)playAnimation(animation===true?Mask.getHideAnimation(this):animation);
		else {
			box.parentNode.removeChild(box);
		}
		if(this._resize){
			animationScheme.remove(this._fixBox);
		}
		this._visible = false;
		return true;
		
	}	
}//end Mask
Mask.opts = {opacity:0.3,keepCentre:true,backColor:"#666666"};
Mask.getShowAnimation = function(mask){
	var elem = mask.backElement;
	return new Animation().init({
		from : 0.1,
		to : mask.opts.opacity,
		step: 0.025,
		target : elem
	});
}
Mask.getHideAnimation = function(mask){
	var elem = mask.backElement;
	return new Animation().init({
		from : mask.opts.opacity,
		to : 0,
		step: -0.05,
		target : elem,
		finish:function(){
			mask.element.parentNode.removeChild(mask.element);
		}
	});
}
yi.mask = function(target,opts){
	if(opts===undefined){
		opts= target;
		if(opts===undefined)opts = extend({},Mask.opts );
	}
	var target = opts.target ||(opts.target = document.documentElement);
	var data = target.$Y_ || (target.$Y_ = {});
	var mask = data.masked ;
	if(mask) mask.setOpts(opts||{});
	else mask =new Mask().init(opts|| {});
	mask.show(opts.showAnimation);
	return mask;
}
yi.unmask = function(target){
	var data = target.yitec || (target.yitec = {});
	var mask = data.masked;
	if(mask)mask.hide(mask.opts.hideAnimation);
	return mask;
}

// ModelBox
var Modal = function(){
	this.init({});
	var fore = this.foreElement;
	fore.innerHTML = "<div class='content'></div><div class='queue' style='display:none;'></div>";
	
	var con = fore.firstChild,queue = fore.lastChild;
	var seed =0;
	this.addItem =function(item){
		item.id= seed++;if(seed>210000000) seed=0;
		var elem = item.element;
		var data = elem.$Y_ || (elem.$Y_={});
		data.modalBox = item;
		if(con.childNodes.length==0){
			item._visible = true;
			con.appendChild(item.element);
			var c = item.opts.content;
			item.opts.content = undefined;
			this.setOpts(item.opts);
			item.opts.content = c;
			this.show(item.opts.showAnimation);
		}else{
			queue.appendChild(item.element);
			item._visible = false;
			fore.className = "fore lineUp";
		}
		return this;
	}
	this.removeItem = function(item){
		var elem = item.element;
		if(!elem || !elem.parentNode)return false;
		
		if(elem.parentNode == queue){
			item._visible  = item._disposed = false;
			elem.parentNode.removeChild(elem);
			item._visible  = false; item._disposed = true;
		}else if(elem.parentNode==con) {
			con.removeChild(elem);
			var nextElem = queue.firstChild;
			if(nextElem){
				var nextItem = nextElem.yitec.modalBox;
				nextItem._visible  = true;
				var nextOpts = nextItem.opts;
				var c = nextOpts.content;
				nextOpts.content = undefined;
				this.setOpts(nextItem.opts);
				nextOpts.content = c;
				con.appendChild(nextElem);
				this.show(nextItem.opts.showAnimation);
			}
		}
		else return false;

		if(queue.childNodes.length==0 ){
			fore.className = "fore";
			if(fore.childNodes.length==0) this.hide();
		}
		return true;
	}
}
Modal.prototype = new Mask();
var modal = yi.modal = new Modal();

var ModalBox = yi.ModalBox = function(){
	this.open = function(){
		modal.addItem(this);return true;
	}
	this.close = function(){
		return modal.removeItem(this);
	}
	this.isVisible = function(){return this._visible;}
}
yi.waitingIcon = "images/waiting.gif";
var WaitingBox = yi.WaitingBox = function(opts){
	this.opts = opts;opts.keepCentre = true;
	var box = this.element =document.createElement("div");
	box.className = "waitingBox";
	box.innerHTML = "<img src='" + (opts.icon || yi.waitingIcon) + "' /><div class='content'>"+opts.content+"</div>";
}
var modalBox = WaitingBox.prototype = new ModalBox();

var MessageBox = yi.MessageBox = function(opts){
	this.opts = opts;
	var self = this,dfd = this._dfd = new Deferred();
	var box = this.element =document.createElement("div");
	box.className = "messageBox";
	var html ="<div class='caption'>" + (opts.caption|| "") + "&nbsp;</div><div class='content'>";
	html += opts.icon?"<img src='" + (opts.icon || yi._waitingIcon) + "' />":"";
	html += opts.content || opts.text || "";
	html += "</div><div class='buttons'>";
	var btns = opts.btns;
	var btnCount=0;
	if(btns) for(var key in btns){
		html += "<button class='" + key + "'>" + btns[key] + "</button>";btnCount++;
	}
	if(btnCount==0) html += "<button class='close'>" + (yi.lang.close|| "Close") + "</button>";
	html += "</div>";
	box.innerHTML = html;
	var btnDiv = box.lastChild;
	for(var i=0,j=btnDiv.childNodes.length;i<j;i++){
		var btn = btnDiv.childNodes[i];
		btn.onclick = function(){
			self.close(this.className);
		}
	}
	this.dragable = function(value){
		if(value===undefined)return this._dragable;
		if(value){
			var caption = box.firstChild;
			caption.style.cursor="move";
			caption.onmousedown = function(evt){
				evt || (evt= event);
				dragable(box,evt,{});
			}
		}else{
			var caption = box.firstChild;
			caption.style.cursor="pointer";
			caption.onmousedown = null;
		}
	}
	if(this._dragable = opts.dragable){
		this.dragable(true);
	}
	else opts.keepCentre = true;
	this.close = function(rs){
		modalBox.close.call(this);
		dfd.resolve(rs);
	}
}
MessageBox.prototype = modalBox;
yi.messageBox = function(opts){
	var box = new MessageBox(opts);
	box.open();
	return box._dfd.promise(box);
}


var rules = {
	"length":function(value,args){
		if(typeof args==='number') return value.length<=args;
		var min = args[0]||0;
		var max = args[1];
		if(max)return value.length>=min && value.length<=max;
		return value.length>=min;
	},
	"required": function(value,args){
		return value.length>0;
	},
	"int":function(value,args){
		return isNaN(parseInt(value))?false:true;
	},
	"number":function(value,args){
		return isNaN(parseFloat(value))?false:true;
	},
	"email":function(value,args){
		return value.match(/^(\w)+(\.\w+)*@(\w)+((\.\w{2,3}){1,3})$/);
	},
	"date":function(value,args){
		var dateReg = /((^((1[8-9]\d{2})|([2-9]\d{3}))([-\/\._])(10|12|0?[13578])([-\/\._])(3[01]|[12][0-9]|0?[1-9])$)|(^((1[8-9]\d{2})|([2-9]\d{3}))([-\/\._])(11|0?[469])([-\/\._])(30|[12][0-9]|0?[1-9])$)|(^((1[8-9]\d{2})|([2-9]\d{3}))([-\/\._])(0?2)([-\/\._])(2[0-8]|1[0-9]|0?[1-9])$)|(^([2468][048]00)([-\/\._])(0?2)([-\/\._])(29)$)|(^([3579][26]00)([-\/\._])(0?2)([-\/\._])(29)$)|(^([1][89][0][48])([-\/\._])(0?2)([-\/\._])(29)$)|(^([2-9][0-9][0][48])([-\/\._])(0?2)([-\/\._])(29)$)|(^([1][89][2468][048])([-\/\._])(0?2)([-\/\._])(29)$)|(^([2-9][0-9][2468][048])([-\/\._])(0?2)([-\/\._])(29)$)|(^([1][89][13579][26])([-\/\._])(0?2)([-\/\._])(29)$)|(^([2-9][0-9][13579][26])([-\/\._])(0?2)([-\/\._])(29)$))/g;
		return value.match(dateReg);
	},
	"remote" : function(value,args){
		var result={};
		var url = args + value;
		if(url.indexOf("?")) url += "&" + Math.random();
		else url += "?" + Math.random();
		ajax({
			url:url,
			method:"GET",
			type:"json",
			error: function(xhr,err,ex){
				alert(xhr.responsText + "\n" + err + "\n" + ex);
			},
			success: function(data){
				if(data.result===true)result.result=true;
				else result.result = false;
			}
		});
		
	}
};
var validate = function(marks,value,opts,callback){
	if(opts.trim) value = trim(value);
	var waitors = {},waitorCount =0;
	if(marks)for(var i=0,j=marks.length;i<j;i++) marks[i].className = elem.className.replace(validateionClassReg," ");
	for(var n in opts){
		var rule = rules[n];
		if(!rule)return true;
		var result = rule.call(elem,value,opts[n]);
		if(result===false){
			if(marks)for(var i=0,j=marks.length;i<j;i++) marks[i].className += " validate-error validate-" + n;
			if(callback) callback.call(this,n,opts);
			return false;
		}else if(typeof result==='object'){
			if(marks)for(var i=0,j=marks.length;i<j;i++) marks[i].className += " validate-waiting";
			waitors[n] = result;waitorCount ++;
		}
	}
	if(waitors.length){
		Task.start(function(){
			var resultCount=0;
			for(var n in waitors){
				var waitor = waitors[n];
				if(waitor.__hasResult){resultCount++;continue;}
				if(waitor.result===false){
					if(marks)for(var i=0,j=marks.length;i<j;i++) marks[i].className += " validate-error validate-" + n;
					if(callback) callback.call(this,n,opts);
					return false;
				}else if(waitor.result ===true){
					waitor.__hasResult = true;
					resultCount++;
				}
			}
			if(waitorCount === resultCount){
				if(marks)for(var i=0,j=marks.length;i<j;i++) marks[i].className += " validate-success";
				if(callback) callback.call(this,null,opts);
				
				return false;
			}
		});
		return;
	}
	if(marks)for(var i=0,j=marks.length;i<j;i++) marks[i].className += " validate-success";
	if(callback)callback.call(this,null,opts);
	return true;
}
var validateionClassReg = /\s?validate\-[a-zA-Z_0-9]+\s?/g;

var Validation = yi.Validation = function(elem,opts,markFinder){
	var tag = elem.tagName,getValue,self = this;
	var data = elem.$Y_ || (elem.$Y_={});

	if(data.validation){
		data.validation.opts = opts;
		return;
	}else{
		data.validateion = this;
	}
	
	var onchange = function(){
		if(delayTimer) clearTimeout(delayTimer);
		delayTimer = setTimeout(self.validate(),100);
	}
	var dispose_detech;
	switch(tag){
		case "TEXTAREA":
			getValue =function(){return elem.value;};
			attach(onchange,"keyup",onchange);
			dispose_detech = function(){detech(elem,"keyup",onchange);}
			break;
		case "SELECT":
			getValue = function(){return elem.options[elem.selectedIndex].value;};
			attach(elem,'change',this.validate);
			dispose_detech = function(){detech(elem,"keyup",this.validate);}
			break;
		case "INPUT":
			var type = elem.type;
			if(type==='checkbox'){
				getValue = function(){
					var name = elem.name;
					if(!name )return elem.checked?elem.value:"";
					var els = elem.form.elements;
					var val =[];
					for(var i=0,j=els.length;i<j;i++){
						var el = els[i];
						if(el.name==name && el.type=='checkbox' && el.checked) val.push(el.value); 
					}
					return val.length==0?val[0]:val;
				}
				attach(elem,"click",this.validate);
				dispose_detech = function(){detech(elem,"click",this.validate);}
			}else if(type=='radio'){
				getValue = function(){return elem.checked?elem.value:"";};
				attach(elem,"click",this.validate);
				dispose_detech = function(){detech(elem,"click",this.validate);}
			}else {
				getValue = function(){return elem.value;}
				attach(elem,"keyup",onchange);
				dispose_detech = function(){detech(elem,"keyup",onchange);}
			}
	}
	attach(elem,"blur",self.validate);
	this.dispose = function(){
		dispose_detech.call(this);
		detech(elem,"blur",self.validate);
		this.dispose = this.validate = DisposedFunction();
	}
}
Validation.getMarkFinder = function(){return function(elem){return elem;}}

yi.validate = function(elem,callback){
	var data= elem.$Y_ || (elem.$Y_={});
	var validation = data.validation;
	if(validation)return validation.validate(callback);
	callback.call(yi);return true;
}


var TreeItem = yi.TreeItem = function(parent,opts){
	opts || (opts={});
	var container,mode = opts.mode,itemWidth = opts.itemWidth,self = this;
	if( parent instanceof TreeItem){
		this.parent = parent;
	}else {
		container =parent;parent = null;
	}
	this.itemWidth = function(){
		if(itemWidth)return itemWidth;
		if(parent) return itemWidth = parent.itemWidth() || 150;
	}
	this.mode = function(){
		if(mode)return mode;
		if(parent) return mode = parent.mode() || "menu";
	}
	var elem = this.element = document.createElement("li");
	elem.className = "tree-item " + (opts.className || "");
	elem.style.width = this.itemWidth() + "px";
	
	elem.style.position="relative";
	var yiData= elem.$Y_ || (elem.$Y_={});
	yiData.treeItem = this;
	elem.innerHTML = "<div class='item'><span class='icon "+(opts.iconClass|| "")+"'></span><a class='text'></a><span class='sub-indicator'></span></div><ul class='children' style='top:0;width:" +this.itemWidth()+ "px;" +(this.mode()=='menu'?"position:absolute;":"") +"'></ul>";
	var itemElem = elem.firstChild;
	var childrenElem = this.childrenElem = elem.lastChild;
	var count = this["@count"] = 0;
	this.iconElement = itemElem.childNodes[0];
	this.textElement = itemElem.childNodes[1];
	var subInd = this.subIndicatorElement = itemElem.childNodes[2];
	this.textElement.onclick = function(evt){
		if(self["@count"]>0)self.toggle();
		evt.cancelBubble = true;evt.returnValue = false;
		if(evt.preventDefault) evt.preventDefault();
		return false;
	}
	this.data = function(data){
		this["@data"] = data;
		if(data.checked) addClass(this.iconElement,"checked"); else removeClass(this.iconElement,"checked");
		if(data.text) this.textElement.innerHTML = data.text ;else this.textElement.innerHTML = "";
		if(data.url) this.textElement.href = data.url;else this.textElement.href = "#";
		if(data.target) this.textElement.target = data.target;else this.textElement.target = "";
		childrenElem.innerHTML = "";
		if(data.children) {
			var c=0;
			for(var i=0,j=data.children.length;i<j;i++) {
				var childData = data.children[i];
				if(!childData)continue;c++;
				var child = new TreeItem(this);
				child.data(childData);
				childrenElem.appendChild(child.element);
			}
			if(c){
				addClass(this.element,"hasChildren");
				subInd.style.visibility = "visible";
			}else{
				removeClass(this.element,"hasChildren");
				subInd.style.visibility = "hidden";
			}
			this["@count"] = c;
		}
	}
	this.collapse = function(){
		hide(childrenElem,true);
		removeClass((container || elem),"expand");
		return this;
	}
	this.expand = function(){
		
		if(this.mode()=='menu'){
			childrenElem.style.left = elem.clientWidth + "px";
			//childrenElem.style.top = elem.offsetTop + "px";
		}
		addClass((container || elem),"expand");
		
		show(childrenElem,true);
		
		return this;
	}
	this.toggle = function(){
		if(hasClass((container|| elem),"expand")){
			this.collapse();
		}else this.expand();
	}
	
	this.addChild = function(childData){
		var child = new TreeItem(this);
		child.data(childData);
		childrenElem.appendChild(child.element);
		var c = this["@count"];this["@count"] = ++c;
		addClass(this.element,"hasChildren");
		subInd.style.visibility = "visible";
		return this;
	}
	
	if(opts.data) this.data(opts.data);
	if(container){
		container.appendChild(childrenElem);
		if(opts.className) childrenElem.className += " " + opts.className;
		var yiData = container.$Y_ || (container.$Y_ = {});
		yiData.tree = this;
	}
}

})(window,document);