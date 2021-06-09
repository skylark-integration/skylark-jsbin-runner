define([
   "./runner",
   "./utils",
   "./sandbox",
],function (runner,utils,sandbox) {
  /** ============================================================================
   * JS Bin Runner
   * Accepts incoming postMessage events and updates a live iframe accordingly.
   * ========================================================================== */
  /*globals sandbox loopProtect window alert */
    'use strict';

    var commands = {};

    /**
     * Render a new preview iframe using the posted source
     */
    commands.render = function (data) {
      if (data.options.injectCSS && sandbox.isActive()) {
        let cssText =  data.source || (data.codes && data.codes.css);
        return sandbox.injectCssText(cssText);
      }
      return sandbox.render(data);
    };

    /**
     * Run console commands against the iframe's scope
     */
    commands['console:run'] = function (cmd) {
      sandbox.eval(cmd);
    };

    /**
     * Load script into the apge
     */
    commands['console:load:script'] = function (url) {
      sandbox.injectScript(url, function (err) {
        if (err) return runner.postMessage('console:load:script:error', err);
        runner.postMessage('console:load:script:success', url);
      });
    };

    /**
     * Load DOM into the apge
     */
    commands['console:load:dom'] = function (html) {
      sandbox.injectDOM(html, function (err) {
        if (err) return runner.postMessage('console:load:dom:error', err);
        runner.postMessage('console:load:dom:success');
      });
    };

    return runner.commands = commands;

});