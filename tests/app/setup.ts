import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom does not implement scrolling; record calls so tests can assert on them.
Element.prototype.scrollIntoView = function scrollIntoView() {
  (this as HTMLElement).dataset.scrolledTo = 'true';
};
