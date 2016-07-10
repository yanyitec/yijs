(function(Global,document,yi,undefined){
    var createInstance = yi.createInstance, Promise = yi.Promise;
    var camelize = yi.camelize;
    var override = yi.override, defer = yi.defer;
    var attach = yi.attach, detech = yi.detech;
    var noop = yi.noop;
    yi.lang = {};
    var div = document.createElement("div");
    //---获取元素绝对位置-----
    var getPosition;
    if (div.getBoundingClientRect) {
        getPosition = function (elem) {
            var rect = elem.getBoundingClientRect();
            return {
                x: rect.left + (document.body.scrollLeft || document.documentElement.scrollLeft),
                y: rect.top + (document.body.scrollTop || document.documentElement.scrollTop)
            };
        }
    } else {
        getPosition = function (elem) {
            if (elem == document.body || elem == document.documentElement) return { x: 0, y: 0 };
            var x = 0, y = 0;
            while (elem) {
                x += elem.offsetLeft; y += elem.offsetTop;
                elem = elem.offsetParent;
            }
            return { x: x, y: y };
        }
    }
    yi.getPosition = getPosition;
    var isVisible = yi.isVisible = function (elem) {
        while (elem) {
            if (getStyle(elem, "display") == 'none' || getStyle("visibility") == 'hidden') return false;
            elem = elem.parentNode;
        }
        return true;
    }
    setStyle = yi.setStyle = function (elem, style, value) { elem.style[camelize(style)] = value; }
    
    var getStyle = yi.getStyle = function (elem, style) {
        // 主流浏览器
        if (window.getComputedStyle) {
            getStyle = yi.getStyle = function (elem, style) {
                return getComputedStyle(elem, null).getPropertyValue(style);
            };
        } else {
            function getIEOpacity(elem) {
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
            }
            getStyle = yi.getStyle = function (elem, style) {
                // IE 下获取透明度
                if (style == "opacity") {
                    getIEOpacity(elem);
                    // IE687 下获取浮动使用 styleFloat
                } else if (style == "float") {
                    return elem.currentStyle.getAttribute("styleFloat");
                    // 取高宽使用 getBoundingClientRect
                } else if ((style == "width" || style == "height") && (elem.currentStyle[style] == "auto")) {
                    var clientRect = elem.getBoundingClientRect();

                    return (style == "width" ? clientRect.right - clientRect.left : clientRect.bottom - clientRect.top) + "px";
                }
                // 其他样式，无需特殊处理
                return elem.currentStyle.getAttribute(style.camelize());
            };


        }
        return getStyle(elem, style);
    }
    var setOpacity = yi.setOpacity = function (elem, val) {
        val = parseFloat(val);
        elem.style.opacity = val;
        elem.style.filter = "alpha(opacity=" + (val * 100) + ")";
        return elem;
    }
    var uiTimer = yi.Timer.uiTimer = new yi.Timer();
    //动画
    var Animation = yi.Animation = function () {
        this.init = function (opts) {
            this.opts = opts;
            var elem = this.target = opts.target;
            this.min = opts.min || 0;
            this.curr = opts.start || 0;
            this.max = opts.max || 1;
            this.step = opts.step || 0.1;
            var attr = this.attr = opts.attr || "opacity";
            this._attrValue = getStyle(elem, attr);

            return this;
        }
        //播放下一帧，返回false表示播放结束
        this.next = function () {
            var val = this.curr += this.step;
            if (val >= this.max) {
                setStyle(this.target, this.attr, this.max);
                if (this.opts.finish) this.opts.finish.call(this);
                return false;
            } else if (val <= this.min) {
                setStyle(this.target, this.attr, this.min);
                if (this.opts.finish) this.opts.finish.call(this);
                return false;
            } else {
                setStyle(this.target, this.attr, val);
                return true;
            }

        }

        this.play = function () {
            if (this._playFunc) return false;
            setStyle(this.target, this.attr, this.curr);
            this._playFunc = function (waitor) { if (!self.next()) return "%%discard"; }

            var self = this;
            uiTimer.addListener(this._playFunc);
            return this;
        }
        this.isPlaying = function () { return this._playFunc ? true : false; }
        this.stop = function (restore) {
            if (this._playFunc) {
                uiTimer.remove(this._playFunc); this._playFunc = undefined;
                if (restore) { setStyle(this.target, this.attr, this._attrValue); }
            }

        }
    }
    var animationPlay = null;
    var autoAnimation = true;
    var disableAnimation = false;
    
    Animation.disable = function (val) {
        if (val === undefined) return Animation.isDisable;
        if (val === true) {
            playAnimation = Animation.play = noop;
            disableAnimation = true;
        } else {
            playAnimation = Animation.play = animationPlay;
            disableAnimation = false;
        }
        return this;
    }
    Animation.auto = function (val) {
        if (val === undefined) return autoAnimation;
        autoAnimation = val;
        return this;
    }

    
    var playAnimation = animationPlay = Animation.play = function (opts) {
        var animation = opts;
        if (!opts.init || !opts.play) {
            animation = opts.$type ? createInstance(animation.$type) : new Animation();
            animation.init(opts);
        }
        animation.play();
        return animation;
    }
    //show & hide
    var show = yi.show = function (elem, animation) {
        var data = elem["@yi.ui"] || (elem["@yi.ui"] = {});
        var display = data["@visible-css-display"] || getStyle(elem, "display");
        if (display == "none") display = data["@visible-css-display"] = displays[elem.tagName] || "block";
        elem.style.display = display;
        elem.style.visibility = "visible";
        if (disableAnimation || animation ===false || animation ===null || data["@visible-show-animation"]) return;
        
        var hide = data["@visible-hide-animation"];
        if (hide) hide.stop(true);
        if (!animation && !autoAnimation) return;
        if (animation === true || animation===undefined) animation = show.getAnimation(elem);
        else {
            if (!animation.$type) animation.$type = "yi.Animation";
            animation.target = elem;
        }
        data["@visible-show-animation"] = playAnimation(animation);
    }
    show.getAnimation = function (elem) {
        return {
            target: elem,
            min: 0,
            max: getStyle(elem, "opacity"),
            start: 0,
            step: 0.1,
            attr: "opacity",
            $type: "yi.Animation"
        };
    }
    var hide = yi.hide = function (elem, animation) {
        var data = elem["@yi.ui"] || (elem["@yi.ui"] = {});

        if (disableAnimation || animation === false || animation === null)
        {
            elem.style.display = "none";
            return;
        }
        if (data["@visible-hide-animation"]) return;
        var show = data["@visible-show-animation"];
        if (show) show.stop(true);
        if (!animation && !autoAnimation) return;
        if (animation === true || animation===undefined) animation = hide.getAnimation(elem);
        else {
            if (!animation.$type) animation.$type = "yi.Animation";
            animation.target = elem;
        }
        data["@visible-hide-animation"] = playAnimation(animation);
    }
    hide.getAnimation = function (elem) {
        var ret= {
            target: elem,
            max: getStyle(elem, "opacity"),
            min: 0,
            step: -0.04,
            attr: "opacity",
            $type: "yi.Animation"
        };
        ret.start = ret.max;
        return ret;
    };
    var dragBg = document.createElement("div"); dragBg.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;padding:0;margin:0;background-color:#ffffff;opacity:0.005;filter:alpha(opacity=0.5);z-index:999999999;cursor:move;";
    var dragable =yi.dragable = function (elem, evt, opts) {
        evt || (evt = event);
        document.body.appendChild(dragBg);
        var storedPos = getStyle(elem, "position");
        elem.style.position = "absolute";
        var left0 = getStyle(elem, "left"), top0 = getStyle(elem, "top");
        var left = parseInt(left0) || 0;
        var top = parseInt(top0) || 0;
        elem.style.left = left + "px"; elem.style.top = top + "px";
        var x0 = evt.clientX || evt.layerX, y0 = evt.clientY || evt.layerY;
        var offsetX, offsetY;
        var onmove = dragBg.onmousemove = function (evt) {
            evt || (evt = event);
            var x = evt.clientX || evt.layerX, y = evt.clientY || evt.layerY;
            offsetX = x - x0;
            offsetY = y - y0;
            elem.style.left = left + x - x0 + "px";
            elem.style.top = top + y - y0 + "px";
            if (opts.ondrag) opts.ondrag.call(elem, offsetX, offsetY);
        }
        dragBg.onmouseout = dragBg.onmouseup = function (evt) {
            onmove(evt);
            dragBg.parentNode.removeChild(dragBg);
            if (opts.ondrop) opts.ondrop.call(elem, {
                position: storedPos,
                x0: left0, y0: top0,
                offsetX: offsetX, offsetY: offsetY
            });
        }
    }
    // Mask

    var Mask = function () {}//end Mask
    Mask.prototype = {
        init: function (opts) {
            opts = this.opts = override({}, Mask.opts, opts);
            var box = this.element = document.createElement("div"), self = this, zIndex = opts.zIndex || 8999997;
            var yiData = box["@yi.ui"] || (box["@yi.ui"] = {});
            yiData.mask = this;
            box.style.cssText = "top:0;left:0;width:100%;height:100%;z-index:" + zIndex;
            box.className = "yitec-mask";
            box.innerHTML = "<div class='back' style='position:absolute;top:0;left:0;width:100%;height:100%;background-color:" + (opts.backColor || "#666666") + ";opacity:" + (this._opacity = opts.opacity || 0.71) + ";filter:alpha(opacity=" + (this._opacity * 100) + ");z-index:" + (++zIndex) + "'></div><div class='fore' style='position:absolute;z-index:" + (++zIndex) + ";text-align:center;'></div>";
            var bg = this.backElement = box.firstChild, fore = this.foreElement = box.lastChild;

            var target = this.target = opts.target || document;
            var targetYiData = target["@yi.ui"] || (target["@yi.ui"] = {});
            targetYiData.masked = this;
            if (target == document || target == document.documentElement) {
                box.style.position = "fixed";
                this._fixBox = function () {
                    var x = parseInt((box.clientWidth - fore.clientWidth) / 2);
                    var y = parseInt((box.clientHeight - fore.clientHeight) / 2);
                    if (x < 0) x = 0; if (y < 0) y = 0;
                    fore.style.left = x + "px";
                    fore.style.top = y + "px";
                }
            } else {
                box.style.position = "absolute";
                this._fixBox = function () {
                    var apos = getPosition(target);
                    box.style.width = target.clientWidth + "px";
                    box.style.height = target.clientHeight + "px";
                    box.style.left = apos.x + "px"; box.style.top = apos.y + "px";
                    var x = (box.clientWidth - fore.clientWidth) / 2;
                    var y = (box.clientHeight - fore.clientHeight) / 2;
                    if (x < 0) x = 0; if (y < 0) y = 0;
                    fore.style.left = x + "px";
                    fore.style.top = y + "px";
                }
            }
            if (opts.content) this.content(opts.content);
            return this;
        },

        opacity: function (val) {
            if (val === undefined) return this._opacity;
            setStyle(this.backElement, "opacity", this._opacity = val);
            return this;
        },

        setOpts: function (opts) {
            override(this.opts, opts);
            for (var n in opts) {
                var prop = this[n];
                var val = opts[n];
                if (typeof prop === 'function' && val !== undefined) prop.call(this, val);
            }
            return this;
        },


        backColor: function (val) {
            var opts = this.opts;
            if (val === undefined) return this.backElement.style.backgroundColor;
            this.backElement.style.backgroundColor = this._backColor = val;
            return this;
        },

        content: function (content) {
            if (content === null || content === undefined) return this;
            if (typeof content == "string") this.foreElement.innerHTML = content;
            else {
                try {
                    this.foreElement.appendChild(content);
                } catch (ex) {
                    this.foreElement.innerHTML = content;
                }
            }
            return this;
        },


        show: function (animation) {
            var box = this.element;
            if (box.parentNode) return false;

            var opts = this.opts, self = this;
            document.body.appendChild(box);
            this._fixBox();

            if (opts.keepCentre && !opts.dragable) {
                this._resize = uiTimer.addListener(this._fixBox);
            }
            this._visible = true;
            if (disableAnimation || animation===false) return true;
            if (animation || autoAnimation) playAnimation(animation===true|| animation===undefined ? Mask.getShowAnimation(this) : animation);

            return true;
        },
        hide: function (animation) {
            var box = this.element, opts = this.opts, self = this;
            if (!box.parentNode) return false;
            if (this._resize) {
                uiTimer.removeListener(this._fixBox);
            }
            this._visible = false;

            if (disableAnimation || animation===false) {
                box.parentNode.removeChild(box);
            }
            if (autoAnimation || animation) { 
                playAnimation(animation === true || animation===undefined ? Mask.getHideAnimation(this) : animation);
            } else {
                box.parentNode.removeChild(box);
            }

            return true;

        }
    };
    Mask.opts = { opacity: 0.5, keepCentre: true, backColor: "#666666" };
    Mask.getShowAnimation = function (mask) {
        var elem = mask.backElement;
        return new Animation().init({
            min: 0.1,
            start:0.1,
            max: mask.opts.opacity || 0.5,
            step: 0.025,
            target: elem
        });
    }
    Mask.getHideAnimation = function (mask) {
        var elem = mask.backElement;
        return new Animation().init({
            max: mask.opts.opacity || 0.5,
            start: mask.opts.opacity || 0.5,
            min: 0,
            step: -0.05,
            target: elem,
            finish: function () {
                mask.element.parentNode.removeChild(mask.element);
            }
        });
    }
    yi.mask = function (target, opts) {
        if (opts === undefined) {
            opts = target;
            if (opts === undefined) opts = extend({}, Mask.opts);
        }
        var target = opts.target || (opts.target = document.documentElement);
        var data = target["@yi.ui"] || (target["@yi.ui"] = {});
        var mask = data.masked;
        if (mask) mask.setOpts(opts || {});
        else mask = new Mask().init(opts || {});
        mask.show(opts.showAnimation);
        return mask;
    }
    yi.unmask = function (target) {
        var data = target["@yi.ui"] || (target["@yi.ui"] = {});;
        var mask = data.masked;
        if (mask) mask.hide(mask.opts.hideAnimation);
        return mask;
    }


    var Modal = function () {
        this.init({});
        this.foreElement.innerHTML = "<div class='content'></div><div class='queue' style='display:none;'></div>";
        var fore = this.foreElement;
        var con = fore.firstChild, queue = fore.lastChild;
        var seed = 0;
        this.addItem = function (item) {
            item._yitecId = seed++; if (seed > 210000000) seed = 0;
            var elem = item.element;
            var data = elem["@yi.ui"] || (elem["@yi.ui"] = {});
            data.modalBox = item;
            if (con.childNodes.length == 0) {
                item._visible = true;
                con.appendChild(item.element);
                var c = item.opts.content; item.opts.content = null;
                this.setOpts(item.opts);
                item.opts.content = c;
                this.show();
            } else {
                queue.appendChild(item.element);
                item._visible = false;
                fore.className = "fore lineUp";
            }
            return this;
        }
        this.removeItem = function (item) {
            var elem = item.element;
            if (!elem || !elem.parentNode) return false;

            if (elem.parentNode == queue) {
                item._visible = item._disposed = false;
                elem.parentNode.removeChild(elem);
                item._visible = false; item._disposed = true;
            } else if (elem.parentNode == con) {
                con.removeChild(elem);
                var nextElem = queue.firstChild;
                if (nextElem) {
                    var nextItem = nextElem["@yi.ui"].modalBox;
                    nextItem._visible = true;
                    var c = nextItem.opts.content; nextItem.opts.content = null;
                    this.setOpts(nextItem.opts);
                    nextItem.opts.content = c;
                    con.appendChild(nextElem);
                    this.show();
                }
            }
            else return false;

            if (queue.childNodes.length == 0 && con.childNodes.length==0) {
                //fore.className = "fore";
                this.hide();
            }
            return true;
        }
    }
    Modal.prototype = new Mask();
    var modal = new Modal();

    var ModalBox = yi.ModalBox = function () {
        this.open = function () {
            if (this._disposed) return false;
            modal.addItem(this); return true;
        }
        this.close = function () {
            if (this._disposed) return false;
            return modal.removeItem(this);
        }
        this.isVisible = function () { return this._visible; }
        this.isDisposed = function () { return this._disposed; }
    }

    yi.waitingIcon = "images/waiting.gif";
    var WaitingBox = yi.WaitingBox = function (opts) {
        this.opts = opts; opts.keepCentre = true;
        var box = this.element = document.createElement("div");
        box.className = "waitingBox";
        var waitingIcon = opts.icon || yi.waitingIcon;
        box.innerHTML = (waitingIcon?"<img src='" + waitingIcon + "' />":"") + "<div class='content'>" + opts.content + "</div>";
    }
    var modalBox = WaitingBox.prototype = new ModalBox();


    var MessageBox = yi.MessageBox = function (opts) {
        this.init = function (opts) {
            this.opts = opts;
            if (opts.animation === undefined) { opts.animation = false; opts.opacity = 0.001; }
            if (opts.keepCentre === undefined) opts.keepCentre = true;

            var self = this;
            var box = this.element = document.createElement("div");
            if (opts.className) box.className = "messageBox " + opts.className; else box.className = "messageBox";
            var html = "<div class='messageBox-caption'>" + (opts.caption || "") + "</div><div class='messageBox-main'>";
            html += opts.icon ? "<img src='" + (opts.icon) + "' class='messageBox-icon' />" : "";
            html += "<span class='messageBox-text'>" + (opts.text || "") + "</span>";
            html += "</div><div class='messageBox-buttons'>";
            var btns = opts.btns;
            var btnCount = 0;
            if (btns) for (var key in btns) {
                html += "<input type='button' class='" + key + "' value=\"" + btns[key] + "\" />"; btnCount++;
            }
            if (btnCount == 0) html += "<input type='button' class='close' value=\"" + (yi.lang.close || "Close") + "\" />";
            html += "</div>";
            box.innerHTML = html;
            var caption = box.firstChild;
            if (!opts.keepCentre) {
                attach(caption, "mousedown", function (evt) {
                    dragable(box, evt, {});
                });
            }

            if (opts.callback || this._defer) {
                var btnDiv = box.lastChild;
                for (var i = 0, j = btnDiv.childNodes.length; i < j; i++) {
                    var btn = btnDiv.childNodes[i];
                    btn.onclick = function () {
                        self.close();
                        if (opts.callback) opts.callback.call(self, this.className, this);
                        if (self._defer) self._defer.resolve(this.className);
                    }
                }
            }
            this.init = yi.invalid;
            return this;
        }
        if (opts) this.init(opts);

    }
    MessageBox.prototype = new ModalBox();
    yi.messageBox = function (opts) {
        var dfd = new Promise();
        var msgBox = new MessageBox();
        msgBox._defer = dfd;
        msgBox.init(opts).open();
        return dfd;
    }
    yi.area = (function (document,yi) {
        var controllers = {};
        var require = yi.require,Promise = yi.Promise, ajax = yi.ajax, resolveUrl = yi.resolveUrl, cloneNode = yi.cloneNode;
        var getArea = function (area, id, cx) {
            var dfd = new Promise();
            var data = area["@yi.ui"] || (area["@yi.ui"] = {});
            if (data.controller && data.controller.dispose) {
                data.controller.dispose(data["@controller.unbind"]);
            }
            load(id).done(function (info) {
                var ctor = info.constructor;
                var controller;
                try {
                    var element = cloneNode(info.element);
                    var model = info.model.clone();
                    controller = new ctor(model, element, cx);
                    data["@controller.unbind"] = info.bind(element, model);
                    area.innerHTML = "";
                    for (var i = 0, j = element.childNodes.length; i < j; i++) {
                        area.appendChild(element.firstChild);
                    }
                    
                    if (controller.onComponentComplete) controller.onComponentComplete(model, area);
                    data.controller = controller;
                    dfd.resolve(controller);
                } catch (ex) {
                    if (controller && controller.onError) controller.onError(ex);
                    dfd.reject({
                        "error": "controller",
                        ex: ex,
                        area: area,
                        controllerId: id,
                        context:cx
                    });
                }
                
            });
            return dfd;
        }
        
        var load = getArea.load = function (id) {
            var dfd = new Promise();
            var ctrlr = controllers[id], html;
            if (ctrlr) {
                dfd.resolve(ctrlr); return dfd;
            }
            var uri = resolveUrl(id, true);
            require([id]).done(function (c) {
                if (html !== undefined) controllers[id] = create(html, c);
                else ctrlr = ctrlr;
            });
            ajax({
                url:uri.url + ".html"
            }).done(function (t) {
                if (ctrlr) controllers[id] = create(t, c);
                else html = t;
            });
        }
        var create = getArea.create = function (html, constructor) {
            var element = document.createElement("div");
            element.innerHTML = html;
            var binder = createBinder(element, constructor.model);
            var info = {
                "@controller.binder": binder,
                "@controller.element": element,
                constructor : constructor
            };
            constructor.prototype = info;
            return info;

        }
    })(document,yi);
})(yi.Global,document,yi);