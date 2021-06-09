/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["./runner","./utils","./sandbox"],function(e,o,s){"use strict";var n={render:function(e){if(e.options.injectCSS&&s.isActive()){let o=e.source||e.codes&&e.codes.css;return s.injectCssText(o)}return s.render(e)},"console:run":function(e){s.eval(e)},"console:load:script":function(o){s.injectScript(o,function(s){if(s)return e.postMessage("console:load:script:error",s);e.postMessage("console:load:script:success",o)})},"console:load:dom":function(o){s.injectDOM(o,function(o){if(o)return e.postMessage("console:load:dom:error",o);e.postMessage("console:load:dom:success")})}};return e.commands=n});
//# sourceMappingURL=sourcemaps/commands.js.map
