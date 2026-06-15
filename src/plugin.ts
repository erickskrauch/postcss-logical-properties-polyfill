import { PluginCreator, Rule, Declaration, AtRule, list } from 'postcss';

import { Direction, WritingMode } from './types';
import { isSupportedProp, transformToNonLogical } from './transformers';

interface PluginOptions {
    buildSelector?: (selector: string, writingMode: WritingMode, direction: Direction) => string;
    buildKeyframeName?: (name: string, writingMode: WritingMode, direction: Direction) => string;
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

const defaultBuildKeyframeName: PluginOptions['buildKeyframeName'] = (name, writingMode, direction) => {
    let suffix = '';
    if (writingMode !== 'horizontal-tb') {
        suffix += `--writing-mode-${writingMode}`;
    }

    suffix += `--${direction}`;

    return `${name}${suffix}`;
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

const plugin: PluginCreator<PluginOptions> = ({
    buildSelector = defaultBuildSelector,
    buildKeyframeName = defaultBuildKeyframeName,
    modes = [
        ['horizontal-tb', 'rtl'],
        ['horizontal-tb', 'ltr'],
    ],
    preserve = true,
}: PluginOptions = {}) => ({
    // Force type since by an unknown reason it doesn't inherited from the function's generic
    postcssPlugin: 'postcss-logical-properties-polyfill',
    Root(root) {
        const normalizedModes = normalizeOptions(modes);

        // Step 0: find the @keyframes, that contains logical properties, because
        //         we need to polyfill references in animation-name
        const keyframesToProcess = new Map<string, AtRule>();
        root.walkAtRules('keyframes', (atRule) => {
            atRule.walkDecls((decl) => {
                if (isSupportedProp(decl.prop)) {
                    keyframesToProcess.set(atRule.params, atRule)
                    return false;
                }
            });
        });

        // Step 1: collect all declarations, that contain logical properties
        //         or references @keyframes with logical properties inside
        const rulesToProcess = new Map<Rule, Array<Declaration>>();
        root.walkDecls((decl) => {
            const parent = decl.parent as Rule | undefined;
            if (!parent || parent.type !== 'rule') {
                return;
            }

            // Skip declarations inside @keyframes, because they need a different treatment
            const grandParent = parent.parent;
            if (grandParent?.type === 'atrule' && grandParent.name.toLowerCase() === 'keyframes') {
                return;
            }

            // Skip LESS namespaces and mixins, since they must have different behavior
            if (parent.selector.match(/\((\s*|\s*[@].*)\)/)) {
                return;
            }

            const isLogicalProp = isSupportedProp(decl.prop);
            const hasRefToAnimationWithLogicalProp = decl.prop.toLowerCase() === 'animation-name'
                                                  && list.comma(decl.value).some((name) => keyframesToProcess.has(name));

            if (!isLogicalProp && !hasRefToAnimationWithLogicalProp) {
                return;
            }

            if (rulesToProcess.has(parent)) {
                rulesToProcess.get(parent)!.push(decl);
            } else {
                rulesToProcess.set(parent, [decl]);
            }
        });

        // Step 2: generate polyfill versions of @keyframes with logical props
        const keyframesWritingModesNamesMap: Record<string, Partial<Record<WritingMode, string>>> = {};
        keyframesToProcess.forEach((atRule) => {
            normalizedModes.forEach(([writingMode, direction]) => {
                const newAtRule = atRule.clone();
                newAtRule.params = buildKeyframeName(atRule.params, writingMode, direction);

                newAtRule.walkDecls((decl) => {
                    if (!isSupportedProp(decl.prop)) {
                        return;
                    }

                    const newDecl = transformToNonLogical(decl, writingMode, direction);
                    if (!newDecl) {
                        return;
                    }

                    if (Array.isArray(newDecl)) {
                        decl.replaceWith(...newDecl);
                    } else {
                        decl.replaceWith(newDecl);
                    }
                });

                if (!newAtRule.raws.before!.startsWith('\n\n')) {
                    newAtRule.raws.before = '\n\n' + newAtRule.raws.before;
                }

                atRule.after(newAtRule);
                if (!keyframesWritingModesNamesMap[atRule.params]) {
                    keyframesWritingModesNamesMap[atRule.params] = {};
                }

                keyframesWritingModesNamesMap[atRule.params][writingMode] = newAtRule.params;
            });

            if (!preserve) {
                atRule.remove();
            }
        });

        // Step 3: generate non-logical declarations
        for (const [rule, decls] of rulesToProcess) {
            for (const [writingMode, direction] of normalizedModes) {
                const newDecls: Array<Declaration> = [];

                decls.forEach((decl) => {
                    if (decl.prop.toLowerCase() === 'animation-name') {
                        const names = list.comma(decl.value);
                        const newNames = names.map((name) => keyframesWritingModesNamesMap[name]?.[writingMode] ?? name);
                        newDecls.push(decl.clone({ value: newNames.join(', ') }));

                        return;
                    }

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

                if (newDecls.length === 0) {
                    continue;
                }

                const newRule = rule.clone().removeAll();
                newRule.selectors = rule.selectors.map((selector) => buildSelector(selector, writingMode, direction));
                newRule.append(newDecls);

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
