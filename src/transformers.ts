import postcss, { Declaration, list } from 'postcss';

type Transformer = (
    decl: Readonly<Declaration>,
    start: 'left' | 'right',
    end: 'left' | 'right',
) => Declaration | undefined;

const replaceValue: Transformer = (decl, start, end) => {
    const value = decl.value.toLowerCase();
    if (value === 'start' || value === 'inline-start') {
        return decl.clone({ value: start });
    }

    if (value === 'end' || value === 'inline-end') {
        return decl.clone({ value: end });
    }
};

const replaceInlineBox: Transformer = (decl, start, end) => {
    if (decl.prop.toLowerCase().includes('start')) {
        return decl.clone({ prop: decl.prop.replace('inline-start', start) });
    } else {
        return decl.clone({ prop: decl.prop.replace('inline-end', end) });
    }
};

const replaceInlinePositioning: Transformer = (decl, start, end) => {
    if (decl.prop.toLowerCase().includes('start')) {
        return decl.clone({ prop: start });
    } else {
        return decl.clone({ prop: end });
    }
};

const replaceTransition: Transformer = (decl, start, end) => {
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
    indexesToModify.forEach((i) => {
        const [prop] = parsedItems[i];
        const tempDecl = postcss.decl({
            prop,
            value: 'initial',
        });
        const newDecl = shouldFindTransformer(prop)(tempDecl, start, end);
        if (newDecl && newDecl.prop !== prop) {
            hasChangedProps = true;
            parsedItems[i][0] = newDecl.prop;
        }
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
    'padding-inline-start': replaceInlineBox,
    'padding-inline-end': replaceInlineBox,
    'border-inline-start': replaceInlineBox,
    'border-inline-end': replaceInlineBox,
    'border-inline-start-color': replaceInlineBox,
    'border-inline-end-color': replaceInlineBox,
    'border-inline-start-style': replaceInlineBox,
    'border-inline-end-style': replaceInlineBox,
    'border-inline-start-width': replaceInlineBox,
    'border-inline-end-width': replaceInlineBox,
    'border-inline-start-top': replaceInlineBox,
    'border-inline-end-top': replaceInlineBox,
    'border-top-inline-start-radius': replaceInlineBox,
    'border-top-inline-end-radius': replaceInlineBox,
    'border-bottom-inline-start-radius': replaceInlineBox,
    'border-bottom-inline-end-radius': replaceInlineBox,
    'margin-inline-start': replaceInlineBox,
    'margin-inline-end': replaceInlineBox,
    'inset-inline-start': replaceInlinePositioning,
    'inset-inline-end': replaceInlinePositioning,
    transition: replaceTransition,
    'transition-property': replaceTransition,
};

export function isSupportedProp(prop: string): boolean {
    return prop.toLowerCase() in transformationMap;
}

export function transformToNonLogical(decl: Readonly<Declaration>, direction: 'ltr' | 'rtl'): Declaration | undefined {
    const start = direction === 'ltr' ? 'left' : 'right';
    const end = direction === 'ltr' ? 'right' : 'left';

    return shouldFindTransformer(decl.prop)(decl, start, end);
}
