import babel from 'rollup-plugin-babel'
import filesize from 'rollup-plugin-filesize'
import cleanup from 'rollup-plugin-cleanup'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babelrc from 'babelrc-rollup'

export const pkg = require('../package.json')
export const external = Object.keys(pkg.dependencies)
export const commonPlugins = [
  resolve({
    jsnext: true,
    main: true
  }),
  commonjs(),
  babel(babelrc()),
  cleanup({sourceType: 'module', maxEmptyLines: 0}),
  filesize()
]
