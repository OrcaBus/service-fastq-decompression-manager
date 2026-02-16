export type SchemaNames = 'decompressionRequest' | 'decompressionStateChange';

export const schemaNamesList: SchemaNames[] = ['decompressionRequest', 'decompressionStateChange'];

export interface BuildSchemaProps {
  schemaName: SchemaNames;
}
