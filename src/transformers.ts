import postcss, { Declaration, list } from 'postcss';

import { Direction, WritingMode } from './types';

type TransformSizeLiteral = 'height' | 'width';
type TransformValueLiteral = 'left' | 'right';
type TransformResizeLiteral = 'vertical' | 'horizontal';
type TransformDirectionLiteral = 'top' | 'bottom' | 'left' | 'right';
type TransformBorderRadiusLiteral = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface TransformOptions {
    valueStart: TransformValueLiteral;
    valueEnd: TransformValueLiteral;

    resizeBlock: TransformResizeLiteral;
    resizeInline: TransformResizeLiteral;

    blockSize: TransformSizeLiteral;
    inlineSize: TransformSizeLiteral;

    inlineStart: TransformDirectionLiteral;
    inlineEnd: TransformDirectionLiteral;
    blockStart: TransformDirectionLiteral;
    blockEnd: TransformDirectionLiteral;

    borderStartStart: TransformBorderRadiusLiteral;
    borderStartEnd: TransformBorderRadiusLiteral;
    borderEndStart: TransformBorderRadiusLiteral;
    borderEndEnd: TransformBorderRadiusLiteral;
}

type Transformer = (
    decl: Readonly<Declaration>,
    options: Readonly<TransformOptions>,
) => Declaration | Array<Declaration> | undefined;

function getDirectionParams(
    decl: Declaration,
    options: TransformOptions,
): ['block' | 'inline', TransformDirectionLiteral, TransformDirectionLiteral] {
    if (decl.prop.includes('block')) {
        return ['block', options.blockStart, options.blockEnd];
    } else {
        return ['inline', options.inlineStart, options.inlineEnd];
    }
}

const replaceStartEndValue: Transformer = (decl, { valueStart, valueEnd }) => {
    const value = decl.value.toLowerCase();
    if (value === 'start' || value === 'inline-start') {
        return decl.clone({ value: valueStart });
    }

    if (value === 'end' || value === 'inline-end') {
        return decl.clone({ value: valueEnd });
    }
};

const replaceResize: Transformer = (decl, { resizeBlock, resizeInline }) => {
    const value = decl.value.toLowerCase();
    if (value === 'block') {
        return decl.clone({ value: resizeBlock });
    }

    if (value === 'inline') {
        return decl.clone({ value: resizeInline });
    }
};

const replaceDimension: Transformer = (decl, { blockSize, inlineSize }) => {
    if (decl.prop.includes('block')) {
        return decl.clone({ prop: decl.prop.replace('block-size', blockSize) });
    } else {
        return decl.clone({ prop: decl.prop.replace('inline-size', inlineSize) });
    }
};

const replaceDirectionalBoxShorthand: Transformer = (decl, options) => {
    const [direction, start, end] = getDirectionParams(decl, options);
    const parts = list.space(decl.value);

    return [
        decl.clone({ prop: decl.prop.replace(direction, start), value: parts[0] }),
        decl.clone({ prop: decl.prop.replace(direction, end), value: parts[1] ?? parts[0] }),
    ];
};

const replaceBox: Transformer = (decl, options) => {
    const [direction, start, end] = getDirectionParams(decl, options);

    if (decl.prop.toLowerCase().includes('start')) {
        return decl.clone({ prop: decl.prop.replace(`${direction}-start`, start) });
    } else {
        return decl.clone({ prop: decl.prop.replace(`${direction}-end`, end) });
    }
};

const replaceSimpleRL: Transformer = (decl, options) => {
    const [direction, start, end] = getDirectionParams(decl, options);

    return [
        decl.clone({ prop: decl.prop.replace(direction, start) }),
        decl.clone({ prop: decl.prop.replace(direction, end) }),
    ];
};

const replaceInlinePositioning: Transformer = (decl, { inlineStart, inlineEnd }) => {
    if (decl.prop.toLowerCase().includes('start')) {
        return decl.clone({ prop: inlineStart });
    } else {
        return decl.clone({ prop: inlineEnd });
    }
};

const replaceBoxShorthand: Transformer = (decl, options) => {
    const parts = list.space(decl.value);
    if (parts[0] !== 'logical') {
        return;
    }

    return [
        decl.clone({ prop: `${decl.prop}-${options.blockStart}`, value: parts[1] }),
        decl.clone({ prop: `${decl.prop}-${options.inlineEnd}`, value: parts[2] ?? parts[1] }),
        decl.clone({ prop: `${decl.prop}-${options.blockEnd}`, value: parts[3] ?? parts[1] }),
        decl.clone({ prop: `${decl.prop}-${options.inlineStart}`, value: parts[4] ?? parts[2] ?? parts[1] }),
    ];
};

const replaceInsetShorthand: Transformer = (decl, options) => {
    const parts = list.space(decl.value);
    if (parts[0] === 'logical') {
        return [
            decl.clone({ prop: options.blockStart, value: parts[1] }),
            decl.clone({ prop: options.inlineStart, value: parts[2] ?? parts[1] }),
            decl.clone({ prop: options.blockEnd, value: parts[3] ?? parts[1] }),
            decl.clone({ prop: options.inlineEnd, value: parts[4] ?? parts[2] ?? parts[1] }),
        ];
    }

    return [
        decl.clone({ prop: 'top', value: parts[0] }),
        decl.clone({ prop: 'left', value: parts[1] ?? parts[0] }),
        decl.clone({ prop: 'bottom', value: parts[2] ?? parts[0] }),
        decl.clone({ prop: 'right', value: parts[3] ?? parts[1] ?? parts[0] }),
    ];
};

const replaceBorderShorthand: Transformer = (decl, options) => {
    const parts = list.space(decl.value);
    if (parts[0] !== 'logical') {
        return;
    }

    const nameParts = decl.prop.split('-');

    return [
        decl.clone({ prop: `${nameParts[0]}-${options.blockStart}-${nameParts[1]}`, value: parts[1] }),
        decl.clone({ prop: `${nameParts[0]}-${options.inlineStart}-${nameParts[1]}`, value: parts[2] ?? parts[1] }),
        decl.clone({ prop: `${nameParts[0]}-${options.blockEnd}-${nameParts[1]}`, value: parts[3] ?? parts[1] }),
        decl.clone({
            prop: `${nameParts[0]}-${options.inlineEnd}-${nameParts[1]}`,
            value: parts[4] ?? parts[2] ?? parts[1],
        }),
    ];
};

const replacePositioningShorthand: Transformer = (decl, options) => {
    const [, start, end] = getDirectionParams(decl, options);
    const parts = list.space(decl.value);

    return [decl.clone({ prop: start, value: parts[0] }), decl.clone({ prop: end, value: parts[1] ?? parts[0] })];
};

const replaceBorderRadius: Transformer = (decl, options) => {
    return decl.clone({
        prop: decl.prop
            .replace('start-start', options.borderStartStart)
            .replace('start-end', options.borderStartEnd)
            .replace('end-start', options.borderEndStart)
            .replace('end-end', options.borderEndEnd),
    });
};

const replaceTransition: Transformer = (decl, options) => {
    const rawItems = list.comma(decl.value);
    // There might be "transition-property" or shorthand "transition"
    // In any case, property name is always comes first, so each element at [0] will contain a property name
    const parsedItems = rawItems.map(list.space);
    const indexesToModify = parsedItems.reduce<number[]>((indexes, [prop], i) => {
        if (isSupportedProp(prop)) {
            indexes.push(i);
        }

        return indexes;
    }, []);

    if (indexesToModify.length === 0) {
        return;
    }

    let hasChangedProps = false;
    let countOfNewProps = 0;
    indexesToModify.forEach((i) => {
        const [prop, ...restParams] = parsedItems[i + countOfNewProps];
        const tempDecl = postcss.decl({
            prop,
            value: 'initial',
        });
        const newDecls = shouldFindTransformer(prop)(tempDecl, options);
        if (!newDecls) {
            return;
        }

        (Array.isArray(newDecls) ? newDecls : [newDecls]).forEach((newDecl, declarationIndex) => {
            hasChangedProps = true;
            if (declarationIndex === 0) {
                parsedItems[i + countOfNewProps][0] = newDecl.prop;
            } else {
                parsedItems.splice(i + countOfNewProps, 0, [newDecl.prop, ...restParams]);
                countOfNewProps++;
            }
        });
    });

    if (!hasChangedProps) {
        return;
    }

    return decl.clone({
        value: parsedItems.map((item) => item.join(' ')).join(', '),
    });
};

const transformationMap: Record<string, Transformer> = {
    // https://www.w3.org/TR/css-logical-1/#float-clear
    float: replaceStartEndValue,
    clear: replaceStartEndValue,

    // https://www.w3.org/TR/css-logical-1/#text-align
    'text-align': replaceStartEndValue,

    // https://www.w3.org/TR/css-logical-1/#resize
    resize: replaceResize,

    // https://www.w3.org/TR/css-logical-1/#dimension-properties
    'block-size': replaceDimension,
    'inline-size': replaceDimension,
    'min-block-size': replaceDimension,
    'min-inline-size': replaceDimension,
    'max-block-size': replaceDimension,
    'max-inline-size': replaceDimension,

    // https://www.w3.org/TR/css-logical-1/#margin-properties
    margin: replaceBoxShorthand,
    'margin-block': replaceDirectionalBoxShorthand,
    'margin-block-start': replaceBox,
    'margin-block-end': replaceBox,
    'margin-inline': replaceDirectionalBoxShorthand,
    'margin-inline-start': replaceBox,
    'margin-inline-end': replaceBox,

    // https://www.w3.org/TR/css-logical-1/#inset-properties
    inset: replaceInsetShorthand,
    'inset-block': replacePositioningShorthand,
    'inset-block-start': replaceInlinePositioning,
    'inset-block-end': replaceInlinePositioning,
    'inset-inline': replacePositioningShorthand,
    'inset-inline-start': replaceInlinePositioning,
    'inset-inline-end': replaceInlinePositioning,

    // https://www.w3.org/TR/css-logical-1/#padding-properties
    padding: replaceBoxShorthand,
    'padding-inline': replaceDirectionalBoxShorthand,
    'padding-inline-start': replaceBox,
    'padding-inline-end': replaceBox,
    'padding-block': replaceDirectionalBoxShorthand,
    'padding-block-start': replaceBox,
    'padding-block-end': replaceBox,

    // https://www.w3.org/TR/css-logical-1/#border-width
    'border-width': replaceBorderShorthand,
    'border-block-width': replaceDirectionalBoxShorthand,
    'border-block-start-width': replaceBox,
    'border-block-end-width': replaceBox,
    'border-inline-width': replaceDirectionalBoxShorthand,
    'border-inline-start-width': replaceBox,
    'border-inline-end-width': replaceBox,

    // https://www.w3.org/TR/css-logical-1/#border-style
    'border-style': replaceBorderShorthand,
    'border-block-style': replaceDirectionalBoxShorthand,
    'border-block-start-style': replaceBox,
    'border-block-end-style': replaceBox,
    'border-inline-style': replaceDirectionalBoxShorthand,
    'border-inline-start-style': replaceBox,
    'border-inline-end-style': replaceBox,

    // https://www.w3.org/TR/css-logical-1/#border-color
    'border-color': replaceBorderShorthand,
    'border-block-color': replaceDirectionalBoxShorthand,
    'border-block-start-color': replaceBox,
    'border-block-end-color': replaceBox,
    'border-inline-color': replaceDirectionalBoxShorthand,
    'border-inline-start-color': replaceBox,
    'border-inline-end-color': replaceBox,

    // https://www.w3.org/TR/css-logical-1/#border-shorthands
    'border-block': replaceSimpleRL,
    'border-block-start': replaceBox,
    'border-block-end': replaceBox,
    'border-inline': replaceSimpleRL,
    'border-inline-start': replaceBox,
    'border-inline-end': replaceBox,

    // https://www.w3.org/TR/css-logical-1/#border-radius-shorthands
    'border-start-start-radius': replaceBorderRadius,
    'border-start-end-radius': replaceBorderRadius,
    'border-end-start-radius': replaceBorderRadius,
    'border-end-end-radius': replaceBorderRadius,

    transition: replaceTransition,
    'transition-property': replaceTransition,
};

function shouldFindTransformer(prop: string): Transformer {
    const transformer = transformationMap[prop.toLowerCase()];
    if (!transformer) {
        throw new Error(`Unknown declaration property received: "${prop}"`);
    }

    return transformer;
}

function shouldGetTransformerOptions(writingMode: WritingMode, direction: Direction): TransformOptions {
    let options: Omit<TransformOptions, 'valueStart' | 'valueEnd' | 'resizeBlock' | 'resizeInline'>;

    switch (writingMode) {
        case 'horizontal-tb':
            options = {
                blockSize: 'height',
                inlineSize: 'width',
                inlineStart: 'left',
                inlineEnd: 'right',
                blockStart: 'top',
                blockEnd: 'bottom',
                borderStartStart: 'top-left',
                borderStartEnd: 'top-right',
                borderEndStart: 'bottom-left',
                borderEndEnd: 'bottom-right',
            };
            break;
        case 'vertical-rl':
        case 'sideways-rl':
            options = {
                blockSize: 'width',
                inlineSize: 'height',
                inlineStart: 'top',
                inlineEnd: 'bottom',
                blockStart: 'right',
                blockEnd: 'left',
                borderStartStart: 'top-right',
                borderStartEnd: 'bottom-right',
                borderEndStart: 'top-left',
                borderEndEnd: 'bottom-left',
            };
            break;
        case 'vertical-lr':
            options = {
                blockSize: 'width',
                inlineSize: 'height',
                inlineStart: 'top',
                inlineEnd: 'bottom',
                blockStart: 'left',
                blockEnd: 'right',
                borderStartStart: 'top-left',
                borderStartEnd: 'bottom-left',
                borderEndStart: 'top-right',
                borderEndEnd: 'bottom-right',
            };
            break;
        case 'sideways-lr':
            options = {
                blockSize: 'width',
                inlineSize: 'height',
                inlineStart: 'bottom',
                inlineEnd: 'top',
                blockStart: 'left',
                blockEnd: 'right',
                borderStartStart: 'bottom-left',
                borderStartEnd: 'top-left',
                borderEndStart: 'bottom-right',
                borderEndEnd: 'top-right',
            };
            break;
        default:
            throw new Error(`Unknown writing-mode received: "${writingMode}"`);
    }

    if (direction === 'rtl') {
        [options.inlineStart, options.inlineEnd] = [options.inlineEnd, options.inlineStart];
        [options.borderStartStart, options.borderStartEnd] = [options.borderStartEnd, options.borderStartStart];
        [options.borderEndStart, options.borderEndEnd] = [options.borderEndEnd, options.borderEndStart];
    }

    return {
        valueStart: direction === 'ltr' ? 'left' : 'right',
        valueEnd: direction === 'ltr' ? 'right' : 'left',
        resizeBlock: writingMode === 'horizontal-tb' ? 'vertical' : 'horizontal',
        resizeInline: writingMode === 'horizontal-tb' ? 'horizontal' : 'vertical',
        ...options,
    };
}

export function isSupportedProp(prop: string): boolean {
    return prop.toLowerCase() in transformationMap;
}

export function transformToNonLogical(
    decl: Readonly<Declaration>,
    writingMode: WritingMode,
    direction: Direction,
): Declaration | Array<Declaration> | undefined {
    const transformer = shouldFindTransformer(decl.prop);
    const options = shouldGetTransformerOptions(writingMode, direction);

    return transformer(decl, options);
}
