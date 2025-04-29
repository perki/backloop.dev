#! /usr/bin/env node
const updateAndLoad = require('../src/check').updateAndLoad;

(async () => {
  await updateAndLoad(true);
})()
