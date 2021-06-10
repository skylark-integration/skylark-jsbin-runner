/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
!function(n,r){var e=r.define,require=r.require,t="function"==typeof e&&e.amd,i=!t&&"undefined"!=typeof exports;if(!t&&!e){var s={};e=r.define=function(n,r,e){"function"==typeof e?(s[n]={factory:e,deps:r.map(function(r){return function(n,r){if("."!==n[0])return n;var e=r.split("/"),t=n.split("/");e.pop();for(var i=0;i<t.length;i++)"."!=t[i]&&(".."==t[i]?e.pop():e.push(t[i]));return e.join("/")}(r,n)}),resolved:!1,exports:null},require(n)):s[n]={factory:null,resolved:!0,exports:e}},require=r.require=function(n){if(!s.hasOwnProperty(n))throw new Error("Module "+n+" has not been defined");var module=s[n];if(!module.resolved){var e=[];module.deps.forEach(function(n){e.push(require(n))}),module.exports=module.factory.apply(r,e)||null,module.resolved=!0}return module.exports}}if(!e)throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");if(function(n,require){n("skylark-jsbin-runner/jsbin",["skylark-langx-ns"],function(n){"use strict";var r=n.attach("intg.jsbin");return r}),n("skylark-jsbin-runner/runner",["skylark-appify-runner","./jsbin"],function(n,r){return n.initJsbinRunner=function(){return this.init(document.getElementById("sandbox-wrapper"),{cssTextTagId:"jsbin-css"})},r.runner=n}),n("skylark-jsbin-runner/main",["./runner"],function(n){return n}),n("skylark-jsbin-runner",["skylark-jsbin-runner/main"],function(n){return n})}(e),!t){var o=require("skylark-langx-ns");i?module.exports=o:r.skylarkjs=o}}(0,this);
//# sourceMappingURL=sourcemaps/skylark-jsbin-runner.js.map
