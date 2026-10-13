import { useSyncExternalStore } from 'react';
import type { Strings } from '../i18n/strings.js';
import type { InstallService } from '../install/install.js';

const never = () => false;
const noSubscription = () => () => undefined;

/** Whether the browser currently lets the app open its install dialog. */
export function useCanInstall(install: InstallService | undefined): boolean {
  return useSyncExternalStore(
    install?.subscribe ?? noSubscription,
    install?.canInstall ?? never,
    install?.canInstall ?? never,
  );
}

interface InstallOfferProps {
  strings: Strings;
  onInstall: () => void;
  onLater: () => void;
}

/**
 * A quiet card at the bottom of the screen offering to install the app. It is
 * a labelled landmark rather than a dialog: it never takes focus or blocks the
 * quotes, and readers who ignore it can keep swiping.
 */
export function InstallOffer({ strings, onInstall, onLater }: InstallOfferProps) {
  return (
    <aside className="install-offer" aria-labelledby="install-offer-heading">
      <img className="install-offer-icon" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
      <div className="install-offer-text">
        <h2 id="install-offer-heading">{strings.installHeading}</h2>
        <p>{strings.installOffer}</p>
      </div>
      <div className="install-offer-actions">
        <button type="button" className="text-button" onClick={onLater}>
          {strings.installLater}
        </button>
        <button type="button" className="text-button primary-button" onClick={onInstall}>
          {strings.installAccept}
        </button>
      </div>
    </aside>
  );
}
