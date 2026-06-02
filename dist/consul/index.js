"use strict";
/**
 * Shared configuration and utilities for microservices
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectEnvironment = exports.config = exports.serviceRegistry = exports.consulClient = void 0;
var consulClient_js_1 = require("./consulClient.js");
Object.defineProperty(exports, "consulClient", { enumerable: true, get: function () { return consulClient_js_1.consulClient; } });
var serviceRegistry_js_1 = require("./serviceRegistry.js");
Object.defineProperty(exports, "serviceRegistry", { enumerable: true, get: function () { return serviceRegistry_js_1.serviceRegistry; } });
var config_js_1 = require("./config.js");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return config_js_1.config; } });
Object.defineProperty(exports, "detectEnvironment", { enumerable: true, get: function () { return config_js_1.detectEnvironment; } });
