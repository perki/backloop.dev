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

import { IncomingMessage, ServerResponse } from 'http';
import { Server } from 'https';

/** A plain Node request handler. */
export type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

/** A middleware called with a `next` continuation. */
export type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void;

/** One hostname / path route: static files, a proxy target, or a custom handler. */
export interface RouteEntry {
  /** Serve static files from this directory (relative to the config file). */
  path?: string;
  /** Reverse-proxy to this http(s) target. */
  proxy?: string;
  /** Custom vanilla request handler. */
  handler?: RequestHandler;
  /** Remove the matched path prefix before forwarding. Defaults to true. */
  strip?: boolean;
  /** 301-redirect a slash-less request (`/x`) to the trailing-slash form (`/x/`). */
  redirectToSlash?: boolean;
  /** Per-route middleware chain. */
  use?: Middleware[];
  /** Proxy only: mutate/replace outgoing headers. */
  transformRequest?: (headers: Record<string, string | string[] | undefined>, req: IncomingMessage) => void | Record<string, string | string[] | undefined>;
  /** Proxy only: inspect/mutate the upstream response before it is piped back. */
  transformResponse?: (res: IncomingMessage, req: IncomingMessage) => void;
}

/** Global hooks evaluated before the built-in routing table. */
export interface Hooks {
  /** Runs first; return true to signal the response was fully handled. */
  onRequest?: (req: IncomingMessage, res: ServerResponse) => boolean | void;
  /** Return a handler to fully override built-in routing, or null to fall through. */
  route?: (req: IncomingMessage) => RequestHandler | null | undefined;
  /** Middleware applied to every matched route. */
  use?: Middleware[];
}

/** Configuration for {@link startServer}. */
export interface ServerConfig {
  /** Listen port (default 4443; 0 picks a free port). */
  port?: number;
  /** Map of `hostname` or `hostname/prefix/` keys to routes. */
  hostnames: Record<string, RouteEntry>;
  /** Global routing hooks. */
  hooks?: Hooks;
  /** Base directory for resolving relative static paths (default cwd). */
  baseDir?: string;
  /** Reuse pre-loaded HTTPS options instead of fetching backloop.dev certs. */
  httpsOptions?: HttpsOptions;
  /** Suppress the startup banner. */
  silent?: boolean;
}

/**
 * Start a multi-host HTTPS server, resolving once it is listening.
 *
 * @example
 * ```js
 * const { startServer, staticDir, proxy } = require('backloop.dev');
 *
 * await startServer({
 *   port: 7655,
 *   hooks: { route: (req) => req.url === '/ping' ? (r, s) => s.end('pong') : null },
 *   hostnames: {
 *     app: staticDir('./dist'),
 *     'rhi/admin/': proxy('https://localhost:7610', { strip: false }),
 *     'rhi/': proxy('https://localhost:5640')
 *   }
 * });
 * ```
 */
export function startServer(config: ServerConfig): Promise<Server>;

/** Build a static-files route entry. */
export function staticDir(dir: string, opts?: Partial<RouteEntry>): RouteEntry;

/** Build a reverse-proxy route entry. */
export function proxy(target: string, opts?: Partial<RouteEntry>): RouteEntry;

/** Build a route entry that redirects every request to a fixed location. */
export function redirect(location: string, status?: number): RouteEntry;
