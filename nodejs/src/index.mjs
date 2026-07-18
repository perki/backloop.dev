import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const backloopDev = require('./index.js');
const httpsOptions = await backloopDev.httpsOptionsPromise();
export default httpsOptions;

export const startServer = backloopDev.startServer;
export const staticDir = backloopDev.staticDir;
export const proxy = backloopDev.proxy;
export const redirect = backloopDev.redirect;
