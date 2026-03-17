/**
 * Theme initialization script that runs before React hydration.
 * This prevents the "flash of unthemed content" (FOUC) issue.
 *
 * The script:
 * 1. Reads the theme preference from localStorage
 * 2. Resolves "system" theme using matchMedia
 * 3. Applies the correct class to the <html> element immediately
 * 4. Restores persisted color theme CSS variables from localStorage
 */

export function getThemeScript() {
  return `
    (function() {
      try {
        var theme = localStorage.getItem('nextjs-ui-theme');
        var resolvedTheme = 'light';

        if (theme === 'dark') {
          resolvedTheme = 'dark';
        } else if (theme === 'system') {
          resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        var root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(resolvedTheme);
        root.setAttribute('data-theme-initialized', 'true');

        var raw = localStorage.getItem('dht-theme-customizer');
        if (raw) {
          var config = JSON.parse(raw);
          var vars = resolvedTheme === 'dark' ? config.cssVarsDark : config.cssVarsLight;
          if (vars && typeof vars === 'object') {
            var keys = Object.keys(vars);
            for (var i = 0; i < keys.length; i++) {
              root.style.setProperty('--' + keys[i], vars[keys[i]]);
            }
          }
          if (config.radius) {
            root.style.setProperty('--radius', config.radius);
          }
        }
      } catch (e) {
        console.error('Failed to initialize theme:', e);
      }
    })();
  `;
}
