var global = window;
(function(global,document,undefined){
"strict";
//******************************
/// <summary></summary>
/// <param name="suffix" type="String"></param>
/// <returns type="Boolean"></returns>
//********************************
var yi = global.yi =global.$y = {};

var extend = yi.extend = function(target,opts,path,isConfig){
	if(target!=this){
		if(isConfig && target.config) return target.config(opts,path);
		if(target.extend && target!=yi) target.extend(opts,path);
	}
	if(!path)path = "";
	for(var n in opts){
		var it = opts[n];
		var exst = target[n];
		if(exst===undefined) target[n] = it;
		else if(isFunction(exst)){
			if(!it)continue;
			if(!isFunction(it))throw path + "." + n + " must be a function.";
			else target[n] = it;
		}else if(isArray(exst)){
			if(!it)continue;
			if(!isArray(it)) throw path + "." + n + " must be an array.";
			else {
				for(var i=0,j=it.length;i<j;i++){
					var val = it[i];hasIt = false;
					for(var p=0,m=exst.length;p<m;p++)if(exist[p]===val) {hasIt=true;break;}
					if(!hasIt) exst.push(val);
				}
			}
		}else if(typeof exst==="object"){
			if(!it) continue;
			if(typeof it !=="object") throw path + "." + n + " must be an object.";
			extend(exst,it,path + "." + n);
		}else{
			target[n] = it;
		}
	}
	return target;
}
yi.config = function(opts){return extend(yi,opts,"yi",true);}
yi.override = function(target){
	for(var i=1,j=arguments.length;i<j;i++){
		var src = arguments[i];
		for(var n in src) target[n] = src[n];
	}
	return target;
}

/// 扩展string
var sp_ = String.prototype;
sp_.$trim = yi.trim = function(){
	/// <summary>去掉字符串两头的空格</summary>
	/// <returns type="String">去掉空格后的字符串</returns> 
	return this.replace(/^\s+|\s+$/g,"");
}

sp_.$trimStart = function(){
	/// <summary>去掉字符串前面的空格</summary>
	/// <returns type="String">去掉空格后的字符串</returns> 
	this.replace(/^\s+/g,"");
}


sp_.$trimEnd = function(){
	/// <summary>去掉字符串后面的空格</summary>
	/// <returns type="String">去掉空格后的字符串</returns> 
	this.replace(/\s+$/g,"");
}


sp_.$startWith = yi.startWith =function(s,i){
	/// <summary>判断字符串是否以s字符串作为开头</summary>
	/// <param name="s" type="String">可能 前导字符串</param>
	/// <param name="i" type="Boolean">是否忽略大小写</param>
	/// <returns type="Boolean">如果是以s开头返回true,否则返回false</returns> 
	return i?this.substr(0,s.length).toLowerCase() === s.toLowerCase():this.substr(0, s.length) === s;
}


sp_.$endWith = yi.endWith =function(s){
	/// <summary>判断字符串是否以s字符串作为结束</summary>
	/// <param name="s" type="String">可能的后置字符串</param>
	/// <param name="i" type="Boolean">是否忽略大小写</param>
	/// <returns type="Boolean">如果是以s结束返回true,否则返回false</returns>
	return (this.substr(this.length - s.length) === s);
}


sp_.$contains = function(s){
	/// <summary>判断字符串包含s作为子串</summary>
	/// <param name="s" type="String">子串</param>
	/// <param name="i" type="Boolean">是否忽略大小写</param>
	/// <returns type="Boolean">如果包含返回true,否则返回false</returns>
	return i? this.toLowerCase().indexOf(s.toLowerCase())>=0 : this.indexOf(s)>=0;
}



sp_.$camelize = yi.camelize = function camelize() {
  // /\-(\w)/g 正则内的 (\w) 是一个捕获，捕获的内容对应后面 function 的 letter
  // 意思是将 匹配到的 -x 结构的 x 转换为大写的 X (x 这里代表任意字母)
  return this.replace(/\-(\w)/g, function(all, letter) {return letter.toUpperCase();});
}
var format_regex = /\{(\d+)\}/g;
yi.format = function(format){
	var inputs = arguments;
	return format.replace(format_regex,function(match,at){
		return  inputs[parseInt(match.length==3?match[1]:match.substr(1,match.length-2))];
	});
}

/// 扩展Array
var arp_ = Array.prototype;
arp_.$contains = function(it){for(var i=0,j=this.length;i<j;i++)if(this[i]===it)return true;return false;}
arp_.$add = function(){ for(var i=0,j=arguments.length;i<j;i++)this.push(arguments[i]);return this;}
var arrRemove = arp_.$remove = function(it){var k;for(var i=0,j=this.length;i<j;i++)if((k=this.shift())!==it) this.push(it);return k===it;}
var otstr = Object.prototype;
var isFunc = yi.isFunction = function (it) {return otstr.call(it) === '[object Function]';}
var isArray= yi.isArray =  function (it) {return otstr.call(it) === '[object Array]';}
arp_.$format = yi.formatArray = function(format){
	var me = this;
	return format.replace(format_regex,function(match,at){
		return  me[parseInt(match.length==3?match[1]:match.substr(1,match.length-2))-1];
	});
}
var ArrayObject = yi.ArrayObject = function(){
	this.length = 0;
	this.push = function(it){
		this[this.length++] = it; return this;
	}
	this.pop = function(){
		var rs = this[--this.length];
		delete this[this.length];
		return rs;
	}
	this.add = this.unshift = function(it){
		for(var i=this.length++;i>0;i--) this[i] = this[i-1];
		this[0] = it; return this;
	}
	this.shift = function(){
		var rs = this[0];
		for(var i= 0,j=this.length--;i<j;i++) this[i] = this[i+1];
		delete this[this.length];
	}
	this.remove = function(it){
		var at = 0,len = this.length;
		for(var i= 0,j=len;i<j;i++) {
			var exst = this[i];
			if(exst!==it) this[at++] = exst;
		}
		for(var i=at;i<len;i++) delete this[i];
		this.length = at+1;
		return this;
	}
	return this;
}

/// 扩展function
Function.prototype.$bind = function(m,a){
	/// <summary>绑定函数的this 或 参数</summary>
	/// <param name="m" type="Object">this指针指向的对象,不可以为空</param>
	/// <param name="a" type="Array">指定的调用参数列表</param>
	/// <returns type="Function">形成一个新的函数。该函数的this指针总指向m。如果设置了a参数，无论给予新函数怎么样的参数表，其调用参数总是为指定的参数</returns>
	var s = this;return function(){return s.apply(m,a||arguments);};
}
yi.bind = function(f,m,a){
	/// <summary>绑定函数的this 或 参数</summary>
	/// <param name="f" type="Function">要绑定的函数</param>
	/// <param name="m" type="Object">this指针指向的对象,不可以为空</param>
	/// <param name="a" type="Array">指定的调用参数列表</param>
	/// <returns type="Function">形成一个新的函数。该函数的this指针总指向m。如果设置了a参数，无论给予新函数怎么样的参数表，其调用参数总是为指定的参数</returns>
	return function(){return f.apply(m,a||arguments);};
}
var Disable = yi.Disable = function(){throw "disabled";}
var Enable = yi.Enable = function(){return "enabled";}
var Cancel = yi.Cancel = function(){throw "canceled";}

var dele = yi.delegate = function(){
	var fs=[];
	var dele = function(){
		for(var i=0,j=fs.length;i<j;i++){
			var f = fs.shift();
			var rs = f.apply(this,arguments);
			if(rs!==Disable) fs.push(f);
			if(rs===Cancel)break;
		}
	}
	dele["@funcs"] = fs;
	dele.add = function(f){fs.push(f);return this;}
	dele.remove = function(f){
		var fn;
		for(var i=0,j=fs.length;i<j;i++) if((fn=fs.shift())!==f) fs.push(fn);
		return this;
	}
	dele.clear = function(){
		this["@funcs"] = fs = [];return this;
	}
}

//CreateInstance
var typenameRegex = /^[\$_a-zA-Z][_a-zA-Z\$0-9]*(.[_a-zA-Z\$][_a-zA-Z\$0-9]*)*$/g;
var cachedActivators = {};
yi.createObject = function(tn,a){
	var exst = cachedActivators[tn];
	if(exst)return exst(a || []);
	if(!tn.match(typenameRegex)) throw  "[" + tn + "] is not a valid type name.";
	exst = cachedActivators[tn] = new Function("args","return new " + tn + "(args);");
	return exst(a || []);
};


/// <summary>格式化日期</summary>
/// <usage>
///	"yyyy-MM-dd" => 2016-06-18
///	"M/dd/yy hh:ss:mm" => 6/18/16 20:30:01
/// </usage>
/// <param name="fmt" type="String">格式字符串</param>
/// <returns type="String">格式化后的时间字符串</returns>
Date.prototype.$format = yi.formatDate = function (fmt) { 

	//author: meizz 
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}
yi.parseDate = function(text){
	var reg = /^\s*(?:(?:(\d{2}|\d{4})(\-)((?:[0]?\d)|(?:1[012]))\-((?:[0-2]?\d)|(?:3[0-1])))|(?:((?:[0]?\d)|(?:1[012]))(\/)((?:[0-2]?\d)|(?:3[0-1]))\/(\d{2}|\d{4})))(?:[ T]((?:[01]?\d)|(?:2[0123]))\:([0-5]?\d)(?:\:([0-5]\d))?)?Z?\s*$/g;
	var dm = text?reg.exec(text):null;
	if(!dm) return;
	
	var tp = dm[2],y ,M ,d ,h,m,s;
	
	if(tp=='-'){
		y= parseInt(dm[1]);M = parseInt(dm[3]);d = parseInt(dm[4]);
		
	}else{
		y= parseInt(dm[4]);M = parseInt(dm[1]);d = parseInt(dm[3]);
	}
	h = parseInt(dm[5]) || 0; m = parseInt(dm[6])||0;s = parseInt(dm[7]) || 0;
	if(y<100) y = 2000 + y;
	
	return new Date(y,M-1,d,h,m,s);
}




var uuid_chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
var uuid = yi.guid = function uuid(len, radix) {
    var uuid = [], i;
    radix = radix || uuid_chars.length;
    if (len) {
      // Compact form
      for (i = 0; i < len; i++) uuid[i] = uuid_chars[0 | Math.random()*radix];
    } else {
      // rfc4122, version 4 form
      var r;
      // rfc4122 requires these characters
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
      uuid[14] = '4';
      // Fill in random data.  At i==19 set the high bits of clock sequence as
      // per rfc4122, sec. 4.1.5
      for (i = 0; i < 36; i++) {
        if (!uuid[i]) {
          r = 0 | Math.random()*16;
          uuid[i] = uuid_chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
      }
    }
    return uuid.join('');
}
var nextId1 = new Date().$format(".yyMMddhhmmssSS"),nextId0 = 0;
yi.nextid = function(){
	if(nextId0==9999) {
		nextId1 = yi.formatDate.call(new Date(),".yyMMddhhmmssSS"));
	}
	return (nextId0++) + nextId1;
}


var slice = Array.prototype.slice;
/// <summary>写日志函数</summary>
/// <usage>yi.log({a:'1'},'hehe').log("后来");</usage>
/// <param name="arguments" type="arguments">支持不定参数日志</param>
/// <returns type="Object">yi名字空间，以便连写</returns>
var log = yi.log =global.$log = function() {
	
	try {
		// Modern browsers
		if (typeof console != 'undefined' && typeof console.log == 'function') {
			// Opera 11
			if (global.opera) 
				for(var i=0,j=arguments.length;i<j;i++) console.log('Item ' + (i + 1) + ': ' + arguments[i]);
			// All other modern browsers
			else if ((slice.call(arguments)).length == 1 && typeof slice.call(arguments)[0] == 'string') 
				console.log((slice.call(arguments)).toString());
			else 
				console.log.apply(console, slice.call(arguments));
		}
        // IE8
		else if ((!Function.prototype.bind || treatAsIE8) && typeof console != 'undefined' && typeof console.log == 'object') {
			Function.prototype.call.call(console.log, console, slice.call(arguments));
		}
	// IE7 and lower, and other old browsers
	} catch (ignore) { 
		alert(ignore);
	}
	return yi;
}
var logError = yi.elog = function(error, err) {
	var exception = error instanceof Error?error:new Error(error);     
	exception.innerError = err;   
	//Report the error as an error, not as a log
    try {
		// Modern browsers (it's only a single item, no need for argument splitting as in log() above)
		if (typeof console != 'undefined' && typeof console.error == 'function') {console.error(exception);}
        // IE8
		else if ((!Function.prototype.bind) && typeof console != 'undefined' && typeof console.error == 'object') {Function.prototype.call.call(console.error, console, exception);}
        // IE7 and lower, and other old browsers
    } catch (ignore) { 
	}
	return yi;
};
//**function** 对象成员拷贝
var extend  = yi.extend = global.$extend = function(o){
	
	var s;
	for(var i=1,j=arguments.length;i<j;i++){
		if(s=arguments[i])for(var n in s) o[n] = s[n];
	}
	return o;
}
yi.keys = function(obj){
	var ret = [];
	for(var n in obj) ret.push(n);return ret;
}
yi.containKey = function(o,k,i){
	if(i){k=k.toLowerCase();for(var n in obj) if(n.toLowerCase()===k)return true;}
	else for(var n in o) if(n===k)return true;
	return false;
}
yi.values = function(obj){
	var ret = [];
	for(var n in obj) ret.push(obj[n]);return ret;
}
yi.contains = function(o,k){
	for(var i in o)if(o[i]===k)return true;
}


/// <summary>异步延迟对象(机制)</summary>
/// <usage>
/// new Deferred(function(dfd){dfd.resolve('ok');}).done(function(result){yi.log(result);});
/// </usage>
/// <param name="fn" type="Function">有耗费时间的操作的函数，可以为空。如果该参数为空，后面的delay参数不起作用</param>
/// <param name="delay" type="Boolean">该函数不会立即执行，而是随后执行。</param>
/// <returns type="Object">Deferred对象</returns>
var Deferred = yi.Deferred = function(fn,delay){
	this.deferredStatus = function(){return this["@deferred.status"];}
	this.deferredResult = function(){return this._deferredResult;}
	this.deferredWaiting = function(){return this["@deferred.status"]=="waiting";}
	this.deferredFinished = function(){var stat = this["@deferred.status"];return stat==='done'|| stat==='fail';}
	this.when = function(fn,delay){
		if(!fn)return this;
		var me = this;
		var f = function(){
			var stat = this["@deferred.status"];
			if(stat && stat!='waiting')throw "already done or fail.";
			var  retValue = fn.call(me,me);
			if(!me["@deferred.status"]) return me.resolve(rv);
		}
		if(typeof delay==='number')setTimeout(fn,delay);
		else if(delay)setTimeout(fn,0);
		else f();
		return this;
	}
	
	this.follow = function(cb){
		var dfd = new Deferred();
		this.done(function(v,st,d){
			cb.call(this,v,st,d);
			dfd.resolve();
		});
		return dfd.promise();
	}
	
	this.done = function(cb){
		if(!cb)return this;
		var done = this["@deferred.status"]=="done";
		if(done){ 
			var rs = this["@deferred.apply"]?cb.apply(this,this._deferredResult):cb.call(this,this._deferredResult,true);
			if(rs===Disable)return this;
		} 
		(this["@deferred.done"] || (this["@deferred.done"]=[])).push(cb);
		return this;
	}
	this.fail = function(cb){
		if(!cb)return this;
		var fail = this["@deferred.status"]=="fail";
		if(fail){ 
			var rs = this["@deferred.apply"]?cb.apply(this,this._deferredResult):cb.call(this,this._deferredResult,true);
			if(rs===Disable)return this;
		} 
		(this["@deferred.fail"] || (this["@deferred.fail"]=[])).push(cb);
		return this;
	}
	this.then = function(cb){
		if(!cb)return this;
		var st = this["@deferred.status"],rd = st=='done' || st=='fail';
		if(rd){ 
			var rs = this["@deferred.apply"]?cb.apply(this,this._deferredResult):cb.call(this,this._deferredResult,this,true);
			if(rs===Disable)return this;
		}
		(this["@deferred.then"] || (this["@deferred.then"]=[])).push(cb);
		return this;
	}
	this.wait = function(){this["@deferred.status"]="waiting";return this;}
	
	this.resolve = function(call_v,apply_v){ 
		this["@deferred.status"]='done';
		this._deferredResult = apply_v|| call_v;
		if(apply_v)this["@deferred.apply"] = true;
		var its;
		if(its=this["@deferred.done"])for(var i=0,j=its.length;i<j;i++){
			var it = its.shift();
			var ctne = apply_v?it.apply_v(this,apply_v):it.call(this,call_v,this,true);
			if(ctne!==Disable) its.push(it);
		}
		if(its=this["@deferred.then"]){
			for(var i=0,j=its.length;i<j;i++){
				var it = it=its.shift();
				var ctne = apply_v?it.apply(this,apply_v):it.call(this,call_v,this,true);
				if(ctne!==Disable) its.push(it);	
			}
		}
	}

	this.reject = function(call_v,apply_v){ 
		this["@deferred.status"]='fail';
		this._deferredResult = apply_v|| call_v;
		if(apply_v)this["@deferred.apply"] = true;
		var its;
		if(its=this["@deferred.fail"])for(var i=0,j=its.length;i<j;i++){
			var it = its.shift();
			var ctne = apply_v?it.apply_v(this,apply_v):it.call(this,call_v,this,false);
			if(ctne!==Disable) its.push(it);
		}
		if(its=this["@deferred.then"]){
			for(var i=0,j=its.length;i<j;i++){
				var it = it=its.shift();
				var ctne = apply_v?it.apply(this,apply_v):it.call(this,call_v,this,false);
				if(ctne!==Disable) its.push(it);	
			}
		}
	}
	
	
	this.promise = function(tgt){
		if(!tgt){
			if(this["@deferred.promise"]) return this;
			tgt = {};
		}
		var me = this;
		tgt.deferredResult = function(){return me._referredResult;}
		tgt.deferredStatus = function(){return me["@deferred.status"];}
		tgt.done = function(cb){me.done(cb);return this;}
		tgt.fail = function(cb){me.fail(cb);return this;}
		tgt.promise = function(targ){return (!targ || targ==this) ? this : me.promise(targ);}
		tgt["@deferred.promise"] = me;
		return tgt;
	}
	if(fn) this.when(fn,delay);
	return this;
}
global.$await = yi.await = function(fnc,delay){return new Deferred(fnc,delay);}

//**function** 定时器
var Timer = yi.Timer = function(tick,initFuncs,isTimeout){
	if(initFuncs===true || initFuncs===false){ var a= isTimeout; isTimeout = initFuncs; initFuncs = a;}
	this["@isTimeout"] = isTimeout;
	this.isTimeout = function(){return this["@isTimeout"];}
	this.add = function(func){this["@funcs"].push(func);this.run();return this;}
	this.remove = function(func){
		var funcs = this["@funcs"];
		var fn;for(var i=0,j=funcs.length;i<j;i++)if((fn=funcs.shift())!=func)funcs.push(fn);
		//没有函数了，停掉
		if(funcs.length==0) this.stop();
		return this;
	}
	this.clear = function(){this["@funcs"] = [];return this;}
	this.tick = function(value){
		var tick = this["@tick"];
		if(value===undefined)return tick;
		if(value===tick)return this;
		var timer = this["@timer"];
		if(timer) (this["@isTimeout"]?clearTimeout:clearInterval)(timer);
		this["@tick"] = value||0;
		this["@timer"] = 0;
		if(this["@isRunning"]) this.run();
		return this;
	}
	this.isRunning = function(){return this["@isRunning"];}
	this.run = function(){
		var timer = this["@timer"],tick = this["@tick"],funcs = this["@funcs"],self = this;
		//先停掉以前的定时器
		if(timer)(isTimeout?clearTimeout:clearInterval)(timer);
		this["@isRunning"]=false;
		if(funcs.length===0)return this;
		if(this["@isTimeout"]){
			this["@timer"] = setTimeout(function(){
				for(var i=0,j=funcs.length;i<j;i++)funcs.shift().call(self,self);
				self["@isRunning"] = false;self["@timer"]=0;	
			},tick);
		}else {
			this["@timer"] = setInterval(function(){
				var fn;
				for(var i=0,j=funcs.length;i<j;i++){
					fn=funcs.shift();
					if(fn.call(this,this)!==Disable) funcs.push(fn);
				}
			},tick);
		}
		
		this["@isRunning"] = true;
		return this;
	}
	this.stop = function(){
		var timer = this["@timer"],tick = this["@tick"];
		if(timer) (this["@isTimeout"]?clearTimeout:clearInterval)(timer);
		this["@isRunning"] = false;this["@timer"] = 0;
		return this;
	}
	if(initFuncs){
		this["@funcs"] = initFuncs;
		this.run();
	}else this["@funcs"] = [];
	return this;
}
var immediate = Timer.immediate = new Timer(0);
var fiftyTimer = Timer.fifty = new Timer(50);

/********************************************
/ Resource
/********************************************/
var res = yi.res={};
var protocols = res.protocols = ["http://","https://"];
res.basUrl = "";

var paths = res.paths ={},resolvedPaths = res["@resolvedUrls"]={};
res.cached = {};

var isAbsoluteUrl = res.isAbsoluteUrl = function(url){
	for(var i=0,j=protocols.length;i<j;i++)
		if(yi.startWith.call(url,protocols[i],true))return true;
	return false;
}
var resolveUrl = res.resolveUrl = function(name,nocache){
	var url,replaced = false;
	if(url = resolvedPaths[name])return url;else url = name;
	for(var n in paths){
		if(name.indexOf(n)==0 && name[n.length]==='/'){
			var k = paths[n];
			url =  k + name.substring(n.length);
			replaced = k;
			break;
		}
	}
	if(isAbsoluteUrl(url)){
		if(!replaced)return url;
		if(isAbsoluteUrl(replaced)){
			
		}else url = (res.basUrl|| "") + url;
	}
	
	if(url.indexOf("?")<0 && !nocache) resolvedPaths[name] = url;
	return url;
}
var imgexts = res.imageExts = [".gif",".png",".jpg"];
var isImageExt = res.isImageExt = function(ext){
	for(var i=0,j=imgexts.length;i<j;i++) if(imgexts[i]===ext)return true;
	return false;
}


var resElementCreators = res.elementCreateors = {
	".js" : function(url){
		var dfd = new  Deferred();
		dfd.url = url;dfd.type = ".js";
		var elm =dfd.element = document.createElement("script");
		elm.type = "text/javascript";
		elm.src = url;
		
		if(elm.onload==null)elm.onload = function(){dfd.done(dfd);};
		else elm.onreadystatechange = function(){if(elm.readyState==4 || elm.readyState=='complete') {dfd.done(dfd);}}
		elm.onerror = function(e){dfd.fail(null,[dfd,".js",url,e]);};
		return dfd;
	} ,
	".img" : function(url){
		var dfd = new  Deferred();
		dfd.url = url;dfd.type = ".img";
		var elm  =dfd.element = document.createElement("img");
		elm.src = url;
		
		if(elm.onload==null)elm.onload = function(){dfd.done(dfd);};
		else elm.onreadystatechange = function(){if(elm.readyState==4 || elm.readyState=='complete') dfd.done(dfd);}
		elm.onerror = function(){dfd.fail(null,[dfd,".img",url,e]);};
		return dfd;
	},
	".css" : function(url){
		var dfd = new  Deferred();
		dfd.url = url;dfd.type = ".css";
		var elm = dfd.element = document.createElement("link");
		elm.type = "text/css";elem.rel = "stylesheet";
		elm.href = url;
		
		if(elm.onload==null)elm.onload = function(){dfd.done(dfd);};
		else elm.onreadystatechange = function(){if(elm.readyState==4 || elm.readyState=='complete') dfd.done(dfd);}
		elm.onerror = function(){dfd.fail(dfd);};
		return dfd;
	}
}
var loadRes = res.loadRes= yi.loadRes = function(url,type){
	var hd = document.getElementsByTagName("HEAD");
	hd = hd[0]|| document.body || document.documentElement;
	var getResType = function(url){
		var at = url.lastIndexOf(".");
		if(at<=0){log(format.call("trade res {1} as .js",url));return ".js";}
		var ext = url.substr(at).toLowerCase();
		if(isImageExt(ext))return ".img";
		return ext;
	}
	loadRes = yi.loadRes = function(url,type){
		type ||(type = getResType(url));
		var dfd = resElementCreators[type](url);
		dfd.wait();
		if(type!=='.img')hd.appendChild(elm);
		return dfd;
	}
	return loadRes(url,type);
}

var Module = function(init_fn,dep_c){
	
	this.tryComplete = function(){
		//还有依赖项没有加载完成
		if(--dep_c!=0)return false;
		//所有依赖项都已经加载完成，从loading列表中移除
		arrRemove.call(Module.loadings,this);
		if(init_fn){
			//模块有初始化函数，调用初始化函数
			var args =[],deps = this.deps;
			for(var n in deps) args.push(deps[n].returnValue);
			var rs = init_fn.apply(mod,args);
			//调用模块初始化函数没有在等待状态，就结束掉调用模块
			if(!this.isWaiting())this.resolve(rs);
			//否则就等待 init_fn
		}else{
			//调用模块没有初始化函数,可以直接结束
			this.resolve();
		}
		this.tryComplete =function(){}
		//调用模块告诉它的调用模块，没有正在加载的模块。
		return true;
	}
	this.deps = {};
}
Module.prototype = new Deferred();
Module.loadings = [];
Module.cached = {};
Module.findLoadings = function(dep_res){
	var loadings = Module.loadings;
	var rs = [];
	for(var i in loadings){
		var ctx = loadings[i];
		if(ctx.deps[dep_res.name]) rs.push(ctx);
	}
	return rs;
}


var load = function(dep_names,init_fn){
	
	if(typeof dep_names==="string"){
		//处理这种用法 : define("jquery",function(){return $;});
		var res = output_mod = new Deferred(init_fn);
		res.name = dep_names;
		cachedRes[dep_names] = res;
		return res;
	}
	//依赖项数量
	var dep_c = dep_names.length,err;
	var mod  = new Module(init_fn,dep_c);//一开始就是initing的.
	var deps = mod.deps;
	
	//依赖项加载后的回调函数
	var dep_loaded = function(dep_res){
		//有错误就立即终止
		if(err)return Disable;
		var ctxs = Module.findLoadings(dep_res);
		for(var i in ctxs){
			var ctx = ctxs[i];
			ctx.tryComplete();
		}
		
		//该函数被加载到了被加载项的done里面，只要done掉，就应该从done事件中移除。
		return Disable;
	};
	for(var i=0,j=dep_c;i<j;i++){
		var dep_name = dep_names[i];
		if(!dep_name)continue;
		//依赖项必须是唯一的
		if(deps[dep_name]) throw "Name in depdences must be unique.";
		//试图从缓存中获取依赖项的资源
		var dep_res = cachedRes[dep_name];
		if(dep_res){
			//有缓存，把dep_loaded函数加入到依赖项资源的done事件中
			deps[dep_name] = {res:dep_res,name:dep_name,mod:mod};
			dep_res.done(dep_loaded);
		}else{
			//没有缓存，第一次加载
			//调用loadRes函数真正加载
			var url = resolveUrl(dep_name);
			dep_res = cachedRes[dep_name] = loadRes(url).done(dep_loaded).fail(function(res){err= res;throw "cannot load resource:" + res.name;});
			dep_res.name = dep_name;
			deps[dep_name] = {res:dep_res,name:dep_name,mod:mod};
		}
		
	} 	
	return mod;
}

res.require = yi.require = global.$require = function(){



res.config = function(opts){return yi.extend(res,opts,"yi.res",opts,true);}

//module.load = function(deps){return module.apply(this,arguments)}


})(global,document,location);


(function(global,document,undefined){
var yi = global.$y,isArray = yi.isArray,isFunction = yi.isFunction,Disable = yi.Disable,enabled = yi.enabled;
var increment_id = 0;
//兼容google 的代码，google的函数这些文字在function中是保留属性名
var  reservedPropertyNames = {
		"name" : "name_",
		"arguments" : "arguments_",
		"length" : "length_",
		"caller" : "caller_",
		"prototype" : "prototype_",
		"constructor" : "constructor_"
};

var Model =yi.Model= function(name,target){
	this["@name"] = name===undefined?"prop-" + (increment_id++):name;
	this["@target"]=target || {};
	this.name = function(value){
		/// <summary>get/set观察器名字</summary>
		/// <param name="value" type="String">设定的名字。如果是undefined则返回观察器名字</param>
		/// <returns type="String | Object">读取的名字。如果是set操作则返回监听器本身</returns>
		if(value===undefined)return this["@name"];
		this["@name"] = value;return this;
	}
	this.target = function(target,source){
		/// <summary>get/set要观察的目标对象</summary>
		/// <param name="target" type="Object">要观察的对象</param>
		/// <returns type="String | Object">对象。如果是set操作则返回监听器本身</returns>
		var old = this["@target"];
		if(target===undefined)return old;
		this["@target"] = target || (target ={});
		//监听目标对象改变后，重新给本监听器赋值，以触发
		if(old!==target)this.setValue(target["@name"],"target.change",source);
		return this;
	}
	this.subject = function(subject){
		/// <summary>get/set该观察器的主体对象(主体观察器)。当一个观察器有主体对象时，表示该观察器是主体对象的一个属性</summary>
		/// <param name="subject" type="Object">要设置的主体对象。必须是另一个Model。如果该参数设置为"root"，返回根</param>
		/// <returns type="Object">对象。如果是set操作则返回监听器本身。否则返回主体观察器</returns>
		if(subject===undefined)return this["@subject"];
		if(subject==="root"){
			var sub = this["@subject"];
			return sub?sub.subject("root"):sub;
		}
		var old = this["@subject"];
		//原先的跟新的一样，就什么都不做
		if(old===subject)return this;

		this["@subject"] = subject;
		if(old){
			var name = this["@name"];
			//清除掉原来subject里面的东西
			delete old["@props"][name];
			var accor = old.accessor();
			delete accor[reservedPropertyNames[name]||name];
		}
		var new_targ = subject["@target"] || (subject["@target"]={});
		this.target(new_targ);
		//数组的item不会当作prop
		if(subject.isArray && typeof name!=='number'){
			(subject["@props"] || (subject["@props"]={}))[name] = this;
			var accor = subject.accessor();
			accor[reservedPropertyNames[name]||name] = this.accessor();
		}
		return this;
	}
	
	this.subscribe = function(subscriber){
		/// <summary>订阅/监听目标值的变化</summary>
		/// <param name="subscriber" type="Function">订阅者，监听者</param>
		/// <returns type="Object">监听器本身</returns>
		
		var its = this['@subscribers'];
		(its || (this['@subscribers']=[])).push(subscriber);return this;
	}
	this.unsubscribe = function(evtname,subscriber){
		/// <summary>退订目标值变化。把监听器函数移除</summary>
		/// <returns type="Object">监听器本身</returns>
		
		var its = this[evtname],it;
		if(!its)return this;
		for(var i=0,j=its.length;i<j;i++) if((it=its.shift())!==subscriber) its.push(it);
		if(its.length==0) this["@subscribers"]=null;
		return this;
	}
	this.trigger = function(evt,bubble){
		/// <summary>触发某个事件/禁用事件/启用事件</summary>
		/// <param name="evtname" type="String">事件名。如果该函数第2个参数没有，evtname='valuechange'.如果该值设置为enabled/disabled对象，表示启用/禁用事件</param>
		/// <param name="evt" type="Object">事件对象</param>
		/// <returns type="Object">监听器本身</returns>
		if(evtname===Disable){
			this["@trigger_disabled"] = true;
			return this;
		}
		if(evtname===enabled){
			this["@trigger_disabled"] = false;
			return this;
		}
		if(this["@trigger_disabled"])return this;
		
		var its = this['@subscribers'],it;
		if(its) for(var i=0,j=its.length;i<j;i++) if((it=its.shift()).call(this,evt)===false) break;
		//如果没有禁用bubble,事件本身也没有取消冒泡
		if(bubble!==false && !evt.cancelBubble){
			var sup = this.subject();
			if(sup) {
				var evtArgs = {type:"change",sender:this,value:this["@target"][this["@name"]],reason:"prop.change",source:(evt.source|| evt)};
				sup.trigger(evtArgs);
			}
		}
		return this;
	}
		
	this.value = function(new_v,reason,_source){
		/// <summary>get/set该监听器在目标对象上的值</summary>
		/// <param name="new_v" type="Anything">要设定的新值。如果该参数为undefined，表示获取目标对象上的值</param>
		/// <param name="reason" type="String | not_trigger">变化原因，传递给事件函数用，默认是valuechange。</param>
		/// <param name="_source" type="Object">之名该变化是由哪个个源事件引起</param>
		/// <returns type="Object">监听器本身</returns>
		
		var targ= this["@target"],name = this["@name"];
		if(new_v===undefined) return targ[name];
		//获取旧值，如果跟新值一样就直接拿返回
		var old_v = targ[name];
		if(old_v===new_v)return this;
		//set value to target
		targ[name] = value;
		//表示不需要触发事件，只是设置一下值
		//跳过后面的事件处理
		if(this["@trigger_disabled"]) return this;
		//构建事件参数
		var evtArgs = {type:"set",sender:this,value:value,reason:(reason||"value.reset"),source:_source};
		
		//获取到该监听上的所有下级监听器
		var props = this["@props"];
		
		if(props) for(var n in props) props[n].target(value,evtArgs);
		var items = this["@items"];
		if(items){
			for(var i=0,j= items.length;i<j;i++){
				var it = items[i];
				var it_evt = {type:"remove",sender:item,value:it,reason:"array.reset",source:evtArgs,index:i};
				it.trigger(it_evt);
			}
			this._initArrayData(this["@itemTemplate"],this.value);
		}
		this.trigger(evtArgs);
		//this.childchange(evtArgs);
		return this;
	}
	this.accessor = function(){
		var me = this;
		var accor = function(value){
			if(value===undefined)return me["@target"][me["@name"]];
			me.value(value);
			return accor;
		}
		accor["@model"] = this;
		accor.subscribe = function(evtname,subscriber){
			me.subscribe(evtname,subscriber);
			return accor;
		}
		accor.unsubscribe = function(evtname,subscriber){
			me.unsubscribe(evtname,subscriber);
			return accor;
		}
		accor.define = function(model){
			me.define(model);
			return actor;
		}

		this.accessor = function(){return accor;}
		return this["@accessor"]=accor;
	} 
	

	this.prop = function(name,value){
		var props = this["@props"] || (this["@props"]={});
		var prop = props[name];
		if(!prop){
			prop = props[name] = new Model(name).subject(this);
			if(isArray(value)) prop.asArray();
		}
		if(value===undefined)return prop;
		prop.value(value);
		return this;
	}
	
	this.define = function(model){
		var props = this["@props"] || (this["@props"]={}),target = this["@target"];
		for(var pname in model){
			var member = model[n];
			var prop = props[name] = new Model(pname,target).subject(this);
			if(typeof member ==='object'){
				if(isArray(member)){
					var tmp;
					if(members.length>0) tmp = new Model(0,member).define(member[0]);
					prop.asArray(tmp);
				}else{
					prop.define(member);
				}
			}
		}
		return this;
	}
	this.clone = function(name,target,evtInc){
		var clone = new Model(name,target);
		target = clone.target();
		var props = this["@props"];
		if(props){
			var cloneProps = {};
			for(var propname in props){
				var prop = props[propname];
				var cloneProp = prop.clone(propname,target);
				clone.value[reservedPropertyNames[propname]||propname] = cloneProp.value;
				cloneProp["@subject"] = clone;
			}
			clone["@props"] = cloneProps;
		}
		if(evtInc){
			var subsers = this["@subscribers"];
			if(subsers && subsers.length){
				var cloneSubsers = [];
				for(var i=0,j=subsers.length;i<j;i++)cloneSubsers[i]=subsers[i];
			}
		}
		if(this.isArray) clone.asArray(this["@itemTemplate"]);
		return clone;
	}
	this.asArray = function(itemTemplate){
		this.isArray = true;
		var initArrayData= this._initArrayData = function(itemTemplate,accor){
			var me = this,targ= me["@target"],name = me["@name"];
			if(!targ){me.value(targ=[]);}
			me["@itemTemplate"] = itemTemplate;
			me.isArray = true;
			var items = me["@items"]= itemTemplate?[]:null,len = targ.length;
			var max = accor.length>targ.length?accor.length:targ.length;
			for(var i=0,j=max;i<j;i++){
				//清理数据
				if(i>=len) {delete accor[i];continue;}
				if(items){
					var oIt = itemTemplate.clone(i,targ,true);
					oIt["@subject"] = me;
					items.push(oIt);
				}else accor[i] = targ[i];
			}
			accor.length = targ.length;
			return accor;
		}
		var me  = this,accor = initArrayData.call(this,itemTemplate,this.accessor());
		
		accor.add = accor.push = this.add = this.push = function(it){
			var arr = me["@target"][me["@name"]],items = me["@items"],item;
			arr.push(accor[accor.length++] = it);
			if(items){
				item = me["@itemTemplate"].clone(items.length,arr,true);
				item["@subject"] = me;
				items.push(item);
			}
			var it_evt = {sender:item,value:it,reason:"array.push"};
			var arr_evt = {type:"change",sender:me,value:arr,reason:"array.push",source:it_evt};
			me.trigger(arr_evt);
			return this;
		}
		accor.pop = this.pop = function(retItem){
			var arr = me["@target"][me["@name"]],items = me["@items"],item;
			var it =arr.pop();
			delete accor[arr.length];
			accor.length = arr.length;
			if(items) item = items.pop();
			var it_evt = {type:"add",sender:item,value:it,reason:"array.pop"};
			if(item)item.trigger(it_evt);
			else{
				var arr_evt = {type:"change",sender:me,value:arr,reason:"array.pop",source:it_evt};
				me.trigger(arr_evt);
			}
			return retItem?item:it;
		}
		accor.unshift = this.unshift = function(it){
			var arr = me["@target"][me["@name"]];
			arr.unshift(it);
			for(var i=accor.length;i>0;i--)accor[i]  = accor[i-1];
			accor[0] = it;
			if(items){
				var item = me["@itemTemplate"].clone(0,arr,true);
				item["@subject"] = me;
				items.unshift(item);
			}
			var it_evt = {type : "add",sender:item,value:it,reason:"array.unshift"};
			var arr_evt = {type:"change",sender:me,value:arr,reason:"array.unshift",source:it_evt};
			me.trigger(arr_evt);
			return this;
		}
		accor.shift = this.shift = function(it,retItem){
			var arr = me["@target"][me["@name"]],items = me["@items"],item;
			var it =arr.shift();
			for(var i=0,j=accor.length;i<j;i++)accor[i]  = accor[i+1];
			accor.length = arr.length;
			if(items) item = items.shift();
			var it_evt = {type:"remove",sender:item,value:it,reason:"array.shift"};
			if(item)item.trigger(it_evt);
			else{
				var arr_evt = {type:"change",sender:me,value:arr,reason:"array.shift",source:it_evt};
				me.trigger(arr_evt);
			}
			

			return retItem?item:it;
		}
		accor.remove = this.remove = function(at,retItem){
			var arr = me["@target"][me["@name"]],items = me["@items"],item;
			if(typeof at!=="number"){
				var cp = at;at =undefined;
				for(var i=0,j=arr.length;i<j;i++) if(arr[i]===cp){at = i;break;}
				if(at===undefined)return;
			}
			var ret_v = arr[at],ret_it = items?items[at]:undefined;
			for(var i=at,j=arr.length-1;i<j;i++){
				accor[i] = arr[i] = arr[i+1];
				if(items) items[i] = items[i+1];
			}
			arr.pop();if(items)items.pop();
			var it_evt = {type:"remove",sender:item,value:it,reason:"array.remove",index:at};
			if(ret_it) ret_it.trigger(it_evt);
			else {
				var arr_evt = {type:"change",sender:self,value:it,reason:"array.remove",index:at,source:it_evt};
				me.trigger(arr_evt);
			}
			return retItem ? ret_v:ret_it;
			
		}

		accor.item = this.item = function(index,value){
			var items = me["@items"];
			if(!items)return value===undefined?undefined:this;
			var arr = me["@target"][me["@name"]];
			if(value===undefined) return  items[index];
			accor[index] = arr[index] = value;
			var item = items[index].value(value,"array.item");
			var it_evt = {type:"change",sender:item,value:value,reason:"array.item",index:index};
			item.trigger(it_evt);
			return item;
		}
		accor.clear = this.clear = function(){
			var arr = me["@target"][me["@name"]],items = me["@items"];
			if(items){
				for(var i=0,j=items.length;i<j;i++){
					var it_evt = {type:"remove",sender:item,value:value,reason:"array.clear",index:i};
					//不冒泡，处理完成后统一给array发送消息
					items[i].trigger(it_evt,false);
				}
			}
			var arr_evt = {type:"change",sender:self,value:it,reason:"array.clear"};
			me.trigger(arr_evt);
			return this;
		}

		this.asArray = function(template){
			if(template===undefined)return this;
			this["@itemTemplate"] = template;
			initArrayData.call(this,template,accor);
			return this;
		}
		return this;
	}
	
}//end function Model
yi.model = function(value,model){
	var ret = new Model("",{"":value});
	if(model) ret.define(model);
	return ret;
}
})(global,document);

(function(global,document,undefined){
var yi = global.$y,Deferred = yi.Deferred,extend = yi.extend;
var createHttp = function(){
	if(global.XMLHttpRequest){
		createHttp = function(){
			var http = new XMLHttpRequest();
			if (http.overrideMimeType) {
				http.overrideMimeType('text/xml');
			};
			return http;
		}
	}else {
		createHttp = function(){
			var http=new ActiveXObject("Microsoft.XMLHTTP");
			return http;
		}
	}
	return createHttp();
}
var HttpRequest = function(opts){
	this._opts = opts || {};
	this.header = function(name,value){
		var opts = this._opts;
		if(name===undefined)return this["@headers"] || {};
		var headers = this["@headers"] || (this["@headers"] = {});
		if(typeof name==='object') extend(headers,name);
		else headers[name] = value;
		return this;
	}
	this.url = function(val){
		if(val===undefined){
			var val = this._opts.url;
			return val || "";
		}
		this.opts.url = val;return this;
	}
	this.method = function(val){
		if(val===undefined){
			var val = this._opts.method;
			return (val===undefined) ? "GET":method;
		}
		this._opts.method= val;return this;
	}
	this.async = function(val){
		if(val===undefined)return this._opts.async !==false;
		this._opts.async = val;return this;
	}
	this.dataType = function(val){
		if(val===undefined)return this._opts.dataType;
		this._opts.dataType = val;return this;
	}
	this.accept = function(val){
		if(val===undefined)return this._opts.accept;
		this._opts.accept = val;return this;
	}
	this.opts = function(opts){
		if(opts===undefined)return this._opts;
		extend(this._opts,opts);
		if(opts.headers) this.header(opts.headers);
		return this;
	}
	
	this.send = function(data){
		var http = this.raw = createHttp(),dfd = new Deferred(),me = this;
		try{
			var headers = this.header();
			for(var n in headers) raw.setRequestHeader(n,headers[n]);
			http.onreadystatechange = function(){
				if (http.readyState==4){
					if(http.status==200){
						var acpt = me["accept"];
						var handler = acceptHandlers[acpt];
						var rs;
						if(handler)rs = handler(http);
						else rs = http.responseText;
						dfd.resolve(rs);
					}else{
						dfd.reject({
							status:http.status,
							statusText : http.statusText,
							content : http.responseText
						});
					}
				}
			}
			http.open(this.method(),this.url(),this.async());
			var dataType = this["@dataType"];
			var handler = dataHandlers[dataType] || dataHandler;
			http.send(handler(data));
			
		}catch(e){
			yi.elog(e);
			dfd.reject(e);
		}
		return dfd.promise(this);
	}
	if(opts) this.opts(opts);
	return this;
}
var dataHandler = function(data){
	if(typeof data==="object"){
		var rs = "";
		for(var n in data) {
			if(rs!="")rs+= "&";
			rs+= encodeURIComponent(name);
			rs += "=";
			var val = data[n];
			rs += encodeURIComponent(val===null||val===undefined?"":val);
		}
		return rs;
	}
	return data===null || data===undefined?"":data.toString();
}
var dataHandlers = {
	"json" : function(data){
		return JSON.stringify(data);
	}
}
var accepts = {
	"json": "text/json",
	"xml" : "text/xml"
}
var acceptHandlers = {
	"json" : function(http){
		var text = xmlhttp.responseText;
		return JSON.parse(text);
	},
	"xml" : function(http){
		return xmlhttp.responseXml;
	}
}
yi.ajax = global.$ajax  = function(opts){return new HttpRequest(opts).send(opts.data);}
})(global,document);




(function(window,document,undefined){
var yi = window.$y;
var ctnrs = {
	
	"li": document.createElement("ul"),
	"option": document.createElement("select"),
	"legend":document.createElement("fieldset")
};
var div = ctnrs[""] = document.createElement("div");
ctnrs.th = ctnrs.td = document.createElement("tr");
ctnrs.dt = ctnrs.dd =  document.createElement("dl");
ctnrs.tbody = ctnrs.tfoot = ctnrs.thead = ctnrs.tbody = document.createElement("table");

//--------------元素的事件操作-----------------------
var attach,detech;
if(div.attachEvent){
	yi.attach = function(elem,evt,handler){elem.attachEvent('on' + evt,handler);}
	yi.detech = function(elem,evt,handler){elem.detechEvent('on' + evt, handler);}
}else if(div.addEventListener){
	yi.attach = function(elem,evt,handler){elem.addEventListener(evt,handler,false);}
	yi.detech = function(elem,evt,handler){elem.removeEventListener(evt, handler,false);}
}


yi.hasClass = function(obj,cls){return obj.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));};
yi.addClass = function(obj,cls){if (!this.hasClass(obj, cls)) obj.className += " " + cls;};
var removeClass = yi.removeClass = function(obj, cls) {
	if (hasClass(obj, cls)) {
		var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
		obj.className = obj.className.replace(reg, ' ');
	}
}


//-------------获取、设置式样表---------------------
if(window.getComputedStyle){
	yi.getStyle = function(elem, style){return getComputedStyle(elem, null).getPropertyValue(style);}
	yi.getOpacity  = function(elem){ getComputedStyle(elem, null).getPropertyValue('opacity');}
}else {
	yi.getOpacity  = function(elem){
		var filter = null;

		// 早期的 IE 中要设置透明度有两个方法：
		// 1、alpha(opacity=0)
		// 2、filter:progid:DXImageTransform.Microsoft.gradient( GradientType= 0 , startColorstr = ‘#ccccc’, endColorstr = ‘#ddddd’ );
		// 利用正则匹配
		fliter = elem.style.filter.match(/progid:DXImageTransform.Microsoft.Alpha\(.?opacity=(.*).?\)/i) || elem.style.filter.match(/alpha\(opacity=(.*)\)/i);
		if (fliter) {
			var value = parseFloat(fliter);
			if (!NaN(value)) {
				// 转化为标准结果
				return value ? value / 100 : 0;
			}
		}
		// 透明度的值默认返回 1
		return 1;
	};
	yi.getStyle = function(elem,style){
		// IE 下获取透明度
		if (style == "opacity") {
			return getOpacity(elem);
		// IE687 下获取浮动使用 styleFloat
		} else if (style == "float") {
			return elem.currentStyle.getAttribute("styleFloat");
			// 取高宽使用 getBoundingClientRect
		} else if ((style == "width" || style == "height") && (elem.currentStyle[style] == "auto")) {
			var clientRect = elem.getBoundingClientRect();
			return (style == "width" ? clientRect.right - clientRect.left : clientRect.bottom - clientRect.top) + "px";
		}
		// 其他样式，无需特殊处理
		return elem.currentStyle.getAttribute(camelize(style));
	};
}
yi.setOpacity = function(elem,value){
	val = parseFloat(val);
	elem.style.opacity = val;
	elem.style.filter = "filter:alpha(opacity=" + (val * 100) + ")";
	return elem;
}
yi.setStyle = function(elem,style,value){elem.style[camelize(style)] = value;}
yi.isVisible = function(elem){
	while(elem){
		if( getStyle(elem,"display")=='none' || getStyle("visibility")=='hidden')return false;
		elem = elem.parentNode;
	}
	return true;
}

//---获取元素绝对位置-----
if(div.getBoundingClientRect){
	yi.getPosition = function(elem){
		var rect = elem.getBoundingClientRect();
		return {
			x: rect.left + ( document.body.scrollLeft|| document.documentElement.scrollLeft),
			y: rect.top + (document.body.scrollTop || document.documentElement.scrollTop)
		};
	}
}else {
	yi.getPosition = function(elem){
		if(elem==document.body || elem == document.documentElement)return {x:0,y:0};
		var x=0 ,y=0;
		while(elem){
			x += elem.offsetLeft;y += elem.offsetTop;
			elem = elem.offsetParent;
		}
		return {x:x,y:y};
	}
}

//------------添加、移除className----------------
yi.hasClass = function(obj, cls) {return obj.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));}
yi.addClass = function(obj, cls) {if (!hasClass(obj, cls)) {obj.className += " " + cls;return true;}return false;}
yi.removeClass = function(obj, cls) {
	if (hasClass(obj, cls)) {
		var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
		obj.className = obj.className.replace(reg, ' ');
		return true;
	}return false;
}

//---------get or set value

yi.getElementValue = function(elem){
	var tag = elem.tagName;
	switch(tag){
		case "INPUT":
			var type = elem.type;
			if(type=='checkbox' || type=='radio'){
				if(elem.checked)return elem.value;
				else return undefined;
			}
			return elem.value;
		case "SELECT":
			return elem.options[elem.selectedIndex].value;
		case "TEXTAREA":return elem.value;
		defautl:return elem.value;
	}
}
})(window,document);

(function(window,document){
var yi = window.$y;
yi.getCookie = function(name){
	var arr,reg=new RegExp("(^| )"+name+"=([^;]*)(;|$)");
	return (arr=document.cookie.match(reg))?unescape(arr[2]):null;
}
yi.setCookie = function(name,value,time){
	if(value===null){
		var exp = new Date();
		exp.setTime(exp.getTime() - 1);
		document.cookie= name + "=;expires="+exp.toGMTString();
		return;
	}
	if(time){
		var exp = yi.parseDate(time);
		if(!exp){
			var strsec = getsec(time||"");
			var exp = new Date();
			exp.setTime(exp.getTime() + strsec*1);
		} 
		
		document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString();
	}else document.cookie = name + "="+ escape (value===undefined?"":value) + ";";
}
function getsec(str){
	var str1=str.substring(1,str.length)*1;
	var str2=str.substring(0,1);
	if (str2=="s")return str1*1000;
	if (str2=="m")return str1*1000*60;
	else if (str2=="h")return str1*60*60*1000;
	else if (str2=="d")return str1*24*60*60*1000;
}
})(window,document);