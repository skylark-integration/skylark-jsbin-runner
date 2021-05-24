/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["./jsbin"],function(e){"use strict";var t={};return loopProtect.hit=function(e){console.warn("Exiting potential infinite loop at line "+e+'. To disable loop protection: add "// noprotect" to your code'),t.postMessage("loopProtectHit",e)},t.parent={},t.parent.origin="*",t.error=function(){var e=["Runner:"].concat([].slice.call(arguments));if(!("console"in window))return alert(e.join(" "))},t.handleMessage=function(e){if(e.origin){var r=e.data;try{r="string"==typeof e.data?JSON.parse(e.data):e.data}catch(e){return t.error("Error parsing event data:",e.message)}if(t.commands&&"function"!=typeof t.commands[r.type])return t.error("No matching event handler:",r.type);t.parent.source=e.source;try{t.commands[r.type](r.data)}catch(e){t.error(e.message)}}},t.postMessage=function(e,r){if(!t.parent.source)return t.error("No postMessage connection to parent window.");t.parent.source.postMessage(JSON.stringify({type:e,data:r}),t.parent.origin)},e.runner=t});
//# sourceMappingURL=sourcemaps/runner.js.map
