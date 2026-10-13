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

// jsdom has no modal dialogs yet; mimic the parts the app relies on.
if (!('showModal' in HTMLDialogElement.prototype)) {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      this.open = true;
    },
    close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event('close'));
    },
  });
}
