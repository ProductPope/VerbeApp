import { useRef } from 'react';
import type { Strings } from '../i18n/strings.js';
import type { PersonalQuote } from '../personal/personal.js';

interface PersonalQuotesProps {
  quotes: PersonalQuote[];
  strings: Strings;
  onAdd: () => void;
  onEdit: (quote: PersonalQuote) => void;
  onDelete: (quote: PersonalQuote) => void;
  onExport: () => void;
  /** Receives the text of the backup file the reader picked. */
  onImport: (json: string) => void;
}

/** The reader's own quotes in the profile: add, edit, delete and back up. */
export function PersonalQuotes({
  quotes,
  strings,
  onAdd,
  onEdit,
  onDelete,
  onExport,
  onImport,
}: PersonalQuotesProps) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <section aria-labelledby="personal-heading" aria-describedby="personal-hint">
      <h2 id="personal-heading">{strings.personalHeading}</h2>
      <p className="muted" id="personal-hint">
        {strings.personalHint}
      </p>
      <p>
        <button type="button" className="text-button primary-button" onClick={onAdd}>
          {strings.addQuote}
        </button>
      </p>
      {quotes.length === 0 ? (
        <p className="muted">{strings.noPersonal}</p>
      ) : (
        <ul className="saved-list">
          {quotes.map((quote) => (
            <li key={quote.id} className="saved-item">
              <blockquote id={`${quote.id}-text`} lang={quote.language}>
                <p>{quote.text}</p>
              </blockquote>
              {(quote.author !== '' || quote.source !== '') && (
                <p className="saved-author">
                  {[quote.author, quote.source].filter((part) => part !== '').join(', ')}
                </p>
              )}
              <div className="item-actions">
                <button
                  type="button"
                  className="text-button"
                  aria-describedby={`${quote.id}-text`}
                  onClick={() => {
                    onEdit(quote);
                  }}
                >
                  {strings.edit}
                </button>
                <button
                  type="button"
                  className="text-button"
                  aria-describedby={`${quote.id}-text`}
                  onClick={() => {
                    onDelete(quote);
                  }}
                >
                  {strings.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="muted">{strings.backupHint}</p>
      <div className="item-actions">
        <button
          type="button"
          className="text-button"
          disabled={quotes.length === 0}
          onClick={onExport}
        >
          {strings.exportQuotes}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            fileInput.current?.click();
          }}
        >
          {strings.importQuotes}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          data-testid="import-file"
          onChange={(event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            if (!file) return;
            void file.text().then(onImport);
            // Picking the same file again should import it again.
            input.value = '';
          }}
        />
      </div>
    </section>
  );
}
