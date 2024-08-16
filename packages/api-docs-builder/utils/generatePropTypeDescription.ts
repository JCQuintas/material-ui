import { parse as docgenParse, PropItemType } from 'react-docgen-typescript';
import * as recast from 'recast';
import escapeCell from './escapeCell';

function getDeprecatedInfo(type: PropItemType) {
  const marker = /deprecatedPropType\((\r*\n)*\s*PropTypes\./g;
  const match = type.raw?.match(marker);
  const startIndex = type.raw?.search(marker);
  if (match) {
    const offset = match[0].length;

    return {
      propTypes: type.raw?.substring((startIndex ?? 0) + offset, type.raw.indexOf(',')),
      explanation: recast.parse(type.raw ?? '').program.body[0].expression.arguments[1].value,
    };
  }

  return false;
}

export function getChained(type: PropItemType) {
  if (type.raw) {
    const marker = 'chainPropTypes';
    const indexStart = type.raw.indexOf(marker);

    if (indexStart !== -1) {
      const parsed = docgenParse(
        `
        import PropTypes from 'prop-types';
        const Foo = () => <div />
        Foo.propTypes = {
          bar: ${recast.print(recast.parse(type.raw).program.body[0].expression.arguments[0]).code}
        }
        export default Foo
      `,
      ).at(0);
      return {
        type: parsed?.props.bar.type,
        required: parsed?.props.bar.required,
      };
    }
  }

  return false;
}

export function isElementTypeAcceptingRefProp(type: PropItemType): boolean {
  return type.raw === 'elementTypeAcceptingRef';
}

function isRefType(type: PropItemType): boolean {
  return type.raw === 'refType';
}

function isIntegerType(type: PropItemType): boolean {
  return type.raw?.startsWith('integerPropType') ?? false;
}

export function isElementAcceptingRefProp(type: PropItemType): boolean {
  return /^elementAcceptingRef/.test(type.raw ?? '');
}

export default function generatePropTypeDescription(type: PropItemType): string | undefined {
  switch (type.name) {
    case 'custom': {
      if (isElementTypeAcceptingRefProp(type)) {
        return 'element type';
      }
      if (isElementAcceptingRefProp(type)) {
        return 'element';
      }
      if (isIntegerType(type)) {
        return 'integer';
      }
      if (isRefType(type)) {
        return 'ref';
      }
      if (type.raw === 'HTMLElementType') {
        return 'HTML element';
      }
      if (type.raw === '() => null') {
        return 'any';
      }

      const deprecatedInfo = getDeprecatedInfo(type);
      if (deprecatedInfo !== false) {
        return generatePropTypeDescription({
          // eslint-disable-next-line react/forbid-foreign-prop-types
          name: deprecatedInfo.propTypes,
        } as any);
      }

      return type.raw;
    }

    case 'shape':
      return `{ ${Object.keys(type.value)
        .map((subValue) => {
          const subType = type.value[subValue];
          return `${subValue}${subType.required ? '' : '?'}: ${generatePropTypeDescription(
            subType,
          )}`;
        })
        .join(', ')} }`;

    case 'union':
      return (
        (type.value as { value: string }[])
          .map((type2) => {
            return escapeCell(type2.value);
          })
          // Display one value per line as it's better for visibility.
          .join('<br>&#124;&nbsp;')
      );
    case 'enum':
      return (
        (type.value as { value: string }[])
          .map((type2) => {
            return escapeCell(type2.value);
          })
          // Display one value per line as it's better for visibility.
          .join('<br>&#124;&nbsp;')
      );

    case 'arrayOf': {
      return `Array&lt;${generatePropTypeDescription(type.value)}&gt;`;
    }

    case 'instanceOf': {
      if (type.value.startsWith('typeof')) {
        return /typeof (.*) ===/.exec(type.value)![1];
      }
      return type.value;
    }

    default:
      return type.name;
  }
}
