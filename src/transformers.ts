import { Declaration } from 'postcss';

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
};

export function isSupportedProp(prop: string): boolean {
    return prop.toLowerCase() in transformationMap;
}

export function transformToNonLogical(decl: Readonly<Declaration>, direction: 'ltr' | 'rtl'): Declaration | undefined {
    const transformer = transformationMap[decl.prop.toLowerCase()];
    if (!transformer) {
        throw new Error(`Unknown declaration property received: "${decl.prop}"`);
    }

    const start = direction === 'ltr' ? 'left' : 'right';
    const end = direction === 'ltr' ? 'right' : 'left';

    return transformer(decl, start, end);
}
