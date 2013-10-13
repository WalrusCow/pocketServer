var url = require('url');
var http = require('http');
var path = require('path');
var fs = require('fs');

var urlList = [];
var webServer;

// Route a request to a specific handler
function route(url, handler, method) {
  // TODO : Add different methods (only GET right now)
  urlList.push({
    url : url,
    handler : handler
  });
}

// Determine if the request matches the specified url
function urlMatch(urlPattern, url) {
  if (urlPattern instanceof RegExp) {
    return urlPattern.test(url);
  }
  return urlPattern === url || urlPattern + '/' === url;
}

// Add a handler for a specific url
function addHandler(queryUrl, urlHandler, siteHandler) {
  // The new layer to add
  function newLayer(req, res) {
    var urlPath = url.parse(req.url).pathname;
    if (urlMatch(queryUrl, url.parse(req.url).pathname)) {
      return urlHandler(req, res);
    }
    else {
      return siteHandler(req, res);
    }
  }
  return newLayer;
}

// Generate a handler for the site
function generateHandler() {
  // The last function returns 404 since no urls matched
  function baseHandler(req, res) {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('404 Not Found\n');
    res.end();
  }
  var siteHandler = baseHandler;
  for (var i = 0; i < urlList.length; ++i) {
    siteHandler = addHandler(urlList[i].url, urlList[i].handler, siteHandler);
  }

  function wrapTopHandler(siteHandler) {
    function topHandler(req, res) {
      console.log(req.url);
      return siteHandler(req, res);
    }
    return topHandler;
  }
  return wrapTopHandler(siteHandler);
}

// Run the server
function run(port, hostname) {
  port = port || 8080;
  hostname = hostname || '127.0.0.1';
  var siteHandler = generateHandler();

  console.log('Starting web server ...');
  webServer = http.createServer(siteHandler);
  webServer.listen(port, hostname);
}

// Shut the server
function close() {
  webServer.close();
}

// Default function to serve static file
function serveStatic(req, res) {
  var urlParts = url.parse(req.url);
  var uri = urlParts.pathname;

  var filePath = path.join(process.cwd(), uri);

  return serveFile(res, filePath);
}

// Serve file to response
function serveFile(res, filePath) {
  // If file is not an absolute path then prepend the cwd
  if (filePath && filePath[0] !== '/') {
    filePath = path.join(process.cwd(), filePath);
  }

  // If file does not exist or is a directory return 404
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, {'Content-Type' : 'text/plain'});
    res.write('404 Not Found\n');
    res.end();
    return;
  }

  fs.readFile(filePath, 'binary', function(err, file) {
    if (err) {
      console.log(err);
      res.writeHead(500, {'Content-Type' : 'text/plain'});
      res.write('500 Internal Server Error\n');
      res.end();
    }
    res.writeHead(200, {'Content-Type' : 'text/html'});
    res.write(file, 'binary');
    res.end();
  });
}

exports.route = route;
exports.run = run;
exports.close = close;
exports.serveStatic = serveStatic;
exports.serveFile = serveFile;
