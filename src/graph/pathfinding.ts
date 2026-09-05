/**
 * A* Pathfinding Module for Computational Evacuation Graph
 * Computes deterministic shortest and fastest evacuation routes across all 5 floors
 * using actual graph topology and physical edge attributes.
 */

import { FloorId, Vector3D } from '../types/building';
import {
  EvacuationGraph,
  GraphEdge,
  GraphNode,
  PathfindingOptions,
  PathfindingResult,
  PathStep,
} from './types';

interface PriorityQueueItem {
  nodeId: string;
  fScore: number;
}

// Simple Min-Priority Queue for A*
class PriorityQueue {
  private items: PriorityQueueItem[] = [];

  public enqueue(nodeId: string, fScore: number) {
    this.items.push({ nodeId, fScore });
    this.items.sort((a, b) => a.fScore - b.fScore);
  }

  public dequeue(): PriorityQueueItem | undefined {
    return this.items.shift();
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export class AStarPathfinder {
  /**
   * Calculates 3D Euclidean distance heuristic between two nodes (admissible & consistent)
   */
  public static heuristic(a: GraphNode, b: GraphNode): number {
    return Math.hypot(
      a.position.x - b.position.x,
      a.position.y - b.position.y,
      a.position.z - b.position.z
    );
  }

  /**
   * Admissible multi-goal heuristic: minimum distance to any candidate exit
   */
  public static heuristicToAnyExit(node: GraphNode, exits: GraphNode[]): number {
    if (exits.length === 0) return 0;
    let minDist = Infinity;
    for (const exit of exits) {
      const dist = this.heuristic(node, exit);
      if (dist < minDist) minDist = dist;
    }
    return minDist;
  }

  /**
   * Calculates edge impedance/cost factoring in distance, hazards, and accessibility constraints
   */
  private static getEdgeCost(edge: GraphEdge, options: PathfindingOptions = {}): number {
    if (edge.isBlocked && !options.ignoreBlocked) {
      return Infinity;
    }

    if (options.wheelchairOnly && !edge.accessibility) {
      return Infinity;
    }

    let cost = edge.distance;

    // Hazard impedance
    if (options.avoidHazards) {
      switch (edge.hazardState) {
        case 'smoke_detected':
          cost += 30; // heavy penalty
          break;
        case 'heat_warning':
          cost += 80;
          break;
        case 'debris':
          cost += 150;
          break;
        case 'impassable':
          return Infinity;
        case 'none':
        default:
          break;
      }
    }

    return cost;
  }

  /**
   * Computes optimal A* path between two specific graph nodes
   */
  public static findPath(
    graph: EvacuationGraph,
    startNodeId: string,
    targetNodeId: string,
    options: PathfindingOptions = {}
  ): PathfindingResult {
    const startTime = performance.now();

    const startNode = graph.nodes.get(startNodeId);
    const targetNode = graph.nodes.get(targetNodeId);

    if (!startNode || !targetNode) {
      return this.createEmptyResult(startNodeId, targetNodeId, performance.now() - startTime);
    }

    if (startNodeId === targetNodeId) {
      return {
        pathFound: true,
        startNodeId,
        targetNodeId,
        nodeIds: [startNodeId],
        edgeIds: [],
        waypoints: [{ ...startNode.position }],
        totalDistance: 0,
        totalTraversalTime: 0,
        floorsTraversed: [startNode.floor],
        steps: [],
        exploredNodeCount: 1,
        computationTimeMs: Number((performance.now() - startTime).toFixed(2)),
        exitReached: !!startNode.isExit,
      };
    }

    // A* State structures
    const openSet = new PriorityQueue();
    const openSetLookup = new Set<string>();
    const closedSet = new Set<string>();

    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFromNode = new Map<string, string>();
    const cameFromEdge = new Map<string, string>();

    gScore.set(startNodeId, 0);
    const initialH = this.heuristic(startNode, targetNode);
    fScore.set(startNodeId, initialH);

    openSet.enqueue(startNodeId, initialH);
    openSetLookup.add(startNodeId);

    let exploredCount = 0;

    while (!openSet.isEmpty()) {
      const current = openSet.dequeue()!;
      const currentId = current.nodeId;
      openSetLookup.delete(currentId);
      closedSet.add(currentId);
      exploredCount++;

      // Reached Goal!
      if (currentId === targetNodeId) {
        return this.reconstructPath(
          graph,
          startNodeId,
          targetNodeId,
          cameFromNode,
          cameFromEdge,
          exploredCount,
          performance.now() - startTime
        );
      }

      const outgoingEdgeIds = graph.adjacency.get(currentId) || [];
      for (const edgeId of outgoingEdgeIds) {
        const edge = graph.edges.get(edgeId);
        if (!edge) continue;

        const neighborId = edge.toNodeId;
        if (closedSet.has(neighborId)) continue;

        const edgeCost = this.getEdgeCost(edge, options);
        if (edgeCost === Infinity) continue;

        const neighborNode = graph.nodes.get(neighborId);
        if (!neighborNode) continue;

        const tentativeGScore = (gScore.get(currentId) ?? Infinity) + edgeCost;

        if (tentativeGScore < (gScore.get(neighborId) ?? Infinity)) {
          cameFromNode.set(neighborId, currentId);
          cameFromEdge.set(neighborId, edge.id);
          gScore.set(neighborId, tentativeGScore);

          const h = this.heuristic(neighborNode, targetNode);
          const f = tentativeGScore + h;
          fScore.set(neighborId, f);

          if (!openSetLookup.has(neighborId)) {
            openSet.enqueue(neighborId, f);
            openSetLookup.add(neighborId);
          }
        }
      }
    }

    // No path found
    return this.createEmptyResult(startNodeId, targetNodeId, performance.now() - startTime, exploredCount);
  }

  /**
   * Computes fastest evacuation path to the nearest safe ground discharge exit
   */
  public static findNearestExit(
    graph: EvacuationGraph,
    startNodeId: string,
    options: PathfindingOptions = {}
  ): PathfindingResult {
    const startTime = performance.now();
    const startNode = graph.nodes.get(startNodeId);

    if (!startNode) {
      return this.createEmptyResult(startNodeId, 'NEAREST_EXIT', performance.now() - startTime);
    }

    // Find all potential exit nodes
    const exitNodes = Array.from(graph.nodes.values()).filter((n) => {
      if (!n.isExit) return false;
      if (options.wheelchairOnly && !n.isAccessible) return false;
      return true;
    });

    if (exitNodes.length === 0) {
      return this.createEmptyResult(startNodeId, 'NO_EXITS_AVAILABLE', performance.now() - startTime);
    }

    const exitNodeIdSet = new Set(exitNodes.map((n) => n.id));

    // If start node is already an exit
    if (exitNodeIdSet.has(startNodeId)) {
      return {
        pathFound: true,
        startNodeId,
        targetNodeId: startNodeId,
        nodeIds: [startNodeId],
        edgeIds: [],
        waypoints: [{ ...startNode.position }],
        totalDistance: 0,
        totalTraversalTime: 0,
        floorsTraversed: [startNode.floor],
        steps: [],
        exploredNodeCount: 1,
        computationTimeMs: Number((performance.now() - startTime).toFixed(2)),
        exitReached: true,
      };
    }

    const openSet = new PriorityQueue();
    const openSetLookup = new Set<string>();
    const closedSet = new Set<string>();

    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const cameFromNode = new Map<string, string>();
    const cameFromEdge = new Map<string, string>();

    gScore.set(startNodeId, 0);
    const initialH = this.heuristicToAnyExit(startNode, exitNodes);
    fScore.set(startNodeId, initialH);

    openSet.enqueue(startNodeId, initialH);
    openSetLookup.add(startNodeId);

    let exploredCount = 0;

    while (!openSet.isEmpty()) {
      const current = openSet.dequeue()!;
      const currentId = current.nodeId;
      openSetLookup.delete(currentId);
      closedSet.add(currentId);
      exploredCount++;

      // Reached any designated exit!
      if (exitNodeIdSet.has(currentId)) {
        return this.reconstructPath(
          graph,
          startNodeId,
          currentId,
          cameFromNode,
          cameFromEdge,
          exploredCount,
          performance.now() - startTime
        );
      }

      const outgoingEdgeIds = graph.adjacency.get(currentId) || [];
      for (const edgeId of outgoingEdgeIds) {
        const edge = graph.edges.get(edgeId);
        if (!edge) continue;

        const neighborId = edge.toNodeId;
        if (closedSet.has(neighborId)) continue;

        const edgeCost = this.getEdgeCost(edge, options);
        if (edgeCost === Infinity) continue;

        const neighborNode = graph.nodes.get(neighborId);
        if (!neighborNode) continue;

        const tentativeGScore = (gScore.get(currentId) ?? Infinity) + edgeCost;

        if (tentativeGScore < (gScore.get(neighborId) ?? Infinity)) {
          cameFromNode.set(neighborId, currentId);
          cameFromEdge.set(neighborId, edge.id);
          gScore.set(neighborId, tentativeGScore);

          const h = this.heuristicToAnyExit(neighborNode, exitNodes);
          const f = tentativeGScore + h;
          fScore.set(neighborId, f);

          if (!openSetLookup.has(neighborId)) {
            openSet.enqueue(neighborId, f);
            openSetLookup.add(neighborId);
          }
        }
      }
    }

    return this.createEmptyResult(startNodeId, 'NO_REACHABLE_EXIT', performance.now() - startTime, exploredCount);
  }

  /**
   * Reconstructs node and edge sequence, waypoints, metrics, and navigation instructions
   */
  private static reconstructPath(
    graph: EvacuationGraph,
    startId: string,
    targetId: string,
    cameFromNode: Map<string, string>,
    cameFromEdge: Map<string, string>,
    exploredCount: number,
    computationTimeMs: number
  ): PathfindingResult {
    const nodeSequence: string[] = [targetId];
    const edgeSequence: string[] = [];

    let current = targetId;
    while (cameFromNode.has(current)) {
      const prevEdge = cameFromEdge.get(current);
      if (prevEdge) edgeSequence.unshift(prevEdge);

      current = cameFromNode.get(current)!;
      nodeSequence.unshift(current);
    }

    // Calculate metrics and waypoints
    const waypoints: Vector3D[] = [];
    const steps: PathStep[] = [];
    const floorSet = new Set<FloorId>();
    let totalDistance = 0;
    let totalTraversalTime = 0;

    for (let i = 0; i < nodeSequence.length; i++) {
      const nId = nodeSequence[i];
      const node = graph.nodes.get(nId);
      if (node) {
        waypoints.push({ ...node.position });
        floorSet.add(node.floor);
      }
    }

    for (let i = 0; i < edgeSequence.length; i++) {
      const eId = edgeSequence[i];
      const edge = graph.edges.get(eId);
      if (!edge) continue;

      const fromNode = graph.nodes.get(edge.fromNodeId);
      const toNode = graph.nodes.get(edge.toNodeId);
      if (!fromNode || !toNode) continue;

      totalDistance += edge.distance;
      totalTraversalTime += edge.traversalTime;

      const isStairDescent = fromNode.floor > toNode.floor;
      const instruction = this.generateStepInstruction(fromNode, toNode, edge);

      steps.push({
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        edgeId: edge.id,
        instruction,
        distance: edge.distance,
        traversalTime: edge.traversalTime,
        fromPosition: { ...fromNode.position },
        toPosition: { ...toNode.position },
        floor: fromNode.floor,
        isStairDescent,
      });
    }

    const targetNode = graph.nodes.get(targetId);

    return {
      pathFound: true,
      startNodeId: startId,
      targetNodeId: targetId,
      nodeIds: nodeSequence,
      edgeIds: edgeSequence,
      waypoints,
      totalDistance: Number(totalDistance.toFixed(2)),
      totalTraversalTime: Number(totalTraversalTime.toFixed(1)),
      floorsTraversed: Array.from(floorSet).sort((a, b) => b - a),
      steps,
      exploredNodeCount: exploredCount,
      computationTimeMs: Number(computationTimeMs.toFixed(2)),
      exitReached: !!targetNode?.isExit,
    };
  }

  private static generateStepInstruction(
    from: GraphNode,
    to: GraphNode,
    edge: GraphEdge
  ): string {
    if (from.floor > to.floor) {
      return `Descend emergency stairs from Floor ${from.floor} to Floor ${to.floor} (${edge.distance}m, ~${edge.traversalTime}s)`;
    }
    if (from.type === 'room' && to.type === 'door') {
      return `Leave ${from.name} through door ${to.name}`;
    }
    if (from.type === 'door' && to.type === 'corridor_segment') {
      return `Enter ${to.name}`;
    }
    if (to.type === 'junction') {
      return `Proceed to ${to.name}`;
    }
    if (to.type === 'door' && to.name.toLowerCase().includes('stair')) {
      return `Pass through fire door into ${to.name}`;
    }
    if (to.type === 'exit') {
      return `DISCHARGE TO SAFETY: Exit building through ${to.name}`;
    }
    return `Traverse corridor from ${from.name} to ${to.name} (${edge.distance}m)`;
  }

  private static createEmptyResult(
    start: string,
    target: string,
    computationTimeMs: number,
    exploredCount = 0
  ): PathfindingResult {
    return {
      pathFound: false,
      startNodeId: start,
      targetNodeId: target,
      nodeIds: [],
      edgeIds: [],
      waypoints: [],
      totalDistance: 0,
      totalTraversalTime: 0,
      floorsTraversed: [],
      steps: [],
      exploredNodeCount: exploredCount,
      computationTimeMs: Number(computationTimeMs.toFixed(2)),
      exitReached: false,
    };
  }
}
