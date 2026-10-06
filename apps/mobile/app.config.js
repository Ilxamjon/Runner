const base = require('./app.json');

const appEnv = process.env.APP_ENV || 'development';
const easProjectId = process.env.EAS_PROJECT_ID;

const isStaging = appEnv === 'staging';
const isProduction = appEnv === 'production';

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    name: isStaging ? 'Runner Staging' : base.expo.name,
    slug: base.expo.slug,
    extra: {
      ...(base.expo.extra || {}),
      environment: appEnv,
      eas: easProjectId ? { projectId: easProjectId } : undefined,
    },
    updates: easProjectId
      ? {
          url: `https://u.expo.dev/${easProjectId}`,
        }
      : undefined,
    android: {
      ...base.expo.android,
      package: isProduction ? 'uz.runner.app' : 'uz.runner.app.staging',
    },
    ios: {
      ...base.expo.ios,
      bundleIdentifier: isProduction ? 'uz.runner.app' : 'uz.runner.app.staging',
    },
  },
};
