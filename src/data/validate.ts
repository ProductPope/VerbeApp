import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import authorsSchema from '../../data/schema/authors.schema.json' with { type: 'json' };
import communityCollectionSchema from '../../data/schema/community-collection.schema.json' with { type: 'json' };
import commonSchema from '../../data/schema/common.schema.json' with { type: 'json' };
import quoteCollectionSchema from '../../data/schema/quote-collection.schema.json' with { type: 'json' };
import sourcesSchema from '../../data/schema/sources.schema.json' with { type: 'json' };
import tagsSchema from '../../data/schema/tags.schema.json' with { type: 'json' };

export type SchemaName =
  'tags' | 'authors' | 'sources' | 'quote-collection' | 'community-collection';

function createValidators(): Record<SchemaName, ValidateFunction> {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  ajv.addSchema(commonSchema);
  return {
    tags: ajv.compile(tagsSchema),
    authors: ajv.compile(authorsSchema),
    sources: ajv.compile(sourcesSchema),
    'quote-collection': ajv.compile(quoteCollectionSchema),
    'community-collection': ajv.compile(communityCollectionSchema),
  };
}

let validators: Record<SchemaName, ValidateFunction> | undefined;

function formatError(error: ErrorObject): string {
  const where = error.instancePath === '' ? '(root)' : error.instancePath;
  return `${where} ${error.message ?? 'is invalid'}`;
}

/** Validates a parsed data file against its JSON Schema; returns readable errors. */
export function validateAgainstSchema(schema: SchemaName, data: unknown): string[] {
  validators ??= createValidators();
  const validate = validators[schema];
  return validate(data) ? [] : (validate.errors ?? []).map(formatError);
}
