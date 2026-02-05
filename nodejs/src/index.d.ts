/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */

/**
 * HTTPS options for use with Node.js https.createServer()
 */
export interface HttpsOptions {
  /** Private key in PEM format */
  key: string;
  /** Certificate in PEM format */
  cert: string;
  /** Certificate Authority chain in PEM format */
  ca: string;
}

/**
 * Callback for httpsOptionsAsync
 */
export type HttpsOptionsCallback = (error: Error | null, options?: HttpsOptions) => void;

/**
 * Synchronously returns HTTPS options for backloop.dev certificates.
 * If certificates are missing or expired, attempts an automatic update
 * and exits the process.
 *
 * @returns HTTPS options object with key, cert, and ca properties
 *
 * @example
 * ```js
 * const https = require('https');
 * const { httpsOptions } = require('backloop.dev');
 *
 * https.createServer(httpsOptions(), app).listen(443);
 * ```
 */
export function httpsOptions(): HttpsOptions;

/**
 * Asynchronously retrieves HTTPS options using a callback.
 * Updates certificates if needed before returning.
 *
 * @param done - Callback called with (error, options)
 *
 * @example
 * ```js
 * const { httpsOptionsAsync } = require('backloop.dev');
 *
 * httpsOptionsAsync((err, options) => {
 *   if (err) throw err;
 *   https.createServer(options, app).listen(443);
 * });
 * ```
 */
export function httpsOptionsAsync(done: HttpsOptionsCallback): void;

/**
 * Asynchronously retrieves HTTPS options using a Promise.
 * Updates certificates if needed before returning.
 *
 * @returns Promise resolving to HTTPS options
 *
 * @example
 * ```js
 * const { httpsOptionsPromise } = require('backloop.dev');
 *
 * const options = await httpsOptionsPromise();
 * https.createServer(options, app).listen(443);
 * ```
 */
export function httpsOptionsPromise(): Promise<HttpsOptions>;
