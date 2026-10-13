const PATHS = {
  heart:
    'M12 20.5s-7.5-4.6-9.6-9.3C.9 7.8 3.1 4 6.8 4c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.7 0 5.9 3.8 4.4 7.2-2.1 4.7-9.6 9.3-9.6 9.3z',
  eyeOff:
    'M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c5.5 0 9.3 4.6 10 7-.3 1-1.1 2.4-2.4 3.7M6.6 6.6C4.2 8 2.6 10.2 2 12c.7 2.4 4.5 7 10 7 1.9 0 3.6-.5 5-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5',
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  settings: 'M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4',
  close: 'M18 6 6 18M6 6l12 12',
  flame:
    'M12 22c4 0 7-2.8 7-7 0-3.4-2.1-6.3-4.6-8.6-.3 2.2-1.4 3.7-2.9 4.4.4-3.3-.9-6.4-3.5-8.8C8 5.4 5 9 5 15c0 4.2 3 7 7 7z',
} as const;

export type IconName = keyof typeof PATHS;

/** Decorative icon; the surrounding control carries the accessible name. */
export function Icon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
      focusable="false"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
