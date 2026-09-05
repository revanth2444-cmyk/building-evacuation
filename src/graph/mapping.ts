/**
 * Digital Twin to Evacuation Graph Mapping Module
 * Establishes bidirectional traceability between 3D Building Digital Twin objects
 * and the computational Graph Nodes and Graph Edges.
 */

import { DigitalTwinObject, Vector3D } from '../types/building';
import { EvacuationGraph, GraphEdge, GraphNode } from './types';

export interface DigitalTwinGraphMappingSummary {
  totalDigitalTwinObjects: number;
  totalGraphNodes: number;
  totalGraphEdges: number;
  objectToNodeCount: Record<string, number>;
  objectToEdgeCount: Record<string, number>;
  unmappedObjects: string[];
}

export class DigitalTwinMapper {
  /**
   * Retrieves all Graph Nodes corresponding to a 3D Digital Twin Object ID
   */
  public static getNodesForObject(
    graph: EvacuationGraph,
    digitalTwinId: string
  ): GraphNode[] {
    const nodeIds = graph.digitalTwinToNodeMap.get(digitalTwinId) || [];
    return nodeIds
      .map((id) => graph.nodes.get(id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * Retrieves all Graph Edges corresponding to a 3D Digital Twin Object ID
   * (e.g., doors represent edges between rooms & corridors; stairs represent vertical edges)
   */
  public static getEdgesForObject(
    graph: EvacuationGraph,
    digitalTwinId: string
  ): GraphEdge[] {
    const edgeIds = graph.digitalTwinToEdgeMap.get(digitalTwinId) || [];
    return edgeIds
      .map((id) => graph.edges.get(id))
      .filter((e): e is GraphEdge => e !== undefined);
  }

  /**
   * Finds the 3D Digital Twin Object ID that originated a given Graph Node ID
   */
  public static getObjectForNode(
    graph: EvacuationGraph,
    nodeId: string
  ): string | undefined {
    return graph.nodeToDigitalTwinMap.get(nodeId);
  }

  /**
   * Finds the 3D Digital Twin Object ID that originated a given Graph Edge ID
   */
  public static getObjectForEdge(
    graph: EvacuationGraph,
    edgeId: string
  ): string | undefined {
    return graph.edgeToDigitalTwinMap.get(edgeId);
  }

  /**
   * Returns primary 3D world coordinate for a given Graph Node or 3D Digital Twin Object
   */
  public static getGeometricAnchor(
    graph: EvacuationGraph,
    targetId: string
  ): Vector3D | undefined {
    if (graph.nodes.has(targetId)) {
      return graph.nodes.get(targetId)?.position;
    }
    const nodes = this.getNodesForObject(graph, targetId);
    if (nodes.length > 0) {
      return nodes[0].position;
    }
    return undefined;
  }

  /**
   * Audits mapping integrity between all registered 3D objects and the computational graph
   */
  public static auditMapping(
    graph: EvacuationGraph,
    registeredObjects: DigitalTwinObject[]
  ): DigitalTwinGraphMappingSummary {
    const unmapped: string[] = [];
    const objectToNodeCount: Record<string, number> = {};
    const objectToEdgeCount: Record<string, number> = {};

    for (const obj of registeredObjects) {
      const nodeCount = (graph.digitalTwinToNodeMap.get(obj.id) || []).length;
      const edgeCount = (graph.digitalTwinToEdgeMap.get(obj.id) || []).length;

      objectToNodeCount[obj.id] = nodeCount;
      objectToEdgeCount[obj.id] = edgeCount;

      if (nodeCount === 0 && edgeCount === 0) {
        unmapped.push(obj.id);
      }
    }

    return {
      totalDigitalTwinObjects: registeredObjects.length,
      totalGraphNodes: graph.nodes.size,
      totalGraphEdges: graph.edges.size,
      objectToNodeCount,
      objectToEdgeCount,
      unmappedObjects: unmapped,
    };
  }
}
