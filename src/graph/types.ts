/**
 * Evacuation Graph Computational Types
 * Every node and edge is guaranteed to have a deterministic identifier.
 */

import { FloorId, Vector3D } from '../types/building';

export type GraphNodeType =
  | 'room'
  | 'corridor'
  | 'corridor_segment'
  | 'door'
  | 'junction'
  | 'emergency_staircase'
  | 'stair_landing'
  | 'floor_transition'
  | 'exit'
  | 'elevator';

export type HazardState =
  | 'none'
  | 'smoke_detected'
  | 'heat_warning'
  | 'debris'
  | 'impassable';

export interface GraphNode {
  id: string; // Deterministic ID: e.g. "NODE_F1_ROOM_101", "NODE_F2_DOOR_201", "NODE_STAIR_WEST_F3"
  name: string;
  type: GraphNodeType;
  floor: FloorId;
  position: Vector3D; // Exact 3D geometric coordinates [x, y, z] matching 3D Digital Twin
  digitalTwinId: string; // Corresponding 3D object ID in the building registry
  capacity?: number; // Max occupant load or flow capacity
  isExit?: boolean; // True if this node is a safe ground evacuation discharge point
  isAccessible?: boolean; // ADA wheelchair step-free accessible
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string; // Deterministic ID: e.g. "EDGE_NODE_F1_ROOM_101__NODE_F1_DOOR_101"
  fromNodeId: string;
  toNodeId: string;
  distance: number; // Euclidean/pathway distance in meters (e.g. 5.4m)
  traversalTime: number; // Estimated seconds based on egress speed (walking ~1.2m/s, stair descent ~0.6m/s)
  capacity: number; // Egress throughput capacity (persons per minute)
  width: number; // Clear width in meters (e.g., 0.9m for doors, 2.0m for corridors)
  accessibility: boolean; // Wheelchair accessible (true for corridors/doors without steps, false for stairs)
  isBlocked: boolean; // Blocked state (e.g. collapsed, locked, fire-sealed)
  hazardState: HazardState; // Hazard level affecting traversal cost/feasibility
  bidirectional: boolean;
  digitalTwinId?: string; // Associated 3D building object (e.g. Door, Corridor segment, Stair flight)
  isVerticalTransition?: boolean; // True if connecting different floors (e.g. stairs)
}

export interface EvacuationGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  adjacency: Map<string, string[]>; // Map node ID -> array of outgoing edge IDs
  digitalTwinToNodeMap: Map<string, string[]>; // 3D Object ID -> Graph Node IDs
  digitalTwinToEdgeMap: Map<string, string[]>; // 3D Object ID -> Graph Edge IDs
  nodeToDigitalTwinMap: Map<string, string>; // Graph Node ID -> 3D Object ID
  edgeToDigitalTwinMap: Map<string, string>; // Graph Edge ID -> 3D Object ID
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationCategory =
  | 'disconnected_room'
  | 'inaccessible_exit'
  | 'invalid_floor_transition'
  | 'missing_door'
  | 'invalid_graph_connection'
  | 'elevator_safety_warning'
  | 'capacity_bottleneck';

export interface ValidationIssue {
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  title: string;
  description: string;
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
  affectedFloor?: FloorId;
  suggestion?: string;
}

export interface GraphValidationReport {
  timestamp: number;
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
  metrics: {
    totalNodes: number;
    totalEdges: number;
    nodesPerFloor: Record<FloorId, number>;
    totalRooms: number;
    connectedRooms: number;
    totalExits: number;
    accessibleExits: number;
  };
}

export interface PathStep {
  fromNodeId: string;
  toNodeId: string;
  edgeId: string;
  instruction: string;
  distance: number;
  traversalTime: number;
  fromPosition: Vector3D;
  toPosition: Vector3D;
  floor: FloorId;
  isStairDescent: boolean;
}

export interface PathfindingOptions {
  wheelchairOnly?: boolean; // If true, avoid stairs and non-accessible edges
  avoidHazards?: boolean; // If true, heavily penalize or forbid hazardous edges
  ignoreBlocked?: boolean; // If false (default), skip blocked edges entirely
  maxTraversalCost?: number;
}

export interface PathfindingResult {
  pathFound: boolean;
  startNodeId: string;
  targetNodeId: string;
  nodeIds: string[];
  edgeIds: string[];
  waypoints: Vector3D[]; // 3D coordinates along the route for visualization
  totalDistance: number; // in meters
  totalTraversalTime: number; // in seconds
  floorsTraversed: FloorId[];
  steps: PathStep[];
  exploredNodeCount: number;
  computationTimeMs: number;
  exitReached?: boolean;
}
