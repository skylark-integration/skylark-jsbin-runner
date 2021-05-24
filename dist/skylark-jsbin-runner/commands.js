/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["./runner","./utils","./sandbox"],function(o,e,n){"use strict";var r={render:function(r){if(r.options.injectCSS&&n.active){var s=n.active.contentDocument.getElementById("jsbin-css");if(s)return void(s.innerHTML=r.source)}var t=n.create(r.options);n.use(t,function(){var s=t.contentDocument,c=e.getIframeWindow(t);s||(s=c.document),proxyConsole.methods.forEach(function(o){delete proxyConsole[o]});var i=processor.render(r.source,r.options);s.open(),s.write(""),c.runnerWindow={proxyConsole:proxyConsole,protect:loopProtect},c.console=proxyConsole,loopProtect.reset(),c.onerror=function(o,e,n,r,s){proxyConsole._raw("error",s&&s.stack?s.stack:o+" (line "+n+")")},s.write(i),s.close(),o.postMessage("complete"),n.wrap(c,r.options)})},"console:run":function(o){n.eval(o)},"console:load:script":function(e){n.injectScript(e,function(n){if(n)return o.postMessage("console:load:script:error",n);o.postMessage("console:load:script:success",e)})},"console:load:dom":function(e){n.injectDOM(e,function(e){if(e)return o.postMessage("console:load:dom:error",e);o.postMessage("console:load:dom:success")})}};return o.commands=r});
//# sourceMappingURL=sourcemaps/commands.js.map
