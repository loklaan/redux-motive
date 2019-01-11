import babel from 'rollup-plugin-babel'
import filesize from 'rollup-plugin-filesize'
import cleanup from 'rollup-plugin-cleanup'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

export const pkg = require('../package.json')
export const external = Object.keys(pkg.dependencies)
export const commonPlugins = [
  resolve({
    jsnext: true,
    main: true
  }),
  commonjs(),
  babel({
    babelHelpers: 'external',
    exclude: 'node_modules/**'
  }),
  cleanup({ sourceType: 'module', maxEmptyLines: 0 })
]
export const reportingPlugins = [filesize()]
