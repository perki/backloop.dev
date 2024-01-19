/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const https = require('https');
const path = require('path');
const fs = require('fs');

const express = require('express');
const app = express();

const { httpsOptionsPromise } = require('..');

// -- read the arguments
if (process.argv.length < 3) {
  exitWithTip('missing arguments');
}
const dirPath = path.resolve(path.normalize(process.argv[2]));
if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
  exitWithTip(`'${dirPath}' is not existing or not a directory`);
}

let port = 4443;
if (process.argv[3]) {
  port = parseInt(process.argv[3], 10);
  if ((isNaN(process.argv[3])) || (port < 1 || port > 65535)) {
    exitWithTip(`'${process.argv[3]}' is not a valid port number`);
  }
}

// -- launch server

// Tiny middleware to allow CORS (cross-domain) requests to the API.
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Serve static files
app.use(express.static(dirPath));

// Custom error messages
app.use(function (req, res) {
  res.status(404).send(`Could not find file '${req.url}'<br>` +
    'Served by <a href="https://backloop.dev">backloop.dev</a>');
});

(async () => {
  const options = await httpsOptionsPromise();
  https.createServer(options, app).listen(port);
  console.log(`Server started on port ${port} serving files in '${dirPath}'\n` +
    `You can open https://whatever.backloop.dev:${port}/`);

})();


function exitWithTip(tip) {
  console.error(`Error: ${tip}\n` +
    `Usage: ${path.basename(process.argv[1])} <path> [<port>]`);
  process.exit(0);
}
