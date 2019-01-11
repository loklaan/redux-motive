import { pkg, commonPlugins, reportingPlugins } from './rollup.shared.config'
import { uglify } from 'rollup-plugin-uglify'

export default {
  input: 'src/index.js',
  plugins: [...commonPlugins, uglify(), ...reportingPlugins],
  output: {
    file: pkg.umd,
    format: 'umd',
    sourceMap: true,
    name: 'ReduxMotive'
  }
}
