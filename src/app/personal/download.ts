/** Offers text to the reader as a file to save, without any server. */
export function downloadFile(name: string, contents: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoke later: some browsers read the URL after the click returns.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

/** Asks the browser not to evict this site's storage under pressure. Best effort. */
export function requestPersistentStorage() {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) return;
  void navigator.storage.persist().catch(() => undefined);
}
