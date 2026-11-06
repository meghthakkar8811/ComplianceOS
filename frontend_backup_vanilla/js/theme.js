/**
 * Theme Manager for ComplianceOS
 * Handles saving/loading the current theme to localStorage
 * and setting it on the html root element.
 */
(function() {
  // Execute immediately to prevent flash of wrong theme
  const getSavedTheme = () => localStorage.getItem('cos_theme');
  const getSystemTheme = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  let currentTheme = getSavedTheme() || getSystemTheme();
  document.documentElement.setAttribute('data-theme', currentTheme);

  window.toggleTheme = function() {
    currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('cos_theme', currentTheme);
    updateToggleButtons();
  };

  function updateToggleButtons() {
    const btns = document.querySelectorAll('.theme-toggle-btn');
    btns.forEach(btn => {
      btn.innerHTML = currentTheme === 'dark' 
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' // Sun icon
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'; // Moon icon
    });
  }

  // When DOM loads, initialize buttons
  document.addEventListener('DOMContentLoaded', () => {
    updateToggleButtons();
  });
})();
