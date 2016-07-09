"strict";
(function (Global, document) {
	
    var yi = Global.yi = Global.$y = Global.yi || {};
    var objProto = Object.prototype;
    var arrProto = Array.prototype;
    var aslice = arrProto.slice;
    var otoStr = objProto.toString;
    var invalid = yi.invalid = function () { throw new Error("Invalid operation."); }
    var each = yi.each = function(obj,cb,arg){for(var n in obj) if(cb.call(obj,obj[n],n,arg)===false)break;}

    if (!yi.log) { 
        var log = yi.log = Global.$log = function () { console.log.apply(console, arguments); }
        var emptyLog = function(){};
        yi.log.enable = emptyLog.enable = function(){
            yi.log = Global.$log = log;
        }
        yi.log.disable = emptyLog.disable = function(){
            yi.log = Global.$log = emptyLog;
        }
    }


    ///-----------------
    /// Observable
    ///-----------------
    yi.Observable = function () {

        this.subscribe = function (evtname, subscriber) {
            var ob = this["@observable.observers"] || (this["@observable.observers"] = {});
            var subscribers = ob[evtname] || (ob[evtname] = []);
            subscribers.push(subscriber);
            return this;
        }
        this.unsubscribe = function (evtname, subscriber) {

            var ob = this["@observable.observers"]; if (!ob) return this;
            var subscribers = ob[evtname]; if (!subscribers) return this;
            for (var i = 0, j = subscribers.length; i < j; i++) {
                var existed;
                if ((existed = subscribers.shift()) !== subscriber) subscribers.push(existed);
            }
            return this;
        }
        this.emit = function (evtname, evtArgs, isApply) {
            var ob = this["@observable.observers"]; if (!ob) return this;
            var subscribers = ob[evtname]; if (!subscribers) return this;
            for (var i = 0, j = subscribers.length; i < j; i++) {
                var subscriber = subscribers.shift();
                var rs = (isApply) ? subscriber.apply(this, evtArgs) : subscriber.call(this, evtArgs);
                if (rs !== '%discard' && rs !== '%discard&interrupt') subscribers.push(subscriber);
                if (rs === '%interrupt' || rs === '%discard&interrupt' || rs === false) return this;
            }
            return this;
        }
        this.toString = function () { return "[object yi.Observable]"; }
    }
    yi.Observable.make = function (name, code) {
        var subscribeCode = "(this[\"!" + name + "\"]||(this[\"!" + name + "\"]=[])).push(listener);return this;";
        var unsubscribeCode = "var sb,fn;if(!(sb=this[\"!" + name + "\"]))return this;for(var i=0,j=sb.length;i<j;i++)if((fn=sb.shift())!==listener) sb.push(fn);return this;";
        var publishCode = "var sb,fn;if(!(sb=this[\"!" + name + "\"]))return this;for(var i=0,j=sb.length;i<j;i++){var fn = sb.shift();var rs = apply?fn.apply(this,params):fn.call(this,params);if(rs!==\"%discard\" && rs!=='%discard&interrupt')sb.push(fn);if(rs==='%interrupt' || rs==='%discard&interrupt' || rs===false)return this;}return this;";
        if (code) publishCode = code + publishCode;
        var result = {};
        result.subscribe = new Function("listener", subscribeCode);
        result.unsubscribe = new Function("listener", unsubscribeCode);
        result.emitCode = new Function("params", "apply", publishCode);
        return result;
    }
    //Observable自己就是全局监听器
    yi.Observable.call(yi.Observable);
    yi.bind = function (func, me, args) { return function () { return func.apply(me || this, args || arguments); } }

    ///-----------------
    /// async
    ///-----------------
    var async = (function (yi) {
        var Async = function (interval, next, max) {
            this["@async.next"] = next;
            this["@async.interval"] = interval;
            this["@async.maxTimes"] = parseInt(max) || 5000;
            this["@async.contexts"] = [];
            this.add = function (fn, arg) {
                var contexts = this["@async.contexts"];
                var me = this;
                contexts.push(fn["@async.func"] ? fn : { "@async.func": fn, "@async.param": arg, "@async.times": 0 });
                this["@async.tick"] = setInterval(function () {
                    var now = new Date(); var ctxs = contexts;
                    var max = me["@async.maxTimes"], self = me;
                    for (var i = 0, j = ctxs.length; i < j; i++) {
                        var ctx = ctxs.shift();
                        var result = ctx["@async.func"].call(ctx, ctx["@async.param"], ctx, self);
                        var keep = result === '%keep', reenter = result === '%reenter';
                        if (keep || reenter) {
                            if (reenter && (++ctx["@async.times"] > max)) {
                                ctx["@async.times"] = 0;
                                var next = me["@async.next"];
                                if (next) next.add(ctx);
                                else ctxs.push(ctx);
                            } else {
                                ctxs.push(ctx);
                            }
                        }
                    }
                    if (ctxs.length === 0) clearInterval(me["@async.tick"]);
                }, this["@async.interval"]);
                return this;
            }
            this.remove = function (fn) {
                var contexts = this["@async.contexts"];
                for (var i = 0, j = contexts.length; i < j; i++) {
                    var ctx = contexts.shift();
                    if (ctx["@async.func"] !== fn) contexts.push(ctx);
                }
                return this;
            }

        }
        Async[7] = new Async(10000);//10秒
        Async[6] = new Async(5000, Async[7], 10);//5秒
        Async[5] = new Async(1000, Async[6], 20);//1秒
        Async[4] = new Async(500, Async[5], 30);//半秒
        Async[3] = new Async(200, Async[4], 50);//200毫秒
        Async[2] = new Async(100, Async[3], 50);//100毫秒
        Async[1] = new Async(40, Async[2], 80);//40毫秒
        var async_stack = Async[0] = new Async(0, Async[1], 20);// 0毫秒
        return yi.async = function (fn, arg) {
            if (fn === false) {
                for (var i = 0; i < 8; i++) Async[i].remove(arg);
                return;
            }
            async_stack.add(fn, arg);
        }
    })(yi);//end async

    ///-----------------
    /// Promise
    ///-----------------
	
    var Promise = (function (yi, async,each) {
        var Thenable = function (src,clearTgt) {
            this["@promise.invalid"] = invalid;     

            this.done = function (onFullfill, remove) {
                if (typeof onFullfill !== 'function') throw new Error("Thenable.done expect a function as the first argument.");
                if (remove) {
                    var its = this["@promise.onFullfilled"]
                    if (its) for (var i = 0, j = its.length; i < j; i++) {
                        if ((it = its.shift()) !== onFullfill) its.push(it);
                    }
                    return this;
                }
                if (this["@promise.isFullfilled"]) {
                    var ret = onFullfill.call(this, this["@promise.value"], this);
                    return this;
                }
                (this["@promise.onFullfilled"] || (this["@promise.onFullfilled"] = [])).push(onFullfill);
                return this;
            };
            this.fail = function (onReject, remove) {
                if (typeof onReject !== 'function') throw new Error("Thenable.fail expect a function as the first argument.");

                if (remove) {
                    var its = this["@promise.onRejected"]
                    if (its) for (var i = 0, j = its.length; i < j; i++) {
                        if ((it = its.shift()) !== cb) its.push(it);
                    }
                    return this;
                }
                if (this["@promise.isRejected"]) {
                    onReject.call(this, this["@promise.value"], this); return this;
                }
                (this["@promise.onRejected"] || (this["@promise.onRejected"] = [])).push(onReject);
                return this;
            };
            this.then = function (onFullfilled, onRejected, onChanged) {
                if (onFullfilled) this.done(onFullfilled);
                if (onRejected) this.fail(onRejected);
                if (onChanged) this.change(onChanged);
                return this;
            }
            this.change = function (onChange, remove) {
                if (typeof onChange !== 'function') throw new Error("Thenable.done expect a function as the first argument.");
                if (remove) {
                    var its = this["@promise.onChanged"]
                    if (its) for (var i = 0, j = its.length; i < j; i++) {
                        if ((it = its.shift()) !== onChange) its.push(it);
                    }
                    return this;
                }
                (this["@promise.onChange"] || (this["@promise.onChanged"] = [])).push(onChange);
                return this;
            };

            this.always = function (cb, remove) {
                if (remove) {
                    var its = this["@promise.onFullfilled"]
                    if (its) for (var i = 0, j = its.length; i < j; i++) {
                        if ((it = its.shift()) !== cb) its.push(it);
                    }
                    its = this["@promise.onRejected"]
                    if (its) for (var i = 0, j = its.length; i < j; i++) {
                        if ((it = its.shift()) !== cb) its.push(it);
                    }
                    return this;
                }
                var rs = this["@promise.value"];
                if (this.isRejected || this.isFullfilled) {
                    cb.call(this, rs, this);
                    return this;
                }
                (this["@promise.onRejected"] || (this["@promise.onRejected"] = [])).push(cb);
                (this["@promise.onRullfilled"] || (this["@promise.onFullfilled"] = [])).push(cb);
            };
            this.thenable = function (tgt,clearTgt) {
                if (this["@promise.source"]) return this;
                var result = tgt;
                if (!tgt || tgt === this) result = new Then(this);
                else Thenable.call(tgt, this,clearTgt);

                return result;
            }

            if (src) {
                Then.call(this,src,clearTgt);
            } else {
                this.isFullfilled = function () { return this["@promise.isFullfilled"]; }
                this.isRejected = function () { return this["@promise.isRejected"]; }
            }
        }
        Thenable.prototype={toString : function () { return "[object yi.Promise.Thenable]"; }};

        var Then = function (src,clearTgt) {
            if (src) {
                this["@promise.source"] = src;
                if (src.await) this.await = function (m) { this["@promise.source"].await(m); return this; }
                this["@promise.onFullfilled"] = src["@promise.onFullfilled"] || (src["@promise.onFullfilled"] =clearDest?[]:(dest["@promise.onFullfilled"]|| []));
                this["@promise.onRejected"] = src["@promise.onRejected"] || (src["@promise.onRejected"] = clearDest?[]:(dest["@promise.onRejected"] || []));
                this["@promise.onChanged"] = src["@promise.onChanged"] || (src["@promise.onChanged"] =clearDest?[]:(dest["@promise.onChanged"]|| []));
                if(src["@promise.onFullfilled"]){
                    resolve.call(this,src["@promise.value"]);
                }else if(src["@promise.onRejected"]){
                    reject.call(this,src["@promise.value"]);
                }else{
                    this.isFullfilled = function () { return this["@promise.source"]["@promise.isFullfilled"]; }
                    this.isRejected = function () { return this["@promise.source"]["@promise.isRejected"]; }
                }
            }
        }
        Then.prototype = new Thenable();
        Then.prototype.toString = function () { return "[object yi.Promise.Then]"; }
		
        
        var resolve = function(value){
            if(this.resolve)this.notify = this.resolve = this.reject = this["@promise.invalid"];

            this["@promise.isFullfilled"] = true; this["@promise.isRejected"] = false;
            this["@promise.status"] = 'fullfilled';
            this["@promise.value"] = value;
            //var dfd = this;
            //if(this["@promise.onChanged"]){
            //async(function(dfd){
            var its = this["@promise.onChanged"], status = this["@promise.status"];
            if (its) for (var i = 0, j = its.length; i < j; i++) {
                var it = its.shift();
                var rs = it.call(this, 'fullfilled', value, status, this);
                if (rs !== '%discard' && rs !== '%discard&interrupt') its.push(it);
                if (rs === '%interrupt' || rs == "%discard&interrupt" || rs == false) break;
            }
            //},this);
            //}
            //if(this["@promise.onFullfilled"]){
            //async(function(dfd){
            var its = this["@promise.onFullfilled"], value = this["@promise.value"];
            if (its) for (var i = 0, j = its.length; i < j; i++) its.shift().call(this, value, this);
            //},this);
            //}

            return this;
        }
        var reject = function (reason) {
            if(this.reject)this.notify = this.resolve = this.reject = this["@promise.invalid"];

            this["@promise.isFullfilled"] = false; this["@promise.isRejected"] = true;
            this["@promise.status"] = 'rejected';
            this["@promise.value"] = reason;
            //var dfd = this;
            //if(this["@promise.onChanged"]){
            //async(function(dfd){
            var its = this["@promise.onChanged"], status = this["@promise.status"];
            if (its) for (var i = 0, j = its.length; i < j; i++) {
                var it = its.shift();
                var rs = it.call(this, 'rejected', value, status, this);
                if (rs !== '%discard' && rs !== '%discard&interrupt') its.push(it);
                if (rs === '%interrupt' || rs == "%discard&interrupt" || rs == false) break;
            }
            //},this);
            //}
            //if(this["@promise.onRejected"]){
            //async(function(dfd){
            var its = this["@promise.onRejected"], value = this["@promise.value"];
            if (its) for (var i = 0, j = its.length; i < j; i++) its.shift().call(this, value, this);
            //},this);
            //}			
            return this;
        }
        var Promisable = function(){
            this.toString = function(){return "[object yi.Promise.Promisable]";}
            this.resolve = resolve;
            this.tryResolve = function (value) {
                if (this.resolve !== this["@promise.invalid"]) return this.resolve(value);
                return false;
            }
            this.reject = reject;
            this.tryReject = function (reason) {
                if (this.reject !== this["@promise.invalid"]) return this.reject(reason);
                return false;
            }
            this.notify = function (stat, value) {
                var its, status = this["@promise,status"];
                this["@promise.status"] = stat;
                this["@promise.value"] = value;
                if (its = this["@promise.onChanged"]) {
                    for (var i = 0, j = its.length; i < j; i++) {
                        var it = its.shift();
                        var rs = it.call(this, stat, value, status, this);
                        if (rs !== '%discard' && rs !== '%discard&interrupt') its.push(it);
                        if (rs === '%interrupt' || rs === '%discard&interrupt' || rs === false) break;
                    }
                }
                return this;
            }
        }
        var Promisable.prototype = new Whenable();
        var Promise = function(whenFn,args){
            this.toString = function(){return "[object yi.Promise]";}
            if(whenFn) when.call(this,args,this);
            return this;
        }
        Promise.prototype = new Promisable();

        var when = function (obj, args, nothenable) {
            if(this.when)this.when = this.defer = invalid;
                
            var t = typeof obj;
            if (t === 'function') {
                try {
                    obj.call(this, args, this);
                    return this;
                } catch (ex) {
                    this.reject(ex);
                }
                return nothenable ?this: this.thenable();
            }
            if (t === "object" && typeof obj.then === 'function') {
                var me = this;
                obj.then(function (value) {
                    me.resolve(value);
                }, function (reason) {
                    me.reject(reason);
                }, function (status, old, value) {
                    me.notify(status, value);
                });
                return nothenable ?this: this.thenable();
            }
            this.resolve(obj);
            return nothenable ?this: this.thenable();
        }
        var Whenable = function () {
            this.toString = function () { return "[object yi.Promise.Whenable]"; }
            this.when = when;
            this.defer = function (func, args) {
                this["@promise.when_obj"] = func;
                this["@promise.when_arg"] = args;
                this["@promise.when"] = this.when;
                this.when = this.defer = invalid;
                async(function (promise) {
                    promise["@promise.when"].call(promise, promise["@promise.when_arg"], promise["@promise.when_obj"], true);
                }, this);
                return this.thenable();
            }

            this.timeout = function (milliseconds) {
                if (!promise["@promise.isFullfilled"] && !promise["@promise.isRejected"]) return this;
                milliseconds = parseInt(milliseconds);
                promise["@promise.milliseconds"] = milliseconds < 0 || Math.isNaN(milliseconds) ? 1000 : milliseconds;
                if (promise["@promise.startWaitingTime"]) {
                    promise["@promise.startWaitingTime"] = new Date().time();
                    return this;
                }
                async(function (promise, now) {
                    if (!promise["@promise.isFullfilled"] && !promise["@promise.isRejected"]) return "%wait";
                    if (!promise["@promise.startWaitingTime"]) promise["@promise.startWaitingTime"] = new Date().time();
                    else {
                        if (now.time() - promise["@promise.startWaitingTime"] > promise["@promise.milliseconds"]) {
                            promise.reject("Timeout");
                        }
                    }
                }, promise);
                return this;
            }  
        }
        Whenable.prototype = new Promisable();
        var When=function(whenFn,arg1,arg2){
            this.toString = function(){return "yi.Promise.When";}
            if (obj) {
                if (whenFn === '%concurrent'){ 
                    concurrentPromise(this,args, arg1);
                    this.when = this.defer = invalid;
                }
                if (whenFn === '%sequence') {
                    sequencePromise(this,args, arg1);
                    this.when = this.defer = invalid;
                }
                this.when(obj, args);
            }
        }
        When.prototype = new Whenable();
        var concurrentPromise = function (dfd,obj, args) {
            var result = {};
            var count = 0, waiting_count = 0;
            for (var n in obj) {
                count++; waiting_count++;
                var sub = new Promise(obj[n], args);
                sub.index = count; sub.name = n;
                sub.done(function (value) {
                    var rs = result[this.name] = { name: this.name, value: value, promise: this, status: "fullfilled" };
                    dfd.notify(waiting_count, rs);
                    if (--waiting_count == 0) { dfd.resolve(result); }
                }).fail(function (reason) {
                    var rs = result[this.name] = { name: this.name, reason: value, promise: this, status: "rejected" };
                    dfd.notify(waiting_count, rs);
                    if (--waiting_count == 0) { dfd.resolve(result); }
                });
            }
            result.length = count;
            return dfd;
        }
        var sequencePromise = function (dfd,seq, args, dfd, prevValue) {
            var obj;
            while (!(obj = seq.shift()) || seq.length <= 0);
            if (!obj) return dfd.resolve(prevValue);

            var pomise = new Promise(obj, args);
            promise.done(function (value) {
                sequencePromise(seq, args, dfd, value);
            });
            return dfd;
        }
        
        Promise.Thenable = Thenable;
        Promise.Then = Then;
        Promise.Whenable = Whenable;
        Promise.When = When;
		        
        each([Thenable,Then,Promise,Whenable,When],function(p){
            each(p.prototype,function(m){
                if(typeof m==='function') m["@promise.primitive"]=true;
            });
        });
        var proxies = {};
		
        Promise.proxy = function(id,obj){
            var Proxy;
            if(obj===undefined){obj=id;id = null;}
            if(id){
                Proxy = proxies[id];
                if(Proxy)return new Proxy(obj);
            }
            //msgProxy.load().enable().done(function(){});
            Proxy = function(obj){this["@promise.proxy"]=obj;}
            var proto= new Whenable();
            proto["@promise.Proxy"] = Proxy;
            each(obj,function(member,name){
                if(typeof member !=='function' || member["@promise.primitive"])return;
                proto[name] = function(){
                    var targetPromise= this["@promise.proxy.promise"];
                    var newProxy = new this["@promise.Proxy"](obj);
                    if(targetPromise||targetPromise===null){
                        if(targetPromise){
                            if(targetPromise["@promise.isRejected"]){
                                reject.call(newProxy,targetPromise["@promise.value"]);
                                return newProxy;
                            }else if(targetPromise["@promise.isFullfilled"]){
                                resolve.call(newProxy,targetPromise["@promise.value"]);
                                return new Proxy;
                            }
                        }
                        var args = aslice.call(arguments);
                        newProxy["@promise.proxy.promise"]=null;
                        this.done(function(){
                            var newPromise = newProxy["@promise.proxy.promise"] = obj[name].apply(obj,args);
                            Then.call(newProxy,newPromise);
                            newPromise.done(function(value){
                                resolve.call(newProxy,value);
                            }).fail(function(reason){
                                reject.call(newProxy,value);
                            });
                        }).fail(function(reason){
                            reject.call(newProxy,reason);
                        });
                        return newProxy;
                    }else{
                        var promise = newProxy["@promise.proxy.promise"] = obj[name].apply(obj,args);
                        promise.done(function(value){
                            resolve.call(newProxy,value);
                        }).fail(function(reason){
                            reject.call(newProxy,reason);
                        });
						
                    }
					
                    return newProxy;
                }
            });
            if(id) proxies[id] = Proxy;
            return new Proxy(obj);
        }
		
		
        return Promise;
    })(yi, async,each);

    ///-----------------
    /// Uri
    ///-----------------
    var Uri = (function (yi) {
        
        var Uri = yi.Uri = function (url) {
            var path = this.url = url;
            this.isAbsolute = false;
            var q = url.indexOf("?");
            if (q >= 0) {
                path = url.substring(0, q);
                this.qs = url.substr(q);
            }
            for (var i = 0, j = protocols.length; i < j; i++) {
                var protocol = protocols[i];
                if (path.substr(0, protocol.length) === protocol) {
                    this.isAbsolute = true;
                    this.protocol = protocol;
                    path = path.substr(protocol.length);
                    var d = path.indexOf("/");
                    if(d>=0){
                        this.domain = path.substring(0,d);
                        path = path.substring(d);
                    }
                    break;
                }
            }
            
			
            var f = path.lastIndexOf("/");
            if (f >= 0 && f<path.length) this.file = path.substr(f+1);
            else this.file = path;
            var e = this.file.lastIndexOf(".");
            if (e >= 0) this.ext = this.file.substr(e);
            this.path = path;
            this.toString = function () { return this.url; }
        }
        var resolvedPaths = Uri.resolved = {};
        Uri.maps = {};
        var protocols = Uri.protocols = ["http://", "https://"];
        Uri.bas = "";

        var resolveUrl = Uri.resolve = function (name) {
            var uri, replaced = false;
            if (uri = resolvedPaths[name]) return uri;
            var url = name.replace(/\\/g,"/"),paths = Uri.maps;
            for (var n in paths) {
                n = n.replace(/[/\\]$/g,"");
                if(name.length<n.length)break;
				
                if (name.substr(0,n.length)===n && name[n.length] === '/') {
                    var k = paths[n].replace(/[\\/]$/g,"");
                    url = k  + "/"+ name.substring(n.length);
                    replaced = k;
                    break;
                }
            }
            var isAbs=false;
            for (var i = 0, j = protocols.length; i < j; i++) {
                var protocol = protocols[i];
                if (url.substr(0, protocol.length) === protocol) {
                    isAbs = true;break;
                }
            }
            if(!isAbs)url = (Uri.bas || "").replace(/[\\/]$/g,"") + "/" + url;
            uri = resolvedPaths[name] = new Uri(url); 
            return uri;
        }
        var imgexts = Uri.imageExts = [".gif", ".png", ".jpg"];
        var isImageExt = Uri.isImageExt = function (ext) {
            for (var i = 0, j = imgexts.length; i < j; i++) if (imgexts[i] === ext) return true;
            return false;
        }
        return Uri;
    })(yi);

    ///*************
    ///* require
    ///*****

    (function (yi, Whenable, Uri, async) {
        var head;
        var loadRes = yi.loadRes = function (url, type) {
            var hd = head;
            if (!hd) {
                hd = document.getElementsByTagName("HEAD");
                if (hd[0]) {
                    hd = head = hd[0];
                }else hd = document.body || document.documentElement;
            }
            var df = new Whenable(), elem;
            if (type === '.js') {
                elem = document.createElement("SCRIPT");
                elem.src = url;
            } else if (type === '.css') {
                elem = document.createElement("LINK");
                elem.href = url; elem.type = "text/css"; elem.rel = "stylesheet";
            } else if (type === '.img') {
                elem = document.createElement("img");
            }
            df.element = elem;
            elem.onerror = function () { df.reject(this); }
            if (elem.onload || elem.onload === null) elem.onload = function () { df.resolve(this); };
            else elem.onstatechange = function () { if (elem.readyState === 4 || elem.readyState === 'complete') df.resolve(this); }
            if (type === '.img') elem.src = url; else hd.appendChild(elem);
            return df.whenable();
        }

        var waitingReqires = [], loadedRequire;
        ///请求管理器。管理请求Require
        var requireManager = {
            //被挂起的Require
            suspends: [],
            defineCount: 0,
            caches: {},
            //刚加载的Require
            loaded: null,
            //请求一个Require
            aquire: function (deps, initial) {
                var req = new Require(initial);
                var suspend = { req: req, deps: deps, isLoading: false };
                this.suspends.push(suspend);
                //如果挂起队列中只有刚请求的那个require，该require直接开始
                if (this.suspends.length === 1) {
                    suspend.isLoading = true;
                    req.loadDeps(deps);
                }
                return req;
            },
            //每一轮请求之后，都要resetLoading,
            resetLoading: function () {
                this.defineCount = 0;
                this.loaded = null;
            },
            //当某个req已经完成所有加载
            //该req里面要求的所有Require会被从suspend状态转为resumes状态。
            loadComplete: function (req) {
                var suspends = this.suspends, resumes = [], removeCount = 0;
                for (var i = 0, j = suspends.length; i < j; i++) {
                    var it = suspends.shift();
                    if (it.req !== req) {
                        suspends.push(it);
                        if (!it.isLoading) resumes.push(it);
                    } else removeCount++;
                }
                if (this.resuming) return removeCount;
                this.resuming = true;
                requireManager.loaded = null; this.defineCount = 0;
                for (var i = 0, j = resumes.length; i < j; i++) {
                    var it = resumes[i];
                    it.isLoading = true;
                    it.req.loadDeps(it.deps);
                }
                this.resuming = false;
                return removeCount;
            }
        };

        var reqid = 0;
        var Require = yi.Require = function (init) {
            this._taskCount = 0;
            this._intial = init;
            this.id = reqid++;
            var mod = this.isModule = init ? true : false;
            if (mod) requireManager.defineCount++;
            requireManager.loaded = this;
            //else loadedRequire.next = this;
        }
        Require.prototype = new Whenable();
        Require.prototype.loadDeps = function (dep_names) {

            yi.log(this.id + " invoke loadDeps", dep_names);
            var deps = {}, me = this;
            this._taskCount++;//loadDeps自己就是个waiting
            var c = this._loadingCount = dep_names.length;
            for (var i = 0, j = c; i < j; i++) {
                if (this.isRejected) break;
                //每加载一个依赖项就添加一个任务计数
                this._taskCount++;

                var dep_name = dep_names[i];
                var dep = deps[dep_name] = { name: dep_name };
                var cached = requireManager.caches[dep_name];
                if (cached) {
                    (function (cached, dep, me, deps) {
                        cached.success(function (result) {
                            deps[dep.name] = result;
                            if (--me._taskCount == 0 && !me.isRejected) me._ready();
                        });
                    })(cached, dep, me, deps);

                } else {

                    //var dep_req = cached[dep_name];
                    //if(dep_req)
                    (function (dep_name, dep, me) {
                        var uri = resolveUrl(dep_name);
                        loadRes(uri.url, ".js").done(function () { me._depLoaded(dep); }).fail(function (elem) {
                            me.reject({ src: this, args: elem });
                        });
                    })(dep_name, dep, this);
                }
            }
            this._deps = deps;
            //任务结束
            if (--this._taskCount == 0 && !this.isRejected) this._ready();
            return this;
        }
        Require.prototype._depLoaded = function (dep) {
            yi.log(dep.name + " is into _depLoaded.");
            //每完成一次加载，就减去一次任务计数
            var me = this; this._taskCount--;
            if (requireManager.defineCount > 1) {
                var error = "Module should only define once in a file[" + res.name + "].";
                this.reject({ error: error, res: res });
                throw error;
                return;
            }
            var loaded = requireManager.loaded;
            if (!loaded) {
                //刚加载的没有module ,当作已经调用过了init
                yi.log(me.id + " loaded a non-module js->" + dep.name);
                if (this._taskCount === 0) this._ready();

            } else {
                yi.log(me.id + " is waiting " + loaded.id);
                loaded.name = dep.name;
                requireManager.caches[dep.name] = loaded;
                //里面有require/define，可能发生等待，添加一个任务计数(等待依赖项变成ready状态)
                me._taskCount++;
                loaded.success(function () {
                    //依赖项变成了ready，相关的任务计数减一
                    if (--me._taskCount === 0) me._ready();
                });
            }
            //刚加载的Require已经处理，清空Require,下次callback的时候loadedRequire里面始终是最近一次加载的js里面的Require
            requireManager.resetLoading();
            if (--this._loadingCount == 0) {
                if (requireManager.loadComplete(this) == 0) throw "There are no require in require manager.";
            }
        }
        Require.prototype._ready = function () {
            if (!this._initial) {
                yi.log(this.id + " resolved with not initial.");

                this.resolve(); return;
            }
            var args = [], deps = this._deps;
            for (var n in deps) args.push(deps[n].result);
            this._initial.call(this, args);
            var me = this;
            this.success(function (value) {
                me.module_instance = value;
            });
        }
        var require = yi.require = Global.$require = function (_deps) {
            var deps = typeof _deps === 'string' ? slice.call(arguments) : _deps;
            var req = requireManager.aquire(deps);
            return req;
        }
        yi.define = Global.$define = function (deps, initial) {
            var req = requireManager.aquire(deps, initial);
            return req;
        }
    })(yi, yi.Promise.Whenable, yi.Uri, async);
    
    



    var Observer = function () { }
    var obproto = {
        "observer.bubble": true,
        name: function (value) {
            var $_META = {
                description: "get/set观察器名字",
                params: {
                    "value": "设定的名字。如果是undefined则返回观察器名字"
                },
                returns: "读取的名字。如果是set操作则返回监听器本身"
            };//META_$
            if (value === undefined) return this["@observer.name"];
            this["@observer.name"] = value; return this;
        },
        target: function (target, source) {
            var $_META = {
                description: "get/set要观察的目标对象",
                params: {
                    "target": "要观察的对象"
                },
                returns: "对象。如果是set操作则返回监听器本身"
            };//META_$
            var old = this["@observer.target"];
            if (target === undefined) return old;
            this["@observer.target"] = target || (target = {});
            //监听目标对象改变后，重新给本监听器赋值，以触发
            if (old !== target) this.setValue(target["@observer.name"], "target.change", source);
            return this;
        },
        subject: function (subject) {
            var $_META = {
                description: "get/set该观察器的主体对象(主体观察器)。当一个观察器有主体对象时，表示该观察器是主体对象的一个属性",
                params: {
                    "subject": "要设置的主体对象。必须是另一个Observable。如果该参数设置为‘%root’，返回根"
                },
                returns: "对象。如果是set操作则返回监听器本身。否则返回主体观察器"
            };//META_$

            if (subject === undefined) return this["@observer.subject"];
            if (subject === "%root") {
                var sub = this["@observer.subject"];
                return sub ? sub.subject("root") : sub;
            }
            var old = this["@observer.subject"];
            //原先的跟新的一样，就什么都不做
            if (old === subject) return this;

            this["@observer.subject"] = subject;
            if (old) {
                var name = this["@observer.name"];
                //清除掉原来subject里面的东西
                delete old["@observer.props"][name];
                var accor = old.accessor();
                delete accor[reservedPropertyNames[name] || name];
            }
            var new_targ = subject["@observer.target"] || (subject["@observer.target"] = {});
            this.target(new_targ);
            //数组的item不会当作prop
            if (subject.isArray && typeof name !== 'number') {
                (subject["@observer.props"] || (subject["@observer.props"] = {}))[name] = this;
                var accor = subject.accessor();
                accor[reservedPropertyNames[name] || name] = this.accessor();
            }
            return this;
        },
        value: function (new_v, reason, _source) {
            /// <summary>get/set该监听器在目标对象上的值</summary>
            /// <param name="new_v" type="Anything">要设定的新值。如果该参数为undefined，表示获取目标对象上的值</param>
            /// <param name="reason" type="String | not_trigger">变化原因，传递给事件函数用，默认是valuechange。</param>
            /// <param name="_source" type="Object">之名该变化是由哪个个源事件引起</param>
            /// <returns type="Object">监听器本身</returns>

            var targ = this["@observer.target"], name = this["@observer.name"];
            if (new_v === undefined) return targ[name];
            //获取旧值，如果跟新值一样就直接拿返回
            var old_v = targ[name];
            if (old_v === new_v) return this;
            //set value to target
            targ[name] = value;
            //表示不需要触发事件，只是设置一下值
            //跳过后面的事件处理
            if (this["@observer.disabledTrigger"]) return this;
            //构建事件参数
            var evtArgs = { type: "set", sender: this, value: value, reason: (reason || "value.set"), source: _source };

            //获取到该监听上的所有下级监听器
            var props = this["@observer.props"];

            if (props) for (var n in props) props[n].target(value, evtArgs);
            var items = this["@observer.items"];
            if (items) {
                for (var i = 0, j = items.length; i < j; i++) {
                    var it = items[i];
                    var it_evt = { type: "remove", sender: item, value: it, reason: "array.reset", source: evtArgs, index: i };
                    it.trigger(it_evt);
                }
                this._initArrayData(this["@observer.itemTemplate"], this.value);
            }
            this.trigger("valuechange", evtArgs, this["observer.bubble"]);
            //this.childchange(evtArgs);
            return this;
        },
        bubble: function (value) {
            if (value === undefine) return this["@observer.bubble"];
            this["@observer.bubble"] = value; return this;
        },
        trigger: function (evtname, args, bubble) {
            /// <summary>触发某个事件/禁用事件/启用事件</summary>
            /// <param name="evtname" type="String">事件名。如果该函数第2个参数没有，evtname='valuechange'.如果该值设置为enabled/disabled对象，表示启用/禁用事件</param>
            /// <param name="evt" type="Object">事件对象</param>
            /// <returns type="Object">监听器本身</returns>
            if (evtname === "%disabled") {
                this["@observer.triggerDisabled"] = true;
                return this;
            }
            if (evtname === "%enabled") {
                this["@observer.triggerDisabled"] = false;
                return this;
            }
            if (this["@observer.triggerDisabled"]) return this;


            var obs = this['@subscribers'], its, it;
            if (its = obs[evtname]) for (var i = 0, j = its.length; i < j; i++) {
                var it = its.shift();
                var result = it.call(this, args);
                if (result !== '%discard' && result !== '%discard&interrupt') its.push(it);
                if (result === '%interrupt' || result === '%discard&interrupt' && result === false) break;
            }
            if (bubble === undefined) bubble = this["@observer.bubble"];
            //如果没有禁用bubble,事件本身也没有取消冒泡
            if (bubble !== false && !evt.cancelBubble) {
                var sup = this.subject();
                if (sup) {
                    var evtArgs = { type: args.type, sender: this, value: args.value, reason: "bubble", source: (evt.source || evt) };
                    sup.trigger(name, evtArgs, bubble);
                }
            }
            return this;
        },

        prop: function (name, value) {
            var props = this["@observer.props"] || (this["@observer.props"] = {});
            var prop = props[name];
            if (!prop) {
                prop = props[name] = new Observable(name).subject(this);
                if (isArray(value)) prop.asArray();
            }
            if (value === undefined) return prop;
            prop.value(value);
            return this;
        },

        validate: function (onlyme) {
            var def = this["@observer.define"], rules;
            if (!def) return true;
            if (rules = def.rules) {
                var val = this["@observer.target"][this["@observer.name"]];
                if (rules["trim"]) {
                    if (val === undefined || val === null) val = "";
                    else val = val.toString().replace(/(^\s+)|(\s+$)/g, "");
                }
                var valids = yi.validations;
                for (var n in rules) {
                    var check = valids[n];
                    if (!check) continue;
                    if (!check(val)) {
                        this.trigger("validate", { type: "validate", sender: this, value: val });
                        return false;
                    }
                }
            }
            if (onlyme) return true;
            var props = this["@observer.props"], result = true;
            if (props) for (var n in props) {
                var prop = props[n];
                var result = result && prop.validate();
            }
            return result;
        },
        define: function (defination) {
            if (!defination) return this["@observer.define"];
            if (defination.$defination === true) {
                this["@observer.define"] = defination;
                defination = defination.value;
            }
            if (!defination) return this;
            var props = this["@observer.props"] || (this["@observer.props"] = {});
            for (var pname in defination) {
                var member = defination[n];
                var prop = props[name] = new Observable(pname, {}).subject(this);

                if (typeof member === 'object') {
                    if (member.length !== undefined) {
                        var tmp;
                        if (member.length > 0) tmp = new Observable(0, []).define(member[0]);
                        prop.asArray(tmp);
                    } else {
                        prop.define(member);
                    }
                }
            }
            return this;
        },

        clone: function (name, target, evtInc) {
            var clone = new Observer(name, target);
            target = clone.target();
            var props = this["@observer.props"];
            if (props) {
                var cloneProps = {};
                for (var propname in props) {
                    var prop = props[propname];
                    var cloneProp = prop.clone(propname, target);
                    clone.value[reservedPropertyNames[propname] || propname] = cloneProp.value;
                    cloneProp["@observer.subject"] = clone;
                }
                clone["@observer.props"] = cloneProps;
            }
            if (evtInc) {
                var subsers = this["@observer.subscribers"];
                if (subsers && subsers.length) {
                    var cloneSubsers = [];
                    for (var i = 0, j = subsers.length; i < j; i++) cloneSubsers[i] = subsers[i];
                }
            }
            if (this.isArray) clone.asArray(this["@observer.itemTemplate"]);
            return clone;
        },
        asArray: function (itemTemplate) {
            this.isArray = true;

            var accor = this.accessor();
            for (var n in ObserverArray) {
                accor[n] = this[n] = ObserverArray[n];
            }
            var me = this, accor = this._initArrayData(itemTemplate);

            accor.asArray = this.asArray = function (template) {
                if (template === undefined) return this;
                this["@observer.itemTemplate"] = template;
                this._initArrayData(template);
                return this;
            }
            return this;
        },
        accessor: function () {
            var me = this;
            var accor = function (value) {
                var me = this["@observer.observer"];
                if (value === undefined) return me["@observer.target"][me["@observer.name"]];
                me.value(value);
                return accor;
            }
            accor["@observer.observer"] = this;
            accor.subscribe = function (evtname, subscriber) {
                var me = this["@observer.observer"];
                me.subscribe(evtname, subscriber);
                return accor;
            }
            accor.unsubscribe = function (evtname, subscriber) {
                var me = this["@observer.observer"];
                me.unsubscribe(evtname, subscriber);
                return accor;
            }
            accor.asArray = function (template) {
                var me = this["@observer.observer"];
                me.asArray(template);
                return accor;
            }
            accor.define = function (model) {
                var me = this["@observer.observer"];
                if (!model) return me["@observer.define"];
                me.define(model);
                return actor;
            }
            accor.validate = function (onlyme) {
                var me = this["@observer.observer"];
                return me.validate(onlyme);
            }

            this.accessor = function () { return accor; }
            return this["@observer.accessor"] = accor;
        }
    };
    var ObserverArray = {
        isArray: true,
        _initArrayData: function (itemTemplate) {
            var accor = this["@observer.accessor"], me = this, targ = me["@observer.target"], name = me["@observer.name"];
            if (!targ) { me.value(targ = []); }
            me["@observer.itemTemplate"] = itemTemplate;
            me.isArray = true;
            var items = me["@observer.items"] = itemTemplate ? [] : null, len = targ.length;
            var max = accor.length > targ.length ? accor.length : targ.length;
            for (var i = 0, j = max; i < j; i++) {
                //清理数据
                if (i >= len) { delete accor[i]; continue; }
                if (items) {
                    var oIt = itemTemplate.clone(i, targ, true);
                    oIt["@observer.subject"] = me;
                    items.push(oIt);
                } else accor[i] = targ[i];
            }
            accor.length = targ.length;
            return this;
        },
        push: function () {
            var me = this["@observer.observer"] || this, accor = me["@observer.accessor"], arr = me["@observer.target"][me["@observer.name"]], items = me["@observer.items"], item;
            arr.push(accor[accor.length++] = it);
            if (items) {
                item = me["@observer.itemTemplate"].clone(items.length, arr, true);
                item["@observer.subject"] = this;
                items.push(item);
            }
            var it_evt = { sender: item, value: it, reason: "array.push" };
            var arr_evt = { type: "valuechange", sender: me, value: arr, reason: "array.push", source: it_evt };
            me.emit("valuechange", arr_evt);
            return this;
        },
        pop: function (retItem) {
            var me = this["@observer.observer"] || this, accor = me["@observer.accessor"], arr = me["@observer.target"][me["@observer.name"]], items = me["@observer.items"], item;
            var it = arr.pop();
            delete accor[arr.length];
            accor.length = arr.length;
            if (items) item = items.pop();
            var it_evt = { type: "remove", sender: item, value: it, reason: "array.pop" };
            if (item) item.emit("remove", it_evt);
            else {
                var arr_evt = { type: "valuechange", sender: me, value: arr, reason: "array.pop", source: it_evt };
                me.emit("valuechange", arr_evt);
            }
            return retItem ? item : it;
        },
        unshift: function (it) {
            var me = this["@observer.observer"] || this, accor = me["@observer.accessor"], arr = me["@observer.target"][me["@observer.name"]];
            arr.unshift(it);
            for (var i = accor.length; i > 0; i--) accor[i] = accor[i - 1];
            accor[0] = it;
            if (items) {
                var item = me["@observer.itemTemplate"].clone(0, arr, true);
                item["@observer.subject"] = me;
                items.unshift(item);
            }
            var it_evt = { type: "add", sender: item, value: it, reason: "array.unshift" };
            var arr_evt = { type: "valuechange", sender: me, value: arr, reason: "array.unshift", source: it_evt };
            me.emit("valuechange", arr_evt);
            return this;
        },
        shift: function (it, retItem) {
            var me = this["@observer.observer"] || this, accor = me["@observer.accessor"], arr = me["@observer.target"][me["@observer.name"]], items = me["@observer.items"], item;
            var it = arr.shift();
            for (var i = 0, j = accor.length; i < j; i++) accor[i] = accor[i + 1];
            accor.length = arr.length;
            if (items) item = items.shift();
            var it_evt = { type: "remove", sender: item, value: it, reason: "array.shift" };
            if (item) item.emit("remove", it_evt);
            else {
                var arr_evt = { type: "valuechange", sender: me, value: arr, reason: "array.shift", source: it_evt };
                me.emit("valuechange", arr_evt);
            }
            return retItem ? item : it;
        },
        remove: function (at, retItem) {
            var me = this["@observer.observer"] || this, accor = me["@observer.accessor"], arr = me["@observer.target"][me["@observer.name"]], items = me["@observer.items"], item;
            if (typeof at !== "number") {
                var cp = at; at = undefined;
                for (var i = 0, j = arr.length; i < j; i++) if (arr[i] === cp) { at = i; break; }
                if (at === undefined) return;
            }
            var ret_v = arr[at], ret_it = items ? items[at] : undefined;
            for (var i = at, j = arr.length - 1; i < j; i++) {
                accor[i] = arr[i] = arr[i + 1];
                if (items) items[i] = items[i + 1];
            }
            arr.pop(); if (items) items.pop();
            var it_evt = { type: "remove", sender: item, value: it, reason: "array.remove", index: at };
            if (ret_it) ret_it.publish("remove", it_evt);
            else {
                var arr_evt = { type: "valuechange", sender: me, value: it, reason: "array.remove", index: at, source: it_evt };
                this.publish("valuechange", arr_evt);
            }
            return retItem ? ret_v : ret_it;
        },
        item: function (index, value) {
            var me = this["@observer.observer"] || this, accor = me["@observer.accessor"], items = me["@observer.items"];
            if (!items) return value === undefined ? undefined : this;
            var arr = me["@observer.target"][me["@observer.name"]];
            if (value === undefined) return items[index];
            accor[index] = arr[index] = value;
            var item = items[index].value(value, "array.item");
            var it_evt = { type: "valuechange", sender: item, value: value, reason: "array.item", index: index };
            item.emit("valuechange", it_evt);
            var arr_evt = { type: "valuechange", sender: me, value: items, reason: "array.item" };
            me.emit("valuechange", arr_evt);
            return item;
        },
        clear: function () {
            var me = this["@observer.observer"] || this, accor = me["@observer.accessor"], arr = me["@observer.target"][me["@observer.name"]], items = me["@observer.items"];
            if (items) {
                for (var i = 0, j = items.length; i < j; i++) {
                    var it_evt = { type: "remove", sender: item, value: value, reason: "array.clear", index: i };
                    //不冒泡，处理完成后统一给array发送消息
                    items[i].publish("remove", it_evt, false);
                }
            }
            var arr_evt = { type: "valuechange", sender: me, value: it, reason: "array.clear" };
            me.emit("valuechange", arr_evt);
            return this;
        }
    };

    Observer.prototype = new yi.Observable();
    for (var n in obproto) Observer.prototype[n] = obproto[n];

    yi.observable = function (value, define) {
        var ret = new Observer("", { "": value });
        if (define) ret.define(define);
        return ret;
    }
    var urlreg = new RegExp('^((https|http|ftp|rtsp|mms)?://)'
		+ '?(([0-9a-z_!~*\'().&=+$%-]+: )?[0-9a-z_!~*\'().&=+$%-]+@)?' //ftp的user@ 
		+ '(([0-9]{1,3}.){3}[0-9]{1,3}' // IP形式的URL- 199.194.52.184 
		+ '|' // 允许IP和DOMAIN（域名） 
		+ '([0-9a-z_!~*\'()-]+.)*' // 域名- www. 
		+ '([0-9a-z][0-9a-z-]{0,61})?[0-9a-z].' // 二级域名 
		+ '[a-z]{2,6})' // first level domain- .com or .museum 
		+ '(:[0-9]{1,4})?' // 端口- :80 
		+ '((/?)|' // a slash isn't required if there is no file name 
		+ '(/[0-9a-z_!~*\'().;?:@&=+$,%#-]+)+/?)$');

    yi.validations = {
        "require": function (value) {
            var t = typeof value;
            if (t === 'function') return true;
            if (t === 'undefined') return false;
            if (t === 'number') return true;
            if (t === 'string') return value !== "";
            if (t === 'object') {
                if (value === null) return false;
                if (value.length) return value.length > 0;
                return true;
            }
            return false;
        },
        "length": function (value, params) {
            var t = typeof params; var len = value.toString().length;
            if (t === 'number') return len <= params;
            var min = params[0] || 0; var max = params[1];
            if (min !== undefined && len < min) return false;
            if (max !== undefined && len > max) return false;
            return true;
        },
        "date": function (value) {
            var reg = /^(?:(?!0000)[0-9]{4}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:0[48]|[2468][048]|[13579][26])00)-02-29)$/g;
            return reg.test(value);
        },
        "number": function (value) {
            var reg = /^[\+\-]?(?:\d{1,3}){0,1}(?:\d{3})*\d(?:.\d+)$/g;
            return reg.test(value);
        },
        "limit": function (value, params) {
            var min = parseFloat(params[0]) || 0;
            var max = parseFloat(params[1]);
            var val = parseFloat(value);
            if (value === Math.NaN) return false;
            if (min !== Math.NaN && len < min) return false;
            if (max !== Math.NaN && len > max) return false;
            return true;
        },
        "email": function (value) {
            var reg = /^[A-Za-z\d]+([-_.][A-Za-z\d]+)*@([A-Za-z\d]+[-.])+[A-Za-z\d]{2,5}$/g;
            return reg.test(value);
        },
        "url": function (value) {
            return urlreg.test(value);
        },
        "reg": function (value, params) {
            var reg = new RegExp(params);
            return reg.test(value);
        }
    }
})(window, document);