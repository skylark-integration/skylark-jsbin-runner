/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["skylark-loopprotect","./runner","./utils","./proxy-console","./sandbox","./processor"],function(o,e,n,r,s,t){"use strict";var c={render:function(c){if(c.options.injectCSS&&s.active){var i=s.active.contentDocument.getElementById("jsbin-css");if(i)return void(i.innerHTML=c.source)}var a=s.create(c.options);s.use(a,function(){var i=a.contentDocument,u=n.getIframeWindow(a);i||(i=u.document),r.methods.forEach(function(o){delete r[o]}),!c.source&&c.codes&&(c.source=t.prepare(c.codes));var l=t.render(c.source,c.options);i.open(),i.write(""),u.runnerWindow={proxyConsole:r,protect:o},u.console=r,o.reset(),u.onerror=function(o,e,n,s,t){r._raw("error",t&&t.stack?t.stack:o+" (line "+n+")")},i.write(l),i.close(),e.postMessage("complete"),s.wrap(u,c.options)})},"console:run":function(o){s.eval(o)},"console:load:script":function(o){s.injectScript(o,function(n){if(n)return e.postMessage("console:load:script:error",n);e.postMessage("console:load:script:success",o)})},"console:load:dom":function(o){s.injectDOM(o,function(o){if(o)return e.postMessage("console:load:dom:error",o);e.postMessage("console:load:dom:success")})}};return e.commands=c});
//# sourceMappingURL=sourcemaps/commands.js.map
