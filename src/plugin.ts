import { PluginCreator, Rule, Declaration } from 'postcss';
import { isSupportedProp, transformToNonLogical } from './transformers';

interface PluginOptions {
    buildSelector?: (selector: string, direction: string) => string;
}

const defaultBuildSelector: PluginOptions['buildSelector'] = (selector, direction) => {
    return `html[dir="${direction}"] ${selector}`;
};

const plugin: PluginCreator<PluginOptions> = ({ buildSelector = defaultBuildSelector } = {}) => {
    function generateRule(rule: Rule, decls: ReadonlyArray<Declaration>, direction: 'ltr' | 'rtl'): void {
        const newRule = rule.clone().removeAll();

        newRule.selectors = rule.selectors.map((selector) => buildSelector(selector, direction));

        decls.forEach((decl) => {
            const newDecl = transformToNonLogical(decl, direction);
            if (newDecl) {
                newRule.append(newDecl);
            }
        });

        if (newRule.nodes.length === 0) {
            return;
        }

        if (!newRule.raws.before!.startsWith('\n\n')) {
            newRule.raws.before = '\n\n' + newRule.raws.before;
        }

        rule.after(newRule);
    }

    return {
        postcssPlugin: 'postcss-logical-properties-polyfill',
        Root(root) {
            const rulesToProcess = new Map<Rule, Array<Declaration>>();

            root.walkDecls((decl) => {
                // TODO: ignore rules that already has [dir= in its selector
                //       https://github.com/gasolin/postcss-bidirection/issues/14

                if (!isSupportedProp(decl.prop)) {
                    return;
                }

                const rule = decl.parent as Rule;
                // TODO: ensure, that the parent is a Rule
                if (rulesToProcess.has(rule)) {
                    rulesToProcess.get(rule)!.push(decl);
                } else {
                    rulesToProcess.set(rule, [decl]);
                }
            });

            for (const [rule, decls] of rulesToProcess) {
                generateRule(rule, decls, 'rtl');
                generateRule(rule, decls, 'ltr');
            }
        },
    };
};

plugin.postcss = true;

export default plugin;
