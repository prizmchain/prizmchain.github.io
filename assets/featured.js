(() => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

  const previousDayKey = (date = new Date()) => {
    const previous = new Date(date.getTime() - millisecondsPerDay);
    return dayKey(previous);
  };

  const hash = (value) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  };

  const deterministicUnit = (value) => (hash(value) + 1) / 4294967297;

  const appWeight = (app, config, date) => {
    const rotation = config.featuredRotation || {};
    const appConfig = config.apps?.[String(app.id)] || {};
    const baseWeight = Math.max(0.01, Number(rotation.baseWeight) || 1);
    const configuredWeight = Math.max(0.01, Number(appConfig.featuredWeight) || 1);
    const boostDays = Math.max(0, Number(rotation.newReleaseBoostDays) || 0);
    const boostWeight = Math.max(1, Number(rotation.newReleaseWeight) || 1);
    const releasedAt = Date.parse(app.releaseDate);
    const ageDays = Number.isFinite(releasedAt)
      ? Math.floor((date.getTime() - releasedAt) / millisecondsPerDay)
      : Number.POSITIVE_INFINITY;
    const newReleaseMultiplier = ageDays >= 0 && ageDays < boostDays ? boostWeight : 1;
    return baseWeight * configuredWeight * newReleaseMultiplier;
  };

  const candidates = (apps, config) => {
    const excluded = new Set((config.featuredRotation?.excludedAppIds || []).map(String));
    return apps.filter((app) => (
      app
      && app.id
      && !excluded.has(String(app.id))
      && config.apps?.[String(app.id)]?.featuredEligible !== false
    ));
  };

  const ranking = (apps, config, key, date) => candidates(apps, config)
    .map((app) => {
      const weight = appWeight(app, config, date);
      const unit = deterministicUnit(`${config.featuredRotation?.seed || 'prizm'}:${key}:${app.id}`);
      return { app, weight, score: -Math.log(unit) / weight };
    })
    .sort((left, right) => left.score - right.score || left.app.id - right.app.id);

  const pick = (apps, config = {}, options = {}) => {
    const date = options.date || new Date();
    const key = dayKey(date);
    const fallback = apps.find((app) => app.id === config.featuredAppId) || apps[0] || null;
    if (config.featuredRotation?.enabled === false) {
      return { app: fallback, day: key, reason: 'rotation_disabled', weight: 1 };
    }

    const ranked = ranking(apps, config, key, date);
    if (!ranked.length) return { app: fallback, day: key, reason: 'fallback', weight: 1 };

    let selected = ranked[0];
    if (ranked.length > 1) {
      const previousRanked = ranking(apps, config, previousDayKey(date), new Date(date.getTime() - millisecondsPerDay));
      if (previousRanked[0]?.app.id === selected.app.id) selected = ranked[1];
    }

    return {
      app: selected.app,
      day: key,
      reason: selected === ranked[0] ? 'daily_weighted_rotation' : 'daily_rotation_repeat_guard',
      weight: selected.weight,
    };
  };

  window.PRIZM_FEATURED = { appWeight, dayKey, pick };
})();
