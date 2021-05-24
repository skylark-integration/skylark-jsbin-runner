/**
 * skylark-jsbin-runner - A version of jsbin-runner  that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-jsbin-runner/
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
      require = globals.require,
      isAmd = (typeof define === 'function' && define.amd),
      isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                resolved: false,
                exports: null
            };
            require(id);
        } else {
            map[id] = {
                factory : null,
                resolved : true,
                exports : factory
            };
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.resolved) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args) || null;
            module.resolved = true;
        }
        return module.exports;
    };
  }
  
  if (!define) {
     throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");
  }

  factory(define,require);

  if (!isAmd) {
    var skylarkjs = require("skylark-langx-ns");

    if (isCmd) {
      module.exports = skylarkjs;
    } else {
      globals.skylarkjs  = skylarkjs;
    }
  }

})(function(define,require) {

define('skylark-jsbin-runner/jsbin',[
	"skylark-langx-ns"
],function(skylark){
	var jsbin =  skylark.attach("intg.jsbin");
	return jsbin;
});
define('skylark-jsbin-runner/runner',[
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
define('skylark-jsbin-runner/utils',[
   "./runner"
],function (runner) {
  /**
   * Utilities & polyfills
   */

  var prependChild = function(elem, child) { 
    elem.insertBefore(child, elem.firstChild); 
  };

  var addEvent = function(elem, event, fn) {
    if (elem.addEventListener) {
      elem.addEventListener(event, fn, false);
    } else {
      elem.attachEvent("on" + event, function() {
        // set the this pointer same as addEventListener when fn is called
        return(fn.call(elem, window.event));
      });
    }
  };

  if (!window.location.origin) {
    window.location.origin = window.location.protocol+"//"+window.location.host;
  }

  var throttle = function (fn, delay) {
    var timer = null;
    var throttled = function () {
      var context = this, args = arguments;
      throttled.cancel();
      throttled.timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };

    throttled.cancel = function () {
      clearTimeout(throttled.timer);
    };

    return throttled;
  };

  var cleanse = function (s) {
    return (s||'').replace(/[<&]/g, function (m) { return {'&':'&amp;','<':'&lt;'}[m];});
  };

  var getIframeWindow = function (iframeElement) {
      return iframeElement.contentWindow || iframeElement.contentDocument.parentWindow;
  };

  return runner.utils = {
    prependChild,
    addEvent,
    throttle,
    cleanse,
    getIframeWindow
  }
});
define('skylark-jsbin-runner/sandbox',[
   "./runner",
   "./utils"
],function (runner,utils) {
  /** ============================================================================
   * Sandbox
   * Handles creating and insertion of dynamic iframes
   * ========================================================================== */

  /*globals window document */

    var sandbox = {};

    /**
     * Save the target container element, plus the old and active iframes.
     */
    sandbox.target = null;
    sandbox.old = null;
    sandbox.active = null;
    sandbox.state = {};
    sandbox.guid = +new Date(); // id used to keep track of which iframe is active

    /**
     * Create a new sandboxed iframe.
     */
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

    /**
     * Add a new iframe to the page and wait until it has loaded to call the
     * requester back. Also wait until the new iframe has loaded before removing
     * the old one.
     */
    /**
     * Add a new iframe to the page and wait until it has loaded to call the
     * requester back. Also wait until the new iframe has loaded before removing
     * the old one.
     */
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

    /**
     * Restore the state of a prvious iframe, like scroll position.
     */
    sandbox.restoreState = function (iframe, state) {
      if (!iframe) return {};
      var win = utils.getIframeWindow(iframe);
      if (!win) return {};
      if (state.scroll) {
        win.scrollTo(state.scroll.x, state.scroll.y);
      }
    };

    /**
     * Save the state of an iframe, like scroll position.
     */
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

    /**
     * Attach event listeners and rpevent some default behaviour on the new
     * window during live rendering.
     */
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

    /**
     * Evaluate a command against the active iframe, then use the proxy console
     * to fire information up to the parent
     */
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

    /**
     * Inject a script via a URL into the page
     */
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

    /**
     * Inject full DOM into the page
     */
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

    return runner.sandbox = sandbox;

});
define('skylark-jsbin-runner/commands',[
   "./runner",
   "./utils",
   "./sandbox"
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
        loopProtect.reset();

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
define('skylark-jsbin-runner/processor',[
   "./runner"
],function (runner) {
  /** =========================================================================
   * Processor
   * Modify the prepared source ready to be written to an iframe
   * ========================================================================== */

    var processor = {};

    processor.blockingMethods = {
      kill: '<script>(function(){window.__blocked={methods:["open","print","alert","prompt","confirm"],old:{}};for(var m in __blocked.methods){try {__blocked.old[m]=window[m];window[m]=function(){};}catch(e){}}})()</script>',
      // RS: the empty comment in the end of the harness, ensures any
      // open comments are closed, and will ensure the harness is hidden
      // from the user.
      restore: '<!--jsbin live harness--><script>(function(){for(var m in __blocked.methods){try{window[m]=__blocked.old[m];delete __blocked;}catch(e){}};})()</script>'
    };

    /**
     * Grab the doctype from a string.
     *
     * Returns an object with doctype and tail keys.
     */
    processor.getDoctype = (function () {
      // Cached regex
      // [\s\S] matches multiline doctypes
      var regex = /<!doctype [\s\S]*?>/i;
      return function (str) {
        var doctype = (str.match(regex) || [''])[0],
            tail = str.substr(doctype.length);
        return {
          doctype: doctype,
          tail: tail
        };
      };
    }());

    /**
     * Replace HTML characters with encoded equivatents for debug mode.
     */
    processor.debug = function (source) {
      return '<pre>' + source.replace(/[<>&]/g, function (m) {
        if (m == '<') return '&lt;';
        if (m == '>') return '&gt;';
        if (m == '&') return '&amp;';
      }) + '</pre>';
    };

    /**
     * Render – build the final source code to be written to the iframe. Takes
     * the original source and an options object.
     */
    processor.render = function (source, options) {

      options = options || {};
      source = source || '';

      var combinedSource = [],
          realtime = (options.requested !== true),
          noRealtimeJs = (options.includeJsInRealtime === false);

      // If the render was realtime and we don't want javascript in realtime
      // renders – Auto-run JS is unchecked – then strip out the Javascript
      if (realtime && noRealtimeJs) {
        source = source.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }

      // Strip autofocus from the markup, preventing the focus switching out of
      // the editable area.
      source = source.replace(/(<.*?\s)(autofocus)/g, '$1');

      // Make sure the doctype is the first thing in the source
      var doctypeObj = processor.getDoctype(source),
          doctype = doctypeObj.doctype;
      source = doctypeObj.tail;
      combinedSource.push(doctype);

      // Kill the blocking functions
      // IE requires that this is done in the script, rather than off the window
      // object outside of the doc.write.
      if (realtime && options.includeJsInRealtime) {
        combinedSource.push(processor.blockingMethods.kill);
      }

      // Push the source, split from the doctype above.
      combinedSource.push(source);

      // Restore the blocking functions
      if (realtime && options.includeJsInRealtime) {
        combinedSource.push(processor.blockingMethods.restore);
      }

      // In debug mode return an escaped version
      if (options.debug) {
        return processor.debug(combinedSource.join('\n'));
      }

      return combinedSource.join('\n');

    };

    return runner.processor = processor;

});

define('skylark-jsbin-runner/proxy-console',[
   "./runner"
],function (runner) {
  /** =========================================================================
   * Console
   * Proxy console.logs out to the parent window
   * ========================================================================== */

  var proxyConsole = (function () {
    'use strict';
    /*global stringify, runner*/
    var supportsConsole = true;
    try { window.console.log('d[ o_0 ]b'); } catch (e) { supportsConsole = false; }

    var proxyConsole = function() {};

    /**
     * Stringify all of the console objects from an array for proxying
     */
    var stringifyArgs = function (args) {
      var newArgs = [];
      // TODO this was forEach but when the array is [undefined] it wouldn't
      // iterate over them
      var i = 0, length = args.length, arg;
      for(; i < length; i++) {
        arg = args[i];
        if (typeof arg === 'undefined') {
          newArgs.push('undefined');
        } else {
          newArgs.push(stringify(arg));
        }
      }
      return newArgs;
    };

    // Create each of these methods on the proxy, and postMessage up to JS Bin
    // when one is called.
    var methods = proxyConsole.prototype.methods = [
      'debug', 'clear', 'error', 'info', 'log', 'warn', 'dir', 'props', '_raw',
      'group', 'groupEnd', 'dirxml', 'table', 'trace', 'assert', 'count',
      'markTimeline', 'profile', 'profileEnd', 'time', 'timeEnd', 'timeStamp',
      'groupCollapsed'
    ];

    methods.forEach(function (method) {
      // Create console method
      proxyConsole.prototype[method] = function () {
        // Replace args that can't be sent through postMessage
        var originalArgs = [].slice.call(arguments),
            args = stringifyArgs(originalArgs);

        // Post up with method and the arguments
        runner.postMessage('console', {
          method: method === '_raw' ? originalArgs.shift() : method,
          args: method === '_raw' ? args.slice(1) : args
        });

        // If the browner supports it, use the browser console but ignore _raw,
        // as _raw should only go to the proxy console.
        // Ignore clear if it doesn't exist as it's beahviour is different than
        // log and we let it fallback to jsconsole for the panel and to nothing
        // for the browser console
        if (window.console) {
          if (!console[method]) {
            method = 'log';
          }

          if (window.console && method !== '_raw') {
            if (method !== 'clear' || (method === 'clear' && console.clear)) {
              console[method].apply(console, originalArgs);
            }
          }
        }
      };
    });

    return new proxyConsole();

  }());

  return runner.proxyConsole = proxyConsole;
});
define('skylark-jsbin-runner/init',[
  "./runner",
  "./utils",
  "./sandbox",
],function(runner,utils,sandbox){


  /** =========================================================================
   * JS Bin Runner
   * ========================================================================== */
  function init() {


    window.onload = function () {
      // from index.js

      /**
       * Live rendering, basic mode.
       * Fallback - load the bin into a new iframe, and let it keep itself up
       * to date using event stream.
       */
      if (!window.postMessage) {
        var iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-modals allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts');
        iframe.setAttribute('frameBorder', '0');
        document.body.appendChild(iframe);
        iframe.src = window.name;
        return;
      }

      /**
       * Live rendering, postMessage style.
       */

      // Set the sandbox target
      sandbox.target = document.getElementById('sandbox-wrapper');
      // Hook into postMessage
      utils.addEvent(window, 'message', runner.handleMessage);

    };

  }

  return runner.init = init;

});

define('skylark-jsbin-runner/main',[
	"./runner",
	"./commands",
	"./processor",
	"./proxy-console",
	"./runner",
	"./sandbox",
	"./utils",
	"./init"
],function(runner){
	return runner;
});
define('skylark-jsbin-runner', ['skylark-jsbin-runner/main'], function (main) { return main; });


},this);
//# sourceMappingURL=sourcemaps/skylark-jsbin-runner.js.map