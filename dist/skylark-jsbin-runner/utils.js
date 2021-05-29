/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["./runner"],function(n){"use strict";window.location.origin||(window.location.origin=window.location.protocol+"//"+window.location.host);return n.utils={prependChild:function(n,t){n.insertBefore(t,n.firstChild)},addEvent:function(n,t,e){n.addEventListener?n.addEventListener(t,e,!1):n.attachEvent("on"+t,function(){return e.call(n,window.event)})},throttle:function(n,t){var e=function(){var i=this,o=arguments;e.cancel(),e.timer=setTimeout(function(){n.apply(i,o)},t)};return e.cancel=function(){clearTimeout(e.timer)},e},cleanse:function(n){return(n||"").replace(/[<&]/g,function(n){return{"&":"&amp;","<":"&lt;"}[n]})},getIframeWindow:function(n){return n.contentWindow||n.contentDocument.parentWindow}}});
//# sourceMappingURL=sourcemaps/utils.js.map
