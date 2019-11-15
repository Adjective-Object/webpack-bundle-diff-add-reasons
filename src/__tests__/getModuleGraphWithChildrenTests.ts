import { ModuleGraph } from 'webpack-bundle-diff';
import { Stats as WebpackStats } from 'webpack';
import { getModuleGraphWithReasons } from '../getModuleGraphWithReasons';

type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>;
};

describe('getGraphWithChilren', () => {
    it('replicates reason relationships as reasonChildren', () => {
        const testGraph: ModuleGraph = {
            'lib/foo': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/foo',
                parents: [],
                size: 10
            },
            'lib/bar': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/bar',
                parents: [],
                size: 10
            },
            'lib/baz': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/baz',
                parents: [],
                size: 10
            }
        };

        const testStats: RecursivePartial<WebpackStats.ToJsonOutput> = {
            modules: [
                {
                    name: 'lib/foo'
                },
                {
                    name: 'lib/bar',
                    reasons: [
                        {
                            moduleName: 'lib/foo'
                        }
                    ]
                },
                {
                    name: 'lib/baz',
                    reasons: [
                        {
                            moduleName: 'lib/bar'
                        }
                    ]
                }
            ]
        };

        const outGraph = getModuleGraphWithReasons(
            testGraph,
            testStats as WebpackStats.ToJsonOutput
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
                size: 10
            },
            'lib/bar': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/bar',
                parents: ['lib/foo'],
                size: 10
            },
            'lib/baz': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/bar',
                parents: [],
                size: 10
            }
        };
        const testStats: RecursivePartial<WebpackStats.ToJsonOutput> = {
            modules: [
                {
                    name: 'lib/foo'
                },
                {
                    name: 'lib/bar',
                    reasons: [
                        {
                            moduleName: 'lib/foo'
                        }
                    ]
                },
                {
                    name: 'lib/baz',
                    reasons: [
                        {
                            moduleName: 'lib/bar'
                        }
                    ]
                }
            ]
        };

        const testGraphClone: ModuleGraph = JSON.parse(
            JSON.stringify(testGraph)
        );

        getModuleGraphWithReasons(
            testGraph,
            testStats as WebpackStats.ToJsonOutput
        );

        expect(testGraph).toEqual(testGraphClone);
    });

    it('does not crash on a cyclical graph', () => {
        const testGraph: ModuleGraph = {
            'lib/foo': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/foo',
                parents: ['lib/bar'],
                size: 10
            },
            'lib/bar': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/bar',
                parents: ['lib/foo'],
                size: 10
            }
        };
        const testStats: RecursivePartial<WebpackStats.ToJsonOutput> = {
            modules: [
                {
                    name: 'lib/foo',
                    reasons: [
                        {
                            moduleName: 'lib/bar'
                        }
                    ]
                },
                {
                    name: 'lib/bar',
                    reasons: [
                        {
                            moduleName: 'lib/foo'
                        }
                    ]
                }
            ]
        };
        const childGraph = getModuleGraphWithReasons(
            testGraph,
            testStats as WebpackStats.ToJsonOutput
        );

        expect(childGraph['lib/foo'].reasonChildren).toEqual(['lib/bar']);
        expect(childGraph['lib/bar'].reasonChildren).toEqual(['lib/foo']);
    });

    it('sorts reasons in output', () => {
        const testGraph: ModuleGraph = {
            'lib/a': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/a',
                parents: [],
                size: 10
            },
            'lib/d': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/d',
                parents: [],
                size: 10
            },
            'lib/c': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/c',
                parents: [],
                size: 10
            },
            'lib/b': {
                namedChunkGroups: ['Mail', 'Fake'],
                name: 'lib/b',
                parents: [],
                size: 10
            }
        };
        const testStats: RecursivePartial<WebpackStats.ToJsonOutput> = {
            modules: [
                {
                    name: 'lib/a'
                },
                {
                    name: 'lib/d',
                    reasons: [
                        {
                            moduleName: 'lib/a'
                        }
                    ]
                },
                {
                    name: 'lib/b',
                    reasons: [
                        {
                            moduleName: 'lib/a'
                        }
                    ]
                },
                {
                    name: 'lib/c',
                    reasons: [
                        {
                            moduleName: 'lib/a'
                        }
                    ]
                }
            ]
        };
        const childGraph = getModuleGraphWithReasons(
            testGraph,
            testStats as WebpackStats.ToJsonOutput
        );

        expect(childGraph['lib/a'].reasonChildren).toEqual([
            'lib/b',
            'lib/c',
            'lib/d'
        ]);
    });
});
