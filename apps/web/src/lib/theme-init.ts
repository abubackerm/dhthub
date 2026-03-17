/**
 * Theme initialization script that runs before React hydration.
 * This prevents the "flash of unthemed content" (FOUC) issue.
 * 
 * The script:
 * 1. Reads the theme preference from localStorage
 * 2. Resolves "system" theme using matchMedia
 * 3. Applies the correct class to the <html> element immediately
 */

export function getThemeScript() {
  return `
    (function() {
      try {
        // Read theme preference from localStorage
        const theme = localStorage.getItem('nextjs-ui-theme');
        
        // Determine which theme to apply
        let resolvedTheme = 'light';
        
        if (theme === 'dark') {
          resolvedTheme = 'dark';
        } else if (theme === 'system') {
          // Use system preference
          resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        // If theme is 'light' or not found, keep default 'light'
        
        // Apply the theme class to html element immediately
        document.documentElement.classList.add(resolvedTheme);
        document.documentElement.classList.remove(resolvedTheme === 'dark' ? 'light' : 'dark');
      } catch (e) {
        // If localStorage is not available (e.g., in iframe), keep light theme
        console.error('Failed to initialize theme:', e);
      }
    })();
  `;
}
