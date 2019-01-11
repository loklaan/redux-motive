import {
  pkg,
  external,
  commonPlugins,
  reportingPlugins
} from './rollup.shared.config'

export default {
  input: 'src/index.js',
  plugins: [...commonPlugins, ...reportingPlugins],
  external: external,
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourceMap: true
    },
    {
      file: pkg.module,
      format: 'es',
      sourceMap: true
    }
  ]
}
