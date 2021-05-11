import postcss, { Declaration } from 'postcss';
import { transformToNonLogical } from '../src/transformers';
import { WritingMode, Direction } from '../src/types';

describe('transformToNonLogical', () => {
    it('should transform when decl is transformable', () => {
        const decl = postcss.decl({
            prop: 'float',
            value: 'start',
        });

        const transformedDecl = transformToNonLogical(decl, 'horizontal-tb', 'rtl');

        expect(transformedDecl).toBeDefined();
        expect(transformedDecl).toBeInstanceOf(Declaration);
        expect((transformedDecl as Declaration).prop).toStrictEqual('float');
        expect((transformedDecl as Declaration).value).toStrictEqual('right');

        // Ensure, that the original declaration doesn't change
        expect(decl.prop).toStrictEqual('float');
        expect(decl.value).toStrictEqual('start');
    });

    describe('logical border-radius', () => {
        const input = {
            ss: postcss.decl({ prop: 'border-start-start-radius', value: '0px' }),
            se: postcss.decl({ prop: 'border-start-end-radius', value: '1px' }),
            es: postcss.decl({ prop: 'border-end-start-radius', value: '2px' }),
            ee: postcss.decl({ prop: 'border-end-end-radius', value: '3px' }),
        };

        function runTest(writingMode: WritingMode, direction: Direction, expectedResult: typeof input) {
            for (const side in input) {
                // @ts-ignore
                const decl = input[side];
                // @ts-ignore
                const expected = expectedResult[side];

                const transformedDecl = transformToNonLogical(decl, writingMode, direction);
                expect(transformedDecl).toBeDefined();
                expect(transformedDecl).toBeInstanceOf(Declaration);
                expect((transformedDecl as Declaration).prop).toStrictEqual(expected.prop);
                expect((transformedDecl as Declaration).value).toStrictEqual(expected.value);
            }
        }

        it('horizontal-tb', () => {
            runTest('horizontal-tb', 'ltr', {
                ss: postcss.decl({ prop: 'border-top-left-radius', value: '0px' }),
                se: postcss.decl({ prop: 'border-top-right-radius', value: '1px' }),
                es: postcss.decl({ prop: 'border-bottom-left-radius', value: '2px' }),
                ee: postcss.decl({ prop: 'border-bottom-right-radius', value: '3px' }),
            });

            runTest('horizontal-tb', 'rtl', {
                ss: postcss.decl({ prop: 'border-top-right-radius', value: '0px' }),
                se: postcss.decl({ prop: 'border-top-left-radius', value: '1px' }),
                es: postcss.decl({ prop: 'border-bottom-right-radius', value: '2px' }),
                ee: postcss.decl({ prop: 'border-bottom-left-radius', value: '3px' }),
            });
        });

        it('vertical-rl', () => {
            runTest('vertical-rl', 'ltr', {
                ss: postcss.decl({ prop: 'border-top-right-radius', value: '0px' }),
                se: postcss.decl({ prop: 'border-bottom-right-radius', value: '1px' }),
                es: postcss.decl({ prop: 'border-top-left-radius', value: '2px' }),
                ee: postcss.decl({ prop: 'border-bottom-left-radius', value: '3px' }),
            });

            runTest('vertical-rl', 'rtl', {
                ss: postcss.decl({ prop: 'border-bottom-right-radius', value: '0px' }),
                se: postcss.decl({ prop: 'border-top-right-radius', value: '1px' }),
                es: postcss.decl({ prop: 'border-bottom-left-radius', value: '2px' }),
                ee: postcss.decl({ prop: 'border-top-left-radius', value: '3px' }),
            });
        });

        it('vertical-lr', () => {
            runTest('vertical-lr', 'ltr', {
                ss: postcss.decl({ prop: 'border-top-left-radius', value: '0px' }),
                se: postcss.decl({ prop: 'border-bottom-left-radius', value: '1px' }),
                es: postcss.decl({ prop: 'border-top-right-radius', value: '2px' }),
                ee: postcss.decl({ prop: 'border-bottom-right-radius', value: '3px' }),
            });

            runTest('vertical-lr', 'rtl', {
                ss: postcss.decl({ prop: 'border-bottom-left-radius', value: '0px' }),
                se: postcss.decl({ prop: 'border-top-left-radius', value: '1px' }),
                es: postcss.decl({ prop: 'border-bottom-right-radius', value: '2px' }),
                ee: postcss.decl({ prop: 'border-top-right-radius', value: '3px' }),
            });
        });

        it('sideways-rl', () => {
            runTest('sideways-rl', 'ltr', {
                ss: postcss.decl({ prop: 'border-top-right-radius', value: '0px' }),
                se: postcss.decl({ prop: 'border-bottom-right-radius', value: '1px' }),
                es: postcss.decl({ prop: 'border-top-left-radius', value: '2px' }),
                ee: postcss.decl({ prop: 'border-bottom-left-radius', value: '3px' }),
            });

            runTest('sideways-rl', 'rtl', {
                ss: postcss.decl({ prop: 'border-bottom-right-radius', value: '0px' }),
                se: postcss.decl({ prop: 'border-top-right-radius', value: '1px' }),
                es: postcss.decl({ prop: 'border-bottom-left-radius', value: '2px' }),
                ee: postcss.decl({ prop: 'border-top-left-radius', value: '3px' }),
            });
        });

        it('sideways-lr', () => {
            runTest('sideways-lr', 'ltr', {
                ss: postcss.decl({ prop: 'border-bottom-left-radius', value: '0px' }),
                se: postcss.decl({ prop: 'border-top-left-radius', value: '1px' }),
                es: postcss.decl({ prop: 'border-bottom-right-radius', value: '2px' }),
                ee: postcss.decl({ prop: 'border-top-right-radius', value: '3px' }),
            });

            runTest('sideways-lr', 'rtl', {
                ss: postcss.decl({ prop: 'border-top-left-radius', value: '0px' }),
                se: postcss.decl({ prop: 'border-bottom-left-radius', value: '1px' }),
                es: postcss.decl({ prop: 'border-top-right-radius', value: '2px' }),
                ee: postcss.decl({ prop: 'border-bottom-right-radius', value: '3px' }),
            });
        });
    });

    it('should not transform property with non logical value', () => {
        const decl = postcss.decl({
            prop: 'text-align',
            value: 'center',
        });

        const transformedDecl = transformToNonLogical(decl, 'horizontal-tb', 'rtl');
        expect(transformedDecl).toBeUndefined();
    });

    it('should throw an error when non transformable declaration has been passed', () => {
        const decl = postcss.decl({
            prop: 'color',
            value: '#fff',
        });

        expect(() => transformToNonLogical(decl, 'horizontal-tb', 'rtl')).toThrow(
            'Unknown declaration property received: "color"',
        );
    });

    it('should throw an error when invalid writing mode passed', () => {
        const decl = postcss.decl({
            prop: 'text-align',
            value: 'start',
        });

        // @ts-expect-error should highlight "supa-dupa-mode" writing mode
        expect(() => transformToNonLogical(decl, 'supa-dupa-mode', 'rtl')).toThrow(
            'Unknown writing-mode received: "supa-dupa-mode"',
        );
    });
});
