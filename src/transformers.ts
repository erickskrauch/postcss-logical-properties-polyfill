import postcss, { Declaration, list } from 'postcss';

interface TransformOptions {
    direction: 'ltr' | 'rtl';
    start: 'left' | 'right';
    end: 'left' | 'right';
}

type Transformer = (decl: Readonly<Declaration>, options: Readonly<TransformOptions>) => Declaration | Array<Declaration> | undefined;

const replaceValue: Transformer = (decl, { start, end }) => {
    const value = decl.value.toLowerCase();
    if (value === 'start' || value === 'inline-start') {
        return decl.clone({ value: start });
    }

    if (value === 'end' || value === 'inline-end') {
        return decl.clone({ value: end });
    }
};

const replaceInlineBox: Transformer = (decl, { start, end }) => {
    if (decl.prop.toLowerCase().includes('start')) {
        return decl.clone({ prop: decl.prop.replace('inline-start', start) });
    } else {
        return decl.clone({ prop: decl.prop.replace('inline-end', end) });
    }
};

const replaceInlineBoxShorthand: Transformer = (decl, { start, end }) => {
    const parts = list.space(decl.value);
    if (parts.length === 2) {
        return [
            decl.clone({ prop: decl.prop.replace('inline', start), value: parts[0] }),
            decl.clone({ prop: decl.prop.replace('inline', end), value: parts[1] }),
        ];
    } else {
        return [
            decl.clone({ prop: decl.prop.replace('inline', start), value: parts[0] }),
            decl.clone({ prop: decl.prop.replace('inline', end), value: parts[0] }),
        ];
    }
};

// TODO: in the future, this transformer shouldn't generate LTR/RTL rules and should write directly into the rule
const replaceSimpleRL: Transformer = (decl, { start, end }) => {
    return [
        decl.clone({ prop: decl.prop.replace('inline', start) }),
        decl.clone({ prop: decl.prop.replace('inline', end) }),
    ];
};

const replaceInlinePositioning: Transformer = (decl, { start, end }) => {
    if (decl.prop.toLowerCase().includes('start')) {
        return decl.clone({ prop: start });
    } else {
        return decl.clone({ prop: end });
    }
};

const replaceInlinePositioningShorthand: Transformer = (decl, { start, end }) => {
    const parts = list.space(decl.value);
    if (parts.length === 2) {
        return [
            decl.clone({ prop: start, value: parts[0] }),
            decl.clone({ prop: end, value: parts[1] }),
        ];
    } else {
        return [
            decl.clone({ prop: start, value: parts[0] }),
            decl.clone({ prop: end, value: parts[0] }),
        ];
    }
};

const replaceBorderRadius: Transformer = (decl, { start, end }) => {
    return decl.clone({
        prop: decl.prop
            .replace('border-start', 'border-top')
            .replace('border-end', 'border-bottom')
            .replace('start', start)
            .replace('end', end)
        });
}

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
            if (newDecl.prop === prop) {
                return;
            }

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

function shouldFindTransformer(prop: string): Transformer {
    const transformer = transformationMap[prop.toLowerCase()];
    if (!transformer) {
        throw new Error(`Unknown declaration property received: "${prop}"`);
    }

    return transformer;
}

const transformationMap: Record<string, Transformer> = {
    float: replaceValue,
    clear: replaceValue,
    'text-align': replaceValue,

    'padding-inline': replaceInlineBoxShorthand,
    'padding-inline-start': replaceInlineBox,
    'padding-inline-end': replaceInlineBox,

    'margin-inline': replaceInlineBoxShorthand,
    'margin-inline-start': replaceInlineBox,
    'margin-inline-end': replaceInlineBox,

    'border-inline': replaceSimpleRL,
    'border-inline-start': replaceInlineBox,
    'border-inline-end': replaceInlineBox,

    'border-inline-color': replaceInlineBoxShorthand,
    'border-inline-start-color': replaceInlineBox,
    'border-inline-end-color': replaceInlineBox,

    'border-inline-style': replaceInlineBoxShorthand,
    'border-inline-start-style': replaceInlineBox,
    'border-inline-end-style': replaceInlineBox,

    'border-inline-width': replaceInlineBoxShorthand,
    'border-inline-start-width': replaceInlineBox,
    'border-inline-end-width': replaceInlineBox,

    'border-start-start-radius': replaceBorderRadius,
    'border-start-end-radius': replaceBorderRadius,
    'border-end-start-radius': replaceBorderRadius,
    'border-end-end-radius': replaceBorderRadius,

    // inset: // TODO: implement when the "block" props will be supported
    'inset-inline': replaceInlinePositioningShorthand,
    'inset-inline-start': replaceInlinePositioning,
    'inset-inline-end': replaceInlinePositioning,

    transition: replaceTransition,
    'transition-property': replaceTransition,
};

export function isSupportedProp(prop: string): boolean {
    return prop.toLowerCase() in transformationMap;
}

export function transformToNonLogical(
    decl: Readonly<Declaration>,
    direction: 'ltr' | 'rtl',
): Declaration | Array<Declaration> | undefined {
    const start = direction === 'ltr' ? 'left' : 'right';
    const end = direction === 'ltr' ? 'right' : 'left';

    return shouldFindTransformer(decl.prop)(decl, { direction, start, end });
}
