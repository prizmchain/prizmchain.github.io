(() => {
  const catalog = window.PRIZM_APP_CATALOG || { apps: [] };
  const config = window.PRIZM_SITE_CONFIG || {};
  const apps = catalog.apps || [];
  const grid = document.querySelector('#app-grid');
  const search = document.querySelector('#app-search');
  const filters = document.querySelector('#genre-filters');
  const empty = document.querySelector('#empty-state');
  let activeGenre = 'All';

  const cleanText = (value = '') => value.replace(/\s+/g, ' ').trim();
  const shortDescription = (value = '') => {
    const text = cleanText(value);
    const sentence = text.match(/^.{40,180}?[.!?](?:\s|$)/)?.[0] || text.slice(0, 150);
    return sentence.replace(/[.!?]$/, '');
  };

  const appUrl = (app, placement) => {
    const url = new URL(app.url);
    const campaign = config.campaign || 'prizm-hub';
    url.searchParams.set('ct', `${campaign}-${placement}`);
    return url.toString();
  };

  const iconMarkup = (app, className = 'app-icon') => `
    <img class="${className}" src="${app.icon}" alt="${cleanText(app.name)} app icon" width="512" height="512" loading="lazy">
  `;

  const requestedApp = new URLSearchParams(location.search).get('app');
  const featured = apps.find((app) => String(app.id) === requestedApp || app.slug === requestedApp)
    || apps.find((app) => app.id === config.featuredAppId)
    || apps[0];

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
        <span class="featured-stamp">Made for iPhone</span>
      </div>
      <div class="featured-copy">
        <p class="featured-genre">${cleanText(featured.genre)} · Version ${cleanText(featured.version)}</p>
        <h2>${cleanText(featured.name)}</h2>
        <p class="featured-line">${cleanText(config.featuredLabel || shortDescription(featured.description))}</p>
        <p class="featured-description">${cleanText(config.featuredCopy || shortDescription(featured.description))}</p>
        <a class="store-button" href="${appUrl(featured, 'featured')}" data-app-id="${featured.id}" data-placement="featured">
          <span><small>Download on the</small>App Store</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"></path></svg>
        </a>
      </div>
    `;
  };

  const cardMarkup = (app, index) => `
    <article class="app-card" style="--delay:${Math.min(index, 12) * 35}ms">
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

  const renderGrid = () => {
    const query = search.value.trim().toLowerCase();
    const visible = apps.filter((app) => {
      const matchesGenre = activeGenre === 'All' || app.genre === activeGenre;
      const haystack = `${app.name} ${app.genre} ${app.description}`.toLowerCase();
      return matchesGenre && haystack.includes(query);
    });

    grid.innerHTML = visible.map(cardMarkup).join('');
    empty.hidden = visible.length > 0;
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
  renderFeatured();
  renderFilters();
  renderGrid();
  renderFloatingIcons();

  search.addEventListener('input', renderGrid);
  filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-genre]');
    if (!button) return;
    activeGenre = button.dataset.genre;
    filters.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    renderGrid();
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-app-id]');
    if (!link) return;
    window.dataLayer?.push({
      event: 'app_store_click',
      app_id: link.dataset.appId,
      placement: link.dataset.placement,
      campaign: config.campaign || 'prizm-hub'
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-visible', entry.isIntersecting));
  }, { threshold: 0.08 });
  document.querySelectorAll('.app-card, .featured-card, .studio-statement, .studio-copy').forEach((node) => observer.observe(node));
})();
