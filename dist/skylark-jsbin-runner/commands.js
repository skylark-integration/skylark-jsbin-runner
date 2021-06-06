/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["skylark-loopprotect","./runner","./utils","./proxy-console","./sandbox","./processor"],function(o,e,n,s,r,c){"use strict";var t={render:function(t){if(t.options.injectCSS&&r.active){var i=r.active.contentDocument.getElementById("jsbin-css");if(i)return void(i.innerHTML=t.source||t.codes&&t.codes.css)}var a=r.create(t.options);r.use(a,function(){var i=a.contentDocument,u=n.getIframeWindow(a);i||(i=u.document),s.methods.forEach(function(o){delete s[o]}),!t.source&&t.codes&&(t.source=c.prepare(t.codes));var d=c.render(t.source,t.options);i.open(),i.write(""),u.runnerWindow={proxyConsole:s,protect:o},u.console=s,o.reset(),u.onerror=function(o,e,n,r,c){s._raw("error",c&&c.stack?c.stack:o+" (line "+n+")")},i.write(d),i.close(),e.postMessage("complete"),r.wrap(u,t.options)})},"console:run":function(o){r.eval(o)},"console:load:script":function(o){r.injectScript(o,function(n){if(n)return e.postMessage("console:load:script:error",n);e.postMessage("console:load:script:success",o)})},"console:load:dom":function(o){r.injectDOM(o,function(o){if(o)return e.postMessage("console:load:dom:error",o);e.postMessage("console:load:dom:success")})}};return e.commands=t});
//# sourceMappingURL=sourcemaps/commands.js.map
