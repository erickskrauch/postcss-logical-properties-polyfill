import * as fs from 'fs';
import * as path from 'path';

import postcss from 'postcss';

import plugin from './../src/plugin';

const fixturesPrefix = path.join(__dirname, 'fixtures');

async function loadFixture(name: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, 'fixtures', name), (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data.toString());
            }
        });
    });
}

async function run(input: string, opts: Parameters<typeof plugin>[0] = {}) {
    let outputFilePath = path.join(__dirname, 'output', expect.getState().currentTestName.replace(/\s+/g, '-'));
    if (!outputFilePath.endsWith('.css')) {
        outputFilePath += '.css';
    }

    const result = await postcss([plugin(opts)]).process(input, { from: undefined });

    expect(result.css).toMatchFile(outputFilePath);
    expect(result.warnings()).toHaveLength(0);
}

describe('run test cases', () => {
    fs.readdirSync(fixturesPrefix).forEach((fixtureName) => {
        it(`case ${fixtureName}`, () => {
            return loadFixture(fixtureName).then(run);
        });
    });

    it('should use custom selector when provided', () => {
        return loadFixture('real-world-example.css').then((input) =>
            run(input, {
                buildSelector(selector, direction) {
                    if (direction === 'ltr') {
                        return '.bar.direction-ltr ' + selector;
                    }

                    return '[dir="' + direction + '"] ' + selector;
                },
            }),
        );
    });
});
