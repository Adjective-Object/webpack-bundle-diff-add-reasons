import { ModuleGraph } from 'webpack-bundle-diff';
import { StatsCompilation as WebpackStats } from 'webpack';
import { getModuleGraphWithReasons } from '../getModuleGraphWithReasons';
import { deriveBundleData } from 'webpack-bundle-diff';
import { readFile } from 'mz/fs';
import { join as joinPath } from 'path';
import { Stats } from 'webpack-bundle-diff/lib/types/Stats';

describe('getModuleGraphWithReasons', () => {
    it('adds reason relationships', () => {
        const testGraph: ModuleGraph = {
            'lib/foo': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/foo',
                parents: [],
                size: 10,
            },
            'lib/bar': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/bar',
                parents: [],
                size: 10,
            },
            'lib/baz': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/baz',
                parents: [],
                size: 10,
            },
        };

        const testStats: WebpackStats = {
            modules: [
                {
                    name: 'lib/foo',
                },
                {
                    name: 'lib/bar',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/foo',
                        },
                    ],
                },
                {
                    name: 'lib/baz',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/bar',
                        },
                    ],
                },
            ],
        };

        const outGraph = getModuleGraphWithReasons(
            testGraph,
            testStats as WebpackStats,
        );

        expect(outGraph['lib/bar'].reasons).toEqual(['lib/foo']);
        expect(outGraph['lib/baz'].reasons).toEqual(['lib/bar']);
    });

    it('replicates reason relationships as reasonChildren', () => {
        const testGraph: ModuleGraph = {
            'lib/foo': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/foo',
                parents: [],
                size: 10,
            },
            'lib/bar': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/bar',
                parents: [],
                size: 10,
            },
            'lib/baz': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/baz',
                parents: [],
                size: 10,
            },
        };

        const testStats: WebpackStats = {
            modules: [
                {
                    name: 'lib/foo',
                },
                {
                    name: 'lib/bar',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/foo',
                        },
                    ],
                },
                {
                    name: 'lib/baz',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/bar',
                        },
                    ],
                },
            ],
        };

        const outGraph = getModuleGraphWithReasons(
            testGraph,
            testStats as WebpackStats,
        );

        expect(outGraph['lib/foo'].reasonChildren).toEqual(['lib/bar']);
        expect(outGraph['lib/bar'].reasonChildren).toEqual(['lib/baz']);
        expect(outGraph['lib/baz'].reasonChildren).toEqual([]);
    });

    it('does not mutate the input graph', () => {
        const testGraph: ModuleGraph = {
            'lib/foo': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/foo',
                parents: ['lib/bar', 'lib/foo'],
                size: 10,
            },
            'lib/bar': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/bar',
                parents: ['lib/foo'],
                size: 10,
            },
            'lib/baz': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/bar',
                parents: [],
                size: 10,
            },
        };
        const testStats: WebpackStats = {
            modules: [
                {
                    name: 'lib/foo',
                },
                {
                    name: 'lib/bar',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/foo',
                        },
                    ],
                },
                {
                    name: 'lib/baz',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/bar',
                        },
                    ],
                },
            ],
        };

        const testGraphClone: ModuleGraph = JSON.parse(
            JSON.stringify(testGraph),
        );

        getModuleGraphWithReasons(
            testGraph,
            testStats as WebpackStats,
        );

        expect(testGraph).toEqual(testGraphClone);
    });

    it('does not crash on a cyclical graph', () => {
        const testGraph: ModuleGraph = {
            'lib/foo': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/foo',
                parents: ['lib/bar'],
                size: 10,
            },
            'lib/bar': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/bar',
                parents: ['lib/foo'],
                size: 10,
            },
        };
        const testStats: WebpackStats = {
            modules: [
                {
                    name: 'lib/foo',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/bar',
                        },
                    ],
                },
                {
                    name: 'lib/bar',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/foo',
                        },
                    ],
                },
            ],
        };
        const childGraph = getModuleGraphWithReasons(
            testGraph,
            testStats as WebpackStats,
        );

        expect(childGraph['lib/foo'].reasonChildren).toEqual(['lib/bar']);
        expect(childGraph['lib/bar'].reasonChildren).toEqual(['lib/foo']);
    });

    it('sorts reasonChildren in output', () => {
        const testGraph: ModuleGraph = {
            'lib/a': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/a',
                parents: [],
                size: 10,
            },
            'lib/d': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/d',
                parents: [],
                size: 10,
            },
            'lib/c': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/c',
                parents: [],
                size: 10,
            },
            'lib/b': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/b',
                parents: [],
                size: 10,
            },
        };
        const testStats: WebpackStats = {
            modules: [
                {
                    name: 'lib/a',
                },
                {
                    name: 'lib/d',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/a',
                        },
                    ],
                },
                {
                    name: 'lib/b',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/a',
                        },
                    ],
                },
                {
                    name: 'lib/c',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/a',
                        },
                    ],
                },
            ],
        };
        const childGraph = getModuleGraphWithReasons(
            testGraph,
            testStats as WebpackStats,
        );

        expect(childGraph['lib/a'].reasonChildren).toEqual([
            'lib/b',
            'lib/c',
            'lib/d',
        ]);
    });

    it('sorts reasons in output', () => {
        const testGraph: ModuleGraph = {
            'lib/a': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/a',
                parents: [],
                size: 10,
            },
            'lib/d': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/d',
                parents: [],
                size: 10,
            },
            'lib/c': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/c',
                parents: [],
                size: 10,
            },
            'lib/b': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/b',
                parents: [],
                size: 10,
            },
        };
        const testStats: WebpackStats = {
            modules: [
                {
                    name: 'lib/a',
                },
                {
                    name: 'lib/d',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/a',
                        },
                    ],
                },
                {
                    name: 'lib/b',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/a',
                        },
                    ],
                },
                {
                    name: 'lib/c',
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/a',
                        },
                        {
                            active: true,
                            moduleName: 'lib/d',
                        },
                        {
                            active: true,
                            moduleName: 'lib/b',
                        },
                    ],
                },
            ],
        };
        const childGraph = getModuleGraphWithReasons(
            testGraph,
            testStats as WebpackStats,
        );

        expect(childGraph['lib/c'].reasons).toEqual([
            'lib/a',
            'lib/b',
            'lib/d',
        ]);
    });

    it('uses the last element in issuerPath when there is a reason with multiple parents', () => {
        const testStats: WebpackStats = {
            namedChunkGroups: {},
            assets: [],
            modules: [
                {
                    id: 1,
                    identifier: 'lib/parent + 42 modules',
                    name: 'lib/parent + 42 modules',
                    chunks: [0],
                    reasons: [],
                },
                {
                    identifier: 'lib/parent',
                    name: 'lib/parent',
                    issuerPath: [{ name: 'lib/parent' }],
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/parent + 42 modules',
                            moduleId: 1,
                        },
                    ],
                    chunks: [0],
                },
                {
                    identifier: 'lib/intermediate_collapsed_module',
                    name: 'lib/intermediate_collapsed_module',
                    issuerPath: [{ name: 'lib/parent' }],
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/parent + 42 modules',
                            moduleId: 1,
                        },
                    ],
                    chunks: [0],
                },
                {
                    identifier: 'lib/b',
                    name: 'lib/b',
                    issuerPath: [
                        { name: 'lib/parent' },
                        { name: 'lib/intermediate_collapsed_module' },
                    ],
                    reasons: [
                        {
                            active: true,
                            moduleName: 'lib/parent + 42 modules',
                            moduleId: 1,
                        },
                    ],
                    chunks: [0],
                },
            ],
        };
        const testGraph: ModuleGraph = deriveBundleData(testStats as unknown as Stats)
            .graph;
        const childGraph = getModuleGraphWithReasons(
            testGraph,
            testStats as WebpackStats,
        );

        expect(childGraph['lib/b'].reasons).toEqual([
            'lib/intermediate_collapsed_module',
        ]);
    });

    it('matches the snapshot', async () => {
        // Snapshot from https://github.com/pinterest/bonsai @ 08b24a4
        const statsJsonString = await readFile(
            joinPath(__dirname, '/test-data', 'bonsai-stats.json'),
            'utf-8',
        );
        const stats = JSON.parse(statsJsonString);
        const bundleData = deriveBundleData(stats);
        const resultGraph = getModuleGraphWithReasons(bundleData.graph, stats);

        expect(resultGraph).toMatchSnapshot();
    });
});
