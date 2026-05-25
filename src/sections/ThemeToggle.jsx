export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span aria-hidden="true">{isDark ? 'Light' : 'Dark'}</span>
      <strong aria-hidden="true">{isDark ? 'Day' : 'Night'}</strong>
    </button>
  );
}
