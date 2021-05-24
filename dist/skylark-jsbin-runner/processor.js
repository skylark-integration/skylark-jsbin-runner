/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["./runner"],function(e){var t,n={};return n.blockingMethods={kill:'<script>(function(){window.__blocked={methods:["open","print","alert","prompt","confirm"],old:{}};for(var m in __blocked.methods){try {__blocked.old[m]=window[m];window[m]=function(){};}catch(e){}}})()<\/script>',restore:"\x3c!--jsbin live harness--\x3e<script>(function(){for(var m in __blocked.methods){try{window[m]=__blocked.old[m];delete __blocked;}catch(e){}};})()<\/script>"},n.getDoctype=(t=/<!doctype [\s\S]*?>/i,function(e){var n=(e.match(t)||[""])[0];return{doctype:n,tail:e.substr(n.length)}}),n.debug=function(e){return"<pre>"+e.replace(/[<>&]/g,function(e){return"<"==e?"&lt;":">"==e?"&gt;":"&"==e?"&amp;":void 0})+"</pre>"},n.render=function(e,t){t=t||{},e=e||"";var o=[],r=!0!==t.requested,c=!1===t.includeJsInRealtime;r&&c&&(e=e.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,"")),e=e.replace(/(<.*?\s)(autofocus)/g,"$1");var i=n.getDoctype(e),d=i.doctype;return e=i.tail,o.push(d),r&&t.includeJsInRealtime&&o.push(n.blockingMethods.kill),o.push(e),r&&t.includeJsInRealtime&&o.push(n.blockingMethods.restore),t.debug?n.debug(o.join("\n")):o.join("\n")},e.processor=n});
//# sourceMappingURL=sourcemaps/processor.js.map
