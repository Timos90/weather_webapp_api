// jest.transform.js
import { createTransformer } from 'babel-jest';
const transformer = createTransformer({
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
    '@babel/preset-typescript'
  ],
  plugins: ['transform-import-meta']
});

export function process(src, filename, config, options) {
    // Replace occurrences of `import.meta.env` with `process.env`
    const modifiedSrc = src.replace(/import\.meta\.env/g, 'process.env');
    return transformer.process(modifiedSrc, filename, config, options);
}
