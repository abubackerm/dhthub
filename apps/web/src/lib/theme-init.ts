/**
 * Theme initialization script that runs before React hydration.
 * This prevents the "flash of unthemed content" (FOUC) issue.
 *
 * SCOPING: This script stores the resolved theme on a data attribute
 * (`data-resolved-theme`) on `<html>` so the ThemeProvider's wrapper
 * div can read it synchronously on first render. It does NOT add
 * `dark` / `light` classes to `<html>` -- that would leak theme
 * styles to public website pages.
 *
 * It also restores persisted color theme CSS variables from localStorage
 * scoped under `[data-dashboard-theme]` selectors.
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
        } else if (!theme) {
          resolvedTheme = 'light';
        }

        document.documentElement.setAttribute('data-dashboard-resolved-theme', resolvedTheme);

        var raw = localStorage.getItem('dht-theme-customizer');
        if (raw) {
          var config = JSON.parse(raw);
          var vars = resolvedTheme === 'dark' ? config.cssVarsDark : config.cssVarsLight;
          if (vars && typeof vars === 'object') {
            var keys = Object.keys(vars);
            for (var i = 0; i < keys.length; i++) {
              document.documentElement.style.setProperty('--' + keys[i], vars[keys[i]]);
            }
          }
          if (config.radius) {
            document.documentElement.style.setProperty('--radius', config.radius);
          }
        }
      } catch (e) {
        console.error('Failed to initialize theme:', e);
      }
    })();
  `;
}
