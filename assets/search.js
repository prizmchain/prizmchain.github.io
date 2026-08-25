(() => {
  const normalize = (value = '') => String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLocaleLowerCase();

  const matches = (app, query = '', genre = 'All') => {
    if (genre !== 'All' && app.genre !== genre) return false;
    const needle = normalize(query);
    if (!needle) return true;
    const haystack = normalize([app.name, app.slug, app.genre, app.description].join(' '));
    return needle.split(/\s+/).every((term) => haystack.includes(term));
  };

  window.PRIZM_APP_SEARCH = { normalize, matches };
})();
