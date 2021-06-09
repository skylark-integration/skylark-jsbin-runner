/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["./runner","./utils","./sandbox"],function(e,n,o){"use strict";return e.init=function(){window.onload=function(){if(!window.postMessage){var t=document.createElement("iframe");return t.setAttribute("sandbox","allow-modals allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts"),t.setAttribute("frameBorder","0"),document.body.appendChild(t),void(t.src=window.name)}o.init(document.getElementById("sandbox-wrapper")),n.addEvent(window,"message",e.handleMessage)}}});
//# sourceMappingURL=sourcemaps/init.js.map
