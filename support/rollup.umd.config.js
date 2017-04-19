import {pkg, commonPlugins} from './rollup.shared.config'
import minify from 'rollup-plugin-uglify'

export default {
  entry: 'src/index.js',
  plugins: [
    ...commonPlugins.slice(0, commonPlugins.length - 1),
    minify(),
    commonPlugins[commonPlugins.length - 1]
  ],
  targets: [
    {
      dest: pkg.umd,
      format: 'umd',
      sourceMap: true,
      moduleName: 'ReduxMotive'
    }
  ]
}
