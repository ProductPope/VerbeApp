import { useRef } from 'react';
import type { Tag } from '../../data/model.js';
import { localized } from '../catalog/catalog.js';
import type { Language, Strings } from '../i18n/strings.js';
import { csvTemplate } from '../personal/csv.js';
import type { PersonalQuote } from '../personal/personal.js';

interface PersonalQuotesProps {
  quotes: PersonalQuote[];
  tags: Tag[];
  language: Language;
  strings: Strings;
  onAdd: () => void;
  onEdit: (quote: PersonalQuote) => void;
  onDelete: (quote: PersonalQuote) => void;
  onExport: () => void;
  /** Receives the text of the backup file the reader picked. */
  onImport: (json: string) => void;
  /** Receives the CSV file the reader picked. */
  onImportCsv: (file: File) => void;
  onDownloadTemplate: () => void;
}

/** Explains the CSV columns, with an example and a template to fill in. */
function CsvHelp({
  tags,
  language,
  strings,
  onDownloadTemplate,
}: Pick<PersonalQuotesProps, 'tags' | 'language' | 'strings' | 'onDownloadTemplate'>) {
  const names = tags.map((tag) => localized(tag.label, language)).join(', ');
  const rows = [
    ['text', strings.csvTextColumn],
    ['author', strings.csvAuthorColumn],
    ['source', strings.csvSourceColumn],
    ['language', strings.csvLanguageColumn],
    ['categories', strings.csvCategoriesColumn(names)],
  ] as const;
  return (
    <details className="help">
      <summary>{strings.csvHelpSummary}</summary>
      <p>{strings.csvHelpIntro}</p>
      <table className="help-table">
        <thead>
          <tr>
            <th scope="col">{strings.csvColumnHeader}</th>
            <th scope="col">{strings.csvMeaningHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([column, meaning]) => (
            <tr key={column}>
              <th scope="row">
                <code>{column}</code>
              </th>
              <td>{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>{strings.csvHelpQuotes}</p>
      <p className="setting-label">{strings.csvExample}</p>
      {/* Scrolls sideways on narrow screens, so keyboard users must be able to reach it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre className="help-example" tabIndex={0}>
        <code>
          {csvTemplate(tags)
            .replace(/^\uFEFF/, '')
            .replace(/\r/g, '')}
        </code>
      </pre>
      <button type="button" className="text-button" onClick={onDownloadTemplate}>
        {strings.csvTemplate}
      </button>
    </details>
  );
}

/** The reader's own quotes in the profile: add, edit, delete and back up. */
export function PersonalQuotes({
  quotes,
  tags,
  language,
  strings,
  onAdd,
  onEdit,
  onDelete,
  onExport,
  onImport,
  onImportCsv,
  onDownloadTemplate,
}: PersonalQuotesProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const csvInput = useRef<HTMLInputElement>(null);

  return (
    // Collapsed by default like Preferences, so favourites stay in view when
    // the profile opens.
    <section aria-labelledby="personal-heading" aria-describedby="personal-hint">
      <details className="disclosure">
        <summary id="personal-heading">{strings.personalHeading}</summary>
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
          <button
            type="button"
            className="text-button"
            onClick={() => {
              csvInput.current?.click();
            }}
          >
            {strings.csvImport}
          </button>
          <input
            ref={csvInput}
            type="file"
            accept=".csv,text/csv"
            hidden
            data-testid="import-csv"
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (file) onImportCsv(file);
              input.value = '';
            }}
          />
        </div>
        <CsvHelp
          tags={tags}
          language={language}
          strings={strings}
          onDownloadTemplate={onDownloadTemplate}
        />
      </details>
    </section>
  );
}
