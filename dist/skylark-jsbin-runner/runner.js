/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["skylark-loopprotect","./jsbin"],function(e,t){"use strict";var r={};return e.hit=function(e){console.warn("Exiting potential infinite loop at line "+e+'. To disable loop protection: add "// noprotect" to your code'),r.postMessage("loopProtectHit",e)},r.parent={},r.parent.origin="*",r.error=function(){var e=["Runner:"].concat([].slice.call(arguments));if(!("console"in window))return alert(e.join(" "))},r.handleMessage=function(e){if(e.origin){var t=e.data;try{t="string"==typeof e.data?JSON.parse(e.data):e.data}catch(e){return r.error("Error parsing event data:",e.message)}if(r.commands&&"function"!=typeof r.commands[t.type])return r.error("No matching event handler:",t.type);r.parent.source=e.source;try{r.commands[t.type](t.data)}catch(e){r.error(e.message)}}},r.postMessage=function(e,t){if(!r.parent.source)return r.error("No postMessage connection to parent window.");r.parent.source.postMessage(JSON.stringify({type:e,data:t}),r.parent.origin)},t.runner=r});
//# sourceMappingURL=sourcemaps/runner.js.map
