/**
 * Evacuation Graph Validator Module
 * Detects structural and topological defects in the evacuation graph:
 * - Disconnected rooms
 * - Inaccessible exits
 * - Invalid floor transitions
 * - Missing doors
 * - Invalid graph connections & isolated subgraphs
 */

import { BuildingAssetRegistry, FloorId } from '../types/building';
import { EvacuationGraph, GraphNode, GraphValidationReport, ValidationIssue } from './types';

export class GraphValidator {
  /**
   * Runs the complete validation suite across the computational graph.
   */
  public static validate(
    graph: EvacuationGraph,
    registry?: BuildingAssetRegistry
  ): GraphValidationReport {
    const issues: ValidationIssue[] = [];

    // 1. Check basic graph connection integrity
    this.validateGraphConnections(graph, issues);

    // 2. Check room door integrity and room connections
    this.validateRoomsAndDoors(graph, registry, issues);

    // 3. Check floor transitions & vertical stair integrity
    this.validateFloorTransitions(graph, issues);

    // 4. Check exit accessibility & overall reachability
    this.validateExitAccessibility(graph, issues);

    // 5. Check elevator safety compliance
    this.validateElevatorSafety(graph, issues);

    // Calculate summary metrics
    const nodesPerFloor: Record<FloorId, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRooms = 0;
    let connectedRooms = 0;
    let totalExits = 0;
    let accessibleExits = 0;

    const exitNodes = Array.from(graph.nodes.values()).filter((n) => n.isExit);
    totalExits = exitNodes.length;

    for (const node of graph.nodes.values()) {
      if (node.floor >= 1 && node.floor <= 5) {
        nodesPerFloor[node.floor]++;
      }
      if (node.type === 'room') {
        totalRooms++;
        // Check if room has an active path to at least one exit
        if (this.canReachAnyExit(graph, node.id, exitNodes)) {
          connectedRooms++;
        }
      }
      if (node.isExit && node.isAccessible) {
        accessibleExits++;
      }
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    return {
      timestamp: Date.now(),
      isValid: errorCount === 0,
      errorCount,
      warningCount,
      issues,
      metrics: {
        totalNodes: graph.nodes.size,
        totalEdges: graph.edges.size,
        nodesPerFloor,
        totalRooms,
        connectedRooms,
        totalExits,
        accessibleExits,
      },
    };
  }

  /**
   * 1. Detects invalid graph connections (dangling edges, self-loops, non-positive lengths, orphaned nodes)
   */
  private static validateGraphConnections(
    graph: EvacuationGraph,
    issues: ValidationIssue[]
  ) {
    // Check all edges
    for (const [edgeId, edge] of graph.edges.entries()) {
      // Missing from/to nodes
      const fromNode = graph.nodes.get(edge.fromNodeId);
      const toNode = graph.nodes.get(edge.toNodeId);

      if (!fromNode) {
        issues.push({
          id: `ISSUE_DANGLING_FROM_${edgeId}`,
          category: 'invalid_graph_connection',
          severity: 'error',
          title: 'Dangling Edge (Missing From-Node)',
          description: `Edge "${edgeId}" references non-existent fromNodeId "${edge.fromNodeId}".`,
          affectedNodeIds: [edge.fromNodeId],
          affectedEdgeIds: [edgeId],
          suggestion: 'Ensure the origin node is registered in the graph before creating edges.',
        });
      }

      if (!toNode) {
        issues.push({
          id: `ISSUE_DANGLING_TO_${edgeId}`,
          category: 'invalid_graph_connection',
          severity: 'error',
          title: 'Dangling Edge (Missing To-Node)',
          description: `Edge "${edgeId}" references non-existent toNodeId "${edge.toNodeId}".`,
          affectedNodeIds: [edge.toNodeId],
          affectedEdgeIds: [edgeId],
          suggestion: 'Ensure the target node is registered in the graph before creating edges.',
        });
      }

      // Self-loop
      if (edge.fromNodeId === edge.toNodeId) {
        issues.push({
          id: `ISSUE_SELF_LOOP_${edgeId}`,
          category: 'invalid_graph_connection',
          severity: 'error',
          title: 'Invalid Self-Loop Connection',
          description: `Edge "${edgeId}" links node "${edge.fromNodeId}" to itself.`,
          affectedNodeIds: [edge.fromNodeId],
          affectedEdgeIds: [edgeId],
          suggestion: 'Remove redundant self-loop edge.',
        });
      }

      // Distance check
      if (edge.distance <= 0 || isNaN(edge.distance)) {
        issues.push({
          id: `ISSUE_INVALID_DIST_${edgeId}`,
          category: 'invalid_graph_connection',
          severity: 'error',
          title: 'Non-Positive Edge Distance',
          description: `Edge "${edgeId}" has invalid distance ${edge.distance}m.`,
          affectedNodeIds: [edge.fromNodeId, edge.toNodeId],
          affectedEdgeIds: [edgeId],
          suggestion: 'Verify 3D positions of incident nodes to calculate physical distance.',
        });
      }
    }

    // Check all nodes for orphaned isolation
    for (const [nodeId, node] of graph.nodes.entries()) {
      const adjacentEdges = graph.adjacency.get(nodeId) || [];
      if (adjacentEdges.length === 0) {
        issues.push({
          id: `ISSUE_ORPHAN_NODE_${nodeId}`,
          category: 'invalid_graph_connection',
          severity: node.type === 'room' ? 'error' : 'warning',
          title: `Orphaned Node (${node.type})`,
          description: `Node "${nodeId}" (${node.name}) has no incident edges in the adjacency list.`,
          affectedNodeIds: [nodeId],
          affectedEdgeIds: [],
          affectedFloor: node.floor,
          suggestion: `Connect node "${nodeId}" to the corridor or room egress network.`,
        });
      }
    }
  }

  /**
   * 2. Detects disconnected rooms and missing doors
   */
  private static validateRoomsAndDoors(
    graph: EvacuationGraph,
    registry: BuildingAssetRegistry | undefined,
    issues: ValidationIssue[]
  ) {
    const roomNodes = Array.from(graph.nodes.values()).filter((n) => n.type === 'room');

    for (const room of roomNodes) {
      const outgoingEdges = (graph.adjacency.get(room.id) || [])
        .map((eId) => graph.edges.get(eId))
        .filter((e): e is NonNullable<typeof e> => e !== undefined);

      // Check if room has any outgoing edge
      if (outgoingEdges.length === 0) {
        issues.push({
          id: `ISSUE_DISCONNECTED_ROOM_${room.id}`,
          category: 'disconnected_room',
          severity: 'error',
          title: `Disconnected Room: ${room.name}`,
          description: `Room node "${room.id}" has no outgoing connection to any door or corridor.`,
          affectedNodeIds: [room.id],
          affectedEdgeIds: [],
          affectedFloor: room.floor,
          suggestion: 'Ensure the room has an assigned door linking it to a corridor.',
        });
        continue;
      }

      // Check if any outgoing edge leads to a door
      const connectsToDoor = outgoingEdges.some((edge) => {
        const neighbor = graph.nodes.get(edge.toNodeId);
        return neighbor && neighbor.type === 'door';
      });

      if (!connectsToDoor) {
        issues.push({
          id: `ISSUE_MISSING_DOOR_${room.id}`,
          category: 'missing_door',
          severity: 'warning',
          title: `Direct Corridor Connection Without Door: ${room.name}`,
          description: `Room "${room.id}" links directly to egress corridors without passing through a door node.`,
          affectedNodeIds: [room.id],
          affectedEdgeIds: outgoingEdges.map((e) => e.id),
          affectedFloor: room.floor,
          suggestion: 'Standard building fire codes require a discrete door between habitable rooms and corridors.',
        });
      }
    }

    // Cross-check with registry if provided
    if (registry) {
      for (const regRoom of registry.rooms) {
        const roomNodeId = `NODE_${regRoom.id}`;
        if (!graph.nodes.has(roomNodeId)) {
          issues.push({
            id: `ISSUE_REG_ROOM_MISSING_${regRoom.id}`,
            category: 'disconnected_room',
            severity: 'error',
            title: `Registry Room Missing from Graph: ${regRoom.name}`,
            description: `Building registry room "${regRoom.id}" was not synthesized into a graph node.`,
            affectedNodeIds: [roomNodeId],
            affectedEdgeIds: [],
            affectedFloor: regRoom.floor,
            suggestion: 'Verify GraphBuilder room generation step.',
          });
        }
      }
    }
  }

  /**
   * 3. Detects invalid floor transitions
   */
  private static validateFloorTransitions(
    graph: EvacuationGraph,
    issues: ValidationIssue[]
  ) {
    for (const [edgeId, edge] of graph.edges.entries()) {
      const fromNode = graph.nodes.get(edge.fromNodeId);
      const toNode = graph.nodes.get(edge.toNodeId);
      if (!fromNode || !toNode) continue;

      const floorDiff = Math.abs(fromNode.floor - toNode.floor);

      if (floorDiff > 0) {
        // Floor transition edge
        if (floorDiff > 1) {
          // Skipping floors directly!
          issues.push({
            id: `ISSUE_FLOOR_SKIP_${edgeId}`,
            category: 'invalid_floor_transition',
            severity: 'error',
            title: 'Invalid Multi-Floor Skip Transition',
            description: `Edge "${edgeId}" jumps directly from Floor ${fromNode.floor} to Floor ${toNode.floor} without intermediate landings.`,
            affectedNodeIds: [fromNode.id, toNode.id],
            affectedEdgeIds: [edgeId],
            suggestion: 'Emergency staircases must link adjacent floor landings sequentially.',
          });
        }

        // Must be a staircase or elevator shaft
        const isStair =
          fromNode.type === 'stair_landing' ||
          toNode.type === 'stair_landing' ||
          fromNode.type === 'emergency_staircase' ||
          toNode.type === 'emergency_staircase' ||
          fromNode.type === 'elevator' ||
          toNode.type === 'elevator';

        if (!isStair) {
          issues.push({
            id: `ISSUE_INVALID_VERT_TYPE_${edgeId}`,
            category: 'invalid_floor_transition',
            severity: 'error',
            title: 'Unrecognized Vertical Transition Element',
            description: `Edge "${edgeId}" connects Floor ${fromNode.floor} to Floor ${toNode.floor} between "${fromNode.type}" and "${toNode.type}".`,
            affectedNodeIds: [fromNode.id, toNode.id],
            affectedEdgeIds: [edgeId],
            suggestion: 'Only stair landing or elevator shaft nodes can bridge differing floor levels.',
          });
        }
      }
    }
  }

  /**
   * 4. Detects inaccessible exits and unevacuable spaces
   */
  private static validateExitAccessibility(
    graph: EvacuationGraph,
    issues: ValidationIssue[]
  ) {
    const exitNodes = Array.from(graph.nodes.values()).filter((n) => n.isExit);

    if (exitNodes.length === 0) {
      issues.push({
        id: 'ISSUE_NO_EXITS',
        category: 'inaccessible_exit',
        severity: 'error',
        title: 'Critical: Zero Evacuation Exits in Graph',
        description: 'No graph nodes have isExit=true. Evacuation pathfinding will be impossible.',
        affectedNodeIds: [],
        affectedEdgeIds: [],
        suggestion: 'Register ground floor exterior discharge exits in the building registry.',
      });
      return;
    }

    // Check each exit node
    for (const exit of exitNodes) {
      const incidentEdges = graph.adjacency.get(exit.id) || [];
      if (incidentEdges.length === 0) {
        issues.push({
          id: `ISSUE_ISOLATED_EXIT_${exit.id}`,
          category: 'inaccessible_exit',
          severity: 'error',
          title: `Inaccessible Isolated Exit: ${exit.name}`,
          description: `Exit node "${exit.id}" has no incoming corridor or door connections.`,
          affectedNodeIds: [exit.id],
          affectedEdgeIds: [],
          affectedFloor: exit.floor,
          suggestion: 'Connect exit to adjacent corridor junction or exterior stair discharge.',
        });
      }

      if (exit.floor !== 1) {
        issues.push({
          id: `ISSUE_UPPER_FLOOR_EXIT_${exit.id}`,
          category: 'inaccessible_exit',
          severity: 'warning',
          title: `Upper Floor Exit Warning: ${exit.name}`,
          description: `Exit "${exit.id}" is marked on Floor ${exit.floor}. Standard exterior discharges are located on Ground Floor (F1).`,
          affectedNodeIds: [exit.id],
          affectedEdgeIds: [],
          affectedFloor: exit.floor,
          suggestion: 'Confirm whether this is an exterior terrace or skybridge connection.',
        });
      }
    }

    // Check all rooms on all floors to ensure they can reach at least one exit
    const roomNodes = Array.from(graph.nodes.values()).filter((n) => n.type === 'room');
    for (const room of roomNodes) {
      const canReach = this.canReachAnyExit(graph, room.id, exitNodes);
      if (!canReach) {
        issues.push({
          id: `ISSUE_UNEVACUABLE_ROOM_${room.id}`,
          category: 'disconnected_room',
          severity: 'error',
          title: `No Evacuation Path from Room: ${room.name}`,
          description: `Room "${room.id}" on Floor ${room.floor} cannot reach any ground exit through non-blocked corridors/stairs.`,
          affectedNodeIds: [room.id],
          affectedEdgeIds: [],
          affectedFloor: room.floor,
          suggestion: 'Check if corridors or stair doors leading from this floor are blocked or disconnected.',
        });
      }
    }
  }

  /**
   * 5. Validates elevator safety rules (elevators must NOT be treated as safe evacuation routes)
   */
  private static validateElevatorSafety(
    graph: EvacuationGraph,
    issues: ValidationIssue[]
  ) {
    for (const [edgeId, edge] of graph.edges.entries()) {
      const fromNode = graph.nodes.get(edge.fromNodeId);
      const toNode = graph.nodes.get(edge.toNodeId);
      if (!fromNode || !toNode) continue;

      if (fromNode.type === 'elevator' || toNode.type === 'elevator') {
        if (!edge.isBlocked) {
          issues.push({
            id: `ISSUE_ELEVATOR_UNBLOCKED_${edgeId}`,
            category: 'elevator_safety_warning',
            severity: 'warning',
            title: 'Elevator Edge Unblocked During Evacuation',
            description: `Edge "${edgeId}" connected to elevator shaft is not flagged as blocked. NFPA 101 prohibits standard elevator evacuation.`,
            affectedNodeIds: [fromNode.id, toNode.id],
            affectedEdgeIds: [edgeId],
            suggestion: 'Mark elevator edges as isBlocked: true to prevent routing occupants into shafts.',
          });
        }
      }
    }
  }

  /**
   * BFS helper to verify path to any exit (ignoring blocked edges)
   */
  private static canReachAnyExit(
    graph: EvacuationGraph,
    startNodeId: string,
    exitNodes: GraphNode[]
  ): boolean {
    const exitSet = new Set(exitNodes.map((e) => e.id));
    if (exitSet.has(startNodeId)) return true;

    const visited = new Set<string>();
    const queue: string[] = [startNodeId];
    visited.add(startNodeId);

    while (queue.length > 0) {
      const currId = queue.shift()!;
      if (exitSet.has(currId)) {
        return true;
      }

      const edgeIds = graph.adjacency.get(currId) || [];
      for (const edgeId of edgeIds) {
        const edge = graph.edges.get(edgeId);
        if (!edge || edge.isBlocked) continue;

        const neighborId = edge.toNodeId;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    return false;
  }
}
