import { ModuleGraphNode, ModuleGraph } from 'webpack-bundle-diff';
import { Stats as WebpackStats } from 'webpack';

export interface ModuleGraphWithReasons<
    TNode extends ModuleGraphNodeWithReasons = ModuleGraphNodeWithReasons
> {
    [id: string]: TNode;
}

export type ModuleGraphNodeWithReasons<
    TBaseNode extends ModuleGraphNode = ModuleGraphNode
> = TBaseNode & {
    reasonChildren: string[];
};

/**
 * Builds a copy of a module graph tracking child information & with a unique ID associated
 * with each node in the graph.
 *
 * @param graph
 */
export function getModuleGraphWithReasons(
    graph: ModuleGraph,
    stats: WebpackStats.ToJsonOutput
): ModuleGraphWithReasons {
    const newGraph: ModuleGraphWithReasons = {};

    if (!stats.modules) {
        throw new Error('no modules in provided webpack stats object');
    }

    const moduleMap: Map<string, WebpackStats.FnModules> = new Map();
    for (let module of stats.modules) {
        moduleMap.set(module.name, module);
    }

    const ensureNodeInNewGraph = (
        moduleName: string
    ): ModuleGraphNodeWithReasons => {
        let mod: ModuleGraphNodeWithReasons = newGraph[moduleName];
        if (mod === undefined) {
            if (!graph[moduleName]) {
                throw new Error(`Module ${moduleName} not in graph`);
            }
            // copy the module from the original graph
            mod = JSON.parse(JSON.stringify(graph[moduleName]));
            mod.reasonChildren = [];
            // add the new module to the new graph
            newGraph[moduleName] = mod;
        }
        return mod;
    };

    // Operate over sorted keys to ensure that the iteration order is consitent between runs.
    // This is to make sure the snapshot tests are sane.
    const moduleNames = Array.from(Object.keys(graph));
    moduleNames.sort();
    for (const moduleName of moduleNames) {
        const mod = ensureNodeInNewGraph(moduleName);
        if (mod === null) {
            continue;
        }
        const statsNode = moduleMap.get(mod.name);
        if (!statsNode) {
            throw new Error(`Module ${mod.name} not in stats.json modules`);
        }

        const sortedReasons = (
            statsNode.reasons || []
        ).sort((a: WebpackStats.Reason, b: WebpackStats.Reason) =>
            a.moduleName && b.moduleName
                ? a.moduleName.localeCompare(b.moduleName)
                : 0
        );

        sortedReasons.forEach((reason: WebpackStats.Reason): void => {
            if (!reason.moduleName) {
                throw new Error(
                    `Reason has no moduleName. Reason: ${JSON.stringify(
                        reason
                    )}`
                );
            }

            const reasonParentMod = ensureNodeInNewGraph(reason.moduleName);
            reasonParentMod.reasonChildren.push(mod.name);
        });
    }

    return newGraph;
}
