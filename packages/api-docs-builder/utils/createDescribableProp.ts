import * as doctrine from 'doctrine';
import { PropItem, PropItemType } from 'react-docgen-typescript';

export interface DescribablePropDescriptor {
  annotation: doctrine.Annotation;
  defaultValue: string | null;
  required: boolean;
  type: PropItemType;
  tags: PropItem['tags'];
}

export type CreateDescribablePropSettings = {
  /**
   * Names of props that do not check if the annotations equal runtime default.
   */
  propsWithoutDefaultVerification?: string[];
};

/**
 * Returns `null` if the prop should be ignored.
 * Throws if it is invalid.
 * @param prop
 * @param propName
 */
export default function createDescribableProp(
  prop: PropItem,
  propName: string,
): DescribablePropDescriptor | null {
  const { defaultValue, description, required, type, tags } = prop;

  const renderedDefaultValue = defaultValue?.value.replace(/\r?\n/g, '');
  const renderDefaultValue = Boolean(
    renderedDefaultValue &&
      // Ignore "large" default values that would break the table layout.
      renderedDefaultValue.length <= 150,
  );

  if (description === undefined) {
    throw new Error(`The "${propName}" prop is missing a description.`);
  }

  const annotation = doctrine.parse(description, {
    sloppy: true,
  });

  if (
    description.trim() === '' ||
    // @ts-expect-error empty object type
    tags?.ignore
  ) {
    return null;
  }

  return {
    annotation,
    defaultValue: renderDefaultValue ? renderedDefaultValue! : null,
    required: Boolean(required),
    type,
    tags: prop.tags,
  };
}
