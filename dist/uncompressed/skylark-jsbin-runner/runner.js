define([
   "./jsbin"
],function (jsbin) {
  /** ============================================================================
   * JS Bin Runner
   * Accepts incoming postMessage events and updates a live iframe accordingly.
   * ========================================================================== */
  /*globals sandbox loopProtect window alert */
    'use strict';
    var runner = {};

    /**
     * Update the loop protoction hit function to send an event up to the parent
     * window so we can insert it in our error UI
     */
    loopProtect.hit = function (line) {
      console.warn('Exiting potential infinite loop at line ' + line + '. To disable loop protection: add "// noprotect" to your code');
      runner.postMessage('loopProtectHit', line);
    }

    /**
     * Store what parent origin *should* be
     */
    runner.parent = {};
    runner.parent.origin = '*';

    /**
     * Log error messages, indicating that it's from the runner.
     */
    runner.error = function () {
      var args = ['Runner:'].concat([].slice.call(arguments));
      if (!('console' in window)) {return alert(args.join(' '));}
      //window.console.error.apply(console, args);
    };

    /**
     * Handle all incoming postMessages to the runner
     */
    runner.handleMessage = function (event) {
      if (!event.origin) {return;}
      var data = event.data;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch (e) {
        return runner.error('Error parsing event data:', e.message);
      }
      if (runner.commands && typeof runner.commands[data.type] !== 'function') {
        return runner.error('No matching event handler:', data.type);
      }
      runner.parent.source = event.source;
      try {
        runner.commands[data.type](data.data);
      } catch (e) {
        runner.error(e.message);
      }
    };

    /**
     * Send message to the parent window
     */
    runner.postMessage = function (type, data) {
      if (!runner.parent.source) {
        return runner.error('No postMessage connection to parent window.');
      }
      runner.parent.source.postMessage(JSON.stringify({
        type: type,
        data: data
      }), runner.parent.origin);
    };

     return jsbin.runner = runner;

});