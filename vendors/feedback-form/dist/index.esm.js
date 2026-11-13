import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import * as React from 'react';
import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { v4 } from 'uuid';
import axios from 'axios';
import cn from 'classnames';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */
var extendStatics = function (d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) {
            for (var p in b)
                if (Object.prototype.hasOwnProperty.call(b, p))
                    d[p] = b[p];
        };
    return extendStatics(d, b);
};
function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign = function () {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
                if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
function __rest(s, e) {
    var t = {};
    for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}
function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) {
            try {
                step(generator.next(value));
            }
            catch (e) {
                reject(e);
            }
        }
        function rejected(value) {
            try {
                step(generator["throw"](value));
            }
            catch (e) {
                reject(e);
            }
        }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}
function __generator(thisArg, body) {
    var _ = { label: 0, sent: function () {
            if (t[0] & 1)
                throw t[1];
            return t[1];
        }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f)
            throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _)
            try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                    return t;
                if (y = 0, t)
                    op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0:
                    case 1:
                        t = op;
                        break;
                    case 4:
                        _.label++;
                        return { value: op[1], done: false };
                    case 5:
                        _.label++;
                        y = op[1];
                        op = [0];
                        continue;
                    case 7:
                        op = _.ops.pop();
                        _.trys.pop();
                        continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                            _ = 0;
                            continue;
                        }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                            _.label = op[1];
                            break;
                        }
                        if (op[0] === 6 && _.label < t[1]) {
                            _.label = t[1];
                            t = op;
                            break;
                        }
                        if (t && _.label < t[2]) {
                            _.label = t[2];
                            _.ops.push(op);
                            break;
                        }
                        if (t[2])
                            _.ops.pop();
                        _.trys.pop();
                        continue;
                }
                op = body.call(thisArg, _);
            }
            catch (e) {
                op = [6, e];
                y = 0;
            }
            finally {
                f = t = 0;
            }
        if (op[0] & 5)
            throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var BaseAPI = /** @class */ (function () {
    function BaseAPI(endpoint) {
        this.baseUrl = '/';
        this.apiVersion = 1;
        this.errorHandlers = [];
        this.endpoint = endpoint;
        this.prefix = this.getPrefix();
        this.httpService = axios.create({
            baseURL: this.baseUrl + this.prefix,
            timeout: 15000,
        });
    }
    BaseAPI.prototype.createHeaders = function () {
        var headers = {};
        return headers;
    };
    BaseAPI.prototype.getPrefix = function () {
        return this.apiVersion ? "/api/v".concat(this.apiVersion) : '';
    };
    BaseAPI.prototype.configure = function (_a) {
        var baseUrl = _a.baseUrl, apiVersion = _a.apiVersion;
        this.baseUrl = baseUrl;
        this.apiVersion = apiVersion;
        this.httpService = axios.create({
            baseURL: this.baseUrl + this.prefix,
            timeout: 15000,
        });
        this.httpService.interceptors.request.use(function (config) {
            if (!config.url || !config.urlParams) {
                return config;
            }
            var currentUrl = config.url;
            Object.entries(config.urlParams).forEach(function (_a) {
                var key = _a[0], value = _a[1];
                currentUrl = currentUrl.replace(":".concat(key), encodeURIComponent(value));
            });
            return __assign(__assign({}, config), { url: currentUrl });
        });
    };
    BaseAPI.prototype.addErrorHandler = function (handler) {
        var _this = this;
        this.errorHandlers.push(handler);
        return function () {
            _this.errorHandlers = _this.errorHandlers.filter(function (_handler) { return _handler !== handler; });
        };
    };
    BaseAPI.prototype._invokeErrorHandlers = function (error) {
        return Promise.all(this.errorHandlers.map(function (handler) { return handler(error); })).then(function () {
            return Promise.resolve(error);
        });
    };
    BaseAPI.prototype.getCompositeURL = function (postfix) {
        var fragments = [this.endpoint];
        if (postfix) {
            fragments.push(postfix);
        }
        return fragments.join('/').replace(/\/\//g, '/');
    };
    BaseAPI.prototype.get = function (postfix, params) {
        return __awaiter(this, void 0, void 0, function () {
            var url, _a, data, status_1, e_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 4]);
                        url = this.getCompositeURL(postfix);
                        return [4 /*yield*/, this.httpService.get(url, __assign(__assign({}, params), { headers: this.createHeaders() }))];
                    case 1:
                        _a = _b.sent(), data = _a.data, status_1 = _a.status;
                        return [2 /*return*/, { data: data, status: status_1 }];
                    case 2:
                        e_1 = _b.sent();
                        return [4 /*yield*/, this._invokeErrorHandlers(e_1)];
                    case 3:
                        _b.sent();
                        throw e_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BaseAPI.prototype.post = function (postfix, payload, params) {
        return __awaiter(this, void 0, void 0, function () {
            var url, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        url = this.getCompositeURL(postfix);
                        return [4 /*yield*/, this.httpService.post(url, payload, __assign(__assign({}, params), { headers: this.createHeaders() }))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        e_2 = _a.sent();
                        return [4 /*yield*/, this._invokeErrorHandlers(e_2)];
                    case 3:
                        _a.sent();
                        throw e_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BaseAPI.prototype.put = function (postfix, payload, params) {
        return __awaiter(this, void 0, void 0, function () {
            var url, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        url = this.getCompositeURL(postfix);
                        return [4 /*yield*/, this.httpService.put(url, payload, __assign(__assign({}, params), { headers: this.createHeaders() }))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        e_3 = _a.sent();
                        return [4 /*yield*/, this._invokeErrorHandlers(e_3)];
                    case 3:
                        _a.sent();
                        throw e_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BaseAPI.prototype.patch = function (postfix, payload, params) {
        return __awaiter(this, void 0, void 0, function () {
            var url, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        url = this.getCompositeURL(postfix);
                        return [4 /*yield*/, this.httpService.patch(url, payload, __assign(__assign({}, params), { headers: this.createHeaders() }))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        e_4 = _a.sent();
                        return [4 /*yield*/, this._invokeErrorHandlers(e_4)];
                    case 3:
                        _a.sent();
                        throw e_4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BaseAPI.prototype.delete = function (postfix, params) {
        return __awaiter(this, void 0, void 0, function () {
            var url, e_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 4]);
                        url = this.getCompositeURL(postfix);
                        return [4 /*yield*/, this.httpService.delete(url, __assign(__assign({}, params), { headers: this.createHeaders() }))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        e_5 = _a.sent();
                        return [4 /*yield*/, this._invokeErrorHandlers(e_5)];
                    case 3:
                        _a.sent();
                        throw e_5;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return BaseAPI;
}());

var ProjectsAPI = /** @class */ (function (_super) {
    __extends(ProjectsAPI, _super);
    function ProjectsAPI(projectName) {
        var _this = _super.call(this, 'projects') || this;
        _this.projectName = projectName;
        return _this;
    }
    ProjectsAPI.prototype.getFormsList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.get('/:projectName/forms', {
                            urlParams: { projectName: this.projectName },
                        })];
                    case 1:
                        data = (_a.sent()).data;
                        return [2 /*return*/, data];
                }
            });
        });
    };
    ProjectsAPI.prototype.submitAnswer = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.post('/:projectName/answers', payload, {
                            urlParams: { projectName: this.projectName },
                        })];
                    case 1:
                        data = (_a.sent()).data;
                        return [2 /*return*/, data];
                }
            });
        });
    };
    return ProjectsAPI;
}(BaseAPI));

var FormStepType;
(function (FormStepType) {
    FormStepType["feedback"] = "feedback";
    FormStepType["rate"] = "rate";
    FormStepType["congrat"] = "congrat";
    FormStepType["multianswers"] = "multianswers";
})(FormStepType || (FormStepType = {}));

function styleInject(css, ref) {
    if (ref === void 0)
        ref = {};
    var insertAt = ref.insertAt;
    if (!css || typeof document === 'undefined') {
        return;
    }
    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';
    if (insertAt === 'top') {
        if (head.firstChild) {
            head.insertBefore(style, head.firstChild);
        }
        else {
            head.appendChild(style);
        }
    }
    else {
        head.appendChild(style);
    }
    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    }
    else {
        style.appendChild(document.createTextNode(css));
    }
}

var css_248z$a = ".Completed-module_completed__d8Ldm {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  height: 316px;\n}\n\n.Completed-module_completedTitle__XrMQm {\n  font-weight: 700;\n  font-size: 24px;\n  line-height: 32px;\n}\n\n.Completed-module_completedDescription__scVZW {\n  font-weight: 400;\n  font-size: 20px;\n  line-height: 32px;\n  margin-top: 7px;\n}\n\n.Completed-module_completedIcon__es4k9 {\n  min-width: 120px;\n  height: 227px;\n  width: 210px;\n  margin-bottom: 25px;\n}\n\n.Completed-module_completedPicture__XDLi1 {\n  width: 295px;\n  height: auto;\n  margin-bottom: 5%;\n}\n\n@media (max-width: 899px) {\n  .Completed-module_completed__d8Ldm {\n    padding: 0;\n    height: auto;\n  }\n  .Completed-module_completedIcon__es4k9 {\n    height: 145px;\n    width: 134px;\n    margin-bottom: 16px;\n  }\n  .Completed-module_completedTitle__XrMQm {\n    font-size: 18px;\n    line-height: 28px;\n  }\n  .Completed-module_completedDescription__scVZW {\n    font-size: 16px;\n    line-height: 24px;\n  }\n}\n@media (min-width: 900px) and (max-width: 1023px) {\n  .Completed-module_completed__d8Ldm {\n    padding: 0;\n    height: auto;\n  }\n  .Completed-module_completedTitle__XrMQm {\n    font-size: 22px;\n    line-height: 32px;\n  }\n  .Completed-module_completedDescription__scVZW {\n    font-size: 20px;\n    line-height: 28px;\n  }\n}\n@media (max-height: 252px) {\n  .Completed-module_completed__d8Ldm {\n    height: auto;\n  }\n  .Completed-module_completedIcon__es4k9 {\n    height: 50vh;\n  }\n}";
var styles$a = {"completed":"Completed-module_completed__d8Ldm","completedTitle":"Completed-module_completedTitle__XrMQm","completedDescription":"Completed-module_completedDescription__scVZW","completedIcon":"Completed-module_completedIcon__es4k9","completedPicture":"Completed-module_completedPicture__XDLi1"};
styleInject(css_248z$a);

function Congrat(_a) {
    var _b = _a.payload, image = _b.image, title = _b.title, onTimeout = _a.onTimeout;
    useEffect(function () {
        var timeout = setTimeout(onTimeout, 2000);
        return function () { return clearTimeout(timeout); };
    }, [onTimeout]);
    return (jsxs("div", __assign({ className: styles$a.completed }, { children: [jsx("img", { className: styles$a.completedPicture, src: image, alt: "\u0424\u0438\u043D\u0430\u043B \u0444\u043E\u0440\u043C\u044B" }), jsx("div", __assign({ className: styles$a.completedTitle }, { children: title }))] })));
}

var css_248z$9 = ".Button-module_button__18Bed {\n  min-width: 202px;\n  max-width: 100%;\n  height: 60px;\n  border: none;\n  border-radius: 16px;\n  background: #fd6373;\n  color: #ffffff;\n  font-weight: 700;\n  font-size: 24px;\n  line-height: 32px;\n  cursor: pointer;\n}\n.Button-module_button__18Bed:disabled {\n  background: rgba(255, 125, 139, 0.24);\n  border-radius: 16px;\n  cursor: auto;\n}\n.Button-module_button__18Bed:hover {\n  opacity: 0.9;\n}\n\n@media (max-width: 899px) {\n  .Button-module_button__18Bed {\n    width: 272px;\n    font-size: 20px;\n    line-height: 32px;\n  }\n}\n@media (min-width: 900px) and (max-width: 1023px) {\n  .Button-module_button__18Bed {\n    width: 336px;\n    font-size: 24px;\n    line-height: 40px;\n  }\n}\n@media (max-height: 252px) {\n  .Button-module_button__18Bed {\n    width: 88px;\n    height: 31px;\n    padding: 6px 18px 9px;\n    font-size: 13px;\n    font-style: normal;\n    font-weight: 800;\n    line-height: normal;\n  }\n}";
var styles$9 = {"button":"Button-module_button__18Bed"};
styleInject(css_248z$9);

function Button(_a) {
    var children = _a.children, className = _a.className, props = __rest(_a, ["children", "className"]);
    return (jsx("button", __assign({ className: cn(styles$9.button, className) }, props, { children: children })));
}

var useAudioPlayer = function (tracks) {
    var currentSound = useRef(null);
    var sounds = useMemo(function () {
        return Object.entries(tracks).reduce(function (acc, _a) {
            var audioKey = _a[0], url = _a[1];
            acc[audioKey] = new Audio(url);
            return acc;
        }, {});
    }, [tracks]);
    var play = function (trackKey) {
        stop();
        var sound = sounds[trackKey];
        if (sound) {
            currentSound.current = sound;
            currentSound.current.play().catch(function (err) {
                // eslint-disable-next-line no-console
                console.error(err);
            });
        }
    };
    var stop = function () {
        var _a;
        if (currentSound.current) {
            currentSound.current.pause();
            if ((_a = currentSound.current) === null || _a === void 0 ? void 0 : _a.currentTime) {
                currentSound.current.currentTime = 0;
            }
        }
    };
    return {
        play: play,
        stop: stop,
    };
};

var _g$1;

function _extends$4() { _extends$4 = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends$4.apply(this, arguments); }

const SvgSpeaker = props => /*#__PURE__*/React.createElement("svg", _extends$4({
  width: 38,
  height: 38,
  viewBox: "0 0 38 38",
  fill: "#93bcec",
  xmlns: "http://www.w3.org/2000/svg"
}, props), _g$1 || (_g$1 = /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
  d: "M19.8902 28C19.626 28 19.4146 27.8907 19.2032 27.7815L13 22H10C9 22 9 21 9 21V17C9 17 9 16 10 16H13L19.2032 10.2559C19.5203 9.98296 19.9959 9.92833 20.3658 10.0921C20.7358 10.2559 21 10.6926 21 11.1294V26.8534C21 27.2902 20.7358 27.6724 20.3658 27.8908C20.2073 27.9454 20.0488 28 19.8902 28Z"
}), /*#__PURE__*/React.createElement("path", {
  d: "M25.2708 24.4816C25.0426 24.4816 24.7384 24.4127 24.5103 24.2745C23.9019 23.9291 23.6737 23.1693 24.13 22.5476C26.6397 18.9557 24.13 15.4328 24.13 15.4328C23.7498 14.8802 23.9019 14.1204 24.5103 13.7059C25.1187 13.3605 25.9552 13.4987 26.4115 14.0513C26.5636 14.2585 29.9098 18.9556 26.4115 23.86C26.1073 24.2744 25.651 24.4816 25.2708 24.4816Z"
}))));

var css_248z$8 = ".styles-module_audioTextItem__ugiHA {\n  border-radius: 20px;\n  padding: 12px 15px 12px 10px;\n  display: flex;\n  flex-basis: 42%;\n  flex-grow: 1;\n  align-items: center;\n  background-color: #e5eeff;\n  user-select: none;\n  color: #283566;\n  outline: none;\n  min-height: 32px;\n}\n.styles-module_audioTextItem__ugiHA:hover {\n  background-color: #d2e2ff;\n}\n\n.styles-module_speakerBox__7lmkH {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  pointer-events: auto;\n  -webkit-tap-highlight-color: transparent;\n}\n\n.styles-module_speakerBox__7lmkH > svg {\n  cursor: pointer;\n  width: 38px;\n  height: 38px;\n}\n\n.styles-module_checked__nr-w9 {\n  background-color: #b0c2ff;\n  cursor: pointer;\n}\n.styles-module_checked__nr-w9:hover {\n  background-color: #95aaf4;\n}\n.styles-module_checked__nr-w9 svg {\n  fill: #fff;\n}\n\n.styles-module_text__gEOxm {\n  display: flex;\n  height: 100%;\n  flex: 1;\n  justify-content: start;\n  align-items: center;\n  cursor: pointer;\n}\n\n@media (min-width: 900px) and (max-width: 1023px) {\n  .styles-module_audioTextItem__ugiHA {\n    width: 100%;\n    padding: 10px 13px 10px 7px;\n  }\n}\n@media (max-height: 252px) {\n  .styles-module_audioTextItem__ugiHA {\n    padding: 3px 13px 3px 7px;\n    min-height: unset;\n  }\n}";
var styles$8 = {"audioTextItem":"styles-module_audioTextItem__ugiHA","speakerBox":"styles-module_speakerBox__7lmkH","checked":"styles-module_checked__nr-w9","text":"styles-module_text__gEOxm"};
styleInject(css_248z$8);

var AudioTextItem = function (_a) {
    var text = _a.text, onPlay = _a.onPlay, checked = _a.checked, onCheck = _a.onCheck;
    return (jsxs("div", __assign({ className: cn(styles$8.audioTextItem, checked ? styles$8.checked : '') }, { children: [jsx("div", __assign({ className: styles$8.speakerBox }, { children: jsx(SvgSpeaker, { onClick: onPlay }) })), jsx("div", __assign({ className: styles$8.text, onClick: onCheck && (function () { return onCheck(); }) }, { children: text }))] })));
};

var css_248z$7 = ".styles-module_answerList__gNKqc {\n  display: flex;\n  flex-direction: row;\n  flex-wrap: wrap;\n  gap: 20px;\n  font-size: 20px;\n  font-weight: 400;\n  line-height: normal;\n  text-align: start;\n}\n\n@media (min-width: 900px) and (max-width: 1023px) {\n  .styles-module_answerList__gNKqc {\n    gap: 10px;\n    font-size: 16px;\n    font-style: normal;\n    font-weight: 400;\n    line-height: 120%;\n  }\n}\n@media (max-width: 899px) {\n  .styles-module_answerList__gNKqc {\n    gap: 15px;\n    flex-direction: column;\n    font-size: 16px;\n    font-style: normal;\n    font-weight: 400;\n    line-height: 120%;\n  }\n}\n@media (max-height: 252px) {\n  .styles-module_answerList__gNKqc {\n    flex-wrap: nowrap;\n  }\n}";
var styles$7 = {"answerList":"styles-module_answerList__gNKqc"};
styleInject(css_248z$7);

var AnswerList = function (_a) {
    var answers = _a.answers, playSound = _a.playSound, selectedAnswers = _a.selectedAnswers, onCheck = _a.onCheck;
    return (jsx("div", __assign({ className: styles$7.answerList }, { children: answers.map(function (answer, index) { return (jsx(AudioTextItem, { checked: selectedAnswers.has(index), text: answer.text, onPlay: function () { return playSound(index); }, onCheck: function () { return onCheck(index); } }, index)); }) })));
};

var css_248z$6 = ".styles-module_multianswerFeedback__TfqTF {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  max-width: 100vw;\n  margin: 0 70px;\n}\n\n.styles-module_feedbackHeading__Sw0ix {\n  display: inline-flex;\n  text-align: center;\n  font-weight: 700;\n  font-size: 24px;\n  line-height: 28px;\n  margin-bottom: 25px;\n}\n.styles-module_feedbackHeading__Sw0ix div {\n  padding: 0;\n  cursor: default;\n  background-color: transparent;\n}\n.styles-module_feedbackHeading__Sw0ix div:hover {\n  background-color: transparent;\n}\n\n.styles-module_feedbackRating__Znu4h {\n  margin-top: 51px;\n}\n\n.styles-module_feedbackButton__VR6oZ {\n  margin-top: 30px;\n}\n\n@media (max-width: 899px) {\n  .styles-module_multianswerFeedback__TfqTF {\n    padding: 24px;\n    margin: 0 10px;\n  }\n  .styles-module_feedbackHeading__Sw0ix {\n    font-size: 18px;\n    line-height: 25px;\n  }\n  .styles-module_feedbackRating__Znu4h {\n    margin-top: 62px;\n  }\n}\n@media (max-width: 899px) and (orientation: landscape) {\n  .styles-module_feedbackRating__Znu4h {\n    margin-top: 22px;\n  }\n  .styles-module_feedbackButton__VR6oZ {\n    margin-top: 37px;\n  }\n}\n@media (min-width: 900px) and (max-width: 1023px) {\n  .styles-module_multianswerFeedback__TfqTF {\n    padding: 30px;\n  }\n  .styles-module_feedbackHeading__Sw0ix {\n    font-size: 18px;\n    font-style: normal;\n    font-weight: 700;\n    line-height: 130%;\n  }\n  .styles-module_feedbackRating__Znu4h {\n    margin-top: 77px;\n  }\n}\n@media (max-height: 252px) {\n  .styles-module_multianswerFeedback__TfqTF {\n    overflow: auto;\n  }\n}";
var styles$6 = {"multianswerFeedback":"styles-module_multianswerFeedback__TfqTF","feedbackHeading":"styles-module_feedbackHeading__Sw0ix","feedbackRating":"styles-module_feedbackRating__Znu4h","feedbackButton":"styles-module_feedbackButton__VR6oZ"};
styleInject(css_248z$6);

function MultianswerFeedback(_a) {
    var _b = _a.payload, question = _b.question, answers = _b.answers, isLast = _a.isLast, onAnswer = _a.onAnswer;
    var _c = useState(new Set()), selectedAnswers = _c[0], setSelectedAnswers = _c[1];
    var tracks = useMemo(function () {
        return __assign(__assign({}, answers.map(function (answer) { return answer.audio; })), { question: question.audio }); // wrong spread type resolving
    }, [question, answers]);
    var _d = useAudioPlayer(tracks), play = _d.play, stop = _d.stop;
    var handleAnswer = useCallback(function () {
        stop();
        var answersArr = [];
        selectedAnswers.forEach(function (answerIndex) {
            var answer = answers[answerIndex];
            if (answer) {
                answersArr.push(answer.text);
            }
        });
        onAnswer(JSON.stringify(answersArr));
    }, [onAnswer, selectedAnswers]);
    var addAnswer = function (index) {
        setSelectedAnswers(function (prev) { return new Set(prev).add(index); });
    };
    var removeAnswer = function (index) {
        setSelectedAnswers(function (prev) {
            var next = new Set(prev);
            next.delete(index);
            return next;
        });
    };
    var check = function (index) {
        if (selectedAnswers.has(index)) {
            removeAnswer(index);
            return;
        }
        addAnswer(index);
    };
    return (jsxs("div", __assign({ className: styles$6.multianswerFeedback }, { children: [jsx("div", __assign({ className: styles$6.feedbackHeading }, { children: jsx(AudioTextItem, { text: question.text, onPlay: function () { return play('question'); } }) })), jsx(AnswerList, { answers: answers, selectedAnswers: selectedAnswers, playSound: function (index) { return play(index); }, onCheck: check }), jsx(Button, __assign({ className: styles$6.feedbackButton, disabled: selectedAnswers.size === 0, onClick: handleAnswer }, { children: isLast ? 'Отправить' : 'Дальше' }))] })));
}

var _path$2, _path2, _path3, _path4;

function _extends$3() { _extends$3 = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends$3.apply(this, arguments); }

const SvgStarActive = props => /*#__PURE__*/React.createElement("svg", _extends$3({
  width: 68,
  height: 64,
  viewBox: "0 0 68 64",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
}, props), _path$2 || (_path$2 = /*#__PURE__*/React.createElement("path", {
  d: "M38.8565 2.98844L45.4379 16.071C45.7405 16.6727 46.1894 17.1919 46.7448 17.5827C47.3002 17.9736 47.9451 18.2242 48.6225 18.3123L63.3245 20.3971C64.3328 20.5403 65.28 20.9578 66.0591 21.6023C66.8382 22.2469 67.418 23.0927 67.7329 24.0441C68.0477 24.9956 68.085 26.0145 67.8406 26.9857C67.5962 27.9569 67.0798 28.8415 66.3499 29.5393L55.7347 39.7239C55.2517 40.1867 54.8903 40.7575 54.6814 41.3875C54.4725 42.0176 54.4223 42.6879 54.5351 43.3412L57.0509 57.7268C57.2237 58.7126 57.112 59.7263 56.7285 60.653C56.345 61.5797 55.7049 62.3825 54.8809 62.9704C54.0568 63.5584 53.0815 63.9081 52.0655 63.9799C51.0495 64.0517 50.0333 63.8428 49.132 63.3768L35.9054 56.601C35.3046 56.2974 34.6386 56.139 33.9628 56.139C33.2871 56.139 32.6211 56.2974 32.0203 56.601L18.8786 63.3873C17.5947 64.0476 16.0964 64.1802 14.713 63.756C13.3295 63.3318 12.1743 62.3855 11.501 61.1252C10.9401 60.087 10.7459 58.8954 10.9491 57.7372L13.4649 43.3516C13.5805 42.6983 13.5316 42.0272 13.3225 41.3967C13.1134 40.7662 12.7505 40.1955 12.2653 39.7344L1.65013 29.5497C0.920202 28.8519 0.403798 27.9673 0.159377 26.9961C-0.0850437 26.025 -0.047719 25.006 0.267126 24.0546C0.581971 23.1031 1.16176 22.2573 1.94086 21.6127C2.71995 20.9682 3.66723 20.5507 4.67546 20.4076L19.3775 18.3227C20.0526 18.2277 20.6945 17.9745 21.2488 17.5843C21.8031 17.1942 22.2536 16.6787 22.5621 16.0815L29.0692 2.98844C29.5196 2.09146 30.2167 1.33618 31.0815 0.80804C31.9463 0.279903 32.9444 0 33.9628 0C34.9813 0 35.9793 0.279903 36.8442 0.80804C37.709 1.33618 38.4061 2.09146 38.8565 2.98844Z",
  fill: "#FFD339"
})), _path2 || (_path2 = /*#__PURE__*/React.createElement("path", {
  d: "M28.9574 15.646L26.1221 21.8482",
  stroke: "#FFE471",
  strokeWidth: 3.6692,
  strokeMiterlimit: 10,
  strokeLinecap: "round"
})), _path3 || (_path3 = /*#__PURE__*/React.createElement("path", {
  d: "M32.2411 7.98438L30.9902 10.7988",
  stroke: "#FFE471",
  strokeWidth: 3.6692,
  strokeMiterlimit: 10,
  strokeLinecap: "round"
})), _path4 || (_path4 = /*#__PURE__*/React.createElement("path", {
  d: "M51.0356 53.9329L51.5047 56.9766",
  stroke: "#FFE471",
  strokeWidth: 3.6692,
  strokeMiterlimit: 10,
  strokeLinecap: "round"
})));

var _path$1;

function _extends$2() { _extends$2 = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends$2.apply(this, arguments); }

const SvgStar = props => /*#__PURE__*/React.createElement("svg", _extends$2({
  width: 68,
  height: 64,
  viewBox: "0 0 68 64",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
}, props), _path$1 || (_path$1 = /*#__PURE__*/React.createElement("path", {
  d: "M38.8565 2.98844L45.4379 16.071C45.7405 16.6727 46.1894 17.1919 46.7448 17.5827C47.3002 17.9736 47.9451 18.2242 48.6225 18.3123L63.3245 20.3971C64.3328 20.5403 65.28 20.9578 66.0591 21.6023C66.8382 22.2469 67.418 23.0927 67.7329 24.0441C68.0477 24.9956 68.085 26.0145 67.8406 26.9857C67.5962 27.9569 67.0798 28.8415 66.3499 29.5393L55.7347 39.7239C55.2517 40.1867 54.8903 40.7575 54.6814 41.3875C54.4725 42.0176 54.4223 42.6879 54.5351 43.3412L57.0509 57.7268C57.2237 58.7126 57.112 59.7263 56.7285 60.653C56.345 61.5797 55.7049 62.3825 54.8809 62.9704C54.0568 63.5584 53.0815 63.9081 52.0655 63.9799C51.0495 64.0517 50.0333 63.8428 49.132 63.3768L35.9054 56.601C35.3046 56.2974 34.6386 56.139 33.9628 56.139C33.2871 56.139 32.6211 56.2974 32.0203 56.601L18.8786 63.3873C17.5947 64.0476 16.0964 64.1802 14.713 63.756C13.3295 63.3318 12.1743 62.3855 11.501 61.1252C10.9401 60.087 10.7459 58.8954 10.9491 57.7372L13.4649 43.3516C13.5805 42.6983 13.5316 42.0272 13.3225 41.3967C13.1134 40.7662 12.7505 40.1955 12.2653 39.7344L1.65013 29.5497C0.920202 28.8519 0.403798 27.9673 0.159377 26.9961C-0.0850437 26.025 -0.047719 25.006 0.267126 24.0546C0.581971 23.1031 1.16176 22.2573 1.94086 21.6127C2.71995 20.9682 3.66723 20.5507 4.67546 20.4076L19.3775 18.3227C20.0526 18.2277 20.6945 17.9745 21.2488 17.5843C21.8031 17.1942 22.2536 16.6787 22.5621 16.0815L29.0692 2.98844C29.5196 2.09146 30.2167 1.33618 31.0815 0.80804C31.9463 0.279903 32.9444 0 33.9628 0C34.9813 0 35.9793 0.279903 36.8442 0.80804C37.709 1.33618 38.4061 2.09146 38.8565 2.98844Z",
  fill: "#ECECEC"
})));

var css_248z$5 = ".Rating-module_rating__z7ace {\n  display: flex;\n  flex-direction: column;\n}\n\n.Rating-module_ratingStars__0TKNm {\n  display: grid;\n  grid-auto-flow: column;\n  height: 64px;\n  gap: 24px;\n}\n\n.Rating-module_ratingStarWrapper__q2HMK {\n  position: relative;\n  width: 68px;\n  height: 64px;\n  cursor: pointer;\n  pointer-events: auto;\n  -webkit-tap-highlight-color: transparent;\n}\n.Rating-module_ratingStarWrapper__q2HMK:hover .Rating-module_ratingStarHover__xkEjC {\n  background: rgba(0, 0, 0, 0.02);\n}\n.Rating-module_ratingStarWrapper__q2HMK:hover .Rating-module_ratingDescription__Izji4 {\n  opacity: 1;\n}\n\n.Rating-module_ratingStar__3G8U5 {\n  width: 100%;\n  height: 100%;\n  color: #e3e3e3;\n  transition: transform 0.15s ease-in-out;\n  cursor: pointer;\n}\n.Rating-module_ratingStar__3G8U5:hover {\n  transform: scale(1.17);\n}\n\n.Rating-module_ratingStarHover__xkEjC {\n  position: absolute;\n  top: -18px;\n  right: -18px;\n  bottom: -18px;\n  left: -18px;\n  border-radius: 50%;\n  background-color: transparent;\n  pointer-events: none;\n  transition: background-color 0.2s;\n}\n\n.Rating-module_ratingDescription__Izji4 {\n  position: absolute;\n  top: calc(100% + 9px);\n  left: 50%;\n  font-weight: 400;\n  font-size: 20px;\n  line-height: 32px;\n  color: #aaaaaa;\n  opacity: 0;\n  transition: opacity 0.15s ease-in-out;\n  transform: translateX(-50%);\n  white-space: nowrap;\n  pointer-events: none;\n}\n\n@media (max-width: 899px) {\n  .Rating-module_ratingStars__0TKNm {\n    gap: 16px;\n    height: auto;\n  }\n  .Rating-module_ratingStarWrapper__q2HMK {\n    width: 46px;\n    height: 44px;\n  }\n  .Rating-module_ratingStarHover__xkEjC {\n    top: -9px;\n    right: -9px;\n    bottom: -9px;\n    left: -9px;\n  }\n  .Rating-module_ratingDescription__Izji4 {\n    font-size: 12px;\n    line-height: 19px;\n    top: calc(100% + 10px);\n  }\n}\n@media (min-width: 900px) and (max-width: 1023px) {\n  .Rating-module_ratingStars__0TKNm {\n    gap: 20px;\n    height: auto;\n  }\n  .Rating-module_ratingStarWrapper__q2HMK {\n    width: 58px;\n    height: 54px;\n  }\n  .Rating-module_ratingStarHover__xkEjC {\n    top: -12px;\n    right: -12px;\n    bottom: -12px;\n    left: -12px;\n  }\n  .Rating-module_ratingDescription__Izji4 {\n    font-size: 15px;\n    line-height: 24px;\n    top: calc(100% + 12px);\n  }\n}\n@media (max-height: 252px) {\n  .Rating-module_ratingStarWrapper__q2HMK {\n    width: 38px;\n    height: 34px;\n  }\n}";
var styles$5 = {"rating":"Rating-module_rating__z7ace","ratingStars":"Rating-module_ratingStars__0TKNm","ratingStarWrapper":"Rating-module_ratingStarWrapper__q2HMK","ratingStarHover":"Rating-module_ratingStarHover__xkEjC","ratingDescription":"Rating-module_ratingDescription__Izji4","ratingStar":"Rating-module_ratingStar__3G8U5"};
styleInject(css_248z$5);

function Rating(_a) {
    var selectedStar = _a.selectedStar, starCount = _a.starCount, descriptions = _a.descriptions, onChange = _a.onChange, className = _a.className;
    return jsx('div', { className: cn(styles$5.rating, className), children: jsx('div', {
        className: styles$5.ratingStars,
        role: 'radiogroup',
        'aria-label': 'Оценка игры',
        children: new Array(starCount).fill(0).map(function (_, idx) {
            return jsxs('div', {
                className: styles$5.ratingStarWrapper,
                role: 'radio',
                tabIndex: idx === (selectedStar === null ? 0 : selectedStar) ? 0 : -1,
                'aria-label': descriptions && descriptions[idx] || String(idx + 1),
                'aria-checked': selectedStar === idx,
                onClick: function () { onChange(idx); },
                onKeyDown: function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onChange(idx);
                    }
                    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
                        event.preventDefault();
                        var offset = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
                        var next = (idx + offset + starCount) % starCount;
                        onChange(next);
                        event.currentTarget.parentElement.children[next].focus();
                    }
                },
                children: [
                    jsx('div', { className: styles$5.ratingStarHover }),
                    jsx(selectedStar !== null && idx <= selectedStar ? SvgStarActive : SvgStar, { className: styles$5.ratingStar }),
                    descriptions && descriptions[idx] && jsx('div', { className: styles$5.ratingDescription, children: descriptions[idx] }),
                ],
            }, idx);
        }),
    }) });
}

var css_248z$4 = ".RateFeedback-module_rateFeedback__oBT0d {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  max-width: 100vw;\n}\n\n.RateFeedback-module_feedbackHeading__2AIh5 {\n  display: inline-flex;\n  max-width: 416px;\n  text-align: center;\n  font-weight: 700;\n  font-size: 24px;\n  line-height: 32px;\n  color: rgba(9, 21, 38, 0.85);\n}\n\n.RateFeedback-module_feedbackRating__ZB8a- {\n  margin-top: 51px;\n}\n\n.RateFeedback-module_feedbackButton__12WWo {\n  margin-top: 69px;\n}\n\n@media (max-width: 899px) {\n  .RateFeedback-module_rateFeedback__oBT0d {\n    padding: 24px;\n  }\n  .RateFeedback-module_feedbackHeading__2AIh5 {\n    font-size: 18px;\n    line-height: 25px;\n  }\n  .RateFeedback-module_feedbackRating__ZB8a- {\n    margin-top: 62px;\n  }\n  .RateFeedback-module_feedbackButton__12WWo {\n    margin-top: 62px;\n  }\n}\n@media (max-width: 899px) and (orientation: landscape) {\n  .RateFeedback-module_feedbackRating__ZB8a- {\n    margin-top: 22px;\n  }\n  .RateFeedback-module_feedbackButton__12WWo {\n    margin-top: 37px;\n  }\n}\n@media (min-width: 900px) and (max-width: 1023px) {\n  .RateFeedback-module_rateFeedback__oBT0d {\n    padding: 30px;\n  }\n  .RateFeedback-module_feedbackHeading__2AIh5 {\n    font-size: 22px;\n    line-height: 32px;\n  }\n  .RateFeedback-module_feedbackRating__ZB8a- {\n    margin-top: 77px;\n  }\n  .RateFeedback-module_feedbackButton__12WWo {\n    margin-top: 77px;\n  }\n}\n@media (max-height: 252px) {\n  .RateFeedback-module_rateFeedback__oBT0d {\n    margin: auto;\n    padding: 10px;\n  }\n}";
var styles$4 = {"rateFeedback":"RateFeedback-module_rateFeedback__oBT0d","feedbackHeading":"RateFeedback-module_feedbackHeading__2AIh5","feedbackRating":"RateFeedback-module_feedbackRating__ZB8a-","feedbackButton":"RateFeedback-module_feedbackButton__12WWo"};
styleInject(css_248z$4);

function RateFeedback(_a) {
    var _b = _a.payload, scale = _b.scale, title = _b.title, isLast = _a.isLast, onAnswer = _a.onAnswer;
    var _c = useState(null), selectedStar = _c[0], setSelectedStar = _c[1];
    var handleAnswer = useCallback(function () {
        if (selectedStar !== null) {
            onAnswer(String(scale[selectedStar].rate));
        }
    }, [onAnswer, selectedStar]);
    return (jsxs("div", __assign({ className: styles$4.rateFeedback }, { children: [jsx("div", __assign({ className: styles$4.feedbackHeading }, { children: title })), jsx(Rating, { className: styles$4.feedbackRating, selectedStar: selectedStar, starCount: scale.length, descriptions: scale.map(function (item) { return item.title; }), onChange: function (rating) { return setSelectedStar(rating); } }), jsx(Button, __assign({ className: styles$4.feedbackButton, disabled: selectedStar === null, onClick: handleAnswer }, { children: isLast ? 'Отправить' : 'Дальше' }))] })));
}

var css_248z$3 = ".SubmitFeedback-module_submitFeedback__I0Rxj {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n\n.SubmitFeedback-module_feedbackSubmitHeading__7W88e {\n  font-weight: 700;\n  font-size: 24px;\n  line-height: 32px;\n  text-align: center;\n  color: rgba(9, 21, 38, 0.85);\n}\n\n.SubmitFeedback-module_feedbackTextarea__TZFGt {\n  width: 416px;\n  height: 160px;\n  max-width: 100%;\n  padding: 8px 12px;\n  margin-top: 32px;\n  box-sizing: border-box;\n  border: 2px solid #816acf;\n  border-radius: 12px;\n  font-family: inherit;\n  font-style: normal;\n  font-weight: 400;\n  font-size: 20px;\n  line-height: 32px;\n  resize: none;\n}\n\n.SubmitFeedback-module_feedbackButton__-NvUH {\n  margin-top: 32px;\n}\n\n@media (max-width: 899px) {\n  .SubmitFeedback-module_submitFeedback__I0Rxj {\n    padding: 10px 24px;\n  }\n  .SubmitFeedback-module_feedbackSubmitHeading__7W88e {\n    font-size: 18px;\n    line-height: 25px;\n  }\n  .SubmitFeedback-module_feedbackTextarea__TZFGt {\n    width: 272px;\n    height: 127px;\n    padding: 6px 10px;\n    margin-top: 20px;\n    font-size: 16px;\n    line-height: 24px;\n    user-select: auto;\n  }\n  .SubmitFeedback-module_feedbackButton__-NvUH {\n    margin-top: 20px;\n  }\n}\n@media (max-width: 899px) and (orientation: landscape) {\n  .SubmitFeedback-module_feedbackTextarea__TZFGt {\n    margin-top: 10px;\n  }\n  .SubmitFeedback-module_feedbackButton__-NvUH {\n    margin-top: 10px;\n  }\n}\n@media (min-width: 900px) and (max-width: 1023px) {\n  .SubmitFeedback-module_submitFeedback__I0Rxj {\n    padding: 30px;\n  }\n  .SubmitFeedback-module_feedbackSubmitHeading__7W88e {\n    font-size: 22px;\n    line-height: 32px;\n  }\n  .SubmitFeedback-module_feedbackTextarea__TZFGt {\n    width: 336px;\n    height: 156px;\n    padding: 7px 12px;\n    margin-top: 12px;\n    font-size: 20px;\n    line-height: 32px;\n  }\n  .SubmitFeedback-module_feedbackButton__-NvUH {\n    margin-top: 12px;\n  }\n}\n@media (max-height: 252px) {\n  .SubmitFeedback-module_feedbackTextarea__TZFGt {\n    flex: 1;\n    max-height: 127px;\n    min-height: 80px;\n  }\n}";
var styles$3 = {"submitFeedback":"SubmitFeedback-module_submitFeedback__I0Rxj","feedbackSubmitHeading":"SubmitFeedback-module_feedbackSubmitHeading__7W88e","feedbackTextarea":"SubmitFeedback-module_feedbackTextarea__TZFGt","feedbackButton":"SubmitFeedback-module_feedbackButton__-NvUH"};
styleInject(css_248z$3);

function SubmitFeedback(_a) {
    var _b = _a.payload, title = _b.title, prompt = _b.prompt, isLast = _a.isLast, onAnswer = _a.onAnswer;
    var _c = useState(''), text = _c[0], setText = _c[1];
    var handleAnswer = useCallback(function () { return onAnswer(text); }, [onAnswer, text]);
    return (jsxs("div", __assign({ className: styles$3.submitFeedback }, { children: [jsx("div", __assign({ className: styles$3.feedbackSubmitHeading }, { children: title })), jsx("textarea", { className: styles$3.feedbackTextarea, value: text, 'aria-label': title, placeholder: prompt, maxLength: 500, onInput: function (e) {
                    setText(e.target.value);
                } }), jsx(Button, __assign({ className: styles$3.feedbackButton, disabled: !text, onClick: handleAnswer }, { children: isLast ? 'Отправить' : 'Дальше' }))] })));
}

function FeedbackContent(_a) {
    var data = _a.data, _b = _a.isLast, isLast = _b === void 0 ? false : _b, onAnswer = _a.onAnswer, onTimeout = _a.onTimeout;
    switch (data === null || data === void 0 ? void 0 : data.type) {
        case FormStepType.congrat:
            return (jsx(Congrat, { payload: data.content, onTimeout: onTimeout }));
        case FormStepType.feedback:
            return (jsx(SubmitFeedback, { payload: data.content, isLast: isLast, onAnswer: onAnswer }));
        case FormStepType.rate:
            return (jsx(RateFeedback, { payload: data.content, isLast: isLast, onAnswer: onAnswer }));
        case FormStepType.multianswers:
            return (jsx(MultianswerFeedback, { payload: data.content, isLast: isLast, onAnswer: onAnswer }));
        default:
            return null;
    }
}

var _path;

function _extends$1() { _extends$1 = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends$1.apply(this, arguments); }

const SvgClose = props => /*#__PURE__*/React.createElement("svg", _extends$1({
  width: 40,
  height: 40,
  viewBox: "0 0 40 40",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
}, props), _path || (_path = /*#__PURE__*/React.createElement("path", {
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M30.4142 12.4142C31.1953 11.6332 31.1953 10.3668 30.4142 9.58579C29.6332 8.80474 28.3668 8.80474 27.5858 9.58579L20 17.1716L12.4142 9.58579C11.6332 8.80474 10.3668 8.80474 9.58579 9.58579C8.80474 10.3668 8.80474 11.6332 9.58579 12.4142L17.1716 20L9.58579 27.5858C8.80474 28.3668 8.80474 29.6332 9.58579 30.4142C10.3668 31.1953 11.6332 31.1953 12.4142 30.4142L20 22.8284L27.5858 30.4142C28.3668 31.1953 29.6332 31.1953 30.4142 30.4142C31.1953 29.6332 31.1953 28.3668 30.4142 27.5858L22.8284 20L30.4142 12.4142Z",
  fill: "#DDDDDD"
})));

var useClickOutside = function (refs, handler) {
    useEffect(function () {
        var listener = function (event) {
            if (refs.some(function (ref) { var _a; return (_a = ref.current) === null || _a === void 0 ? void 0 : _a.contains(event.target); })) {
                return;
            }
            handler(event);
        };
        document.addEventListener('mouseup', listener);
        document.addEventListener('touchstart', listener);
        return function () {
            document.removeEventListener('mouseup', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [handler, refs]);
};

var useMount = function (isShown) {
    var _a = useState(isShown), isMount = _a[0], setIsMount = _a[1];
    var onVisibleTransitionEnd = function () {
        if (!isShown) {
            setIsMount(false);
        }
    };
    useEffect(function () {
        if (isShown) {
            setIsMount(true);
        }
    }, [isShown]);
    return [isMount, onVisibleTransitionEnd];
};

var css_248z$2 = ".FeedbackWindow-module_feedbackWindow__bjtsX {\n  position: absolute;\n  min-width: 568px;\n  max-width: 864px;\n  width: max-content;\n  min-height: 412px;\n  padding: 56px 0 40px;\n  box-sizing: border-box;\n  border-radius: 16px;\n  background: #ffffff;\n  opacity: 0;\n  transform: translateY(32px) scale(0.8);\n  transition: opacity 500ms easeOut;\n}\n\n.FeedbackWindow-module_shown__6uYMs {\n  opacity: 1;\n  transform: translateY(0) scale(1);\n}\n\n.FeedbackWindow-module_hidden__b0OQ8 {\n  opacity: 0;\n  transform: translateY(512px);\n}\n\n.FeedbackWindow-module_content__RQHnw {\n  max-height: 100%;\n  overflow-y: auto;\n  opacity: 0;\n  transition: opacity 500ms;\n}\n\n.FeedbackWindow-module_shownContent__kE-ZD {\n  opacity: 1;\n}\n\n.FeedbackWindow-module_closeIcon__NHnCk {\n  position: absolute;\n  top: 8px;\n  right: -48px;\n  width: 40px;\n  height: 40px;\n  cursor: pointer;\n  transition: none;\n}\n.FeedbackWindow-module_closeIcon__NHnCk:hover {\n  opacity: 0.9;\n}\n\n@media (max-width: 899px) {\n  .FeedbackWindow-module_feedbackWindow__bjtsX {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    border-radius: 0;\n    min-width: unset;\n    min-height: unset;\n    width: 100%;\n    height: 100%;\n    padding: 0;\n  }\n  .FeedbackWindow-module_closeIcon__NHnCk {\n    top: 15px;\n    right: 15px;\n  }\n}\n@media (min-width: 900px) and (max-width: 1023px) {\n  .FeedbackWindow-module_feedbackWindow__bjtsX {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    border-radius: 0;\n    max-width: unset;\n    min-height: unset;\n    width: 100%;\n    height: 100%;\n    padding: 0;\n  }\n  .FeedbackWindow-module_closeIcon__NHnCk {\n    width: 50px;\n    height: 50px;\n    top: 18px;\n    right: 18px;\n  }\n}\n@media (max-height: 252px) {\n  .FeedbackWindow-module_content__RQHnw {\n    min-height: 100%;\n    display: flex;\n    justify-content: center;\n  }\n}";
var styles$2 = {"feedbackWindow":"FeedbackWindow-module_feedbackWindow__bjtsX","shown":"FeedbackWindow-module_shown__6uYMs","hidden":"FeedbackWindow-module_hidden__b0OQ8","content":"FeedbackWindow-module_content__RQHnw","shownContent":"FeedbackWindow-module_shownContent__kE-ZD","closeIcon":"FeedbackWindow-module_closeIcon__NHnCk"};
styleInject(css_248z$2);

function FeedbackWindow(_a) {
    var _b, _c;
    var step = _a.step, zIndex = _a.zIndex, children = _a.children, requestClose = _a.requestClose, isShown = _a.isShown;
    var ref = useRef(null);
    useClickOutside([ref], requestClose);
    var _d = useMount(isShown), isMount = _d[0], onTransitionEnd = _d[1];
    var _e = useState(true), isShownContent = _e[0], setIsShownContent = _e[1];
    var currentContent = useRef(children);
    var onContentTransitionEnd = function () {
        currentContent.current = children;
        setIsShownContent(true);
    };
    useEffect(function () {
        var isNextContent = currentContent.current !== children;
        if (isShownContent && isNextContent) {
            setIsShownContent(false);
        }
    }, [children, isShownContent, step]);
    return (jsx(Fragment, { children: isMount && (jsxs("div", __assign({ className: cn(styles$2.feedbackWindow, (_b = {},
                _b[styles$2.shown] = isShown,
                _b[styles$2.hidden] = !isShown && isMount,
                _b)), ref: ref, style: {
                zIndex: zIndex,
            }, onTransitionEnd: onTransitionEnd }, { children: [jsx('button', { className: styles$2.closeIcon, type: 'button', 'aria-label': 'Закрыть обратную связь', autoFocus: true, onClick: requestClose, children: jsx(SvgClose, {}) }), jsx("div", __assign({ className: cn(styles$2.content, (_c = {},
                        _c[styles$2.shownContent] = isShownContent,
                        _c)), onTransitionEnd: onContentTransitionEnd }, { children: currentContent.current }))] }))) }));
}

var css_248z$1 = ".Loader-module_loader__Ukoov {\n  width: 75px;\n  height: 75px;\n  display: inline-block;\n  border-width: 2px;\n  border-color: rgba(255, 255, 255, 0.05);\n  border-top-color: #fff;\n  animation: Loader-module_spin__HfHqf 1s infinite linear;\n  border-radius: 100%;\n  border-style: solid;\n}\n\n@keyframes Loader-module_spin__HfHqf {\n  100% {\n    transform: rotate(360deg);\n  }\n}";
var styles$1 = {"loader":"Loader-module_loader__Ukoov","spin":"Loader-module_spin__HfHqf"};
styleInject(css_248z$1);

function Loader() {
    return jsx("div", { className: styles$1.loader });
}

var css_248z = ".Overlay-module_overlay__PjFtk {\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background-color: rgba(0, 0, 0, 0.5);\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  opacity: 0;\n}\n\n.Overlay-module_shown__zbXHG {\n  animation: Overlay-module_shownKeyframe__wNblQ 500ms forwards;\n}\n\n.Overlay-module_hidden__tifDZ {\n  animation: Overlay-module_hiddenKeyframe__PC-ue 500ms forwards;\n}\n\n@media (max-width: 899px) {\n  .Overlay-module_overlay__PjFtk {\n    background-color: transparent;\n  }\n}\n@media (min-width: 900px) and (max-width: 1023px) {\n  .Overlay-module_overlay__PjFtk {\n    background-color: transparent;\n  }\n}\n@keyframes Overlay-module_shownKeyframe__wNblQ {\n  0% {\n    opacity: 0;\n  }\n  100% {\n    opacity: 1;\n  }\n}\n@keyframes Overlay-module_hiddenKeyframe__PC-ue {\n  0% {\n    opacity: 1;\n  }\n  100% {\n    opacity: 0;\n  }\n}";
var styles = {"overlay":"Overlay-module_overlay__PjFtk","shown":"Overlay-module_shown__zbXHG","shownKeyframe":"Overlay-module_shownKeyframe__wNblQ","hidden":"Overlay-module_hidden__tifDZ","hiddenKeyframe":"Overlay-module_hiddenKeyframe__PC-ue"};
styleInject(css_248z);

function Overlay(_a) {
    var _b;
    var children = _a.children, className = _a.className, zIndex = _a.zIndex, isShown = _a.isShown, onOverlayAnimationComplete = _a.onOverlayAnimationComplete;
    var _c = useMount(isShown), isMount = _c[0], onAnimationEnd = _c[1];
    return (jsx(Fragment, { children: isMount && (jsx("div", __assign({ style: { zIndex: zIndex }, className: cn(styles.overlay, className, (_b = {},
                _b[styles.shown] = isShown,
                _b[styles.hidden] = !isShown && isMount,
                _b)), onAnimationEnd: function () {
                onAnimationEnd();
                onOverlayAnimationComplete();
            } }, { children: children }))) }));
}


var _g;

function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

const SvgGrisha = props => /*#__PURE__*/React.createElement("svg", _extends({
  width: 113,
  height: 139,
  viewBox: "0 0 113 139",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg"
}, props), _g || (_g = /*#__PURE__*/React.createElement("g", {
  id: "Group 1321316163"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector",
  d: "M45.7159 138.606C70.8118 138.606 91.156 135.618 91.156 131.933C91.156 128.247 70.8118 125.26 45.7159 125.26C20.6201 125.26 0.275879 128.247 0.275879 131.933C0.275879 135.618 20.6201 138.606 45.7159 138.606Z",
  fill: "#D7F2F2"
}), /*#__PURE__*/React.createElement("g", {
  id: "Group"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_2",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M82.7817 78.4936L83.8901 75.7891C83.8901 75.7891 84.5282 76.0791 85.1765 76.783C87.1036 78.8749 86.1617 82.2745 83.4907 83.2473L82.7817 78.4936Z",
  fill: "#6F568E"
}), /*#__PURE__*/React.createElement("path", {
  id: "Vector_3",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M51.464 81.4423C51.464 81.4423 59.2041 104.145 81.7748 84.2708L78.2659 78.7046C78.2659 78.7046 67.3245 85.7176 57.427 76.916L51.464 81.4423Z",
  fill: "#6F568E"
}), /*#__PURE__*/React.createElement("g", {
  id: "Group_2"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_3"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_4",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M30.8695 103.929L22.9118 99.9639L21.5571 108.028L14.7404 105.991L14.1476 113.411L8.43151 112.569L8.36963 118.914L18.9824 111.131L30.8695 103.929Z",
  fill: "#0D1013"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_4"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_5"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_5",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M27.6905 64.5838L20.1387 61.2776L24.4044 55.2553L16.4154 52.0697L21.1743 43.4707L11.7382 40.5604L18.8057 30.0361L27.6905 64.5838Z",
  fill: "#0D1013"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_6"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_7"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_8"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_6",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M62.7003 125.693L69.0462 130.613L49.4987 130.554C49.4987 130.554 49.2984 121.931 49.382 117.812C49.4656 113.694 51.8642 107.323 54.8536 103.78C57.8438 100.237 60.3113 103.752 60.8919 107.882C61.6053 112.963 62.7003 125.693 62.7003 125.693Z",
  fill: "#6F568E"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_9"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_10"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_7",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M69.0461 130.613L61.8031 130.591L64.0913 126.771L69.0461 130.613Z",
  fill: "#0D1013"
})))), /*#__PURE__*/React.createElement("g", {
  id: "Group_11"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_12"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_8",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M63.2343 40.704C63.1552 39.7599 63.0761 39.04 62.9836 38.5846C62.2842 35.0324 60.1606 32.2991 57.219 30.2065C57.2126 30.2001 57.2126 30.2001 57.2056 30.2001C45.5648 21.9211 21.1296 23.585 21.1296 23.585C21.1296 23.585 20.8725 23.8687 20.6019 24.4761C20.1469 25.493 17.8613 27.4259 18.442 30.4767C21.2847 45.4507 29.4197 70.4858 33.3638 94.0097C34.9074 103.193 25.3028 106.3 21.5297 108.93C17.7566 111.561 14.1833 112.993 7.89807 118.902C2.72057 123.768 2.55786 126.281 2.55786 126.281C3.40461 125.912 4.78673 125.327 6.51533 124.684C16.1633 121.092 24.0291 120.354 25.9249 120.131C31.8828 119.431 42.3788 116.344 62.2121 105.385C62.2121 105.385 62.2121 105.379 62.2185 105.372C63.9598 100.903 64.2036 95.3434 64.2234 88.5565C64.2432 79.2414 63.986 49.7623 63.2343 40.704Z",
  fill: "#FF6170"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_13"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_14"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_9",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M63.2344 40.7033C60.7413 38.0556 55.8408 35.2629 46.2451 34.8867C35.8378 34.4836 30.1855 42.5582 37.038 43.2123C37.038 43.2123 47.966 88.147 46.6937 100.473C45.8361 108.759 42.1364 110.951 30.2646 113.433C30.2646 113.433 13.6576 117.573 6.51538 124.683C14.7366 122.698 21.4672 121.619 25.9977 121.006C32.623 120.11 39.7525 119.505 48.6788 116.665C51.921 115.633 56.5835 113.931 59.9131 109.506C61.0955 107.935 61.7974 106.436 62.2122 105.385C62.2122 105.385 62.2122 105.378 62.2185 105.371C63.9599 100.902 64.2036 95.3427 64.2234 88.5558C64.2432 79.2407 63.9861 49.7616 63.2344 40.7033Z",
  fill: "#FFC500"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_15"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_16"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_17"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_10",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M33.6095 107.881C34.1896 103.751 36.6577 100.237 39.6478 103.779C42.6379 107.321 45.0365 113.693 45.1195 117.811C45.2024 121.929 45.0027 130.553 45.0027 130.553L25.4553 130.612L31.8012 125.692C31.8012 125.693 32.8955 112.962 33.6095 107.881Z",
  fill: "#6F568E"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_18"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_19"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_11",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M30.4101 126.771L32.6983 130.591L25.4553 130.613L30.4101 126.771Z",
  fill: "#0D1013"
})))), /*#__PURE__*/React.createElement("g", {
  id: "Group_20"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_12",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M72.6481 25.094C68.5139 13.3988 57.1086 16.2292 39.7052 21.7296C33.0499 23.8331 20.3748 28.4712 20.3748 28.4712C23.8919 36.9974 25.9498 41.6617 28.4575 43.9677C43.0622 57.3945 63.3536 50.11 64.2483 49.8552C68.7858 48.5623 76.5807 45.8948 77.4894 45.5275C77.4907 45.5275 76.7856 36.8007 72.6481 25.094Z",
  fill: "#FF6170"
}), /*#__PURE__*/React.createElement("g", {
  id: "Group_21"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_22"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_23"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_13",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M63.8788 11.6956C66.7075 11.6586 68.8974 14.6793 68.7711 18.4429C68.6447 22.2066 66.2493 25.2873 63.4207 25.3237C60.592 25.3608 58.4021 22.3401 58.5284 18.5764C58.6547 14.8135 61.0501 11.7327 63.8788 11.6956Z",
  fill: "#FF6170"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_24"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_25"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_14",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M64.6636 14.9071C65.7107 15.1134 66.3571 16.6362 66.1064 18.3079C65.8556 19.9802 64.8034 21.1683 63.7563 20.9619C62.7092 20.7556 62.0628 19.2328 62.3135 17.5611C62.5637 15.8889 63.6159 14.7007 64.6636 14.9071Z",
  fill: "#0D1013"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_26"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_27"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_15",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M74.2683 14.8331C76.6241 15.6705 77.3477 18.9365 75.8846 22.1278C74.4214 25.3191 71.3254 27.2265 68.9696 26.389C66.6137 25.5516 65.8901 22.2856 67.3533 19.0943C68.8164 15.903 71.9124 13.995 74.2683 14.8331Z",
  fill: "#FF6170"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_28"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_29"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_16",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M73.3437 17.4822C74.216 17.9045 74.3621 19.2804 73.6692 20.556C72.9762 21.8316 71.7077 22.524 70.8347 22.1018C69.9625 21.6796 69.8163 20.3037 70.5093 19.028C71.2023 17.7524 72.4708 17.06 73.3437 17.4822Z",
  fill: "#0D1013"
})))), /*#__PURE__*/React.createElement("g", {
  id: "Group_30"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_31"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_32"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_17",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M18.0489 5.54193C19.609 4.91594 20.9458 5.00026 21.5099 5.95075C22.074 6.90123 21.2655 8.26691 20.3939 8.84883C19.5222 9.43074 17.8121 12.2879 17.3616 12.988C16.9105 13.6881 15.6445 14.0005 14.9152 13.6211C14.1859 13.2416 13.974 12.0944 14.1093 11.2206C14.4405 9.07431 15.7243 6.47453 18.0489 5.54193Z",
  fill: "#0D1013"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_33"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_34"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_18",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M36.5256 0.845757C34.8806 1.2271 33.829 2.06772 33.9126 3.18109C33.9962 4.29382 35.4491 4.95878 36.5013 4.9377C37.5542 4.91726 40.6088 6.29763 41.3834 6.61765C42.1581 6.93767 43.3807 6.46563 43.7616 5.73104C44.1432 4.99646 43.6563 3.92397 43.0418 3.27754C41.5314 1.69148 38.9765 0.277894 36.5256 0.845757Z",
  fill: "#0D1013"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_35"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_36"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_19",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M21.6076 12.8238C27.0122 11.4256 32.5247 14.6711 33.919 20.0732C35.3132 25.4752 32.0634 30.9884 26.6581 32.3867C21.2534 33.785 15.7409 30.5394 14.3467 25.1373C12.9524 19.7353 16.2029 14.2221 21.6076 12.8238Z",
  fill: "#6F568E"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_37"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_38"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_20",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M36.0579 8.14796C41.4626 6.7497 46.9751 9.99655 48.3699 15.3999C49.7648 20.8032 46.515 26.3177 41.1097 27.7159C35.705 29.1142 30.1925 25.8673 28.7976 20.464C27.4028 15.0607 30.6526 9.54686 36.0579 8.14796Z",
  fill: "#6F568E"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_39"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_40"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_21",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M22.5066 16.3171C25.9804 15.4184 29.5237 17.5052 30.4209 20.9788C31.3181 24.4525 29.2283 27.997 25.7545 28.8957C22.2807 29.7945 18.7374 27.7076 17.8402 24.234C16.9431 20.7604 19.0328 17.2159 22.5066 16.3171Z",
  fill: "white"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_41"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_42"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_22",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M24.9672 21.5928C26.6077 21.1681 28.2808 22.1537 28.7045 23.7928C29.1282 25.4318 28.1411 27.1054 26.5005 27.5302C24.86 27.955 23.1869 26.9693 22.7632 25.3303C22.3395 23.6906 23.3266 22.017 24.9672 21.5928Z",
  fill: "#0D1013"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_43"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_44"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_23",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M36.9627 11.6443C40.4365 10.7455 43.9798 12.8324 44.877 16.306C45.7742 19.7796 43.6844 23.3241 40.2106 24.2229C36.7368 25.1216 33.1935 23.0347 32.2963 19.5611C31.3998 16.0875 33.4889 12.543 36.9627 11.6443Z",
  fill: "white"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_45"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_46"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_24",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M39.4231 16.921C41.0637 16.4962 42.7368 17.4818 43.1604 19.1209C43.5835 20.7606 42.597 22.4335 40.9565 22.8583C39.3159 23.2831 37.6428 22.2975 37.2191 20.6584C36.7954 19.0187 37.7826 17.3458 39.4231 16.921Z",
  fill: "#0D1013"
})))), /*#__PURE__*/React.createElement("g", {
  id: "Group_47"
}, /*#__PURE__*/React.createElement("g", {
  id: "Group_48"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_25",
  d: "M63.7902 50.0199C59.7383 51.0317 53.3477 51.8231 46.8073 51.3236C41.6719 50.9314 35.0102 49.4897 32.4374 44.8478C32.2179 44.4517 31.7195 44.3093 31.3239 44.529C30.9283 44.7488 30.786 45.2476 31.0055 45.6437C36.2372 55.0834 55.0795 53.8627 64.0607 51.6449C64.0537 51.5587 63.8355 50.0946 63.7902 50.0199Z",
  fill: "white"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_49"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_26",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M33.9023 48.9482L35.3904 56.2366L42.382 52.3695L46.6426 58.2947L52.5437 53.0523L58.0109 57.8539L62.2816 51.6266L60.0987 51.4292L49.9485 52.2258L41.5825 51.555L33.9023 48.9482Z",
  fill: "white"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_50"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_27",
  d: "M87.9279 77.9436L54.5919 96.2806C52.6853 97.3423 50.2746 96.6409 49.2536 94.7182L37.7806 73.7271C36.7246 71.8178 37.4278 69.4001 39.3484 68.3742L72.6596 50.0269C74.5649 48.9646 76.9769 49.6667 77.9979 51.5893L89.4708 72.5805C90.5256 74.4891 89.8224 76.9062 87.9279 77.9436Z",
  fill: "#D7F2F2"
}), /*#__PURE__*/React.createElement("path", {
  id: "Vector_28",
  d: "M83.9386 71.4419L68.4393 68.5675L74.7896 54.0886C75.0608 53.4722 74.1872 53.0582 73.8682 53.6523L64.3185 71.8048C64.2074 71.99 64.009 72.1082 63.815 72.0813L43.4585 69.8565C42.8178 69.7799 42.6602 70.738 43.3028 70.8747L58.8238 73.6993L52.4505 88.168C52.1793 88.7844 53.0516 89.1977 53.3707 88.6037L61.052 74.0947L65.2565 74.8638C65.4989 74.9117 65.7331 74.7795 65.8301 74.5585L67.5542 70.6454L83.8084 72.471C84.458 72.5227 84.592 71.5537 83.9386 71.4419Z",
  fill: "#5998D7"
})), /*#__PURE__*/React.createElement("g", {
  id: "Group_51"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_29",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M84.2386 82.92C79.264 86.1004 75.7366 85.5938 75.7366 85.5938C75.7366 85.5938 75.7366 75.905 78.6125 74.1816C78.6125 74.1816 79.435 75.7485 79.7119 77.3876C79.7119 77.3876 81.616 74.8281 82.6382 73.9785C82.6382 73.9785 83.6598 75.9127 83.8391 78.4314L84.2386 82.92Z",
  fill: "#6F568E"
})), /*#__PURE__*/React.createElement("g", {
  id: "Group_52"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_30",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M48.181 74.7457C47.0171 75.7645 43.3991 77.0599 42.1305 73.5997C41.5224 71.9402 41.8026 70.0335 42.9422 68.6832C46.3739 64.618 52.7861 70.7132 48.181 74.7457Z",
  fill: "#6F568E"
}), /*#__PURE__*/React.createElement("path", {
  id: "Vector_31",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M42.1816 70.0043C42.1816 70.0043 41.8172 63.4314 46.5289 62.5391L46.8359 67.6786L42.1816 70.0043Z",
  fill: "#6F568E"
}), /*#__PURE__*/React.createElement("path", {
  id: "Vector_32",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M44.1885 68.3926C44.1885 68.3926 48.703 63.6057 52.5916 66.415L49.0769 70.1741L44.1885 68.3926Z",
  fill: "#6F568E"
}), /*#__PURE__*/React.createElement("path", {
  id: "Vector_33",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M46.2131 68.4555C46.2131 68.4555 52.6994 67.3708 54.1032 71.961L49.0342 72.8316L46.2131 68.4555Z",
  fill: "#6F568E"
}), /*#__PURE__*/React.createElement("path", {
  id: "Vector_34",
  fillRule: "evenodd",
  clipRule: "evenodd",
  d: "M46.8499 74.8638C46.8499 74.8638 46.4524 89.4685 37.4763 89.6378C28.5002 89.8071 26.302 76.0033 28.5462 70.959C28.5462 70.959 29.5359 77.9139 34.5908 79.6002C37.1075 80.4402 41.6558 75.7625 41.9519 71.905L46.8499 74.8638Z",
  fill: "#6F568E"
}))), /*#__PURE__*/React.createElement("g", {
  id: "Group_53"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_35",
  d: "M103.232 94.8885C102.771 94.8885 102.313 94.6892 101.997 94.3041L92.6707 82.9161C92.1124 82.2346 92.212 81.2279 92.8934 80.669C93.5743 80.1094 94.5806 80.209 95.1389 80.8912L104.465 92.2792C105.024 92.9607 104.924 93.9674 104.243 94.527C103.946 94.7697 103.587 94.8885 103.232 94.8885Z",
  fill: "#D7F2F2"
})), /*#__PURE__*/React.createElement("g", {
  id: "Group_54"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_36",
  d: "M111.045 85.3077C110.839 85.3077 110.629 85.2675 110.427 85.1819L95.9143 79.0663C95.1026 78.724 94.721 77.7882 95.0631 76.975C95.4044 76.1625 96.3405 75.7799 97.1515 76.1229L111.664 82.2391C112.476 82.5808 112.858 83.5173 112.516 84.3298C112.259 84.9404 111.668 85.3077 111.045 85.3077Z",
  fill: "#D7F2F2"
})), /*#__PURE__*/React.createElement("g", {
  id: "Group_55"
}, /*#__PURE__*/React.createElement("path", {
  id: "Vector_37",
  d: "M99.3166 75.4951C98.5394 75.4951 97.8592 74.926 97.7405 74.1339C97.6103 73.2614 98.2114 72.4489 99.0831 72.3186L105.049 71.4275C105.925 71.2946 106.733 71.8995 106.863 72.7715C106.993 73.644 106.392 74.4565 105.52 74.5868L99.554 75.4779C99.4742 75.4894 99.3944 75.4951 99.3166 75.4951Z",
  fill: "#D7F2F2"
})), /*#__PURE__*/React.createElement("path", {
  id: "Vector_38",
  d: "M90.4629 45.9073L87.899 47.0992L87.4255 49.8894L85.5074 47.8166L82.7004 48.2279L84.0698 45.761L82.821 43.2239L85.5942 43.7719L87.6144 41.7949L87.9539 44.5946L90.4629 45.9073Z",
  fill: "#FEB414"
}), /*#__PURE__*/React.createElement("path", {
  id: "Vector_39",
  d: "M81.3445 93.998L83.4809 95.8517L86.2177 95.1414L85.1138 97.7419L86.6382 100.137L83.8293 99.8964L82.0286 102.076L81.3924 99.319L78.7634 98.2835L81.1761 96.8271L81.3445 93.998Z",
  fill: "#FEB414"
}), /*#__PURE__*/React.createElement("path", {
  id: "Vector_40",
  d: "M95.3764 59.7899L94.5335 61.3874L95.3688 62.9926L93.5923 62.6777L92.3359 63.9757L92.0756 62.1859L90.4669 61.3791L92.0832 60.58L92.3436 58.7979L93.5993 60.0888L95.3764 59.7899Z",
  fill: "#FEB414"
}), /*#__PURE__*/React.createElement("path", {
  id: "Vector_41",
  d: "M15.6247 71.8614L14.011 72.6707L13.7583 74.4624L12.4955 73.1721L10.7191 73.4966L11.5467 71.8895L10.7063 70.297L12.4853 70.5877L13.7322 69.2891L14.004 71.0699L15.6247 71.8614Z",
  fill: "#FEB414"
}), /*#__PURE__*/React.createElement("path", {
  id: "Vector_42",
  d: "M13.1661 49.6409L9.89526 51.3541L9.43902 55.0213L6.79858 52.426L3.17164 53.1299L4.82303 49.8255L3.05042 46.5774L6.69839 47.1184L9.22653 44.4229L9.8391 48.0696L13.1661 49.6409Z",
  fill: "#FEB414"
}))));

function CongratDefault(_a) {
    var onTimeout = _a.onTimeout;
    useEffect(function () {
        var timeout = setTimeout(onTimeout, 2000);
        return function () { return clearTimeout(timeout); };
    }, [onTimeout]);
    return (jsxs("div", __assign({ className: styles$a.completed }, { children: [jsx(SvgGrisha, { className: styles$a.completedIcon }), jsx("div", __assign({ className: styles$a.completedTitle }, { children: "\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u043E\u0442\u0432\u0435\u0442!" }))] })));
}

var DEFAULT_Z_INDEX = 10000;
var DEFAULT_BASE_URL = '/content_feedback';
var Feedback = function (_a) {
    var _b = _a.config, _c = _b.baseUrl, baseUrl = _c === void 0 ? DEFAULT_BASE_URL : _c, apiVersion = _b.apiVersion, projectName = _b.projectName, formName = _b.formName, visible = _a.visible, _d = _a.zIndex, zIndex = _d === void 0 ? DEFAULT_Z_INDEX : _d, className = _a.className, onClose = _a.onClose, onCloseAnimationComplete = _a.onCloseAnimationComplete;
    var _e = useState(0), step = _e[0], setStep = _e[1];
    var _f = useState(true), isLoading = _f[0], setIsLoading = _f[1];
    var _g = useState(null), sessionId = _g[0], setSessionId = _g[1];
    var _h = useState(false), congratDefault = _h[0], setCongratDefault = _h[1];
    var _error = useState(null), error = _error[0], setError = _error[1];
    var _retry = useState(0), retry = _retry[0], setRetry = _retry[1];
    var submitting = useRef(false);
    var _j = useState({
        formId: null,
        formSteps: [],
    }), formData = _j[0], setFormData = _j[1];
    var projectsAPI = useMemo(function () {
        var instance = new ProjectsAPI(projectName);
        instance.configure({ baseUrl: baseUrl, apiVersion: apiVersion });
        return instance;
    }, [baseUrl, apiVersion, projectName]);
    useEffect(function () {
        if (!visible || step !== 0) return;
        var canceled = false;
        async function getForm() {
            setIsLoading(true);
            setError(null);
            try {
                var projectForms = await projectsAPI.getFormsList();
                var form = projectForms.find(function (item) { return item.name === formName; });
                if (!form || !Array.isArray(form.formsteps) || form.formsteps.length === 0) {
                    throw new Error('Feedback form is unavailable');
                }
                if (canceled) return;
                setSessionId(v4());
                setFormData({ formId: form.id, formSteps: form.formsteps });
            } catch (requestError) {
                if (!canceled) setError('Не удалось загрузить форму. Попробуй ещё раз.');
            } finally {
                if (!canceled) setIsLoading(false);
            }
        }
        getForm();
        return function () { canceled = true; };
    }, [projectName, formName, projectsAPI, step, visible, retry]);
    var onOverlayAnimationComplete = function () {
        if (!visible) {
            if (onCloseAnimationComplete)
                onCloseAnimationComplete();
            // Если окно было закрыто на первом шаге, то сбрасываем данные формы,
            // т.к. при следующем открытии окна все равно отправляется запрос на получение данных формы
            if (step === 0) {
                reset();
            }
        }
    };
    var lastStepIndex = formData.formSteps.length - 1;
    var sendFeedback = useCallback(async function (answer) {
        try {
            await projectsAPI.submitAnswer({
                answer: answer,
                formId: formData.formId,
                formstepId: formData.formSteps[step].id,
                sessionId: sessionId,
            });
            return true;
        } catch (requestError) {
            setError('Не удалось отправить отзыв. Проверь соединение и попробуй ещё раз.');
            return false;
        }
    }, [projectsAPI, formData.formId, formData.formSteps, sessionId, step]);
    var nextStep = useCallback(function () {
        if (step < lastStepIndex) {
            setStep(step + 1);
        }
        else if (formData.formSteps[step].type !== FormStepType.congrat) {
            // если мы тут, значит у формы в конце не было конграта, показываем дефолтный
            setCongratDefault(true);
        }
        else {
            reset();
        }
    }, [step, lastStepIndex]);
    var submitAnswer = useCallback(async function (answer) {
        if (submitting.current) return;
        submitting.current = true;
        setError(null);
        try {
            if (await sendFeedback(answer)) nextStep();
        } finally {
            submitting.current = false;
        }
    }, [sendFeedback, nextStep]);
    var close = onClose;
    var reset = function () {
        close();
        setStep(0);
        setCongratDefault(false);
        setSessionId(null);
        setFormData({ formId: null, formSteps: [] });
    };
    var isShownFeedbackWindow = lastStepIndex >= 0 && step <= lastStepIndex;
    var content;
    if (error && lastStepIndex === -1) {
        content = jsxs('div', { className: 'feedback-request-error', role: 'alert', children: [
            jsx('p', { children: error }),
            jsx(Button, { onClick: function () { setRetry(retry + 1); }, children: 'Попробовать ещё раз' }),
        ] });
    } else if (isLoading || lastStepIndex === -1) {
        content = jsx(Loader, {});
    } else {
        content = jsx(FeedbackWindow, {
            step: step,
            zIndex: zIndex,
            requestClose: close,
            isShown: isShownFeedbackWindow,
            children: jsxs(Fragment, { children: [
                congratDefault ? jsx(CongratDefault, { onTimeout: reset }) : jsx(FeedbackContent, {
                    data: formData.formSteps[step],
                    isLast: step === lastStepIndex,
                    onAnswer: submitAnswer,
                    onTimeout: nextStep,
                }),
                error && jsx('p', { className: 'feedback-submit-error', role: 'alert', children: error }),
            ] }),
        });
    }
    return jsx(Overlay, { zIndex: zIndex, className: className, isShown: visible, onOverlayAnimationComplete: onOverlayAnimationComplete, children: content });
};

export { Feedback as default };
