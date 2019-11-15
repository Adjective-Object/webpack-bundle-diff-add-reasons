# webpack-bundle-diff-add-reasons

[npm](https://www.npmjs.com/package/webpack-bundle-diff-add-children), [github](https://github.com/Adjective-Object/webpack-bundle-diff-add-children)

A utility to add reasons to the bundle graph produced by webpack-bundle-diff
([npm](https://www.npmjs.com/package/webpack-bundle-diff), [github](https://github.com/smikula/webpack-bundle-diff))

When `webpack-bundle-diff` adds children to the depgraph, it moves hoisted modules into their hoisted parent.
This is fine for tracking the graph of modules in the bundle, but it makes tracking exaclty how a given file ends up inside the graph a little difficult.

This module adds reasons back to the bundleGraph output. This may be be preferrable to analyzing `stats.json` directly when it is too large to be processed by most tools that depend on stats.json. (e.g. it is multiple gigabytes)

## Usage

`yarn add webpack-bundle-diff-add-reasons`

```js
const getModuleGraphWithChildren = require('webpack-bundle-diff-add-reasons')
    .getModuleGraphWithChildren;
const deriveBundleData = require('webpack-bundle-diff').deriveBundleData;

// Get your bundle stats somehow
const webpackStats = require('fs').readFileSync('./stats.json', 'utf-8');

// Derive webpack-bundle-diff data
const data = deriveBundleData(webpackStats);

// Add reasons to the graph
const graphWithReasons = getModuleGraphWithReasons(
    data.bundleData.graph,
    webpackStats
);
```

## Development

```sh
yarn # install dependencies
yarn build # build.             Can also use `rollup -c`
yarn watch # build with watch.  Can also use `rollup -cw`
yarn jest # run tests
```
