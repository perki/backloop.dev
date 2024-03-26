# backloop.dev plugin for viteJS

[![npm](https://img.shields.io/npm/v/vite-plugin-backloop.dev)](https://www.npmjs.com/package/vite-plugin-backloop.dev) [![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Do SSL HTTPS requests on **Localhost** using [backloop.dev](https://www.npmjs.com/package/backloop.dev) certificates pointing to your local environment.

**https://\<any subdomain>.backloop.dev/ → https://localhost/**

Any subdomain of `*.backloop.dev` points to `localhost`!

## Install

1. `npm install vite-plugin-backloop.dev --save-dev`
2. Edit `vite.config.js`
   - Add `import backloop from 'vite-plugin-backloop'`
   - Add `backloop('myHostName')` to the plugins list

Example

```js
// vite.config.js
import { defineConfig } from 'vite';
import backloop from 'vite-plugin-backloop.dev';

export default defineConfig({
  plugins: [
    // ..
    backloop('myComputer')
  ],
  // ..
});
```

#### Run

Launch viteJs in dev model `npm run dev`

Open `https://myComputer.backloop.dev:<port>` 

## CONTRIBUTING

\- Pull requests are welcome

## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
