"strict";
(function (Global, document, undefined) {
    var yi = Global.yi || (Global.yi = {});
    var objProto = Object.prototype;
    var arrProto = Array.prototype;
    var aslice = arrProto.slice;
    var otoStr = objProto.toString;
    var ftoStr = Function.prototype.toString;
	var noop  =function(){};

    var Logger = function (_opts) {
		this.toString = function(){return "[object,yi.log.Logger]";}
		var empty = function(){},me = this;
		empty["@log.disable"] = empty;
		this["@log.enable"]= empty["@log.enable"] = this;
        var opts = {
            output: Logger.defaultOutput,
            levels: ["debug","fail","warming","notice","info",'success',"assert"],
            defaultLevel: "debug"
        }
        if (_opts) for (var n in _opts) opts[n] = _opts;
        empty.opts = this.opts = opts;
        this.log = function (lv) {
            if (arguments.length == 0 || this.isLogDisabled) return this;
            var lvfn;
            var lvs = this["@log.levels"];
            if ((lvfn = lvs[lv])) {
                if (!lvfn.isLogDisabled) this["@log.output"].call(this, lv, arguments,1);
            } else {
                this["@log.output"].call(this, this["@log.defaultLevel"], arguments);
            }
            
        }
		empty.log = noop;
        
        this.enable = empty.enable = function () {
			var args=[],lvs = me["@log.levels"];
			if(arguments.length==0){
				this.isLogDisabled = false;
				for(var n in lvs) args.push(lvs);
			}else{
				args=arguments;
			}
            
            
            for (var i = 0, j = args.length; i < j; i++) {
                var n = args[i]; if (!n) continue;
                var stored = lvs["##" + n];
                if (stored) {
                    me[n] = stored;
                    stored.isLogDisabled = false;
                }
            }
            return this;
        }
        this.disable= empty.disable = function () {
			var args=[],lvs = me["@log.levels"];
            if (arguments.length == 0) {
                this.isLogDisabled = true; 
				for(var n in lvs) args.push(lvs);
            }
            for (var i = 0, j = args.length; i < j; i++) {
                var n = args[i]; if (!n) continue;
                var stored = lvs["##" + n];
                if (!stored) continue;
                stored.isLogDisabled = true;
                this[n] = noop;
            }
            return this;
        }
        var config = function (output, lvs) {
            var levels = me["@log.levels"];
            var elvs = [];
            for (var n in levels) {
                var name = n.substring(2);
                elvs.push(name);
                delete me[name];
				delete empty[name];
            }
            if (lvs) me["@log.levels"] = levels = {};
            else lvs = elvs;
            if (!output) output = me["@log.output"];
            else this["@log.output"] = output;
            for (var i in lvs) {
                var lv = lvs[i];
                (function (logger, name, levels, output, aslice) {
                    var name1 = "##" + name;
                    var log  = function () {
                        if(logger.isLogDisabled)return;
                        output.call(logger, name1, arguments);
                    }
					levels[name1] = logger[name]= log;
                })(me, lv, levels, output, aslice);
				empty[lv]=noop;
            }
			me.output = output;
			empty.output = noop;
        };
        this.config = empty.config = function (opts) {
            if (opts.output) me["@log.output"] = opts.output;
            config.call(me, opts.output, opts.levels);
            if (opts.defaultLevel){ me["@log.defaultLevel"] =empty["@log.defaultLevel"]= "##" + opts.defaultLevel; }
            if (opts.enables) this.enable.apply(this, opts.enables);
            if (opts.disables) this.disables.apply(this, opts.disables);
			var dft = me["@log.levels"][me["@log.defaultLevel"]];
			if(!dft){
				for(var n in me["@log.levels"]) {
					empty["@log.levels"]=me["@log.defaultLevel"]=n;
					
					break;
				}
			}
            return this;
        }
        this.addOutput =empty.addOutput= function (output) {
            var exist = me["@log.output"];
            if (typeof exist.addArggregation === 'function') {
                if(!exist.existAggregation(output))exist.addArggregation(output);
            } else if (exist!=output) {
                var aggr = Logger.outputAggregation();
				aggr.addAgregation(exist);
                aggr.addAggregation(output);
                me["@log.output"] = aggr;
            } else {
                me["@log.output"] = output;
            }
            config(this["@log.output"], this["@log.levels"]);
        }
        this.removeOutput = function (output) {
            var exist = me["@log.output"];
            if (typeof exist.removeArggregaation === 'function') {
                exist.removeArggregaation(output);
                if (exist.count() == 1) {
                    me["@log.output"] = exist.getAggregatioin(0);
                }
            } if (exist) {
                if (exist === output) me["@log.output"] = log.defaultOutput;
            }
            config(me["@log.output"], me["@log.levels"]);
        }
        this.config(opts);
    };
	Logger.create = function(loggerTypename,params){
		var mylogger;
		var result = mylogger= function(){
			var logger = mylogger;
			if (arguments.length == 0 || logger.isLogDisabled) return this;
			var lvfn,lv = arguments[0];
			var lvs = logger["@log.levels"];
			if ((lvfn = lvs[lv])) {
				if (!lvfn.isLogDisabled){ 
					var log = logger["@log.output"];
					log.call(logger, lv, arguments,1);
				}
			} else {
				logger["@log.output"].call(logger, logger["@log.defaultLevel"], arguments);
			}
		}
		eval((loggerTypename || "yi.log.Logger") + ".call(result,params)");
		result.toString = function(){return "[function," + loggerTypename + "]";}
		return result;
	}
	Logger.defaultOutput = function (lv, params,start) {
        try {
            params || (params = []);
            var t = new Date();
            var s = lv || "##debug";
			if(typeof params !=='object'){ console.log(s,params);return this;}
			if(start){
				if(!params.shift)params = aslice.call(params);
				for(var i=0;i<start;i++) params.shift();
			}
			if(!params.unshift)params = aslice.call(params);
            params.unshift(s);
            console.log.apply(console, params);
        } catch (ignore) { }
    };
	Logger.outputAggregation = function () {
        var ret = function (type,contents,start) {
            for (var i = 0, j = fns.length; i < j; i++) fns[i].call(this,type,contents,start);
        }
        var fns = ret["@log.aggregations"]=[];
        ret.addAggregation = function (fn) {
            fns.push(fn); return this;
        }
        ret.removeAggregation = function (fn) {
            for (var i = 0, j = fns.length; i < j; i++) {
                var it = fns.shift();
                if (it !== fn) exist.push(it);
            }
            return this;
        }
        ret.getAggregation = function (i) { return fns[i]; }
        ret.existAggregation = function (it) {
            for (var i = 0, j = fns.length; i < j; i++) {
                if (fns[i] === it) return true;
            }
            return false;
        }
        ret.count = function () { return fns.length;}
        return ret;
    }
	var log = yi.log = Global.$log = Logger.create("Logger");
	log.enable = function(){
		log = Global.$log = log["@log.enable"];
		return log.enable.apply(log,arguments);
	}
	log.disable = function(){
		log = Global.$log = log["@log.disable"];
		return log.disable.apply(log,arguments);
	}
	log.Logger = Logger;
	log.toString = function(){return "[function yi.log.Logger]";}

    yi.log.HtmlLogger = function (elem) {
		Logger.call(this,{levels:[]});
		var me = this;
		this.toString = function(){return "[object,yi.log.HtmlLogger]";}
		//不要让Logger的默认levels出现在原型中
        elem = this.element  = elem || document.createElement("div");
		elem.className = "logger-output";
		elem.style.cssText = "margin:0;padding:5px;overflow:auto;word-wrap:break-word;";
		this["@log.levels"] =null;
        this["@log.css"] = {
            "##assert": "color:#dfdfdf;border-bottom:1px dashed #666666;",
            "##debug": "color:yellow;border-bottom:1px dashed #666666;",
            "##info": "color:gray;border-bottom:1px dashed #666666;",
            "##notice": "color:white;border-bottom:1px dashed #666666;",
            "##warming": "color:orange;border-bottom:1px dashed #666666;",
            "##success": "color:green;border-bottom:1px dashed #666666;",
            "##fail": "color:red;border-bottom:1px dashed #666666;"
        };
		this.trace = function(v){
			if(v===undefined)return this["@log.trace"];
			this["@log.trace"] = v;return this;
		}
        var output = (function (me, outputView, css) {
            var output = function (type, contents,start) {
                var ctn = document.createElement("div");
                ctn.style.cssText = css[type] || css[me.defaultLevel] || "";
				ctn.style.clear = "both";
				ctn.className = type.substring(2);
				if(typeof contents==="string"){
					ctn.innerHTML = contents;
				}else{
					for (var i = (start||0), j = contents.length; i < j; i++) {
						var o = contents[i];
						var elem = toDom(o);
						var div = document.createElement("div");
						div.appendChild(elem);
						div.style.cssText = "float:left;";
						ctn.appendChild(div);
					}
				}
                
				var stack = document.createElement("div");
				
                if (me["@log.trace"]) {
					var t = new Date();
					var ts = t.getMonth() + "/" + t.getDate() + "/" + t.getFullYear() + "T" + t.getHours() + ":" + t.getMinutes() + ":" + t.getSeconds() + "." + t.getMilliseconds();
					var tz = t.getTimezoneOffset()/60;
					ts += tz>=0?"+" +tz:tz.toString();
                    stack.innerHTML = "<span style='color:#666;text-decoration:underline;cursor:pointer;'>&"+ts+"</span>";
                    stack.style.cssText = "float:right;";
                    var stacks;
					try{
						throw new Error();
					}catch(ex){
						var stacks = ex.stack.split("\n");
						var hasOutput=false,txt;
						while(true){
							txt = stacks.shift();
							if(!txt)break;
							if(txt==='Error' )continue;
							var at = txt.indexOf("(");
							if(at<0){
								at = txt.indexOf("@");
								if(at<0)break;
							}
							var codeAt = txt.substring(0,at).replace(/( +$)/g,"");
							var isOutput = codeAt.substring(codeAt.length-7);
							if(isOutput===' output' || isOutput==='.output' || isOutput==='/output'){hasOutput=true; continue;}
							var isLog = codeAt.substring(codeAt.length-4);
							if(isLog===' log' || isLog==='.log' || isLog ==='/log'|| codeAt.indexOf("at Function.Logger.")>=0){continue;}
							var isLogger = codeAt.substring(codeAt.length-6);
							if(isLogger==="logger" || isLogger==="Logger")continue;
							//if(hasOutput){
								stacks.unshift(txt);
								//if(lastLog) stacks.unshift(lastLog);
								break;
							//}
							//if(txt.substring(at-,at))
						}
						
					}
                    
                    var d = ctn["@log.tracesElement"] = document.createElement("div");
                    
                    d.style.cssText = "border:1x dashed #999;color:#888;clear:both;";
                    var b = "<ol style=''><li>" + stacks.join("</li><li>") + "</li></ol>";
                    d.innerHTML = b;

                    stack.onclick = function (evt) {
                        var d = ctn["@log.tracesElement"];
                        if (!d.parentNode) {
                            ctn.appendChild(d);
                        } else d.parentNode.removeChild(d);
                        evt = evt || event;
                        evt.cancelBubble = true; evt.returnValue = true;
                        if (evt.preventDefault) evt.preventDefault();
                        return false;
                    }
                }
				ctn.insertBefore(stack, ctn.firstChild);
				var clear = document.createElement("div");
				clear.style.cssText = "clear:both";
				ctn.appendChild(clear);
                outputView.appendChild(ctn);
                outputView.scrollTop = outputView.scrollHeight;
                outputView.scollLeft = 0;
            }
            return output;
        })(this, this.element, this["@log.css"]);
		var opts = {
            output: output,
            levels: ["debug","fail","warming","notice","info",'success',"assert"],
            defaultLevel: "debug"
        }
		this.config(opts);
		var basconfig = this.config;
        this.config = this["@log.disable"] = function (opts) {
            if (opts.output) throw new Error("HtmlLogger's output is fixed. You should NOT replace this output.");
            
            basconfig.call(me,opts);
			if (opts.css) {
                var css = me["@log.css"], ns = [], lvs = me["@log.levels"];
                for (var n in css) ns.push(n);
                for(var i in ns) if(!lvs[ns[i]]) delete css[ns[i]];
                for(var n in opts.css) css["##" + n] = opts.css[n];
            }
        }
       
        
    }
	

    var toDom = function (o, exists,deep) {
        var t = typeof o;
        exists || (exists = []);
		deep || (deep=1);
        if (t === "object" || t === 'function') {
            if (o === null) {
                var divnull = document.createElement("div");
                divnull.className = "object null";
                divnull.innerHTML = "null";
                return divnull;
            }
            //去重
            for (var i = 0, j = exists.length; i < j; i++) {
                if (exists[i] === o) {
                    var e = document.createElement("div");
                    e.className = "cuit";
                    e.innerHTML = "[cuit ref]";
                    return e;
                }
            }
            exists.push(o);
            var valuehtml;
            if (t !== 'function') { 
                valuehtml = htmlEncode(o.toString());
            } else {
                //var elem = document.createElement("div");
                var code = ftoStr.call(o);
                var at = code.indexOf(")");
                //if (at <= 0) {
                //    var divfn = document.createElement("div");
                //    divfn.className = "function value-like";
                //    divfn.innerHTML = code;
                //    return divfn;
                //}
                var df = code.substring(0, at + 1);
                //var cd = code.substring(at+1);//
                valuehtml = "<span style='text-decoration:underline;' onclick=\"this.nextSibling.style.display=this.nextSibling.style.display==='none'?'block':'none'\">" + df + "</span><div style='float:left;display:none;'>" + htmlEncode(code) + "</div>";
                //elem.innerHTML = html; elem.className = "function";

            }
            
            var elem = document.createElement("table");
			elem.style.cssText ="text-align:left;";;
            if (Object.prototype.toString.call(o) === '[object Array]') elem.className = "object array";
            else if (t === 'function') elem.className = "function";
            else elem.className = "object";
            var hd = document.createElement("thead");
            var hdTr = document.createElement("tr"); hd.appendChild(hdTr);
            var preElem = document.createElement("td");
            preElem.innerHTML = "<span style='color:#666;cursor:pointer;'>+</span>";
			preElem.__collapsed = true;
            preElem.onclick = function () {
                var hd = this.parentNode.parentNode;
                var valueTbody = hd.nextSibling;
                if (!this.__collapsed) {
                    valueTbody.style.display = "none";
                    this.innerHTML = "<span style='color:#666;cursor:pointer;'>+</span>";
					this.__collapsed = true;
                } else {
                    valueTbody.style.display = "table-row-group";
                    this.innerHTML = "<span style='color:#666;cursor:pointer;'>-</span>";
					this.__collapsed= false;
                }
            }
            hdTr.appendChild(preElem);
            var nmTd = document.createElement("td");
            
            nmTd.innerHTML = "<div class='value'>" + valuehtml + "</div>"; nmTd.setAttribute("colspan", 2); hdTr.appendChild(nmTd);

            var bd = document.createElement("tbody");
            bd.style.display = "none";
            bd.className = "members";
			if(o instanceof Error) o = {message:o.message,stack:o.stack};
            for (var n in o) {
                var val = o[n];
                var valElem = deep==4?toDom(val?val.toString():val):toDom(val, exists,deep+1);

                var tr = document.createElement("tr");
                var preTd = document.createElement("td");
                preTd.innerHTML = "&nbsp;"; tr.appendChild(preTd);
                var nameTd = document.createElement("th");
                nameTd.setAttribute("valign", "top");
                nameTd.innerHTML = "<div class='member-name'>" + htmlEncode(n) + "</div>"; tr.appendChild(nameTd);
                var valueTd = document.createElement("td");
                valueTd.style.width = "100%";
                var valueDiv = document.createElement("div");
                valueDiv.className = "value";
                valueDiv.appendChild(valElem);
                valueTd.appendChild(valueDiv);
                tr.appendChild(valueTd);
                bd.appendChild(tr);
            }

            elem.appendChild(hd);
            elem.appendChild(bd);
            return elem;
        } else {
            var elem = document.createElement("span");
            if (t === 'undefined') {
                elem.innerHTML = "undefined";
                elem.className = "undefined";
            } else if (t === 'number') {
                elem.innerHTML = o.toString();
                elem.className = "number";
            } else if (t === 'string') {
                elem.innerHTML = htmlEncode(o);
                elem.className = "string";
            }else if(t==='boolean'){
				elem.innerHTML = t?"true":"false";
				elem.className = "boolean";
			}else if(t==='number'){
				elem.innerHTML = t.toString();
				elem.className = "number";
			}else {
				elem.innerHTML = t.toString();
				elem.className = "unknown";
			}
            return elem;
        }
    }
    var htmlEncode = function (txt) {
        if(txt===null)return "null";
        if (txt === undefined) return "undefined";
        return txt.toString().replace(/&/g, "&amp").replace(/ /g, "&nbsp;").replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");
    }

    var Console = function (elem) {
		this.toString = function(){return "[object,yi.console.Console]";}
        var me = this;
		this["@console.fontSize"] = 16;
        elem = this.element = elem || document.createElement("div");
		elem.className = "console";
		elem.style.position="absolute";
		elem.style.fontSize = "16px;";
		//elem.style.overflow = "hidden";
		
		//控制台由三部分构成
		elem.innerHTML = "<textarea style='z-index:999999999;width:100%;height:20px;padding:2px;border:1px solid #333;position:absolute;left:0;top:0;clear:both;'></textarea><div class='quickActions' style='position:absolute;clear:both;'></div>";
		
		//快捷栏
		var quickActionsView = elem.lastChild;
		//命令行
		var commandView = elem.firstChild;
		//日志器

		var logger = this.log = yi.log.Logger.create("yi.log.HtmlLogger");
		elem.insertBefore(logger.element,quickActionsView);
		var loggerView  = this.loggerView = logger.element;
		loggerView.style.position="absolute";
		loggerView.style.padding = '5px';
		logger.config({
			levels : ["command","debug","fail","warming","notice","info",'success',"assert"],
			css: {"command":"color:#efefef;"}
		});
		var refreshView = this.refreshView = function(){
			if (commandView.offsetHeight < this["@console.fontSize"]+4) commandView.style.height = this["@console.fontSize"] + 4 + "px";
			commandView.style.top = "0";
			commandView.style.left = "0";
			commandView.style.width = elem.offsetWidth-6 + "px";
			loggerView.style.width = elem.offsetWidth-12 + "px";
			loggerView.style.top = commandView.offsetHeight -1 + "px";
			loggerView.style.height = elem.offsetHeight - quickActionsView.offsetHeight - this["@console.fontSize"]  -22 + "px";
			var y = elem.offsetHeight - quickActionsView.offsetHeight + 2;
			quickActionsView.style.top =  (y>0?y:0) + "px";
			quickActionsView.width = elem.offsetWidth + "px";
			setPosition.tick = 0;
		}
		var setPosition = function(){
			if(setPosition.tick)return;
			setPosition.tick = setTimeout(refreshView,100);
		}
		this.quickActions = function(commands,notMove){
			for(var n in commands){
				var value = commands[n];
				var t = typeof value;
				var elm ;
				if(t==='function') {
					elm = document.createElement("button");
					elm.innerHTML  = n;elm.onclick = value;
				}else if(t==='string'){
					elm = document.createElement("div");
					elm.innerHTML = value;
				}else {
					try{
						elm = document.createElement("div");
						elm.appendChild(value);
					}catch(ignore){}
				}
				elm.style.cssText= "float:left;";
				quickActionsView.appendChild(elm);
			}
			var clr = document.createElement("div");clr.style.cssText ="clear:both;";
			quickActionsView.appendChild(clr);
			if(!notMove)setPosition();
		}
		this.init = function(opts){
			opts || (opts = {});
			if(opts.quickActions){this.quickActions(opts.quickActions,true);}
			this.refreshView();
			if(window.attachEvent)window.attachEvent("onresize",setPosition);
			else if(window.addEventListener) window.addEventListener("resize",setPosition,false);
			this.init = function(){throw new Error("Aready inited.");}
			this.init.valid = false;
			return this;
		}
		this.dispose =function(){
			if(window.detechEvent)window.detechEvent("onresize",setPosition);
			else if(window.removeEventListener) window.removeEventListener("resize",setPosition,false);
		}
		commandView.onkeydown = function (evt) {
            evt = evt || event;
            //yi.console.log(evt.keyCode);
            if (evt.keyCode === 13) {
                if ((commandView.value[0] == ":" && commandView.value[1] == ':') || evt.ctrlKey) {
                    me.exec(commandView.value);
					evt.returnValue = false;evt.cancelBubble = true;
					if(evt.preventDefault)evt.preventDefault();
                    return false;
                }
                var h = commandView.scrollHeight + me["@console.fontSize"];
                if (h > elem.offsetHeight - quickActionsView.clientHeight) h = elem.offsetHeight - quickActionsView.clientHeight;
                commandView.style.height = h + "px";
            }
        }
        this.exec = function (code) {
			code = code.replace(/(^\s+)|(\s+$)/g,"");
			if(!code){this.log.warming("No command to input");}
			else{
				var hasError = false;
				var html = "<fieldset style='border:1px dashed #999;background-color:#696969;color:#dedede;'><legend style='background-color:#3d3d3d;color:#fff;font-weight:bold;padding:2px 5px;'>Execute:</legend><pre style='margin:5px;'>"+htmlEncode(code)+"</pre></fieldset>";
				logger.output("##command",html);

				if (code.indexOf("::") == 0) {
					code = code.substring(2);
					if (code[code.length - 1] != ")") code += "()";
					try {
						var fnc = "return $$me$$." + code;
						var fn = new Function("$$me$$", fnc);
						fn(this);
						logger.success("success");
					} catch (ex) {
						logger.fail(ex);hasError = true;
					}
				} else {
					try {
						eval(code);
						logger.success("success");
					} catch (ex) {
						logger.fail(ex);hasError = true;
					}
				}
			}
            
			commandView.style.height = this["@console.fontSize"] + 4 + "px";
			commandView.scrollTop = commandView.scrollLeft= 0;
			commandView.value = "";
			this.refreshView();
        }

		this.fontSize = function (v) {
            if (v === undefined) return this["@console.fontSize"];
            v = this["@console.fontSize"] = parseInt(v) || 16;
            elem.style.fontSize = v + "px";
            setPosition();
			return this;
        }
        this.clear = function () { loggerView.innerHTML = ""; return this; }
    }
	yi.console = (function(Console){
		var con = new Console();
		var elem = con.element;
		con["@console.width"]= con["@console.height"] = 500;
		elem.style.cssText = "z-index:999999999;font-size:16px;position:fixed;right:0;bottom:0;height:500px;width:500px;";
		var top="auto",left="auto",right="0",bottom="0";
		con.dock = function(v){
			if(v==="left"){right = elem.style.right="auto";left =  elem.style.left="0";}
			if(v==="right"){right = elem.style.right="0";left = elem.style.left="auto";}
			if(v==="top"){ top = elem.style.top="0"; bottom = elem.style.bottom="auto";}
			if(v==="bottom"){top = elem.style.top="auto";bottom = elem.style.bottom="0";}
			return this;
		}
		var tryFullscrn = function(){
			if(tryFullscrn.tick)return ;
			tryFullscrn.tick = setTimeout(fullscrn,100);
		}
		var fullscrn = function(){
			var view = document.compatMode==="CSS1compat"? document.body:document.documentElement;
			elem.style.width = view.clientWidth + "px";
			elem.style.height = view.clientHeight  + "px";
			elem.style.top = "0";elem.style.left = "0";
			elem.style.right= "auto";elem.style.bottom = "auto";
			con.refreshView();
			tryFullscrn.tick = 0;
		}
		con.fullscreen = function(v){
			if(v===false){
				elem.style.width = this["@console.width"] + "px";
				elem.style.height = this["@console.height"] + "px";
				elem.style.top = top;elem.style.left= left; elem.style.right = right; elem.style.bottom = bottom;
				con.refreshView();
				if (window.removeEventListener) window.removeEventListener("resize", tryFullscrn, false);
				else if (window.removeEvent) window.removeEvent("onresize", tryFullscrn);
			}else{
				fullscrn();
				if (window.addEventListener) window.addEventListener("resize", tryFullscrn, false);
				else if (window.attachEvent) window.attachEvent("onresize", tryFullscrn);
			}
			return this;
		}
		con.width = function(w){
			w = parseInt(w);if(!w)return this;
			elem.style.width = (this["@console.width"]=w) + "px";
			con.refreshView();
			return this;
		}
		con.height = function(h){
			h = parseInt(h);if(!h)return this;
			elem.style.height = (this["@console.height"]=h) + "px";
			con.refreshView();
			return this;
		}
		con.enable = function(){
			this.show();
			this.log.output("##text", "<hr /><h3><em>Virtual con</em></h3>You can type '::help' ,then press CTRL + ENTER to get help info about this con<hr />");
			if (window.addEventListener)window.addEventListener("keyup", onkey, false);
			else if (window.attachEvent) window.attachEvent("onkeyup", onkey);
			this.isDisabled = false;
			return  this;
		}
		con.disable = function(){
			if (window.removeEventListener) {
				window.removeEventListener("keyup", onkey, false);
				window.removeEventListener("resize", tryFullscrn, false);
			}
			else if (window.detechEvent){
				window.detechEvent("onkeyup", onkey);
				window.detechEvent("onresize", tryFullscrn);
			}
			this.intrude(false);
			return this.hide();
		}
		var onkey = function (evt) {
			evt = evt || event;
			if (evt.keyCode == 67) {
				var c = false;
				if (evt.altKey) { c = true; con.toggle(); }
				if (evt.ctrlKey) { c = true; con.clear(); }
				if (c) {
					evt.cancelBubble = true; evt.returnValue = true;
					if (evt.preventDefault) evt.preventDefault();
					return false;
				}
			}
		}
		con.toggle = function () {
			if (!this.element.parentNode) this.show();
			else this.hide();
			return this;
		}
		con.show = function () {
			if(!elem.parentNode){
				this.element.style.display = "block";
				document.body.appendChild(elem);
				con.refreshView();
				if (window.addEventListener)window.addEventListener("resize", this.refreshView, false);
				else if (window.attachEvent) window.attachEvent("resize", this.refreshView);
			}
			return this;
		}
		con.hide = function () {
			if (elem.parentNode){
				elem.parentNode.removeChild(elem);
				if (window.removeEventListener)window.removeEventListener("resize", this.refreshView, false);
				else if (window.detechEvent) window.detechEvent("resize", this.refreshView);
			}
			return this;
		}
		con.element.ondblclick = function (evt) {
			evt = evt || event; var c = false;
			if (evt.altKey) { con.hide(); c = true; }
			if (evt.ctrlKey) { con.clear(); c = true; }
			if (c) {
				evt.cancelBubble = true; evt.returnValue = true;
				if (evt.preventDefault) evt.preventDefault();
				return false;
			}
		}
		con.help = function () {
            var help = "<strong>You can enter any js code in command window, and press ctrl + ENTER to execute then.<br />:: means you should type this command in command window which shown at the top of the con.<br />double click the log line , you can see the stack about this log.</strong><ul><li><em>::help = get help</em></li><li><em>ALT + C = toggle show/hide</em></li><li><em>CTRL + C = clear</em></li><li><em>ALT + double click = hide</em></li><li><em>CTRL + double click = clear</em></li><li><em>::clear = clear con</em></li><li><em>::suspend = suspend log</em></li><li><em>::resume = resume log</em></li><li><em>::hide = hide con</em></li><li><em>::show = show con</em></li></ul>";
            var elem = document.createElement("div");
            elem.className = "help";
            elem.innerHTML = help;
            con.loggerView.appendChild(elem);
            return this;
        }
		var dispose = con.dispose;
		con.dispose = function(){this.disable();}
		var sysLog,yiLog;
		con.intrude = function(v){
			if(v===false){
				if(yiLog && yi.log["@log.output"]===con.log["@log.output"]){
					yi.log["@log.output"] = yiLog;
					yiLog = null;
				}
				if(sysLog && console.log === con.log) {
					console.log = sysLog;
					sysLog = null;
				}
			}else{
				if(v==='yi.log'||v===true){
					if(!yiLog && yi.log["@log.output"]!==con.log["@log.output"]){
						yiLog = yi.log["@log.output"];
						yi.log["@log.output"] = con.log["@log.output"];
					}
				}
				if(v==='console.log' || v===true){
					if(!sysLog){
						try{
							sysLog = console.log;
							console.log = con.log;
						}catch(ignore){}
						
					}
				}
			}
			return this;
		}
		
		
		//con.init();
		return con;
	})(Console);
	yi.console.Console = Console;

	
	
    var Assert = function (logger) {
		this.toString = function(){return "[object,yi.log.Assert]";}
        this.logger = logger|| yi.log;
        this.log = function(){
			if(arguments.length==0)return this;
			var params = aslice.call(arguments);
			var lv = params[0];
			if(lv  && lv.toString().indexOf("##")!==0) params.unshift("##assert");
			this.logger.apply(this.logger,params);
			return this;
		}
		this.wait = function(seconds){
			var ret = {
				start:(new Date()).getTime(),
				"For" :function(ck){
					if(ck()) {
						this.result= true;
						if(this.callback) this.callback();
					}else{
						this.checker = ck;
						this.tick = setInterval(function(){
							var t = (new Date()).getTime() - ret.start;
							if(ret.checker && ret.checker()){
								ret.result =true;
								clearInterval(ret.tick);
								if(ret.callback)ret.callback();
							}
							if(t/60>seconds) {
								clearInterval(ret.tick);
								me.logger("##fail","waiting timeout.");
								throw new Error("Timeout");
							}
						},50);
					}
					return this;
				},
				"done":function(callback){
					if(ret.result) callback();
					else this.callback = callback;
				}
			};
			var me = this;
			return ret;
		}
        this.Array = function (value, text) {
            var t = Object.prototype.toString.call(value);
            if (t !== '[object Array]') {
                this.logger("##fail","Array::Expect array,but actual is ",value);
                if(!this.notThrows)throw new Error(text || "Assert.isArray");
            }
            return this;
        }
        this.Equal = function (expect, actual, text) {
            if (expect !== actual) {
                this.logger("##fail","Equal::Expect ", expect,", but actual is ",actual);
                throw new Error(text || "Assert.Eual");
            }
            return this;
        }
        this.NotExists = function (value, text) {
            if (value) {
                this.logger("##fail","Not Exists::Expect 0 or null or undefined or '', but actual is ",value);
                //alert(arguments.callee.callee);
                //this.log("invoker:",arguments.callee.caller);
                if(!this.notThrows)throw new Error(text || "Assert.NotExists");
            }
            return this;
        }
        this.Exists = function (value, text) {
            if (!value) {
                this.logger("##fail","Exists::Expect value should not be 0 or null or undefined or '',but actual is ",value);
                if(!this.notThrows) throw new Error(text || "Assert.Exists");
            }
            return this;
        }
        this.Undefined = function (value, text) {
            if (value !== undefined) {
                this.logger("##fail","Undefined::Expect undefined, but actual is ",value);
                if(!this.notThrows) throw new Error(text || "Assert.Undefined");
            }
            return this;
        }
        this.Null = function (value, text) {
            if (value !== null) { 
                this.logger("##fail","Null::Expect null, but actual is ", value);
				if(!this.notThrows) throw new Error(text || "Assert.Null");
            }
            return this;
        }

        this.True = function (value, text) {
            if (value !== true) { 
                this.logger.output("##fail","True::Expect true, but actual is ", value);
				if(!this.notThrows) throw new Error(text || "Assert.True");
            }
            return this;
        }
        this.False = function (value, text) {
            if (value !== false) { 
                this.logger.output("##fail","False::Expect true, but actual is ", value);
				if(!this.notThrows) throw new Error(text || "Assert.False");
            }
            return this;
        }
    }
	Assert.create = function(logger){
		var myassert;
		var assert = myassert = function(expect, actual, text){
			if (arguments.length === 1) return isTrue.call($assert, expect);
			return equal.call(myassert, expect, actual, text);
		}
		Assert.call(assert,logger);
		var equal = assert.Equal,isTrue = assert.True;
		assert.toString = function(){return "[function,yi.assert.Assert]"}
		return assert;
	}
	yi.assert = Global.$assert = Assert.create();
	yi.assert.Assert = Assert;
	yi.assert.test = function(tester){
		var ass = Assert.create();
		tester.call(this,ass);
		return this;
	}
	yi.assert.clearCode = function(code){
		var codes = code.split("\n");
		for(var i =0,j= codes.length;i<j;i++){
			var line = codes.shift();
			var lineCode = line.replace(/(^\s+)|(\s+$)/g,"");
			if(lineCode.indexOf("$assert.")!==0 &&lineCode.indexOf("$assert(")!==0 && lineCode!="$log();" && lineCode.lastIndexOf("//$assert")!==(lineCode.length-"//$assert".length)) codes.push(line);
		}
		return codes.join("\n");
	}
    
   
})(window, document);