(function(Global){
var data = {};
var $assert = Global.$assert  = function(expect,actual,text){
	if(arguments.length===1) return isTrue.call($assert,expect);
	return equal.call($assert,expect,actual,text);
}
var Assert =$assert.Assert  = $assert.constructor = function(){
	this.__data = {};
	this.clear = function(){this.__data = {};return this;}
	this.set=function(key,value){this.__data[key]=value;return this}
	this.get=function(key){return this.__data[key];}
	this.log= function(){try{console.log.apply(console,arguments);}catch(ex){};return this;}
	this.check = function(value ,then){if(value) then();return this;}
	this.isArray = function(value,text){
		var t = Object.prototype.toString.call(value);
		if(t!=='[object Array]'){
			this.log(text || "Assert isArray");
			this.log("expect:array");
			this.log("actual:",value);
			//alert(arguments.callee.callee);
			//this.log("invoker:",arguments.callee.caller);
			throw new Error(text || "Assert isArray");
		}
		return this;
	}
	this.Equal = function(expect,actual,text){
		if(expect!==actual){
			this.log(text || "Assert Equal");
			this.log("expect:",expect);
			this.log("actual:",actual);
			//this.log("invoker:",argument.callee.caller);
			throw new Error(text || "Assert Equal");
		}
		return this;
	}
	this.None = function(value,text){
		if(value){
			this.log(text || "Assert None");
			this.log("expect:0,null,undefined,''");
			this.log("actual:",value);
			//alert(arguments.callee.callee);
			//this.log("invoker:",arguments.callee.caller);
			throw new Error(text || "Assert None");
		}
		return this;
	}
	this.NotNone = function(value,text){
		if(!value){
			this.log(text || "Assert NotNone");
			this.log("expect:Not be 0,null,undefined,''");
			this.log("actual:",value);
			//alert(arguments.callee.callee);
			//this.log("invoker:",arguments.callee.caller);
			throw new Error(text || "Assert NotNone");
		}
		return this;
	}
	this.Undefined = function(value,text){
		if(value!==undefined){
			this.log(text || "Assert undefined");
			this.log("expect:undefined");
			this.log("actual:",value);
			//this.log("invoker:",argument.callee.caller);
			throw new Error(text || "Undefined");
		}
		return this;
	}
	this.Null = function(value,text){
		if(value!==null){
			this.log(text || "Not null");
			this.log("expect:null");
			this.log("actual:",value);
			//this.log("invoker:",argument.callee.caller);
			throw text || "Not null";
		}
		return this;
	}
	
	this.True = function(value,text){
		if(value!==true){
			this.log(text || "Assert True");
			this.log("expect:true");
			this.log("actual:",value);
			//this.log("invoker:",argument.callee.caller);
			throw new Error(text || "Assert True");
		}
		return this;
	}
	this.False = function(value,text){
		if(value!==false){
			this.log(text || "Not false");
			this.log("expect:false");
			this.log("actual:",value);
			//this.log("invoker:",argument.callee.caller);
			throw text || "Not flase";
		}
		return this;
	}
}

Assert.call($assert);
var equal = $assert.Equal;
var isTrue = $assert.True;
})(window);