function normalizeHost(value) {
  const host = String(value || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  if (!host || host.length > 253) return '';
  if (!/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(host)) return '';
  return host;
}

function deploymentOrigin(req) {
  const env = process.env.VERCEL_ENV || '';
  if (env === 'production') {
    const productionHost = normalizeHost(process.env.VERCEL_PROJECT_PRODUCTION_URL);
    if (productionHost) return `https://${productionHost}`;
  }

  const deploymentHost = normalizeHost(process.env.VERCEL_URL);
  if (deploymentHost) return `https://${deploymentHost}`;

  if (process.env.NODE_ENV === 'test' || !process.env.VERCEL) {
    const fallbackHost = normalizeHost(req?.headers?.host) || 'localhost:3000';
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').toLowerCase();
    const proto = forwardedProto === 'https' ? 'https' : 'http';
    return `${proto}://${fallbackHost}`;
  }

  const error = new Error('Trusted deployment origin is unavailable');
  error.code = 'DEPLOYMENT_ORIGIN_UNAVAILABLE';
  throw error;
}

module.exports = { deploymentOrigin, normalizeHost };
