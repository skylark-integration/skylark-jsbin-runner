define([
   "skylark-loopprotect",
   "./runner",
   "./utils",
   "./sandbox"
],function (loopProtect,runner,utils,sandbox) {
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
      // if we're just changing CSS, let's try to inject the change
      // instead of doing a full render
      if (data.options.injectCSS) {
        if (sandbox.active) {
          var style = sandbox.active.contentDocument.getElementById('jsbin-css');
          if (style) {
            style.innerHTML = data.source;
            return;
          }
        }
      }

      var iframe = sandbox.create(data.options);
      sandbox.use(iframe, function () {
        var childDoc = iframe.contentDocument,
            childWindow = utils.getIframeWindow(iframe);
        if (!childDoc) childDoc = childWindow.document;

        // Reset the console to the prototype state
        proxyConsole.methods.forEach(function (method) {
          delete proxyConsole[method];
        });


        // Process the source according to the options passed in
        if (!data.source && data.codes) { // added by lwf
          data.source = processor.prepare(data.codes);
        }
        var source = processor.render(data.source, data.options);

        // Start writing the page. This will clear any existing document.
        childDoc.open();

        // We need to write a blank line first – Firefox blows away things you add
        // to the child window when you do the fist document.write.
        // Note that each document.write fires a DOMContentLoaded in Firefox.
        // This method exhibits synchronous and asynchronous behaviour, depending
        // on the browser. Urg.
        childDoc.write('');

        // Give the child a reference to things it needs. This has to go here so
        // that the user's code (that runs as a result of the following
        // childDoc.write) can access the objects.
        childWindow.runnerWindow = {
          proxyConsole: proxyConsole,
          protect: loopProtect,
        };

        childWindow.console = proxyConsole;

        // Reset the loop protection before rendering
        loopProtect.reset(); //TODO:

        // if there's a parse error this will fire
        childWindow.onerror = function (msg, url, line, col, error) {
          // show an error on the jsbin console, but not the browser console
          // (i.e. use _raw), because the browser will throw the native error
          // which (hopefully) includes a link to the JavaScript VM at that time.
          proxyConsole._raw('error', error && error.stack ? error.stack : msg + ' (line ' + line + ')');
        };

        // Write the source out. IE crashes if you have lots of these, so that's
        // why the source is rendered above (processor.render) – it should be one
        // string. IE's a sensitive soul.
        childDoc.write(source);
        // childDoc.documentElement.innerHTML = source;

        // Close the document. This will fire another DOMContentLoaded.
        childDoc.close();

        runner.postMessage('complete');

        // Setup the new window
        sandbox.wrap(childWindow, data.options);
      });
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