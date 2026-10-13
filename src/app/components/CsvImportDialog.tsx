import { useEffect, useId, useRef } from 'react';
import type { Strings } from '../i18n/strings.js';
import type { CsvFileError, CsvImport, CsvRowError } from '../personal/csv.js';
import { MAX_CSV_ROWS } from '../personal/csv.js';
import { MAX_TEXT_LENGTH } from '../personal/personal.js';
import { Icon } from './Icon.js';

/** Rows listed by name; the rest are counted, so a broken file stays readable. */
const SHOWN_PROBLEMS = 20;
const SHOWN_QUOTES = 5;

interface CsvImportDialogProps {
  result: CsvImport;
  strings: Strings;
  onConfirm: () => void;
  /** Called once the dialog has closed, imported or not. */
  onClose: () => void;
}

export function fileErrorMessage(error: CsvFileError, strings: Strings): string {
  switch (error) {
    case 'empty':
      return strings.csvEmpty;
    case 'noTextColumn':
      return strings.csvNoTextColumn;
    case 'unclosedQuote':
      return strings.csvUnclosedQuote;
    case 'tooLarge':
      return strings.csvTooLarge;
    case 'tooManyRows':
      return strings.csvTooManyRows(MAX_CSV_ROWS);
  }
}

function rowErrorMessage(error: CsvRowError, strings: Strings): string {
  switch (error.kind) {
    case 'noText':
      return strings.csvNoText;
    case 'textTooLong':
      return strings.csvTextTooLong(MAX_TEXT_LENGTH);
    case 'unknownLanguage':
      return strings.csvUnknownLanguage(error.value);
    case 'unknownCategory':
      return strings.csvUnknownCategory(error.value);
  }
}

/**
 * Shows what a CSV file will add before anything is saved: how many quotes
 * are ready, the first few of them, and every row that will be skipped and
 * why. It opens as soon as it mounts; the parent unmounts it when it closes.
 */
export function CsvImportDialog({ result, strings, onConfirm, onClose }: CsvImportDialogProps) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = `${id}-heading`;
  const summaryId = `${id}-summary`;
  const count = result.ok ? result.drafts.length : 0;

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  function close() {
    dialog.current?.close();
  }

  return (
    <dialog
      ref={dialog}
      className="settings"
      aria-labelledby={headingId}
      aria-describedby={summaryId}
      onClose={onClose}
    >
      <div className="settings-header">
        <h2 id={headingId}>{strings.csvImport}</h2>
        <button type="button" className="icon-button" onClick={close}>
          <Icon name="close" />
          <span className="visually-hidden">{strings.close}</span>
        </button>
      </div>
      <div className="settings-body">
        {result.ok ? (
          <>
            <div id={summaryId}>
              <p>{count === 0 ? strings.csvNothing : strings.csvReady(count)}</p>
              {result.duplicates > 0 && <p>{strings.csvDuplicates(result.duplicates)}</p>}
            </div>
            {count > 0 && (
              <section aria-labelledby={`${id}-preview`}>
                <h3 id={`${id}-preview`}>{strings.csvPreviewHeading}</h3>
                <ul className="saved-list">
                  {result.drafts.slice(0, SHOWN_QUOTES).map((draft) => (
                    <li key={draft.text} className="saved-item">
                      <blockquote lang={draft.language}>
                        <p>{draft.text}</p>
                      </blockquote>
                      {(draft.author !== '' || draft.source !== '') && (
                        <p className="saved-author">
                          {[draft.author, draft.source].filter((part) => part !== '').join(', ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {count > SHOWN_QUOTES && (
                  <p className="muted">{strings.csvMoreProblems(count - SHOWN_QUOTES)}</p>
                )}
              </section>
            )}
            {result.problems.length > 0 && (
              <section aria-labelledby={`${id}-problems`}>
                <h3 id={`${id}-problems`}>{strings.csvProblemsHeading}</h3>
                <ul className="problems">
                  {result.problems.slice(0, SHOWN_PROBLEMS).map(({ row, error }) => (
                    <li key={row}>
                      <strong>{strings.csvRow(row)}</strong>: {rowErrorMessage(error, strings)}
                    </li>
                  ))}
                </ul>
                {result.problems.length > SHOWN_PROBLEMS && (
                  <p className="muted">
                    {strings.csvMoreProblems(result.problems.length - SHOWN_PROBLEMS)}
                  </p>
                )}
              </section>
            )}
          </>
        ) : (
          <p id={summaryId} className="setting-error">
            {fileErrorMessage(result.error, strings)}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="text-button" onClick={close}>
            {count > 0 ? strings.cancel : strings.close}
          </button>
          {count > 0 && (
            <button
              type="button"
              className="text-button primary-button"
              onClick={() => {
                onConfirm();
                close();
              }}
            >
              {strings.csvConfirm(count)}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
