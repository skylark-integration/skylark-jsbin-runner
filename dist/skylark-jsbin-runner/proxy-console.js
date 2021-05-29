/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["./runner"],function(o){"use strict";var e=function(){try{window.console.log("d[ o_0 ]b")}catch(o){!1}var e=function(){};return(e.prototype.methods=["debug","clear","error","info","log","warn","dir","props","_raw","group","groupEnd","dirxml","table","trace","assert","count","markTimeline","profile","profileEnd","time","timeEnd","timeStamp","groupCollapsed"]).forEach(function(r){e.prototype[r]=function(){var e=[].slice.call(arguments),n=function(o){for(var e,r=[],n=0,t=o.length;n<t;n++)void 0===(e=o[n])?r.push("undefined"):r.push(JSON.stringify(e));return r}(e);o.postMessage("console",{method:"_raw"===r?e.shift():r,args:"_raw"===r?n.slice(1):n}),window.console&&(console[r]||(r="log"),window.console&&"_raw"!==r&&("clear"!==r||"clear"===r&&console.clear)&&console[r].apply(console,e))}}),new e}();return o.proxyConsole=e});
//# sourceMappingURL=sourcemaps/proxy-console.js.map
