import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const backloopDev = require('./index.js'); 
const httpsOptions = await backloopDev.httpsOptionsPromise();
export default httpsOptions;