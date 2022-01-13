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
    reasons: string[];
    reasonChildren: string[];
};

function getRegularizedReasonModuleName(
    node: WebpackStats.FnModules,
    reason: WebpackStats.Reason,
): string | null {
    const name = reason.moduleName;
    if (!name) {
        return null;
    }
    if (name.match(/ \+ \d+ modules$/)) {
        // parent is a concatenated module.
        // recover from this by taking the last element
        // in the issuerPatj
        if (node.issuerPath?.length) {
            const lastNodeInPath = node.issuerPath[node.issuerPath.length - 1];
            return lastNodeInPath.name;
        } else if (reason.resolvedModule) {
            return reason.resolvedModule;
        } else {
            throw new Error(`module included by concatenated module has no issuer path.\nNode: ${JSON.stringify(node, null, 2)}\nReason: ${JSON.stringify(reason, null, 2)}`);
        }
    }

    return name;
}

/**
 * Builds a copy of a module graph tracking child information & with a unique ID associated
 * with each node in the graph.
 *
 * @param graph
 */
export function getModuleGraphWithReasons(
    graph: ModuleGraph,
    stats: WebpackStats.ToJsonOutput,
): ModuleGraphWithReasons {
    const newGraph: ModuleGraphWithReasons = {};

    if (!stats.modules) {
        throw new Error('no modules in provided webpack stats object');
    }

    const moduleMap: Map<string, WebpackStats.FnModules> = new Map();
    let toVisit = [...stats.modules.values()];
    while (toVisit.length) {
        const thisModule = toVisit.pop();
        if (!thisModule) {
            continue;
        }
        moduleMap.set(thisModule.name, thisModule);
        if (thisModule.modules) {
            toVisit = toVisit.concat([...thisModule.modules.values()]);
        }
    }
    for (let module of stats.modules) {
    }
    // if (stats.chunks) {
    //     for (let chunk of stats.chunks) {
    //         if (chunk.modules) {
    //             for (let module of chunk.modules) {
    //                 if (moduleMap.has(module.name)) {
    //                     throw new Error(
    //                         `duplicate module ${module.name} in chunk with names ${chunk.names}`,
    //                     );
    //                 }
    //                 moduleMap.set(module.name, module);
    //             }
    //         }
    //     }
    // }

    const ensureNodeInNewGraph = (
        moduleName: string,
    ): ModuleGraphNodeWithReasons => {
        let mod: ModuleGraphNodeWithReasons = newGraph[moduleName];
        if (mod === undefined) {
            if (!graph[moduleName]) {
                throw new Error(`Module ${moduleName} not in graph`);
            }
            // copy the module from the original graph
            mod = JSON.parse(JSON.stringify(graph[moduleName]));
            mod.reasonChildren = [];
            mod.reasons = [];
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
            const allNames = Array.from(moduleMap.keys());
            allNames.sort();
            console.log(allNames);
            throw new Error(`Module ${mod.name} not in stats.json modules`);
        }

        const sortedReasons = (
            statsNode.reasons || []
        ).sort((a: WebpackStats.Reason, b: WebpackStats.Reason) =>
            a.moduleName && b.moduleName
                ? a.moduleName.localeCompare(b.moduleName)
                : 0,
        );

        sortedReasons.forEach((reason: WebpackStats.Reason): void => {
            if (
                // include modules without type. This includes modules
                // that webpack includes but bailed of because it could not
                // recognize.
                //
                // (In tests this triggers on style loader chains of preprocessed css)
                (reason.type &&
                    // Handle webpack updating underneath types.
                    ((reason.type as any) == 'entry' ||
                        reason.type == 'multi entry' ||
                        reason.type == 'single entry')) ||
                // Entry modules get a reason that says it's used as a library export, with no moduleName or other information
                // https://github.com/webpack/webpack/blob/547b4d8deb75355bf5695349fdcc3830ec22d68f/lib/library/ExportPropertyLibraryPlugin.js#L86
                reason.explanation === 'used as library export'
            ) {
                return;
            }

            const reasonModuleName = getRegularizedReasonModuleName(
                statsNode,
                reason,
            );

            if (!reasonModuleName) {
                throw new Error(
                    `Reason has no moduleName. Node: ${JSON.stringify(
                        statsNode,
                    )} Reason: ${JSON.stringify(reason)}`,
                );
            }

            mod.reasons.push(reasonModuleName);
            const reasonParentMod = ensureNodeInNewGraph(reasonModuleName);
            reasonParentMod.reasonChildren.push(mod.name);
        });
    }

    for (const moduleName of moduleNames) {
        const mod = newGraph[moduleName];
        if (!mod) {
            continue;
        }
        mod.reasons = Array.from(new Set(mod.reasons)).sort();
        mod.reasonChildren = Array.from(new Set(mod.reasonChildren)).sort();
    }

    return newGraph;
}
