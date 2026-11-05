const required = ['MONGODB_URI', 'JWT_SECRET'];

function loadEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  const nodeEnv = process.env.NODE_ENV || 'development';
  const cookieSameSite = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
  if (!['lax', 'strict', 'none'].includes(cookieSameSite)) {
    throw new Error('COOKIE_SAME_SITE must be lax, strict, or none');
  }
  const cloudinaryKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const configuredCloudinaryKeys = cloudinaryKeys.filter((key) => process.env[key]);
  if (configuredCloudinaryKeys.length && configuredCloudinaryKeys.length !== cloudinaryKeys.length) {
    const missingCloudinaryKeys = cloudinaryKeys.filter((key) => !process.env[key]);
    throw new Error(`Set all Cloudinary variables or leave them unset: ${missingCloudinaryKeys.join(', ')}`);
  }

  return {
    nodeEnv,
    port: Number(process.env.PORT) || 4000,
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    cookieSecure: process.env.COOKIE_SECURE === 'true' || nodeEnv === 'production' || cookieSameSite === 'none',
    cookieSameSite,
    corsOrigins: (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 300,
    cloudinary: configuredCloudinaryKeys.length ? {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET
    } : null
  };
}

module.exports = loadEnv;
