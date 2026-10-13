import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import type { Tag } from '../../data/model.js';
import { localized } from '../catalog/catalog.js';
import { LANGUAGES, isLanguage, type Language, type Strings } from '../i18n/strings.js';
import {
  draftError,
  MAX_FIELD_LENGTH,
  MAX_TEXT_LENGTH,
  type PersonalQuote,
  type PersonalQuoteDraft,
} from '../personal/personal.js';
import { Icon } from './Icon.js';

const LANGUAGE_NAMES = { en: 'English', pl: 'Polski' } as const;

interface PersonalQuoteDialogProps {
  /** The quote being edited, or undefined to add a new one. */
  quote: PersonalQuote | undefined;
  tags: Tag[];
  language: Language;
  strings: Strings;
  onSave: (draft: PersonalQuoteDraft) => void;
  /** Called once the dialog has closed, saved or not. */
  onClose: () => void;
}

function initialDraft(quote: PersonalQuote | undefined, language: Language): PersonalQuoteDraft {
  return quote
    ? {
        text: quote.text,
        author: quote.author,
        source: quote.source,
        language: quote.language,
        tags: quote.tags,
      }
    : { text: '', author: '', source: '', language, tags: [] };
}

/**
 * Adds or edits one of the reader's own quotes in a modal dialog. It opens as
 * soon as it mounts; the parent unmounts it when it closes, so every opening
 * starts from a fresh form.
 */
export function PersonalQuoteDialog({
  quote,
  tags,
  language,
  strings,
  onSave,
  onClose,
}: PersonalQuoteDialogProps) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const textField = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(() => initialDraft(quote, language));
  const [submitted, setSubmitted] = useState(false);
  const error = draftError(draft);
  const showError = submitted && error !== undefined;

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    // Start where the reader types, not on the close button.
    textField.current?.focus();
  }, []);

  function update(change: Partial<PersonalQuoteDraft>) {
    setDraft((current) => ({ ...current, ...change }));
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (error !== undefined) {
      textField.current?.focus();
      return;
    }
    onSave(draft);
    dialog.current?.close();
  }

  const headingId = `${id}-heading`;
  const errorId = `${id}-text-error`;
  const hintId = `${id}-text-hint`;
  const sourceHintId = `${id}-source-hint`;
  const tagsHintId = `${id}-tags-hint`;
  const heading = quote ? strings.editQuote : strings.addQuote;

  return (
    <dialog ref={dialog} className="settings" aria-labelledby={headingId} onClose={onClose}>
      <div className="settings-header">
        <h2 id={headingId}>{heading}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={() => {
            dialog.current?.close();
          }}
        >
          <Icon name="close" />
          <span className="visually-hidden">{strings.close}</span>
        </button>
      </div>
      <form className="settings-body" noValidate onSubmit={submit}>
        <div className="setting">
          <label className="setting-label" htmlFor={`${id}-text`}>
            {strings.quoteTextLabel}
          </label>
          <textarea
            ref={textField}
            id={`${id}-text`}
            className="field"
            rows={5}
            lang={draft.language}
            value={draft.text}
            required
            aria-invalid={showError}
            aria-describedby={showError ? `${errorId} ${hintId}` : hintId}
            onChange={(event) => {
              update({ text: event.target.value });
            }}
          />
          <p className="setting-error" id={errorId}>
            {showError &&
              (error === 'textRequired'
                ? strings.textRequired
                : strings.textTooLong(MAX_TEXT_LENGTH))}
          </p>
          <p className="setting-hint" id={hintId}>
            {strings.quoteTextHint(MAX_TEXT_LENGTH)}
          </p>
        </div>
        <div className="setting">
          <label className="setting-label" htmlFor={`${id}-author`}>
            {strings.quoteAuthorLabel}
          </label>
          <input
            id={`${id}-author`}
            className="field"
            type="text"
            autoComplete="off"
            maxLength={MAX_FIELD_LENGTH}
            value={draft.author}
            onChange={(event) => {
              update({ author: event.target.value });
            }}
          />
        </div>
        <div className="setting">
          <label className="setting-label" htmlFor={`${id}-source`}>
            {strings.quoteSourceLabel}
          </label>
          <input
            id={`${id}-source`}
            className="field"
            type="text"
            autoComplete="off"
            maxLength={MAX_FIELD_LENGTH}
            value={draft.source}
            aria-describedby={sourceHintId}
            onChange={(event) => {
              update({ source: event.target.value });
            }}
          />
          <p className="setting-hint" id={sourceHintId}>
            {strings.quoteSourceHint}
          </p>
        </div>
        <div className="setting setting-row">
          <label className="setting-label" htmlFor={`${id}-language`}>
            {strings.quoteLanguageLabel}
          </label>
          <select
            id={`${id}-language`}
            value={draft.language}
            onChange={(event) => {
              const value = event.target.value;
              if (isLanguage(value)) update({ language: value });
            }}
          >
            {LANGUAGES.map((option) => (
              <option key={option} value={option} lang={option}>
                {LANGUAGE_NAMES[option]}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="setting checks" aria-describedby={tagsHintId}>
          <legend className="setting-label">{strings.quoteTagsLabel}</legend>
          {tags.map((tag) => (
            <label key={tag.id} className="check">
              <input
                type="checkbox"
                checked={draft.tags.includes(tag.id)}
                onChange={(event) => {
                  update({
                    tags: event.target.checked
                      ? [...draft.tags, tag.id]
                      : draft.tags.filter((t) => t !== tag.id),
                  });
                }}
              />
              {localized(tag.label, language)}
            </label>
          ))}
          <p className="setting-hint" id={tagsHintId}>
            {strings.quoteTagsHint}
          </p>
        </fieldset>
        <div className="form-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              dialog.current?.close();
            }}
          >
            {strings.cancel}
          </button>
          <button type="submit" className="text-button primary-button">
            {strings.save}
          </button>
        </div>
      </form>
    </dialog>
  );
}
