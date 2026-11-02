(() => {
  try {
    if (globalThis.localStorage?.getItem('hotel-saharien-locale') !== 'fr') return;

    const root = document.documentElement;
    root.lang = 'fr';
    root.dir = 'ltr';
    root.classList.add('locale-pending');

    globalThis.setTimeout(() => {
      root.classList.remove('locale-pending');
    }, 3000);
  } catch {
    // Storage can be unavailable in strict privacy modes; Arabic remains the default.
  }
})();
