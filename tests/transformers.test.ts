import postcss from 'postcss';
import { transformToNonLogical } from '../src/transformers';

describe('transformToNonLogical', () => {
    it('should transform when decl is transformable', () => {
        const decl = postcss.decl({
            prop: 'float',
            value: 'start',
        });

        const transformedDecl = transformToNonLogical(decl, 'rtl');

        expect(transformedDecl).toBeDefined();
        expect(transformedDecl!.prop).toStrictEqual('float');
        expect(transformedDecl!.value).toStrictEqual('right');

        // Ensure, that the original declaration doesn't change
        expect(decl.prop).toStrictEqual('float');
        expect(decl.value).toStrictEqual('start');
    });

    it('should not transform property with non logical value', () => {
        const decl = postcss.decl({
            prop: 'text-align',
            value: 'center',
        });

        const transformedDecl = transformToNonLogical(decl, 'rtl');
        expect(transformedDecl).toBeUndefined();
    });

    it('should throw an error when non transformable declaration has been passed', () => {
        const decl = postcss.decl({
            prop: 'margin',
            value: '5px',
        });

        expect(() => transformToNonLogical(decl, 'rtl')).toThrow('Unknown declaration property received: "margin"');
    });
});
