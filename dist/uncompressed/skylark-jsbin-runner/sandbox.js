define([
   "skylark-loopprotect",
   "skylark-domx-plugins-sandboxs/sandbox",
   "./runner",
   "./utils",
   "./proxy-console",
   "./processor"
],function (loopProtect,Sandbox,runner,utils,proxyConsole,processor) {
    'use strict';
  /** ============================================================================
   * Sandbox
   * Handles creating and insertion of dynamic iframes
   * ========================================================================== */
   /*

    var sandbox = {};


    sandbox.target = null;
    sandbox.old = null;
    sandbox.active = null;
    sandbox.state = {};
    sandbox.guid = +new Date(); // id used to keep track of which iframe is active


    sandbox.create = function () {
      var iframe = document.createElement('iframe');
      // iframe.src = window.location.origin + '/runner-inner';
      iframe.setAttribute('sandbox', 'allow-modals allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts');
      iframe.setAttribute('frameBorder', '0');
      iframe.setAttribute('name', 'JS Bin Output ');
      iframe.id = sandbox.guid++;
      // sandbox.active = iframe;
      return iframe;
    };

    sandbox.use = function (iframe, done) {
      if (!sandbox.target) {
        throw new Error('Sandbox has no target element.');
      }
      sandbox.old = sandbox.active;
      sandbox.saveState(sandbox.old);
      sandbox.active = iframe;
      utils.prependChild(sandbox.target, iframe);
      // setTimeout allows the iframe to be rendered before other code runs,
      // allowing us access to the calculated properties like innerWidth.
      setTimeout(function () {
        // call the code that renders the iframe source
        if (done) {
          done();
        }

        // remove *all* the iframes, baring the active one
        var iframes = sandbox.target.getElementsByTagName('iframe');
        var length = iframes.length;
        var i = 0;
        var id = sandbox.active.id;
        var iframe;

        for (; iframe = iframes[i], i < length; i++) {
          if (iframe.id !== id) {
            iframe.parentNode.removeChild(iframe);
            length--;
          }
        }
      }, 0);
    };


    sandbox.restoreState = function (iframe, state) {
      if (!iframe) return {};
      var win = utils.getIframeWindow(iframe);
      if (!win) return {};
      if (state.scroll) {
        win.scrollTo(state.scroll.x, state.scroll.y);
      }
    };


    sandbox.saveState = function (iframe) {
      if (!iframe) return {};
      var win = utils.getIframeWindow(iframe);
      if (!win) return {};
      return {
        scroll: {
          x: win.scrollX,
          y: win.scrollY
        }
      };
    };


    sandbox.wrap = function (childWindow, options) {
      if (!childWindow) return;
      options = options || {};

      // Notify the parent of resize events (and send one straight away)
      utils.addEvent(childWindow, 'resize', utils.throttle(function () {
        runner.postMessage('resize', sandbox.getSizeProperties(childWindow));
      }, 25));

      runner.postMessage('resize', sandbox.getSizeProperties(childWindow));

      // Notify the parent of a focus
      utils.addEvent(childWindow, 'focus', function () {
        runner.postMessage('focus');
      });

    };

    sandbox.getSizeProperties = function (childWindow) {
      return {
        width: childWindow.innerWidth || childWindow.document.documentElement.clientWidth,
        height: childWindow.innerHeight || childWindow.document.documentElement.clientHeight,
        offsetWidth: childWindow.document.documentElement.offsetWidth,
        offsetHeight: childWindow.document.documentElement.offsetHeight
      };
    };


    sandbox.eval = function (cmd) {
      if (!sandbox.active) throw new Error("sandbox.eval: has no active iframe.");

      var re = /(^.|\b)console\.(\S+)/g;

      if (re.test(cmd)) {
        var replaceWith = 'window.runnerWindow.proxyConsole.';
        cmd = cmd.replace(re, function (all, str, arg) {
          return replaceWith + arg;
        });
      }

      var childWindow = sandbox.active.contentWindow;
      var output = null,
          type = 'log';
      try {
        output = childWindow.eval(cmd);
      } catch (e) {
        output = e.message;
        type = 'error';
      }

      return proxyConsole[type](output);
    };


    sandbox.injectScript = function (url, cb) {
      if (!sandbox.active) throw new Error("sandbox.injectScript: has no active iframe.");
      var childWindow = sandbox.active.contentWindow,
          childDocument = childWindow.document;
      var script = childDocument.createElement('script');
      script.src = url;
      script.onload = function () {
        cb();
      };
      script.onerror = function () {
        cb('Failed to load "' + url + '"');
      };
      childDocument.body.appendChild(script);
    };


    sandbox.injectDOM = function (html, cb) {
      if (!sandbox.active) throw new Error("sandbox.injectDOM: has no active iframe.");
      var childWindow = sandbox.active.contentWindow,
          childDocument = childWindow.document;
      try {
        childDocument.body.innerHTML = html;
      } catch (e) {
        cb("Failed to load DOM.");
      }
      cb();
    };

    */

    var _sandbox;



    return runner.sandbox = {
      init : function(el) {
        _sandbox = new Sandbox(el,{
          cssTextTagId : 'jsbin-css'
        });
      },

      /**
       * Render a new preview iframe using the posted source
       */
      render : function (data) {
        /*
        // if we're just changing CSS, let's try to inject the change
        // instead of doing a full render
        if (data.options.injectCSS) {
          if (sandbox.active) {
            var style = sandbox.active.contentDocument.getElementById('jsbin-css');
            if (style) {
              ///style.innerHTML = data.source; // lwf
              style.innerHTML = data.source || (data.codes && data.codes.css);
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
        */

        // Reset the loop protection before rendering
        loopProtect.reset(); //TODO:

        // Process the source according to the options passed in
        if (!data.source && data.codes) { // added by lwf
          data.source = processor.prepare(data.codes);
        }
        var source = processor.render(data.source, data.options);

        data.options.proxyConsole = proxyConsole;
        data.options.loopProtect = loopProtect;

        _sandbox.render(source,data.options);

        runner.postMessage('complete');

      },

      injectScript : function (url, cb) {
        return _sandbox.injectScript(url,cb);
      },

      injectDOM : function (html, cb)  {
        return _sandbox.injectDOM(html,cb);
      },
      
      injectCssText : function(cssText) {
        return _sandbox.injectCssText(cssText);
      },
      
      eval : function(cmd){
        return _sandbox.eval(cmd);
      },

      isActive : function() {
        return !!_sandbox.active;
      }

    };

});