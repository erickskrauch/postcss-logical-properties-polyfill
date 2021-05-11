import { PluginCreator, Rule, Declaration } from 'postcss';

import { Direction, WritingMode } from './types';
import { isSupportedProp, transformToNonLogical } from './transformers';

interface PluginOptions {
    buildSelector?: (selector: string, writingMode: WritingMode, direction: Direction) => string;
    modes?: Array<[WritingMode, Direction]> | Array<Direction>;
    preserve?: boolean;
}

const defaultBuildSelector: PluginOptions['buildSelector'] = (selector, writingMode, direction) => {
    let prefix = `html[dir="${direction}"]`;
    if (writingMode !== 'horizontal-tb') {
        prefix += ` .writing-mode-${writingMode}`;
    }

    return `${prefix} ${selector}`;
};

function normalizeOptions(options: Exclude<PluginOptions['modes'], undefined>): Array<[WritingMode, Direction]> {
    // @ts-ignore
    return options.map((mode) => {
        if (Array.isArray(mode)) {
            return mode;
        }

        return ['horizontal-tb', mode];
    });
}

function generatePolyfills(
    decls: ReadonlyArray<Declaration>,
    writingMode: WritingMode,
    direction: Direction,
): Array<Declaration> {
    const newDecls: Array<Declaration> = [];
    decls.forEach((decl) => {
        const newDecl = transformToNonLogical(decl, writingMode, direction);
        if (!newDecl) {
            return;
        }

        if (Array.isArray(newDecl)) {
            newDecls.push(...newDecl);
        } else {
            newDecls.push(newDecl);
        }
    });

    return newDecls;
}

const plugin: PluginCreator<PluginOptions> = ({
    buildSelector = defaultBuildSelector,
    modes = [
        ['horizontal-tb', 'rtl'],
        ['horizontal-tb', 'ltr'],
    ],
    preserve = true,
}: PluginOptions = {}) => ({
    // Force type since by an unknown reason it doesn't inherited from the function's generic
    postcssPlugin: 'postcss-logical-properties-polyfill',
    Root(root) {
        modes = normalizeOptions(modes);

        const rulesToProcess = new Map<Rule, Array<Declaration>>();

        root.walkDecls((decl) => {
            if (!isSupportedProp(decl.prop)) {
                return;
            }

            const parent = decl.parent as Rule | undefined;
            if (!parent || parent.type !== 'rule') {
                return;
            }

            // Skip LESS namespaces and mixins, since they must have different behavior
            if (parent.selector.match(/\((\s*|\s*[@].*)\)/)) {
                return;
            }

            if (rulesToProcess.has(parent)) {
                rulesToProcess.get(parent)!.push(decl);
            } else {
                rulesToProcess.set(parent, [decl]);
            }
        });

        for (const [rule, decls] of rulesToProcess) {
            for (const [writingMode, direction] of modes) {
                const declsForDirection = generatePolyfills(decls, writingMode, direction);
                if (declsForDirection.length === 0) {
                    continue;
                }

                const newRule = rule.clone().removeAll();
                newRule.selectors = rule.selectors.map((selector) => buildSelector(selector, writingMode, direction));
                newRule.append(declsForDirection);

                if (!newRule.raws.before!.startsWith('\n\n')) {
                    newRule.raws.before = '\n\n' + newRule.raws.before;
                }

                rule.after(newRule);
            }

            if (!preserve) {
                decls.forEach((decl) => decl.remove());
            }
        }
    },
});

plugin.postcss = true;

export default plugin;
