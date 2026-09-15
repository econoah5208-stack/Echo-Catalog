/* Echo Trading bootstrap: always fetch the latest catalog/script files on page load. */
(async () => {
  'use strict';
  const v = Date.now();
  await import(`../data/catalog.js?v=${v}`);
  if (document.documentElement.dataset.page === 'manage') {
    await import(`./manage.js?v=${v}`);
  } else {
    await import(`./print.js?v=${v}`);
    await import(`./app.js?v=${v}`);
  }
})().catch(error => {
  console.error('Echo Trading catalog load failed:', error);
});
