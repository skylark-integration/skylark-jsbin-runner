define([
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
