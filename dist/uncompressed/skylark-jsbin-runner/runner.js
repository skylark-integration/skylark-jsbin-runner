define([
   "skylark-appify-runner",
   "./jsbin"
],function (runner,jsbin) {

    runner.initJsbinRunner = function() {
      return this.init(document.getElementById('sandbox-wrapper'),{
        cssTextTagId : "jsbin-css"
      })
    }

        ///sandbox.init(document.getElementById('sandbox-wrapper'),options);

     return jsbin.runner = runner;
});