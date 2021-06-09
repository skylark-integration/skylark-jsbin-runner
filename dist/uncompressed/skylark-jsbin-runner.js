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
    'use strict';
	var jsbin =  skylark.attach("intg.jsbin");
	return jsbin;
});
define('skylark-jsbin-runner/runner',[
   "skylark-loopprotect",
   "./jsbin"
],function (loopProtect,jsbin) {
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
    'use strict';
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
define('skylark-jsbin-runner/proxy-console',[
   "./runner"
],function (runner) {
    'use strict';
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
          newArgs.push(JSON.stringify(arg));  // stringify => JSON.stringify
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
define('skylark-jsbin-runner/processor',[
   "skylark-loopprotect",
   "./runner"
],function (loopProtect, runner) {
    'use strict';
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


    //moved from render/live.js(getPreparedCode)
    var escapeMap = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;'
    }, re = {
        docReady: /\$\(document\)\.ready/,
        shortDocReady: /\$\(function/,
        console: /(^.|\b)console\.(\S+)/g,

        script: /<\/script/ig,
        code: /%code%/,
        csscode: /%css%/,

        description: /(<meta name="description" content=")([^"]*)/im,
        title: /<title>(.*)<\/title>/im,
        winLoad: /window\.onload\s*=/,
        scriptopen: /<script/gi
    };

    processor.prepare = function(codes) {
      // reset all the regexp positions for reuse
      re.docReady.lastIndex = 0;
      re.shortDocReady.lastIndex = 0;
      re.console.lastIndex = 0;
      re.script.lastIndex = 0;
      re.code.lastIndex = 0;
      re.csscode.lastIndex = 0;
      re.title.lastIndex = 0;
      re.winLoad.lastIndex = 0;
      re.scriptopen.lastIndex = 0;

      var parts = [],
          html = codes.html,
          js = codes.javascript || '',
          css = codes.css,
          close = '',
          hasHTML = !!html.trim().length,
          hasCSS = !!css.trim().length,
          hasJS = !!js.trim().length,
          replaceWith = 'window.runnerWindow.proxyConsole.';

      // this is used to capture errors with processors, sometimes their errors
      // aren't useful (Script error. (line 0) #1354) so we try/catch and then
      // throw the real error. This also works exactly as expected with non-
      // processed JavaScript
      if (hasHTML) {
        js = 'try {' + js + '\n} catch (error) { throw error; }';
      }

      loopProtect.alias = 'window.runnerWindow.protect';

      // Rewrite loops to detect infiniteness.
      // This is done by rewriting the for/while/do loops to perform a check at
      // the start of each iteration.
      js = loopProtect(js);

      // escape any script tags in the JS code, because that'll break the mushing together
      js = js.replace(re.script, '<\\/script');

      // redirect console logged to our custom log while debugging
      if (re.console.test(js)) {
        // yes, this code looks stupid, but in fact what it does is look for
        // 'console.' and then checks the position of the code. If it's inside
        // an openning script tag, it'll change it to window.top._console,
        // otherwise it'll leave it.
        js = js.replace(re.console, function (all, str, arg) {
          return replaceWith + arg;
        });
      }

      // note that I'm using split and reconcat instead of replace, because if
      // the js var contains '$$' it's replaced to '$' - thus breaking Prototype
      // code. This method gets around the problem.
      if (!hasHTML && hasJS) {
        html = '<pre>\n' + js.replace(/[<>&]/g, function (m) {
          return escapeMap[m];
        }) + '</pre>';
      } else if (re.code.test(html)) {
        html = html.split('%code%').join(code.javascript);
      } else if (hasJS) {
        close = '';
        if (html.indexOf('</body>') !== -1) {
          parts.push(html.substring(0, html.lastIndexOf('</body>')));
          parts.push(html.substring(html.lastIndexOf('</body>')));

          html = parts[0];
          close = parts.length === 2 && parts[1] ? parts[1] : '';
        }

        // TODO
        ///var type = jsbin.panels.named.javascript.type ? ' type="text/' + jsbin.panels.named.javascript.type + '"' : '';
        /// js += '\n\n//# sourceURL=' + jsbin.state.code + '.js';
        var type = "text/script";

        html += '<script' + type + '>' + js + '\n</script>\n' + close;
      }

      // reapply the same proxyConsole - but to all the html code, since
      if (re.console.test(html)) {
        // yes, this code looks stupid, but in fact what it does is look for
        // 'console.' and then checks the position of the code. If it's inside
        // an openning script tag, it'll change it to window.top._console,
        // otherwise it'll leave it.
        var first = ' /* double call explained https://github.com/jsbin/jsbin/issues/1833 */';
        html = html.replace(re.console, function (all, str, arg, pos) {
          var open = html.lastIndexOf('<script', pos),
              close = html.lastIndexOf('</script', pos),
              info = first;

          first = null;

          if (open > close) {
            return replaceWith + arg;
          } else {
            return all;
          }
        });
      }

      if (!hasHTML && !hasJS && hasCSS) {
        html = '<pre>\n' + css.replace(/[<>&]/g, function (m) {
          return escapeMap[m];
        }) + '</pre>';
      } else if (re.csscode.test(html)) {
        html = html.split('%css%').join(css);
      } else if (hasHTML) {
        parts = [];
        close = '';
        if (html.indexOf('</head>') !== -1) {
          parts.push(html.substring(0, html.indexOf('</head>')));
          parts.push(html.substring(html.indexOf('</head>')));

          html = parts[0];
          close = parts.length === 2 && parts[1] ? parts[1] : '';
        }

        // if the focused panel is CSS, then just return the css NOW
        ///if (jsbin.state.hasBody && jsbin.panels.focused.id === 'css') {
        ///  return css;
        ///}

        html += '<style id="jsbin-css">\n' + css + '\n</style>\n' + close;
      }

      // Add defer to all inline script tags in IE.
      // This is because IE runs scripts as it loads them, so variables that
      // scripts like jQuery add to the global scope are undefined.
      // See http://jsbin.com/ijapom/5
      ///if (jsbin.ie && re.scriptopen.test(html)) {
      ///  html = html.replace(/<script(.*?)>/gi, function (all, match) {
      ///    if (match.indexOf('src') !== -1) {
      ///      return all;
      ///    } else {
      ///      return '<script defer' + match + '>';
      ///    }
      ///  });
      ///}

      return html;
    };

    return runner.processor = processor;

});

define('skylark-jsbin-runner/sandbox',[
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
define('skylark-jsbin-runner/commands',[
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
define('skylark-jsbin-runner/init',[
  "./runner",
  "./utils",
  "./sandbox",
],function(runner,utils,sandbox){
    'use strict';


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
      ///sandbox.target = document.getElementById('sandbox-wrapper');
      sandbox.init(document.getElementById('sandbox-wrapper'));
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
