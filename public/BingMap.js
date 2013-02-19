;if (Microsoft.Maps) {
    var BingMap = (function (global) {
        "use strict";
        var doc = document;
        var getElementById = function (id, context) {
            var ele;
            if ('jQuery' in global && context) {
                ele = $("#" + id.replace('#', ''), context)[0];
            } else {
                ele = doc.getElementById(id.replace('#', ''));
            }
            return ele;
        };

        var bingMap = function (options) {
            window.context_menu = {};

            var eventsThatHideContextMenu = ['bounds_changed', 'center_changed', 'click', 'dblclick', 'drag', 'dragend', 'dragstart', 'idle', 'maptypeid_changed', 'projection_changed', 'resize', 'tilesloaded', 'zoom_changed'];
            var eventsThatDoesntHideContextMenu = ['mousemove', 'mouseout', 'mouseover'];


            if (typeof (options.el) === 'string' || typeof (options.div) === 'string') {
                this.el = getElementById(options.el || options.div, options.context);
            } else {
                this.el = options.el || options.div;
            }

            this.el.style.width = options.width || this.el.scrollWidth || this.el.offsetWidth;
            this.el.style.height = options.height || this.el.scrollHeight || this.el.offsetHeight;

            this.controls = [];
            this.pushpins = [];
            this.mapLayers = options.mapLayers || ["a", "auto", "be", "r"];
            this.infoBox = null;
            this.ready = true;
            this.zoom = options.zoom || 15;
            this.zoomRange = options.zoomRange || { min: 1, max: 19 }

            var disableContextMenu = options.disableContextMenu || true;
            disableElementContextMenu(this.el, disableContextMenu);

            var mapType;
            if (options.mapType)
                mapType = window.Microsoft.Maps.MapTypeId[options.mapType.toLowerCase()];
            else
                mapType = window.Microsoft.Maps.MapTypeId['auto'];

            var mapCenter = new window.Microsoft.Maps.Location(options.lat, options.lng);
            delete options.el;
            delete options.lat;
            delete options.lng;
            delete options.mapType;
            delete options.width;
            delete options.height;
            delete options.pushpinClusterer;

            var enableClickableLogo = false || !!options.enableClickableLogo,
                enableSearchLogo = false || !!options.enableSearchLogo,
                showDashboard = false || !!options.showDashboard,
                disablePanning = !!options.disablePanning || false,
                showMapTypeSelector = !!options.showMapTypeSelector || false,
                showScalebar = !!options.showScalebar || false,
                disableKeyboardInput = !!options.disableKeyboardInput || false,
                showCopyright = !!options.showCopyright || false;

            var mapBaseOptions = {
                zoom: this.zoom,
                center: mapCenter,
                mapTypeId: mapType
            };

            var mapControlsOptions = {
                disablePanning: disablePanning,
                enableClickableLogo: enableClickableLogo,
                enableSearchLogo: enableSearchLogo,
                showDashboard: showDashboard,
                showMapTypeSelector: showMapTypeSelector,
                showScalebar: showScalebar,
                disableKeyboardInput: disableKeyboardInput,
                showCopyright: showCopyright
            };

            if (options.beautify) {
                mapBaseOptions = extend_object(mapBaseOptions, mapControlsOptions);
            }

            var mapOptions = extend_object(mapBaseOptions, options);

            for (var i = 0; i < eventsThatHideContextMenu.length; i++) {
                delete mapOptions[eventsThatHideContextMenu[i]];
            }

            for (var j = 0; j < eventsThatDoesntHideContextMenu.length; j++) {
                delete mapOptions[eventsThatDoesntHideContextMenu[j]];
            }

            // Map methods
            this.Center = function (lat, lng, callback) {
                if (typeof lat !== 'undefined' && typeof lng !== 'undefined')
                    this.map.setView({ center: new window.Microsoft.Maps.Location(lat, lng) });
                if (callback) {
                    callback();
                }
                return this.map.getCenter();
            };

            this.Reset = function () {
                this.map.entities.clear();
            };

            this.MapType = function (value) {
                if (value) {
                    this.map.setMapType(value);
                }
                return this.map.getMapTypeId()
            };

            this.MapTypeNext = function () {
                return this.MapType(this.mapLayers[(this.mapLayers.indexOf(this.MapType()) + 1) % this.mapLayers.length])
            };


            this.Zoom = function (value) {
                if (value) {
                    var range = [this.zoomRange.min, this.zoomRange.max, value].sort(function (a, b) { return a - b });
                    this.map.setView({ zoom: range[1] });
                }
                return this.map.getZoom();
            };
            this.ZoomInOut = function (value) {
                this.Zoom(this.Zoom() + value);
            };

            // Pushpins
            this.createPushpin = function (options) {
                if ((options.hasOwnProperty('lat') && options.hasOwnProperty('lng')) || options.position) {
                    var self = this;
                    var baseOptions = {
                        position: new window.Microsoft.Maps.Location(options.lat, options.lng)
                    };

                    delete options.lat;
                    delete options.lng;
                    var pushpinOptions = extend_object(baseOptions, options);
                    var pushpin = new window.Microsoft.Maps.Pushpin(pushpinOptions.position, pushpinOptions);

                    if (options.infoBox) {
                        options.infoBox.visible = !!options.visible || false;
                        pushpin.infoBox = new window.Microsoft.Maps.Infobox(pushpinOptions.position, options.infoBox);

                        var infoBoxEvents = ['closeclick', 'content_changed', 'domready', 'position_changed', 'zindex_changed'];

                        for (var ev = 0; ev < infoBoxEvents.length; ev++) {
                            (function (object, name) {
                                window.Microsoft.Maps.Events.addHandler(object, name, function (e) {
                                    if (options.infoBox[name])
                                        options.infoBox[name].apply(this, [e]);
                                });
                            })(pushpin.infoBox, infoBoxEvents[ev]);
                        }
                    }

                    window.Microsoft.Maps.Events.addHandler(pushpin, 'click', function () {
                        if (options.click) {
                            options.click.apply(this, [this]);
                        }

                        if (pushpin.infoBox) {
                            self.hideInfoWindows();
                            pushpin.infoBox.setOptions({ visible: true });
                        }
                    });

                    return pushpin;
                }
                else {
                    throw 'No latitude or longitude defined';
                }
            };

            this.AddPushpin = function (options) {
                var pushpin;
                if ((options.hasOwnProperty('lat') && options.hasOwnProperty('lng')) || options.position) {
                    pushpin = this.createPushpin(options);
                }
                else {
                    throw 'No latitude or longitude defined';
                }
                this.map.entities.push(pushpin);
                if (pushpin.infoBox) this.map.entities.push(pushpin.infoBox);
                this.pushpins.push(pushpin);
                return pushpin;
            };

            this.AddPushpins = function (array) {
                for (var i = 0, pushpin; pushpin = array[i]; i++) {
                    this.AddPushpin(pushpin);
                }
                return this.pushpins;
            };

            this.hideInfoWindows = function () {
                for (var i = 0, pushpin; pushpin = this.pushpins[i]; i++) {
                    if (pushpin.infoBox) {
                        pushpin.infoBox.setOptions({ visible: false });
                    }
                }
            };

            this.RemovePushpin = function (pushpin) {
                for (var i = 0; i < this.pushpins.length; i++) {
                    if (this.pushpins[i] === pushpin) {
                        this.pushpins.splice(i, 1);
                        this.map.entities.removeAt(this.map.entities.indexOf(pushpin));
                        if (pushpin.infoBox) this.map.entities.removeAt(this.map.entities.indexOf(pushpin.infoBox));
                        break;
                    }
                }
                return pushpin;
            };

            this.RemovePushpins = function (collection) {
                var collection = (collection || this.pushpins);
                for (var i = 0; i < collection.length;) {
                    this.RemovePushpin(collection[i]);
                }
            };

            this.map = new window.Microsoft.Maps.Map(this.el, mapOptions);

            var setupListener = function (object, name) {
                window.Microsoft.Maps.Events.addHandler(object, name, function (e) {
                    if (e == undefined) {
                        e = this;
                    }
                    options[name].apply(this, [e]);
                });
            };
            for (var ev = 0; ev < eventsThatHideContextMenu.length; ev++) {
                var name = eventsThatHideContextMenu[ev];
                if (name in options) {
                    setupListener(this.map, name);
                }
            }

            for (var ev = 0; ev < eventsThatDoesntHideContextMenu.length; ev++) {
                var name = eventsThatDoesntHideContextMenu[ev];
                if (name in options) {
                    setupListener(this.map, name);
                }
            }

            window.Microsoft.Maps.Events.addHandler(this.map, 'rightclick', function (e) {
                if (options.rightclick) {
                    options.rightclick.apply(this, [e]);
                }

                if (window.context_menu['map'] != undefined) {
                    window.buildContextMenu('map', e);
                }
            });
        };
        return bingMap;
    }(this));

    var disableElementContextMenu = function (el, disable) {
        el.oncontextmenu = function () {
            return !disable;
        };
    };
    var coordsToLatLngs = function (coords, useGeoJson) {
        var firstCoord = coords[0];
        var secondCoord = coords[1];

        if (useGeoJson) {
            firstCoord = coords[1];
            secondCoord = coords[0];
        }
        return new window.Microsoft.Maps.Location(firstCoord, secondCoord);
    };

    var arrayToLatLng = function (coords, useGeoJson) {
        for (var i = 0; i < coords.length; i++) {
            if (coords[i].length > 0 && typeof (coords[i][0]) != "number") {
                coords[i] = arrayToLatLng(coords[i], useGeoJson);
            }
            else {
                coords[i] = coordsToLatLngs(coords[i], useGeoJson);
            }
        }

        return coords;
    };

    var extend_object = function (obj, newObj) {
        if (obj === newObj) return obj;
        for (var name in newObj) {
            obj[name] = newObj[name];
        }
        return obj;
    };

    var replace_object = function (obj, replace) {
        if (obj === replace) return obj;

        for (var name in replace) {
            if (obj[name] != undefined)
                obj[name] = replace[name];
        }

        return obj;
    };

    var array_map = function (array, callback) {
        var originalCallbackParams = Array.prototype.slice.call(arguments, 2);

        if (Array.prototype.map && array.map === Array.prototype.map) {
            return Array.prototype.map.call(array, function (item) {
                var callbackParams = originalCallbackParams;
                callbackParams.splice(0, 0, item);

                return callback.apply(this, callbackParams);
            });
        }
        else {
            var arrayReturn = [];
            var arrayLength = array.length;

            for (var i = 0; i < arrayLength; i++) {
                var callbackParams = originalCallbackParams;
                callbackParams = callbackParams.splice(0, 0, array[i]);
                arrayReturn.push(callback.apply(this, callbackParams));
            }
            return arrayReturn;
        }
    };

    var array_flat = function (array) {
        var newArray = [];

        for (var i = 0; i < array.length; i++) {
            newArray = newArray.concat(array[i]);
        }
        return newArray;
    };

}