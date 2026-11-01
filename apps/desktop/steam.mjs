// The real SDK adapter belongs here once the developer supplies Steamworks access.
// The executable remains fully playable without a Steam SDK or an invented AppID.
export async function initializeSteam({ logger = () => {} } = {}) {
  logger('Steamworks: adapter disabled; no official SDK configured.');
  return Object.freeze({
    available: false,
    identity: null,
    capabilities: Object.freeze({ overlay: false, achievements: false, statistics: false }),
    shutdown() {},
  });
}
