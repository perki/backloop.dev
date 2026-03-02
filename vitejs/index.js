/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
import backloopHttpsOptions from 'backloop.dev';

function backloop(hostname = 'whatever', port) {
  return {
    name: 'backloop.dev',
    apply: 'serve',
    config(options) {
      options.server = options.server || {};
      options.server.host = `${hostname}.backloop.dev`;
      options.server.https = backloopHttpsOptions;
      options.server.port = port || options.server.port;
    }
  }
}

export default backloop;