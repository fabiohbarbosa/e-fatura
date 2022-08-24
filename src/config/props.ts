const env = process.env.NODE_ENV || 'local';

export const props = {
  env,
  port: 3000,
  cookiePath: './src/config/cookie',
};
