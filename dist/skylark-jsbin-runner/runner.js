/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
define(["skylark-appify-runner","./jsbin"],function(n,e){return n.initJsbinRunner=function(){return this.init(document.getElementById("sandbox-wrapper"),{cssTextTagId:"jsbin-css"})},e.runner=n});
//# sourceMappingURL=sourcemaps/runner.js.map
