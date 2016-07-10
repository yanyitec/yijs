"strict";
(function (Global, document) {
    var yi = Global.yi = {};
    yi.Global = Global;
    var objProto = Object.prototype;
    var arrProto = Array.prototype;
    var aslice = arrProto.slice;
    var otoStr = objProto.toString;
    var invalid = yi.invalid = function () { throw new Error("Invalid operation."); }
    yi.noop = function () { }
    var each = yi.each = function (obj, cb, arg) { for (var n in obj) if (cb.call(obj, obj[n], n, arg) === false) break; }
    var override = yi.override = function (dest) {
        if (!dest) dest = {};
        for (var i = 1, j = arguments.length; i < j; i++) {
            var src = arguments[i];
            if(src) for(var n in src) dest[n] = src[n];
        }
        return dest;
    }
    var createInstanceFactory = {};
    yi.createInstance = function (clsname, arg1, arg2, arg3, arg4, arg5) {
        var creator = createInstanceFactory[clsname];
        if (creator) return creator(arg1, arg2, arg3, arg4, arg5);
        creator = new Function(arg1, arg2, arg3, arg4, arg5, "return new " + clsname + "(arg1,arg2,arg3,arg4,arg5);");
        createInstanceFactory[clsname] = creator;
        return creator(arg1, arg2, arg3, arg4, arg5);
    }
    yi.delegate = function (func, me, args) { return function () { return func.apply(me || this, args || arguments); } }
    var camelize = yi.camelize = function camelize(attr) {
        // /\-(\w)/g 正则内的 (\w) 是一个捕获，捕获的内容对应后面 function 的 letter
        // 意思是将 匹配到的 -x 结构的 x 转换为大写的 X (x 这里代表任意字母)
        return attr.replace(/\-(\w)/g, function (all, letter) { return letter.toUpperCase(); });
    }
    var trim = yi.trim = function (val) { return val.replace(/^\s+|\s+$/, ""); }

    if (!yi.log) {
        var log = yi.log = Global.$log = function () { console.log.apply(console, arguments); }
        var emptyLog = function () { };
        emptyLog.debug = yi.noop;
        yi.log.enable = emptyLog.enable = function () {
            yi.log = Global.$log = log;
        }
        yi.log.disable = emptyLog.disable = function () {
            yi.log = Global.$log = emptyLog;
        }
        yi.log.error = emptyLog.error = function () {
            console.log.apply(console, arguments);
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


    }
    yi.Observable.prototype = { toString: function () { return "yi.Observable"; } }
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
    //Model自己就是全局监听器
    yi.Observable.call(yi.Model);
    
    ///-----------------
    /// async
    ///-----------------

    yi.async = (function (yi) {
        var Timer = yi.Timer = function (val) {
            this["@timer.tick"]=0;
            this["@timer.interval"]=50;
            if (val) this.interval(val);
            var me = this;
            this["@timer.onTick"] = function () {
                var now = new Date(), self = me;
                var funcs = self["@timer.handlers"];
                for (var i = 0, j = funcs.length; i < j; i++) {
                    var fn = funcs.shift();
                    var re = fn.call(self ,now);
                    if (re !== '%%discard') funcs.push(fn);
                }
                var tick = self["@timer.tick"];
                if (funcs.length == 0 && tick) {
                    clearInterval(tick); self["@timer.tick"] = 0;
                }
            };
        }
        Timer.prototype = {
            "interval": function (val) {
                if (val === undefined) return this["@timer.interval"];
                var old = this["@timer.interval"];
                var newval = this["@timer.interval"] = parseInt(val) || 50;
                var tick = this["@timer.tick"];
                if (tick && newval!=old) {
                    clearInterval(tick);
                    this["@timer.tick"]=setInterval(this["@timer.onTick"], newval);
                }
                return this;
            },
            isRunning:function(){return this["@timer.tick"]!=0;},
            
            "addListener": function (val) {
                var funcs = this["@timer.handlers"] || (this["@timer.handlers"] = []);
                funcs.push(val);
                if (!this["@timer.tick"]) this["@timer.tick"] = setInterval(this["@timer.onTick"], this.interval());
                return this;
            },
            "removeListener": function (val) {
                var funcs = this["@timer.handlers"]; if (!funcs || funcs.length == 0) return this;
                for (var i = 0, j = funcs.length; i < j; i++) {
                    var fn;
                    if ((fn = funcs.shift()) != val) funcs.push(fn);
                }
                var tick = this["@timer.tick"];
                if (funcs.length == 0 && tick) {
                    clearInterval(tick); this["@timer.tick"] = 0;
                }
                return this;
            }
        }
        var Async = function (interval, next, max) {
            this["@async.next"] = next;
            this["@async.interval"] = interval;
            this["@async.maxTimes"] = parseInt(max) || 5000;
            this["@async.contexts"] = [];
            var me = this;
            this["@async.handler"] = function () {
                var self = me, ctxs = self["@async.contexts"], interval = self["@async.interval"], max = self["@async.maxTimes"];
                var now = new Date();
                for (var i = 0, j = ctxs.length; i < j; i++) {
                    var ctx = ctxs.shift();
                    var result = ctx["@async.func"].call(ctx, ctx["@async.param"], ctx, self);
                    var keep = result === '%keep', reenter = result === '%reenter';
                    if (keep || reenter) {
                        if ((reenter && (++ctx["@async.times"] > max) || interval)) {
                            ctx["@async.times"] = 0;
                            var next = me["@async.next"];
                            if (next) next.add(ctx);
                            else ctxs.push(ctx);
                        } else {
                            ctxs.push(ctx);
                        }
                    }
                }
                if (ctxs.length === 0) {
                    var tick = self["@async.tick"];
                    self["@async.tick"] = 0;
                    if (interval) clearInterval(tick); 
                }else{
					if(interval===0) setTimeout(self["@async.handler"]);
				}
            }

            this.add = function (fn, arg) {
                var contexts = this["@async.contexts"];
                var me = this;
                contexts.push(fn["@async.func"] ? fn : { "@async.func": fn, "@async.param": arg, "@async.times": 0 });

                var interval = this["@async.interval"];
                if (!this["@async.tick"]) {
                    if (interval) this["@async.tick"] = setInterval(this["@async.handler"], interval);
                    else this["@async.tick"] = setTimeout(this["@async.handler"]);
                }

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
        Async[1] = new Async(40, Async[2], 65);//40毫秒
        var async_stack = Async[0] = new Async(0, Async[1], 0);// 0毫秒
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

    yi.Promise = (function (yi, async, each) {
        var Thenable = function (src, clearTgt) {
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
            this.thenable = function (tgt, clearTgt) {
                if (this["@promise.source"]) return this;
                var result = tgt;
                if (!tgt || tgt === this) result = new Then(this);
                else Thenable.call(tgt, this, clearTgt);

                return result;
            }

            if (src) {
                Then.call(this, src, clearTgt);
            } else {
                this.isFullfilled = function () { return this["@promise.isFullfilled"]; }
                this.isRejected = function () { return this["@promise.isRejected"]; }
            }
        }
        Thenable.prototype = { toString: function () { return "[object yi.Then.Thenable]"; } };

        var Then = function (src, clearTgt) {
            if (src) {
                this["@promise.source"] = src;
                if (src.await) this.await = function (m) { this["@promise.source"].await(m); return this; }
                comine("@promise.onFullfilled", this, src);
                comine("@promise.onRejected", this, src);
                comine("@promise.onChanged", this, src);
                if (src["@promise.isFullfilled"]) {
                    resolve.call(this, src["@promise.value"]);
                } else if (src["@promise.isRejected"]) {
                    reject.call(this, src["@promise.value"]);
                } else {
                    this.isFullfilled = function () { return this["@promise.source"]["@promise.isFullfilled"]; }
                    this.isRejected = function () { return this["@promise.source"]["@promise.isRejected"]; }
                }
            }
        }
        Then.prototype = new Thenable();
        Then.prototype.toString = function () { return "[object yi.Then]"; }
        var comine = function (name, dest, src) {
            var d = dest[name];
            var s = src[name];
            if (d) {
                if (s) {
                    for (var i = 0, j = d.length; i < j; i++) s.push(d[j]);
                    dest[name] = s;
                } else {
                    src[name] = d;
                }
            } else {
                dest[name] = src[name] = s || [];
            }

        }

        var resolve = function (value) {
            if (this.resolve) this.notify = this.resolve = this.reject = this["@promise.invalid"];

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
            if (this.reject) this.notify = this.resolve = this.reject = this["@promise.invalid"];

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
        var Promisable = function () {
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
        Promisable.prototype = new Thenable();
        Promisable.prototype.toString = function () { return "[object yi.Promise.Promisable]"; }
        var Promise = function (whenFn, args) {
            if (whenFn) when.call(this, whenFn, args);
            return this;
        }
        Promise.prototype = new Promisable();
        Promise.prototype.toString = function () { return "[object yi.Promise]"; }

        var when = function (obj, args, nothenable) {
            if (this.when) this.when = this.defer = invalid;

            var t = typeof obj;
            if (t === 'function') {
                try {
                    obj.call(this, this, args);
                    return this;
                } catch (ex) {
                    this.reject(ex);
                }
                return nothenable ? this : this.thenable();
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
                return nothenable ? this : this.thenable();
            }
            this.resolve(obj);
            return nothenable ? this : this.thenable();
        }
        var Whenable = function () {
            this.when = when;
            this.defer = function (func, args) {
                //this["@promise.when_obj"] = func;
                //this["@promise.when_arg"] = args;
                //this["@promise.when"] = this.when;
                //this.when = this.defer = invalid;
                //async(function (promise) {
                //    promise["@promise.when"].call(promise, promise["@promise.when_obj"], promise["@promise.when_arg"], true);
                //}, this);
                var me = this, when = this.when;
                setTimeout(function () {
                   when.call(me,func, args, true);
                });
                this.when = this.defer = invalid;
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
        Whenable.prototype.toString = function () { return "[object yi.When.Whenable]"; }
        //***
        //When
        var When = function (whenFn, arg1, arg2) {
            if (whenFn) {
                if (whenFn === '%concurrent') {
                    concurrentPromise(this, args, arg1);
                    this.when = this.defer = invalid;
                }
                if (whenFn === '%sequence') {
                    sequencePromise(this, args, arg1);
                    this.when = this.defer = invalid;
                }
                this.when(obj, args);
            }
        }
        When.prototype = new Whenable();
        When.prototype.toString = function () { return "yi.Promise.When"; }
        var concurrentPromise = function (dfd, obj, args) {
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
        var sequencePromise = function (dfd, seq, args, dfd, prevValue) {
            var obj;
            while (!(obj = seq.shift()) || seq.length <= 0);
            if (!obj) return dfd.resolve(prevValue);

            var pomise = new Promise(obj, args);
            promise.done(function (value) {
                sequencePromise(seq, args, dfd, value);
            });
            return dfd;
        }

        each([Thenable, Then, Promise, Whenable, When], function (p) {
            each(p.prototype, function (m) {
                if (typeof m === 'function') m["@promise.primitive"] = true;
            });
        });
        var proxies = {};
        var createProxy = function (id, obj) {
            var Proxy;
            if (obj === undefined) { obj = id; id = null; }
            if (id) {
                Proxy = proxies[id];
                if (Proxy) return new Proxy(obj);
            }
            //msgProxy.load().enable().done(function(){});
            Proxy = function (obj) { this["@promise.proxy"] = obj; }
            var proto = new Whenable();
            proto["@promise.Proxy"] = Proxy;
            proto.toString = function () { return "yi.Promise.Proxy"; }
            each(obj, function (member, name) {
                if (typeof member !== 'function' || member["@promise.primitive"]) return;
                proto[name] = function () {
                    var targetPromise = this["@promise.proxy.promise"];
                    var newProxy = new this["@promise.Proxy"](obj);
                    if (targetPromise || targetPromise === null) {
                        if (targetPromise) {
                            if (targetPromise["@promise.isRejected"]) {
                                reject.call(newProxy, targetPromise["@promise.value"]);
                                return newProxy;
                            } else if (targetPromise["@promise.isFullfilled"]) {
                                resolve.call(newProxy, targetPromise["@promise.value"]);
                                return new Proxy;
                            }
                        }
                        var args = aslice.call(arguments);
                        newProxy["@promise.proxy.promise"] = null;
                        this.done(function () {
                            var newPromise = newProxy["@promise.proxy.promise"] = obj[name].apply(obj, args);
                            Then.call(newProxy, newPromise);
                            newPromise.done(function (value) {
                                resolve.call(newProxy, value);
                            }).fail(function (reason) {
                                reject.call(newProxy, value);
                            });
                        }).fail(function (reason) {
                            reject.call(newProxy, reason);
                        });
                        return newProxy;
                    } else {
                        var promise = newProxy["@promise.proxy.promise"] = obj[name].apply(obj, args);
                        promise.done(function (value) {
                            resolve.call(newProxy, value);
                        }).fail(function (reason) {
                            reject.call(newProxy, reason);
                        });

                    }

                    return newProxy;
                }
            });
            if (id) proxies[id] = Proxy;
            return new Proxy(obj);
        }

        Then.Thenable = Thenable;
        yi.Then = Then;
        Promise.Promisable = Promisable;
        yi.Promise = Promise;
        When.Whenable = Whenable;
        yi.When = When;
        Promise.proxy = createProxy;
        yi.defer = function (dfd,args) {
            return new When().defer(dfd,args);
        }
        return Promise;
    })(yi, yi.async, each);

    ///-----------------
    /// Uri
    ///-----------------
    yi.Uri = (function (yi) {

        var Uri = yi.Uri = function (url,ext) {
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
                    if (d >= 0) {
                        this.domain = path.substring(0, d);
                        path = path.substring(d);
                    }
                    break;
                }
            }


            var f = path.lastIndexOf("/");
            if (f >= 0 && f < path.length) this.file = path.substr(f + 1);
            else this.file = path;
            if (!exts) {
                var e = this.file.lastIndexOf(".");
                if (e >= 0) this.ext = this.file.substr(e);
            }
            
            this.path = path;
            this.toString = function () { return this.url; }
        }
        var resolvedPaths = Uri.resolved = {};
        Uri.maps = {};
        var protocols = Uri.protocols = ["http://", "https://"];
        Uri.bas = "";

        var resolveUrl = Uri.resolve = function (name,ext) {
            var uri, replaced = false;
            if (uri = resolvedPaths[name]) return uri;
            var url = name.replace(/\\/g, "/"), paths = Uri.maps;
            for (var n in paths) {
                n = n.replace(/[/\\]$/g, "");
                if (name.length < n.length) break;

                if (name.substr(0, n.length) === n && name[n.length] === '/') {
                    var k = paths[n].replace(/[\\/]$/g, "");
                    url = k + "/" + name.substring(n.length);
                    replaced = k;
                    break;
                }
            }
            var isAbs = false;
            for (var i = 0, j = protocols.length; i < j; i++) {
                var protocol = protocols[i];
                if (url.substr(0, protocol.length) === protocol) {
                    isAbs = true; break;
                }
            }
            if (!isAbs) url = (Uri.bas || "").replace(/[\\/]$/g, "") + "/" + url;
            uri = resolvedPaths[name] = new Uri(url, ext);
            this.name = name;
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

    yi.Require = (function (yi, Whenable, Uri, async) {
        var head;
        var loadRes = yi.loadRes = function (url, type) {
            var hd = head;
            if (!hd) {
                hd = document.getElementsByTagName("HEAD");
                if (hd[0]) {
                    hd = head = hd[0];
                } else hd = document.body || document.documentElement;
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
        Require.prototype = new yi.When.Whenable();
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
        return Require;
    })(yi, yi.Promise.Whenable, yi.Uri, yi.async);


    yi.ajax = (function (global, document, yi,undefined) {
        var yi = global.yi, Deferred = yi.Promise, extend = yi.override;
        var createHttp = function () {
            if (global.XMLHttpRequest) {
                createHttp = function () {
                    var http = new XMLHttpRequest();
                    if (http.overrideMimeType) {
                        http.overrideMimeType('text/xml');
                    };
                    return http;
                }
            } else {
                createHttp = function () {
                    var http = new ActiveXObject("Microsoft.XMLHTTP");
                    return http;
                }
            }
            return createHttp();
        }
        var ajax = function (opts) {
            var http = createHttp(), dfd = new Deferred();
            var headers = opts.headers;
            if (headers) for (var n in headers) raw.setRequestHeader(n, headers[n]);
            http.onreadystatechange = function () {
                if (http.readyState == 4 || http.readyState=='completed') {
                    if (http.status == 200) {
                        var handler = acceptHandlers[opts.accept];
                        var rs;
                        if (handler) {
                            try {
                                rs = handler(http);
                            } catch (ex) {
                                dfd.reject({
                                    error: "parse-response",
                                    ex:ex,
                                    opts: opts,
                                    http: http
                                });
                            }
                            
                        }
                        else rs = http.responseText;
                        dfd.resolve(rs);
                    } else {
                        dfd.reject({
                            error : "http",
                            status: http.status,
                            statusText: http.statusText,
                            content: http.responseText,
                            opts: opts,
                            http:http
                        });
                    }
                }
            }
            var url = opts.url;
            var dataType = opts.dataType;
            var dh = dataHandlers[dataType] || dataHandler;
            var data;
            try {
                data = dh(opts.data);
            } catch (ex) {
                dfd.reject({error:"parse-senddata",ex:ex,opts:opts});
            }
            var method = opts.method ? opts.method.toUpperCase() : "GET";
            var url = opts.url || "";
            if (method == 'GET' && data) {
                if (url.indexOf("?") < 0) url += "?";
                url += "&" + data;
            }
            try {
                http.open(method, url, opts.sync===true);
                http.send(data);
            } catch (e) {
                dfd.reject({ error:"http-operation",ex:e});
            }
            return dfd.promise();
        }
        
        var dataHandler = function (data) {
            if (typeof data === "object") {
                var rs = "";
                for (var n in data) {
                    if (rs != "") rs += "&";
                    rs += encodeURIComponent(name);
                    rs += "=";
                    var val = data[n];
                    rs += encodeURIComponent(val === null || val === undefined ? "" : val);
                }
                return rs;
            }
            return data === null || data === undefined ? "" : data.toString();
        }
        var dataHandlers =ajax.senddataHandlers = {
            "":dataHandler,
            "json": function (data) {
                return JSON.stringify(data);
            }
        }
        var accepts = {
            "json": "text/json",
            "xml": "text/xml"
        }
        var acceptHandlers = ajax.responseHandlers = {
            "json": function (http) {
                var text = xmlhttp.responseText;
                return JSON.parse(text);
            },
            "xml": function (http) {
                return xmlhttp.responseXml;
            }
        }
        
        return ajax;
    })(Global, document,Global.yi);

    yi.Model = (function (yi, otoStr, override) {
        var seed = 1;
        //兼容google 的代码，google的函数这些文字在function中是保留属性名
        var reservedPropertyNames = {
            "name": "name_",
            "arguments": "arguments_",
            "length": "length_",
            "caller": "caller_",
            "prototype": "prototype_",
            "constructor": "constructor_"
        };
        var Model = function (name, target) {
            target || (target = {});
            name || (name = '@model.prop-' + (seed == 210000000 ? 1 : seed++));
            this["@model.object"] = target;
            this["@model.name"] = name;
            this["@model.bubble"] = true;
            var me = this;
            var accessor = function (value) {
                var self = me;
                if (value === undefined) return self["@model.object"][self["@model.name"]];
                self.setValue(value);
                return self["@model.accessor"];
            }
            Accessor.call(accessor);
            accessor.toString = function () { var v = me.getValue(); if (v === null || v === undefined) return ""; return v.toString();}
            
            this.accessor = this["@model.accessor"] = accessor["@model.accessor"] = accessor;
            this["@model.model"] = accessor["@model.model"] = this;
           
        }
        Model.define = function (defination) {
            if (defination === null) return this["@model.define"];
            var type = defination.$model_type;
            if (!type) throw new Error("Model.define require $model_type in it's argument.");
            var def = this["@model.define"] = override(this["@model.define"], defination);
            
            if (type === 'array') {                
                return this.asArray(defination.template);
            }else if (type === 'object') {
                for (var n in def) {
                    if (n === '$model_type') continue;
                    var subdef = def[n];
                    var prop = this.prop(n);
                    prop.define(subdef);
                }
                return this;
            } 
            var rules = defination.rules;
            if (rules) {
                if (type) rules[type] = true;
                this["@model.rules"] = rules;
            }
            return this;
        }

        Model.prototype = {
            $type: "yi.Model",
            toString : function(){return "[object yi.Model]";},
            //设置或获取某个Model的名字，该名字也就是属性名
            name: function (value) {
                if (value === undefined) return this["@model.name"];
                this["@model.name"] = value; return this;
            },
            object : function (target, source) {
                //get/set要观察的目标对象
                // target 要观察的对象
                //对象。如果是set操作则返回监听器本身
                //get
                var old = this["@model.object"];
                if (target === undefined) return old;
                //set
                this["@model.object"] = target || (target = {});
                //监听目标对象改变后，重新给本监听器赋值，以触发事件
                var name = this["@model.name"];
                if (old !== target) this.setValue(target[name], "object.change", source,old[name],true);
                return this;
            },
            parent: function (parent) {
                ///get/set该观察器的主体对象(主体观察器)。当一个观察器有主体对象时，表示该观察器是主体对象的一个属性",
                ///        "parent": "要设置的主体对象。必须是另一个Model。如果该参数设置为‘%root’，返回根"
                ///    returns: "对象。如果是set操作则返回监听器本身。否则返回主体观察器"
                if (parent === undefined) return this["@model.parent"];
                if (parent === "%root") {
                    var sub = this["@model.parent"];
                    return sub ? sub.parent("%root") : sub;
                }
                var old = this["@model.parent"];
                //原先的跟新的一样，就什么都不做
                if (old === parent) return this;

                this["@model.parent"] = parent;
                if (old) {
                    var name = this["@model.name"];
                    //清除掉原来subject里面的东西
                    delete old["@model.props"][name];
                    var accor = old.accessor();
                    delete accor[reservedPropertyNames[name] || name];
                }
                var new_targ = subject["@model.target"] || (parent["@model.target"] = {});
                this.target(new_targ);
                //数组的item不会当作prop
                if (parent["@model.template"] && typeof name !== 'number') {
                    (parent["@model.props"] || (parent["@model.props"] = {}))[name] = this;
                    var accor = parent.accessor();
                    accor[reservedPropertyNames[name] || name] = this.accessor();
                }
                return this;
            },
            
            getValue: function () {
                return this["@model.object"][this["@model.name"]];
            },
            setValue: function (new_v, reason, _source,_old,_nocompare) {
                /// <summary>get/set该监听器在目标对象上的值</summary>
                /// <param name="new_v" type="Anything">要设定的新值。如果该参数为undefined，表示获取目标对象上的值</param>
                /// <param name="reason" type="String | not_trigger">变化原因，传递给事件函数用，默认是valuechange。</param>
                /// <param name="_source" type="Object">之名该变化是由哪个个源事件引起</param>
                /// <returns type="Object">监听器本身</returns>
                //get
                var targ = this["@model.object"], name = this["@model.name"];
                
                //获取旧值，如果跟新值一样就直接拿返回
                if (!_nocompare) {
                    _old = targ[name];
                    if (_old === new_v) return this;
                    //set value to target
                    targ[name] = new_v;
                }
                
                //表示不需要触发事件，只是设置一下值
                //跳过后面的事件处理
                if (this["@model.disabledTrigger"]) return this;
                //构建事件参数
                var evtArgs = { type: "valuechange", sender: this, value: new_v,old:_old, reason: (reason || "value.set"), source: _source };

                //获取到该监听上的所有下级监听器
                var props = this["@model.props"];

                if (props) for (var n in props) props[n].object(new_v, evtArgs);
                var items = this["@model.items"];
                if (items) {
                    for (var i in items) {
                        var it = items[i];
                        var it_evt = { type: "valuechange", sender: it, value: it.getValue(),index:i, reason: "array.reset", source: evtArgs, index: i };
                        it.trigger(it_evt,false);
                    }
                    //this._initArrayData(this["@model.itemTemplate"], this.value);
                }
                this.trigger("valuechange", evtArgs, this["model.bubble"]);
                //this.childchange(evtArgs);
                return this;
            },
            
            bubble: function (value) {
                if (value === undefine) return this["@model.bubble"];
                this["@model.bubble"] = value; return this;
            },
            subscribe: function (evtname, callback) {
                if (callback === undefined) { callback = evtname; evtname = "valuechange";}
                if(typeof callback!=='function') throw new Error("invalid argument");
                var obs = this['@model.subscribers'] || (this['@model.subscribers'] =[]);
                (obs[evtname]|| (obs[evtname]=[])).push(callback);
                return this;
            },
            unsubscribe: function (evtname, callback) {
                var obs = this['@model.subscribers'], its,it;
                if (!(its = obs[evtname])) return this;
                for (var i = 0, j = its.length; i < j; i++) if ((it = its.shift()) !== callback) its.push(it);
                return this;
            },
            enableTrigger: function () { 
                //启用事件触发
                this["@model.triggerDisabled"] = false;
                if (this["@model.triggler"]) this.trigger = this["@model.triggler"];
                return this;
            },
            disableTrigger: function () {
                //禁用事件触发
                this["@model.triggerDisabled"] = true;
                this["@model.triggler"] = this.trigger;
                this.trigger = function () { return this; };
                return this;
            },
            trigger: function (evtname, args, bubble) {
                /// <summary>触发某个事件/禁用事件/启用事件</summary>
                /// <param name="evtname" type="String">事件名。如果该函数第2个参数没有，evtname='valuechange'.如果该值设置为enabled/disabled对象，表示启用/禁用事件</param>
                /// <param name="evt" type="Object">事件对象</param>
                /// <returns type="Object">监听器本身</returns>
                
                if (this["@model.triggerDisabled"]) return this;
                var obs = this['@model.subscribers'], its, it;
                if (!obs) return this;
                if (its = obs[evtname]) for (var i = 0, j = its.length; i < j; i++) {
                    var it = its.shift();
                    var result = it.call(this, args);
                    if (result !== '%discard' && result !== '%discard&interrupt') its.push(it);
                    if (result === '%interrupt' || result === '%discard&interrupt' && result === false) break;
                }
                if (bubble === undefined) bubble = this["@model.bubble"];
                //如果没有禁用bubble,事件本身也没有取消冒泡
                if (bubble !== false && !args.cancelBubble) {
                    var sup = this.parent();
                    if (sup) {
                        var evtArgs = { type: "valuechange", sender: this, value: sup.getValue(), reason: "bubble", source: (args.source || args) };
                        sup.trigger("valuechange", evtArgs, bubble);
                    }
                }
                return this;
            },

            prop: function (names, value) {
                var props = this["@model.props"]
                    , target = this["@model.object"][this["@model.name"]];
                if(!props) props = this["@model.props"] = {};
                if (typeof target!=='object')  target = this["@model.object"][this["@model.name"]] = {};

                var isArr = false;
                if (otoStr.call(names) === '[object Array]') {
                    isArr = true;
                } else {
                    names = [names];
                }
                var rs = {};
                for (var i = 0, j = names.length; i < j; i++) {
                    var name = names[i];
                    var prop = props[name];
                    if (!prop) {
                        prop = props[name] = new Model(name, target);
                        var aname = reservedPropertyNames[name] || name;
                        this["@model.accessor"][aname] = prop["@model.accessor"];
                        prop["@model.parent"] = this;
                        if (otoStr.call(value) === '[object Array]') prop.asArray();
                    }
                    if (isArr) rs[name] = prop;
                }
                
                if (!isArr && value !== undefined) prop.setValue(value);
                return isArr?rs : prop;
            },
            asArray: function (define) {
                var value = this.getValue();
                if (otoStr.call(value) !== '[object Array]') this["@model.object"][this["@model.name"]] = [];
                ModelArray.call(this);
                ModelArray.call(this["@model.accessor"]);
                this.asArray = function (def) {
                    if (def) {
                        if (def["@model.object"]) {
                            return this.template(def);
                        } else {
                            return this.template().define(def);
                        }
                    }
                    return this;
                }
                return this.asArray(define);
                return this;
            },

            validate: function (onlyme) {
                var def = this["@model.define"], rules;
                if (!def) return true;
                if (rules = def.rules) {
                    var val = this["@model.object"][this["@model.name"]];
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
                var props = this["@model.props"], result = true;
                if (props) for (var n in props) {
                    var prop = props[n];
                    var result = result && prop.validate();
                }
                return result;
            },
            define: Model.define,

            clone: function (object, evtInc) {
                object || (object = this["@model.object"]);
                var name = this["@model.name"];
                var clone = new Model(name, object);
                var props = this["@model.props"];
                var target = clone.getValue();
                
                if (props) {
                    var cloneProps = {};
                    if (!target) target = object[name] = {};
                    for (var propname in props) {
                        var prop = props[propname];
                        var cloneProp = cloneProps[propname] = prop.clone(target);
                        clone.accessor[reservedPropertyNames[propname] || propname] = cloneProp["@model.accessor"];
                        cloneProp["@model.parent"] = clone;
                    }
                    clone["@model.props"] = cloneProps;
                }
                if (evtInc) {
                    var subsers = this["@model.subscribers"];
                    if (subsers) {
                        var newSubs = {};
                        for (var n in subsers) {
                            var lsns = subsers[n];
                            var clonelsns = [];
                            for (var i = 0, j = lsns.length; i < j; i++) clonelsns.push(lsns[i]);
                            newSubs[n] = clonelsns;
                        }
                        clone["@model.subscribers"] = newSubs;
                    }
                }
                if (this.isArray) clone.asArray(this["@model.template"]);
                return clone;
            }
        };
        var Accessor = function () {
			this["$type"]="yi.Model.Accessor";
            //this["@model.accessor"] = accor["@model.accessor"] = accor;
            this.subscribe = function (evtname, subscriber) {
                this["@model.model"].subscribe(evtname, subscriber);
                return this["@model.accessor"];
            }
            this.unsubscribe = function (evtname, subscriber) {
                this["@model.model"].unsubscribe(evtname, subscriber);
                return this["@model.accessor"];
            }
            this.asArray = function (template) {
                var me = this["@model.model"];
                me.asArray(template);
                return this["@model.accessor"];
            }
            this.define = function (model) {
                var me = this["@model.model"];
                if (!model) return me["@observer.define"];
                me.define(model);
                return this["@model.accessor"];
            }
            this.validate = function (onlyme) {
                var me = this["@model.model"];
                return this["@model.accessor"];
            }
            return this;
        }
        
        var ModelArray = function () {

            this.template = function (v) {
                var me = this["@model.model"];
                if (v === undefined) {
                    return me["@model.template"] || (me["@model.template"] = new Model(0, []));
                }
                this["@model.template"] = v;
                return this;
            }
            this.count = function () {
                var me = this["@model.model"];
                return me["@model.object"][me["@model.name"]].length;
            }
            this.push = function (item) {
                var me = this["@model.model"],
                    arr = me["@model.object"][me["@model.name"]];//, items = me["@model.items"], item;
                arr.push(item);
                //var it_evt = { sender: item, value: it, reason: "array.push" };
                var arr_evt = { type: "valuechange", sender: me, value: arr, reason: "array.push" };
                me.trigger("valuechange", arr_evt);
                return this;
            }
            this.pop= function () {
                var me = this["@model.model"],
                    arr = me["@model.object"][me["@model.name"]],
                    items = me["@model.props"];
                var it = arr.pop();
                if (items) {
                    var item = items[arr.length], it_evt;
                    if (item) {
                        delete items[arr.length];
                        it_evt = { type: "remove", sender: item, value: it, reason: "array.pop" };
                        item.trigger("remove", it_evt,false);
                    }
                }
                var arr_evt = { type: "valuechange", sender: me, value: arr, reason: "array.pop", item: it };
                me.trigger("valuechange", arr_evt);
                return it;
            }
            this.unshift = function (it) {
                var me = this["@model.model"],
                    arr = me["@model.object"][me["@model.name"]],
                    items = me["@model.props"];
                arr.unshift(it);
                if (items) {
                    for (var n in items) {
                        var item = items[n];
                        var it_evt = {
                            type: "valuechange",
                            sender: item,
                            value: arr[n],
                            index:n,
                            reason: "array.unshift"
                        };
                        item.trigger("valuechange", it_evt,false);
                    }
                }
                var arr_evt = { type: "valuechange", sender: me, value: arr, reason: "array.unshift",item:it };
                me.trigger("valuechange", arr_evt);
                return this;
            }

            this.shift = function (it) {
                var me = this["@model.model"],
                    arr = me["@model.object"][me["@model.name"]],
                    items = me["@model.props"];
                var it = arr.shift(), cancled = false;
                if (items) {
                    var item = items[0], rmv_evt;
                    if (item) {
                        delete items[0];
                        rmv_evt = { type: "remove", sender: item, value: it, reason: "array.shift", index: 0 };
                        item.trigger("remove", rmv_evt, false);
                        
                    }
                    for (var n in items) {
                        if (n == 0) continue;
                        var item = items[n];
                        var it_evt = {
                            type: "valuechange",
                            sender: item,
                            value: arr[n],
                            index: n,
                            reason: "array.shift",
                            source: rmv_evt
                        };
                        item.trigger("valuechange", it_evt,false);
                    }
                    
                }
                var arr_evt = { type: "valuechange", sender: me, value: arr, reason: "array.shift" };
                me.trigger("valuechange", arr_evt);

                return it;
            }
            this.removeAt= function (at) {
                var me = this["@model.model"],
                    arr = me["@model.object"][me["@model.name"]],
                    items = me["@model.props"];
                if (at<0 || arr.length <= at) return this;
                var it;
                for (var i = 0, j = arr.length; i < j; i++) {
                    var itat = arr.shift();
                    if (i === at) { it == itat; } else arr.push(itat);
                }
                
                if (items) {
                    var item = items[at], rm_evt;
                    if (item) {
                        delete items[at];
                        it_evt = { type: "remove", sender: item, value: it, reason: "array.remove", index: at };
                        item.trigger("remove", rm_evt, false);
                    }

                    for (var n in items) {
                        if (n <at) continue;
                        var item = items[n];
                        var it_evt = {
                            type: "valuechange",
                            sender: item,
                            value: arr[n],
                            index: n,
                            reason: "array.shift",
                            source: rm_evt
                        };
                        item.trigger("valuechange", it_evt, false);
                    }
                    
                }
                var arr_evt = { type: "valuechange", sender: me, value: arr, reason: "array.remove",index:at,item:it };
                me.emit("valuechange", arr_evt);
            }

            this.clear =function () {
                var me = this["@model.model"],
                    arr = me["@model.object"][me["@model.name"]],
                    items = me["@model.props"];
                for (var i = 0, j = arr.length; i < j; i++) arr.pop();
                if (items) {
                    for (var i = 0, j = items.length; i < j; i++) {
                        var it_evt = { type: "remove", sender: item, value: value, reason: "array.clear", index: i };
                        //不冒泡，处理完成后统一给array发送消息
                        items[i].publish("remove", it_evt, false);
                    }
                    me["@model.props"] = null;
                }
                
                var arr_evt = { type: "valuechange", sender: me, value: it, reason: "array.clear" };
                me.trigger("valuechange", arr_evt);
                return this;
            }
            this.valueAt = function (at) {
                var me = this["@model.model"],
                    arr = me["@model.object"][me["@model.name"]];
                if (at < 0 || at >= arr.length) throw new Error("InvalidArguments:Out of range");
                return arr[at];
            }
            
            this.getItemAt = function (at, cache) {
                var me = this["@model.model"],
                    arr = me["@model.object"][me["@model.name"]],
                    items = me["@model.props"];
                if (at<0 || at >= arr.length) throw new Error("InvalidArguments:Out of range");

                if (!items) items = me["@model.props"] = {};
                var item = items[at];
                if (item) return item;
                item = me.template().clone();
                item["@model.name"] = at;
                item["@model.parent"] = me;
                item.disableTrigger();
                item.object(arr);
                item.enableTrigger();
                if(cache)items[at] = item;
                return item;
            }
            this.setItemAt = function (at, value,cache) {
                var me = this["@model.model"],
                    arr = me["@model.object"][me["@model.name"]],
                    items = me["@model.props"], item;
                if (at < 0 || at >= arr.length) throw new Error("InvalidArguments:Out of range");
                if (!items) items = me["@model.props"] = {};
                if (item = items[at]) {
                    item.setValue(value,"array.item");
                    return this;
                } else {

                    arr[at] = value;
                    var arr_evt = { type: "valuechange", sender: me, value: arr, reason: "array.item" };
                    me.trigger("valuechange", arr_evt);
                    if (cache) {
                        item = me.itemTemplate().clone();
                        item["@model.name"] = at;
                        item["@model.parent"] = me;
                        item.disableTrigger();
                        item.object(arr,arr_evt);
                        item.enableTrigger();
                        items[at] = item;
                    }
                }
                return this;
            }
        }
        Model.ModelArray = ModelArray;
        Model.Accessor = Accessor;
        yi.model = function (value) {
            var ret = new Observer("",{"":value});
            return ret["@model.accessor"];
        }
        return Model;
    })(yi, otoStr, override);
    
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
	yi.bind = (function(yi,Global,document,Model,oToStr){
		var attach = yi.attach = window.attachEvent ? function (elem, evtname, fn) { elem.attachEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.addEventListener(evtname, fn, false); };

	    var detech = yi.detech = window.detechEvent ? function (evtname, elem) { elem.detechEvent("on" + evtname, fn); } : function (elem, evtname, fn) { elem.removeEventListener(evtname, fn, false); }
	    

	    var propRegx = /^([a-zA-Z_\$][a-zA-Z_\$0-9]*(?:.[a-zA-Z_\$][a-zA-Z_\$0-9]*)*)$/;
	    var txt = "Na.si$_";
	    //alert(propRegx.exec(txt));
	    var expr = "(Na.s,Na.p.s)=>{return Na.s()>0?Na.s() + Na.p.s():Na.p.s();}";
	    var depRegx = /^\(([a-zA-Z_\$][a-zA-Z_\$0-9]*(?:.[a-zA-Z_\$][a-zA-Z_\$0-9]*)*(?:,[a-zA-Z_\$][a-zA-Z_\$0-9]*(?:.[a-zA-Z_\$][a-zA-Z_\$0-9]*)*))\)/;
	    var depRegx = /^\(([a-zA-Z_\$][a-zA-Z_\$0-9]*(?:.[a-zA-Z_\$][a-zA-Z_\$0-9]*)*(?:,[a-zA-Z_\$][a-zA-Z_\$0-9]*(?:.[a-zA-Z_\$][a-zA-Z_\$0-9]*)*))\)=>(.*)$/;

	    var tagContainers = {
	        "": yi.DIV = document.createElement("div"),
	        "LEGEND": document.createElement("fieldset"),
            "DT" : document.createElement("DL"),
	        "LI": document.createElement("ul"),
	        "TR": document.createElement("tbody"),
	        "TD": document.createElement("tr"),
	        "TBODY": document.createElement("table"),
	        "OPTION": document.createElement("select")
	    };
	    //oToStr = Object.prototype.toString;
	    tagContainers.THEAD = tagContainers.TFOOT = tagContainers.TBODY;
	    tagContainers.DD = tagContainers.DT;
	    var cloneNode = yi.cloneNode = function (elem) {
	        var tag = elem.tagName;
	        if (elem.cloneNode) return elem.cloneNode(true);
	        var ctn = tagContainers[tag] || tagContainers[""];
	        var html = elem.outerHTML + "";
	        ctn.innerHTML = html;

	        //var html = ctn.innerHTML;
	        //ctn.innerHTML = html;
	        return ctn.firstChild;
	    }

	    //alert(regx.exec("rs {{''+se() + bs()}} ok"));
	    var checkModel = function ($self, $root, expr) {
	        var ret = {}, start = 1;
	        var props = expr.split('.');
	        var model = $self["@model.model"];

	        var prop = props.shift();
	        if (prop === '$parent') { model = model.parent(); props.unshift("$item['@model.model'].parent().accessor"); }
	        else if (prop === '$root') { model = $root["@model.model"]; props.unshift("$root"); }
	        else { model = model.prop(prop); props.unshift(prop); props.unshift("$item"); start = 2; }
	        for (var i = start, j = props.length; i < j; i++) {
	            propname = props[i];
	            model = model.prop(propname);
	        }
	        ret.modelName = props.join(".");
	        ret.model = model;
	        return ret;
	    }
	    var getElementSelector = function (elem) {
	        var name = elem.tagName;
	        if (elem.id) name += "#" + elem.id;
	        if (elem.name) name += "[name=\"" + elem.name.replace(/"/g, "\\\"") + "\"]";
	        if (elem.className) name += "." + elem.className.replace(/^\s+|\s+$/g, "").replace(/\s+/g, ".");
	        return name;
	    }
	    var genCodes = function (element, model, cx) {
	        var children = element.childNodes, isBinded = false;
	        //把cx中一些常用函数展开
	        var codes = cx.codes, propRegx = cx.propRegx, root = cx.root, gbinders = cx.gbinders;
	        var checkModel = cx.checkModel;

	        for (var childAt = 0, childCount = children.length; childAt < childCount; childAt++) {
	            var child = children[childAt];
	            if (!child) {
	                alert(childAt);
	                alert(element.outerHTML);
	            }
	            if (child.nodeType != 1) continue;
	            codes.push("$element=$element.childNodes[" + childAt + "];\r\n");
	            var attrs = child.attributes, binded = false, parseChild = true;
	            for (var m in attrs) {
	                var attr = attrs[m], attr_name = attr.name, attr_value = attr.value;

	                if (attr_name === 'bind-each') {
	                    parseChild = false;
	                    var match = propRegx.exec(attr_value);
	                    if (!match) cx.logger.error("invalid expression for bind-each", cx.getElementSelector(elem));
	                    var eachModel = checkModel(model, cx.root, attr_value);
	                    eachModel.model.asArray();
	                    var tmpl = eachModel.model.template();
	                    var withBinder = createBinder(child, tmpl, cx.root);
	                    if (withBinder) {
	                        tmpl["@bind.binder"] = withBinder;
	                        tmpl["@bind.element"] = cloneNode(child);
	                        codes.push("$unbinds.push($gbinders['@bind.each']($element," + eachModel.modelName + "));\n");
	                        cx.sbinders.push(eachBinder);
	                        binded = true;
	                    }
	                } else if (attr_name === 'bind-with') {
	                    parseChild = false;
	                    //如果是with,每个with都是一个单独的binder
	                    var match = propRegx.exec(attr_value);
	                    //with 必须是属性访问
	                    if (!match) { throw new Error("invalid expression for bind-with", cx.getElementSelector(elem)); continue; }
	                    var withModel = checkModel(model, cx.root, attr_value);
	                    var withBinder = cx.createBinder(child, withModel.model, cx.root);
	                    if (withBinder) {
	                        codes.push("$unbinds.push($sbinders[" + cx.sbinders.length + "]($element," + withModel.modelName + "));\n");
	                        cx.sbinders.push(withBinder);
	                        binded = true;
	                    }
	                }
	                var binder;
	                if (attr_name == 'bind-value') {
	                    var tag = child.tagName;
	                    if (tag == 'INPUT') {
	                        var tp = child.type;
	                        if (tp === 'radio') attr_name = "@bind.radio";
	                        else if (tp === 'checkbox') attr_name = "@bind.checkbox";
	                        else if (tp === 'botton' || tp === 'submit' || tp === 'reset') attr_name = "@bind.vtext";
	                        else attr_name = "@bind.value";
	                    } else if (tag == 'SELECT') attr_name = "@bind.select";
	                    else if (tag == 'TEXTAREA') attr_name = "@bind.value";
	                    else if (tag == 'BUTTON' || tag == 'OPTION') attr_name = "@bind.vtext";
	                    else binder = attr_name = "@bind.text";
	                } else if (attr_name == 'bind-text') {
	                    if (tag == 'INPUT' || tag == 'TEXTAREA') binder = gbinders["@bind.vtext"];
	                    if (tag == 'SELECT') attr_name = "@bind.stext";
	                    else attr_name = "@bind.text";
	                }


	                if (!(binder = gbinders[attr_name])) continue;
	                var match = propRegx.exec(attr_value), bindModel;
	                if (match) {
	                    bindModel = checkModel(model, root, attr_value);
	                    codes.push("$unbinds.push($gbinders[\"" + attr_name + "\"]($element," + bindModel.modelName + "," + bindModel.modelName + ",\"" + attr_value + "\"));\n");
	                    
						binded = true; continue;
	                }
	                match = cx.dependenceRegx.exec(attr_value);
	                if (match) {
	                    var depInfo = cx.createDepAccessor(model, match);
	                    codes.push("$unbinds.push($gbinders[" + attr_name + "]($element,$accessors[" + accessors.length + "].accessor,$accessors[" + accessors.length + "].dependences));\n");
	                    accessors.push(depInfo);
	                    binded = true; continue;
	                }
	                throw new Error("not supported");

	            }
	            if (parseChild) {
	                var r = genCodes(child, model, cx);
	                if (r) binded = true;
	            }

	            if (!binded) codes.pop();
	            else {
	                codes.push("$element=$element.parentNode;\r\n");
	                isBinded = true;
	            }

	        }
	        return isBinded;
	    }
	    var createBinder = function (elem, model, root) {
	        var cx = { codes: [], accessors: [], sbinders: [], root: root || model, gbinders: Binders, createBinder: createBinder, propRegx: propRegx, dependenceRegx: depRegx, logger: null, checkModel: checkModel };
	        genCodes(elem, model, cx);
	        var codes = cx.codes;
			if (codes.length == 0) return;
			while(true){
				var line = codes.pop();
				if (!line || line == "$element=$element.parentNode;\r\n") continue;
				codes.push(line);
				break;
			}
			codes.unshift("var $unbinds = [];\r\n");
			codes.push("return $unbinds;");
	        var cd = cx.codes.join("");
	        //alert(cd);
	        var fn = new Function("$element", "$item", "$root", "$accessors", "$gbinders", "$sbinders", cd);
	        return function (element, accessor, deps, expression) {
	            var unbinds= fn(element, accessor, cx.root.accessor, cx.accessors, cx.gbinders, cx.sbinders);
	            return function () {
	                for (var i = 0, j = unbinds.length; i < j; i++) {
	                    var unbind = unbinds[i];
	                    if (unbind) unbind();
	                }
	            }
	        };
	    }
	    eachBinder = function (element, accessor) {
	        var model = accessor["@model.model"];
	        var tpl = model.template();
	        var elem = tpl["@bind.element"];
	        var childCount = elem.childNodes.length;
	        var binder = tpl["@bind.binder"];
	        var setValue = function () {
	            element.innerHTML = "";
	            for (var i = 0, j = model.count() ; i < j; i++) {
	                var item = model.getItemAt(i, true);
	                var el = cloneNode(elem);
	                binder(el, item.accessor);
	                for (var n = 0, m = childCount; n < m; n++) {
	                    element.appendChild(el.firstChild);
	                }
	            }
	        }
			var handler = function (evt) {
	            switch (evt.reason) {
	                case "array.push":
	                    var item = model.getItemAt(model.count() - 1, true);
	                    var el = elem.clone(true);
	                    binder(el, item);
	                    for (var i = 0, j = childCount; i < j; i++) {
	                        element.appendChild(el.firstChild);
	                    }
	                    break;
	                case "array.pop":
	                    for (var i = 0, j = childCount; i < j; i++) {
	                        element.removeChild(element.lastChild);
	                    }
	                    break;
	                case "array.unshift":
	                    var item = model.getItemAt(model.count() - 1, true);
	                    var el = elem.clone(true);
	                    binder(el, item);
	                    if (element.firstChild) {
	                        for (var i = childCount - 1; i >= 0; i--) {
	                            element.insertBefore(el.childNodes[i], element.firstChild);
	                        }
	                    } else {
	                        for (var i = 0, j = childCount; i < j; i++) {
	                            element.appendChild(el.childNodes[i]);
	                        }
	                    }
	                    break;
	                case "array.shift":
	                    for (var i = 0, j = childCount; i < j; i++) {
	                        element.removeChild(element.firstChild);
	                    }
	                    break;
	                case "array.remove":
	                    var at = childCount * evt.index;
	                    for (var i = 0, j = childCount; i < j; i++) {
	                        element.removeChild(element.firstChild);
	                    }
	                    break;
	                default:
	                    setValue();
	            }
	        }
			model.subscribe(handler);
            

			setValue();
			return function () {
			    //TODO : 应该要重新构建，而不是清空
			    model["@model.props"] = {};
			    model.unsubscribe(handler);
			}
	    }
	    var Binders = {
	        "@bind.each": eachBinder,
	        "bind-click": function (element, accessor) {
	            attach(element, 'click', function (evt) {
	                var handler = accessor();
	                handler.call(element, evt || event);
	            });
	        },
	        "bind-change": function (element, accessor) {
	            attach(element, 'change', function (evt) {
	                var handler = accessor();
	                handler.call(element, evt || event);
	            });
	        },
	        "bind-visible": function (element, accessor) {
				var handler = function (evt) {
	                var val = evt.value;
	                element.style.display = val ? "" : "none";
	            };
	            accessor.subscribe(handler);
	            element.style.display = accessor() ? "" : "none";
				return function(){accessor.unsubscribe(handler);}
	        },
	        "bind-readonly": function (element, accessor) {
	            var setValue = function (element, val) {
	                if (val) {
	                    element.readonly = true;
	                    element.setAttribute("readonly", "readonly");
	                } else {
	                    element.readonly = false;
	                    element.removeAttribute("readonly");
	                }
	            }
				var handler = function (evt) { setValue(element, evt.value); };
	            accessor.subscribe(handler);
	            setValue(element, accessor());
				return function(){accessor.unsubscribe(handler);}
	        },
	        "bind-disable": function (element, accessor) {
	            var setValue = function (element, val) {
	                if (val) {
	                    element.disabled = true;
	                    element.setAttribute("disabled", "disabled");
	                } else {
	                    element.disabled = false;
	                    element.removeAttribute("disabled");
	                }
	            }
				var handler = function (evt) { setValue(element, evt.value); };
	            accessor.subscribe(handler);
	            setValue(element, accessor());
				return function(){accessor.unsubscribe(handler);}
	        },
	        "@bind.text": function (element, accessor) {
	            var handler = function (evt) { element.innerHTML = evt.value; };
	            accessor.subscribe(handler);
	            element.innerHTML = accessor();
				return function(){accessor.unsubscribe(handler);}
	        },
	        "@bind.value": function (element, accessor) {
	            var evtHandler = function () { accessor(element.value); }
	            attach(element, "keydown", evtHandler);
	            attach(element, "blur", evtHandler);
				var handler = function (evt) { element.value = evt.value; };
	            accessor.subscribe(handler);
	            element.value = accessor();
				return function(){accessor.unsubscribe(handler);}
	        },
	        "@bind.vtext": function (element, accessor) {
				var handler = function (evt) { element.value = evt.value; };
	            accessor.subscribe(handler);
	            element.value = accessor();
				return function(){accessor.unsubscribe(handler);}
	        },
	        "@bind.select": function (element, accessor) {
	            var evtHandler = function () { accessor(element.selectedIndex > -1 ? element.options[element.selectedIndex].value : element.value); }
	            var setValue = function (element, value) {
	                var opts = element.options;
	                for (var i = 0, j = opts.length; i < j; i++) {
	                    if (value === opts[i].value) {
	                        element.selectedIndex = i;
	                        element.value = value;
	                        return;
	                    }
	                }
	            }
	            attach(element, "change", evtHandler);
				var handler = function (evt) { setValue(element, evt.value); }
	            accessor.subscribe(handler);
	            setValue(element, accessor());
				return function(){accessor.unsubscribe(handler);}
	        },
	        "@bind.radio": function (element, accessor) {
	            var evtHandler = function () {
	                if (element.checked) accessor(element.value);
	                else accessor(null);
	            }
	            var setValue = function (element, value) {
	                if (value == element.value) {
	                    element.checked = true;
	                    element.setAttribute("checked", "checked");
	                } else {
	                    element.checked = false;
	                    element.removeAttribute("checked");
	                }
	            }
				var handler = function (evt) {
	                setValue(element, evt.value);
	            }
	            attach(element, "change", evtHandler);
	            attach(element, "blur", evtHandler);
	            attach(element, "click", evtHandler);
	            accessor.subscibe(handler);
	            setValue(element, accessor());
				return function(){accessor.unsubscribe(handler);}
	        },
	        "@bind.checkbox": function (element, accessor) {
	            var evtHandler = function () {
	                var p = element.parentNode;
	                var vals = [];
	                for (var i = 0, j = p.childNodes.length; i < j; i++) {
	                    var child = p.childNodes[i];
	                    if (child.name === element.name) {
	                        if (child.checked) { vals.push(child.value); }
	                    }
	                }
	                accessor(vals.length === 0 ? null : (vals.length == 1 ? vals[0] : vals));
	            }
	            var setValue = function (element, value) {
	                if (value === null || value === undefined) {
	                    element.checked = false;
	                    element.removeAttribute("checked");
	                    return;
	                }
	                if (oToStr.call(value) === '[object Array]') {
	                    for (var i = 0, j = value.length; i < j; i++) {
	                        if (value[i] === element.value) {
	                            element.checked = true;
	                            element.setAttribute("checked", "checked");
	                        } else {
	                            element.checked = false;
	                            element.removeAttribute("checked");
	                        }
	                    }
	                } else {
	                    if (value == element.value) {
	                        element.checked = true;
	                        element.setAttribute("checked", "checked");
	                    } else {
	                        element.checked = false;
	                        element.removeAttribute("checked");
	                    }
	                }
	            }
				var handler = function (evt) {
	                var value = evt.value;
	                setValue(element, value);
	            };
	            attach(element, "change", evtHandler);
	            attach(element, "blur", evtHandler);
	            attach(element, "click", evtHandler);
	            accessor.subscibe(handler);
	            setValue(element, accessor());
				return function(){accessor.unsubscribe(handler);}
	        },
	        "@bind.text": function (element, accessor, deps, expr) {
				var handler = function (evt) {
	                element.innerHTML = evt.value;
	            }
	            accessor.subscribe(handler);
	            element.innerHTML = accessor();
				return function(){accessor.unsubscribe(handler);}
	        },
	        "@bind.stext": function (element, accessor) {
	            var setValue = function (element, val) {
	                for (var i = 0, j = opts.length; i < j; i++) {
	                    if (val === opts[i].value) {
	                        element.selectedIndex = i; break;
	                    }
	                }
	            }
				var handler = function (evt) {
	                var opts = element.options;
	                setValue(element, evt.value);
	            };
	            accessor.subscibe(handler);
	            setValue(element, accessor());
				return function(){accessor.unsubscribe(handler);}
	        }

	    };

	    var ModelBinder = function ( model,element) {
	        if (model || element) this.init(model,element);
	    }

	    ModelBinder.prototype = {
	        "$type": "yi.bind.ModelBinder",
	        init: function (model, element) {
	            var views = this["@modelBinder.views"] = [];
	            this.model = this["@modelBinder.model"] = model || new Model();
	            if (element) this.bind(element);
	        },
	        bind: function (view) {
	            if (view["@modelBinder.modelBinder"]) throw new Error("Already binded");
	            var views = this["@modelBinder.views"];
	            for (var i = 0, j = views.length; i < j; i++) {
	                if (views[i] == view) throw new Error("Already binded");
	            }
	            view["@modelBinder.modelBinder"] = this;
	            views.push(this.view = view);
	            var model = this["@modelBinder.model"];
	            var binder = this["@modelBinder.binder"];
	            if (!binder) {
	                binder = this["@modelBinder.binder"] = createBinder(view, model);
	            }
	            var unbinds = binder(view, model.accessor);
	            view["@modelBinder.unbind"] = unbinds;
	            return this;
	        },
	        "unbind": function (view) {
	            var views = this["@modelBinder.views"];
	            var hasIt = false;
	            for (var i = 0, j = views.length; i < j; i++) {
	                if (views[i] == view) { hasIt = true; break;}
	            }
	            var unbind = view["@modelBinder.unbind"];
	            unbind();
	            return this;
	        }
	    };
	    var bind = function (element, model) {
	        if (!model) model = new Model();
	        var binder = createBinder(element, model);
	        return binder(element, model.accessor);
	    }
	    bind.createBinder = createBinder;
	    bind.Binders = Binders;
	    bind.ModelBinder = ModelBinder;
	    return bind;
	})(yi,Global, document,yi.Model, otoStr);
})(window, document);