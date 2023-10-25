#! /usr/bin/env node
const updateAndLoad = require('../src/check').updateAndLoad;

updateAndLoad((err, res) => {
  if (err) console.error(err);
});
