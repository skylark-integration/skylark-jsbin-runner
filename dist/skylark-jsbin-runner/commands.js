/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["skylark-loopprotect","./runner","./utils","./sandbox"],function(o,e,n,r){"use strict";var s={render:function(s){if(s.options.injectCSS&&r.active){var t=r.active.contentDocument.getElementById("jsbin-css");if(t)return void(t.innerHTML=s.source)}var c=r.create(s.options);r.use(c,function(){var t=c.contentDocument,i=n.getIframeWindow(c);t||(t=i.document),proxyConsole.methods.forEach(function(o){delete proxyConsole[o]}),!s.source&&s.codes&&(s.source=processor.prepare(s.codes));var a=processor.render(s.source,s.options);t.open(),t.write(""),i.runnerWindow={proxyConsole:proxyConsole,protect:o},i.console=proxyConsole,o.reset(),i.onerror=function(o,e,n,r,s){proxyConsole._raw("error",s&&s.stack?s.stack:o+" (line "+n+")")},t.write(a),t.close(),e.postMessage("complete"),r.wrap(i,s.options)})},"console:run":function(o){r.eval(o)},"console:load:script":function(o){r.injectScript(o,function(n){if(n)return e.postMessage("console:load:script:error",n);e.postMessage("console:load:script:success",o)})},"console:load:dom":function(o){r.injectDOM(o,function(o){if(o)return e.postMessage("console:load:dom:error",o);e.postMessage("console:load:dom:success")})}};return e.commands=s});
//# sourceMappingURL=sourcemaps/commands.js.map
