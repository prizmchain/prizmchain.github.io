(() => {
  const catalog = window.PRIZM_APP_CATALOG || { apps: [] };
  const config = window.PRIZM_SITE_CONFIG || {};
  const apps = catalog.apps || [];
  const grid = document.querySelector('#app-grid');
  const search = document.querySelector('#app-search');
  const searchStatus = document.querySelector('#search-result-status');
  const filters = document.querySelector('#genre-filters');
  const empty = document.querySelector('#empty-state');
  const searchEngine = window.PRIZM_APP_SEARCH;
  const featureEngine = window.PRIZM_FEATURED;
  let activeGenre = 'All';

  const cleanText = (value = '') => value.replace(/\s+/g, ' ').trim();
  const shortDescription = (value = '') => {
    const text = cleanText(value);
    const sentence = text.match(/^.{40,180}?[.!?](?:\s|$)/)?.[0] || text.slice(0, 150);
    return sentence.replace(/[.!?]$/, '');
  };

  const appUrl = (app, placement) => {
    const url = new URL(app.url);
    const campaign = config.apps?.[String(app.id)]?.campaign || config.defaultCampaign || 'prizm-hub';
    url.searchParams.set('ct', `${campaign}-${placement}`);
    return url.toString();
  };

  const iconMarkup = (app, className = 'app-icon') => `
    <img class="${className}" src="${app.icon}" alt="${cleanText(app.name)} app icon" width="512" height="512" loading="lazy">
  `;

  const requestedApp = new URLSearchParams(location.search).get('app');
  const requestedFeatured = apps.find((app) => String(app.id) === requestedApp || app.slug === requestedApp);
  const rotation = featureEngine?.pick(apps, config) || {
    app: apps.find((app) => app.id === config.featuredAppId) || apps[0],
    day: new Date().toISOString().slice(0, 10),
    reason: 'legacy_fallback',
    weight: 1,
  };
  const featured = requestedFeatured || rotation.app;
  const featuredSelection = requestedFeatured
    ? { ...rotation, app: requestedFeatured, reason: 'query_override' }
    : rotation;
  const featuredConfig = featured ? (config.apps?.[String(featured.id)] || {}) : {};

  const renderFeatured = () => {
    const target = document.querySelector('#featured-card');
    if (!featured) {
      target.innerHTML = '<p>App catalog is temporarily unavailable.</p>';
      return;
    }

    target.innerHTML = `
      <div class="featured-art">
        <div class="featured-orbit orbit-one"></div>
        <div class="featured-orbit orbit-two"></div>
        ${iconMarkup(featured, 'featured-icon')}
        <span class="featured-stamp">${cleanText(featuredConfig.featuredStamp || config.defaultFeaturedStamp || 'On the App Store')}</span>
      </div>
      <div class="featured-copy">
        <p class="featured-genre">${cleanText(featured.genre)} · Version ${cleanText(featured.version)}</p>
        <h2>${cleanText(featured.name)}</h2>
        <p class="featured-line">${cleanText(featuredConfig.featuredLabel || shortDescription(featured.description))}</p>
        <p class="featured-description">${cleanText(featuredConfig.featuredCopy || shortDescription(featured.description))}</p>
        <a class="store-button" href="${appUrl(featured, 'featured')}" data-app-id="${featured.id}" data-placement="featured">
          <span><small>Download on the</small>App Store</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"></path></svg>
        </a>
      </div>
    `;

    window.dataLayer?.push({
      event: 'featured_app_impression',
      app_id: String(featured.id),
      campaign: featuredConfig.campaign || config.defaultCampaign || 'prizm-hub',
      rotation_day: featuredSelection.day,
      selection_source: featuredSelection.reason,
      selection_weight: featuredSelection.weight,
    });
  };

  const cardMarkup = (app, index) => `
    <article class="app-card" data-app-id="${app.id}" style="--delay:${Math.min(index, 12) * 35}ms">
      <a href="${appUrl(app, 'catalog')}" data-app-id="${app.id}" data-placement="catalog" aria-label="View ${cleanText(app.name)} on the App Store">
        <div class="card-top">
          ${iconMarkup(app)}
          <span class="card-arrow" aria-hidden="true">↗</span>
        </div>
        <div class="card-copy">
          <p>${cleanText(app.genre)}</p>
          <h3>${cleanText(app.name)}</h3>
          <span>${shortDescription(app.description)}</span>
        </div>
      </a>
    </article>
  `;

  const applySearch = () => {
    const visibleIds = new Set(apps
      .filter((app) => searchEngine.matches(app, search.value, activeGenre))
      .map((app) => String(app.id)));

    grid.querySelectorAll('.app-card').forEach((card) => {
      card.hidden = !visibleIds.has(card.dataset.appId);
    });
    empty.hidden = visibleIds.size > 0;
    searchStatus.textContent = `${visibleIds.size} app${visibleIds.size === 1 ? '' : 's'} found`;
  };

  const renderFilters = () => {
    const genres = ['All', ...new Set(apps.map((app) => app.genre))];
    filters.innerHTML = genres.map((genre) => `
      <button type="button" data-genre="${genre}" aria-pressed="${genre === activeGenre}">${genre}</button>
    `).join('');
  };

  const renderFloatingIcons = () => {
    const target = document.querySelector('#floating-icons');
    const choices = apps.filter((app) => app.id !== featured?.id).slice(0, 5);
    target.innerHTML = choices.map((app, index) => `
      <img src="${app.icon}" alt="" width="512" height="512" style="--i:${index}" loading="eager">
    `).join('');
  };

  document.querySelectorAll('[data-app-count]').forEach((node) => { node.textContent = apps.length; });
  document.querySelector('#current-year').textContent = new Date().getFullYear();
  search.value = new URLSearchParams(location.search).get('q') || '';
  renderFeatured();
  renderFilters();
  grid.innerHTML = apps.map(cardMarkup).join('');
  applySearch();
  renderFloatingIcons();

  search.addEventListener('input', applySearch);
  search.addEventListener('search', applySearch);
  filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-genre]');
    if (!button) return;
    activeGenre = button.dataset.genre;
    filters.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    applySearch();
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-app-id]');
    if (!link) return;
    window.dataLayer?.push({
      event: 'app_store_click',
      app_id: link.dataset.appId,
      placement: link.dataset.placement,
      campaign: config.apps?.[String(link.dataset.appId)]?.campaign || config.defaultCampaign || 'prizm-hub',
      ...(link.dataset.placement === 'featured' ? {
        rotation_day: featuredSelection.day,
        selection_source: featuredSelection.reason,
      } : {})
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting));
  }, { threshold: 0.08 });
  document.querySelectorAll('.app-card, .featured-card, .studio-statement, .studio-copy').forEach((node) => observer.observe(node));
})();
