import { pkg, external, commonPlugins } from './rollup.shared.config';

export default {
  entry: 'src/index.js',
  plugins: commonPlugins,
  external: external,
  targets: [
    {
      dest: pkg.main,
      format: 'cjs',
      sourceMap: true
    },
    {
      dest: pkg.module,
      format: 'es',
      sourceMap: true
    }
  ]
};
