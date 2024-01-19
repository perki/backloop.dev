/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const https = require('https');
const http = require('http');
const path = require('path');

const httpsOptionsAsync = require('..').httpsOptionsAsync;

// -- read the arguments
if (process.argv.length < 3) {
  exitWithTip('missing arguments');
}

let port = 4443;
if (process.argv[3]) {
  port = parseInt(process.argv[3], 10);
  if (isNaN(port) || (port < 1 || port > 65535)) {
    exitWithTip(`'${process.argv[3]}' is not a valid port number`);
  }
}

const hostnameAndPort = process.argv[2].split(':');
const hostname = hostnameAndPort[0];
const hostport = hostnameAndPort[1] || 80;
if (isNaN(hostport) || (hostport < 1 || hostport > 65535)) {
  exitWithTip(`'${hostport}' is not a valid port number`);
}

httpsOptionsAsync(function (err, httpsOptions) {
  if (err) { console.error(err); return; }
  https.createServer(httpsOptions, onRequest).listen(port);
});

function onRequest (clientReq, clientRes) {
  console.log('serve: ' + clientReq.url);

  function writeError (str) {
    clientRes.statusCode = 500;
    clientRes.write(str);
    clientRes.end();
    console.log('failed: ' + clientReq.url + ' > ' + str);
  }

  try {
    const options = {
      hostname: hostname,
      port: hostport,
      path: clientReq.url,
      method: clientReq.method,
      headers: clientReq.headers
    };

    const proxy = http.request(options, function (res) {
      clientRes.writeHead(res.statusCode, res.headers);
      res.pipe(clientRes, {
        end: true
      });
    });

    proxy.on('error', function (e) {
      writeError(e.message);
    });

    proxy.on('timeout', function () {
      writeError('timeout');
    });

    clientReq.pipe(proxy, {
      end: true
    });
  } catch (e) {
    writeError(e.message);
  }
}

function exitWithTip (tip) {
  console.error(`Error: ${tip}\n` +
    `Usage: ${path.basename(process.argv[1])} <target host>[:<target port>] [<port>]`);
  process.exit(0);
}

console.log(`Proxy started on port ${port} serving http://${hostname}:${hostport}\n` +
  `You can open https://l.backloop.dev:${port}/`);
