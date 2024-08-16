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
  const { defaultValue, description, required, type } = prop;

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
    annotation.description.trim() === '' ||
    annotation.tags.some((tag) => tag.title === 'ignore')
  ) {
    return null;
  }

  if (defaultValue === undefined) {
    // Assume that this prop:
    // 1. Is typed by another component
    // 2. Is forwarded to that component
    // Then validation is handled by the other component.
    // Though this does break down if the prop is used in other capacity in the implementation.
    // So let's hope we don't make this mistake too often.
  } else if (defaultValue !== undefined && renderDefaultValue) {
    const shouldHaveDefaultAnnotation =
      // Discriminator for polymorphism which is not documented at the component level.
      // The documentation of `component` does not know in which component it is used.
      propName !== 'component';

    if (shouldHaveDefaultAnnotation) {
      throw new Error(
        `JSDoc @default annotation not found. Add \`@default ${defaultValue.value}\` to the JSDoc of this prop.`,
      );
    }
  }

  return {
    annotation,
    defaultValue: renderDefaultValue ? renderedDefaultValue! : null,
    required: Boolean(required),
    type,
    tags: prop.tags,
  };
}
