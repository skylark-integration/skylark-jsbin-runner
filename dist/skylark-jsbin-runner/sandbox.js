/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["skylark-loopprotect","skylark-domx-plugins-sandboxs/sandbox","./runner","./utils","./proxy-console","./processor"],function(e,n,t,o,r,s){"use strict";var c;return t.sandbox={init:function(e){c=new n(e,{cssTextTagId:"jsbin-css"})},render:function(n){e.reset(),!n.source&&n.codes&&(n.source=s.prepare(n.codes));var o=s.render(n.source,n.options);n.options.proxyConsole=r,n.options.loopProtect=e,c.render(o,n.options),t.postMessage("complete")},injectScript:function(e,n){return c.injectScript(e,n)},injectDOM:function(e,n){return c.injectDOM(e,n)},injectCssText:function(e){return c.injectCssText(e)},eval:function(e){return c.eval(e)},isActive:function(){return!!c.active}}});
//# sourceMappingURL=sourcemaps/sandbox.js.map
