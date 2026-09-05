/**
 * EVACUATE-AI Central Zustand Store
 * Bridges 3D scene state, Digital Twin inspection, Computational Graph, and A* Pathfinding.
 */

import { create } from 'zustand';
import { buildingRegistry } from '../data/buildingRegistry';
import { GraphBuilder } from '../graph/builder';
import { DigitalTwinMapper } from '../graph/mapping';
import { AStarPathfinder } from '../graph/pathfinding';
import {
  EvacuationGraph,
  GraphEdge,
  GraphNode,
  GraphValidationReport,
  PathfindingOptions,
  PathfindingResult,
} from '../graph/types';
import { GraphValidator } from '../graph/validator';
import { FloorId } from '../types/building';
import { FIXED_TIMESTEP } from '../simulation/constants';
import {
  SimulatedAgent,
  SimulationCapacitySummary,
  SimulationConfig,
  SimulationMetrics,
} from '../simulation/types';
import { SimulationEngine } from '../simulation/engine';
import { CapacityEngine } from '../simulation/capacityEngine';

export type SimulationState = 'idle' | 'running' | 'paused' | 'completed';

export interface EvacuateState {
  // Building & Graph Data
  graph: EvacuationGraph;
  validationReport: GraphValidationReport | null;

  // View / Floor State
  activeFloor: FloorId | 'all';
  setActiveFloor: (floor: FloorId | 'all') => void;

  // Selection & Inspection State
  selectedObjectId: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedAgentId: string | null;
  setSelectedObject: (objectId: string | null) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  setSelectedAgentId: (agentId: string | null) => void;

  // Route & Pathfinding State
  routeStartNodeId: string;
  routeTargetNodeId: string; // Specific node ID or 'NEAREST_EXIT'
  isWheelchairOnly: boolean;
  computedRoute: PathfindingResult | null;
  setRouteStartNode: (nodeId: string) => void;
  setRouteTargetNode: (nodeId: string) => void;
  setIsWheelchairOnly: (val: boolean) => void;
  calculateRoute: () => void;
  clearRoute: () => void;

  // 3D Visualization Layer Toggles
  showGraphNodes: boolean;
  showGraphEdges: boolean;
  showNodeLabels: boolean;
  showRoutePath: boolean;
  showBuildingMesh: boolean;
  showAgents: boolean;
  cameraPreset: 'isometric' | 'top_down' | 'front' | 'perspective';
  setShowGraphNodes: (show: boolean) => void;
  setShowGraphEdges: (show: boolean) => void;
  setShowNodeLabels: (show: boolean) => void;
  setShowRoutePath: (show: boolean) => void;
  setShowBuildingMesh: (show: boolean) => void;
  setShowAgents: (show: boolean) => void;
  setCameraPreset: (preset: 'isometric' | 'top_down' | 'front' | 'perspective') => void;

  // Edge State Mutation (for developer debugging / scenario simulation)
  toggleEdgeBlocked: (edgeId: string) => void;
  setEdgeHazard: (edgeId: string, hazard: GraphEdge['hazardState']) => void;
  resetAllEdges: () => void;

  // Validation Actions
  runValidation: () => void;
  injectTestFault: (faultType: 'disconnect_room' | 'block_stairs' | 'isolate_exit') => void;

  // ==========================================
  // PHASE 3: AGENT-BASED SIMULATION STATE
  // ==========================================
  simulationState: SimulationState;
  simulationConfig: SimulationConfig;
  simulationMetrics: SimulationMetrics;
  capacitySummary: SimulationCapacitySummary;
  agents: SimulatedAgent[];

  // Simulation Controls
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  stepSimulation: (dt: number) => void;
  setSimulationSpeed: (speed: number) => void;
  setSimulationSeed: (seed: number) => void;
  setAgentCount: (count: number) => void;
  regeneratePopulation: () => void;
}

// Initial Graph Construction
const initialGraph = GraphBuilder.buildGraph(buildingRegistry);
const initialValidation = GraphValidator.validate(initialGraph, buildingRegistry);

// Initial Agent Population (Default: 150 agents, seed 42)
const INITIAL_AGENT_COUNT = 150;
const INITIAL_SEED = 42;
const initialAgents = SimulationEngine.initPopulation(initialGraph, INITIAL_AGENT_COUNT, INITIAL_SEED);

const initialMetrics: SimulationMetrics = {
  totalAgents: initialAgents.length,
  evacuatedAgents: 0,
  remainingAgents: initialAgents.length,
  reactingAgents: 0,
  queuedAgents: 0,
  elapsedTime: 0,
  averageEvacuationTime: 0,
  evacuationProgress: 0,
};

export const useEvacuateStore = create<EvacuateState>((set, get) => ({
  graph: initialGraph,
  validationReport: initialValidation,

  activeFloor: 'all',
  setActiveFloor: (floor) => set({ activeFloor: floor }),

  selectedObjectId: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedAgentId: null,

  setSelectedObject: (objectId) => {
    const { graph } = get();
    if (!objectId) {
      set({ selectedObjectId: null, selectedNodeId: null, selectedAgentId: null });
      return;
    }
    const nodes = DigitalTwinMapper.getNodesForObject(graph, objectId);
    const primaryNodeId = nodes.length > 0 ? nodes[0].id : null;
    set({
      selectedObjectId: objectId,
      selectedNodeId: primaryNodeId,
      selectedEdgeId: null,
      selectedAgentId: null,
    });
  },

  setSelectedNode: (nodeId) => {
    const { graph } = get();
    if (!nodeId) {
      set({ selectedNodeId: null });
      return;
    }
    const objectId = DigitalTwinMapper.getObjectForNode(graph, nodeId);
    set({
      selectedNodeId: nodeId,
      selectedObjectId: objectId ?? null,
      selectedEdgeId: null,
      selectedAgentId: null,
    });
  },

  setSelectedEdge: (edgeId) => {
    const { graph } = get();
    if (!edgeId) {
      set({ selectedEdgeId: null });
      return;
    }
    const objectId = DigitalTwinMapper.getObjectForEdge(graph, edgeId);
    set({
      selectedEdgeId: edgeId,
      selectedObjectId: objectId ?? null,
      selectedNodeId: null,
      selectedAgentId: null,
    });
  },

  setSelectedAgentId: (agentId) => set({
    selectedAgentId: agentId,
    selectedObjectId: null,
    selectedNodeId: null,
    selectedEdgeId: null,
  }),

  // Default start: Penthouse Office on Floor 5, Target: Nearest Exit
  routeStartNodeId: 'NODE_F5_ROOM_502',
  routeTargetNodeId: 'NEAREST_EXIT',
  isWheelchairOnly: false,
  computedRoute: null,

  setRouteStartNode: (nodeId) => set({ routeStartNodeId: nodeId }),
  setRouteTargetNode: (nodeId) => set({ routeTargetNodeId: nodeId }),
  setIsWheelchairOnly: (val) => set({ isWheelchairOnly: val }),

  calculateRoute: () => {
    const { graph, routeStartNodeId, routeTargetNodeId, isWheelchairOnly } = get();
    const options: PathfindingOptions = {
      wheelchairOnly: isWheelchairOnly,
      avoidHazards: true,
    };

    let result: PathfindingResult;
    if (routeTargetNodeId === 'NEAREST_EXIT' || !routeTargetNodeId) {
      result = AStarPathfinder.findNearestExit(graph, routeStartNodeId, options);
    } else {
      result = AStarPathfinder.findPath(graph, routeStartNodeId, routeTargetNodeId, options);
    }

    set({ computedRoute: result, showRoutePath: true });
  },

  clearRoute: () => set({ computedRoute: null }),

  showGraphNodes: false,
  showGraphEdges: true,
  showNodeLabels: false,
  showRoutePath: true,
  showBuildingMesh: true,
  showAgents: true,
  cameraPreset: 'isometric',

  setShowGraphNodes: (show) => set({ showGraphNodes: show }),
  setShowGraphEdges: (show) => set({ showGraphEdges: show }),
  setShowNodeLabels: (show) => set({ showNodeLabels: show }),
  setShowRoutePath: (show) => set({ showRoutePath: show }),
  setShowBuildingMesh: (show) => set({ showBuildingMesh: show }),
  setShowAgents: (show) => set({ showAgents: show }),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  toggleEdgeBlocked: (edgeId) => {
    const { graph } = get();
    const edge = graph.edges.get(edgeId);
    if (!edge) return;

    edge.isBlocked = !edge.isBlocked;

    // If bidirectional counterpart exists, synchronize it
    const counterpartId = `EDGE_${edge.toNodeId}__${edge.fromNodeId}`;
    const counterpart = graph.edges.get(counterpartId);
    if (counterpart) {
      counterpart.isBlocked = edge.isBlocked;
    }

    // Revalidate and recompute route if active
    const newValidation = GraphValidator.validate(graph, buildingRegistry);
    set({ graph: { ...graph }, validationReport: newValidation });
    get().calculateRoute();
  },

  setEdgeHazard: (edgeId, hazard) => {
    const { graph } = get();
    const edge = graph.edges.get(edgeId);
    if (!edge) return;

    edge.hazardState = hazard;
    const counterpartId = `EDGE_${edge.toNodeId}__${edge.fromNodeId}`;
    const counterpart = graph.edges.get(counterpartId);
    if (counterpart) {
      counterpart.hazardState = hazard;
    }

    set({ graph: { ...graph } });
    get().calculateRoute();
  },

  resetAllEdges: () => {
    const freshGraph = GraphBuilder.buildGraph(buildingRegistry);
    const freshValidation = GraphValidator.validate(freshGraph, buildingRegistry);
    set({ graph: freshGraph, validationReport: freshValidation });
    get().calculateRoute();
  },

  runValidation: () => {
    const { graph } = get();
    const report = GraphValidator.validate(graph, buildingRegistry);
    set({ validationReport: report });
  },

  injectTestFault: (faultType) => {
    const { graph } = get();
    if (faultType === 'disconnect_room') {
      const edge = graph.edges.get('EDGE_NODE_F5_ROOM_501__NODE_F5_DOOR_501');
      if (edge) edge.isBlocked = true;
      const reverse = graph.edges.get('EDGE_NODE_F5_DOOR_501__NODE_F5_ROOM_501');
      if (reverse) reverse.isBlocked = true;
    } else if (faultType === 'block_stairs') {
      const westStairs = Array.from(graph.edges.values()).filter((e) =>
        e.id.includes('STAIR_WEST')
      );
      westStairs.forEach((e) => (e.isBlocked = true));
    } else if (faultType === 'isolate_exit') {
      const exitNorth = graph.edges.get('EDGE_NODE_F1_DOOR_EXIT_NORTH__NODE_F1_EXIT_NORTH');
      if (exitNorth) exitNorth.isBlocked = true;
      const exitSouth = graph.edges.get('EDGE_NODE_F1_DOOR_101_B__NODE_F1_EXIT_SOUTH');
      if (exitSouth) exitSouth.isBlocked = true;
    }

    const report = GraphValidator.validate(graph, buildingRegistry);
    set({ graph: { ...graph }, validationReport: report });
    get().calculateRoute();
  },

  // ==========================================
  // PHASE 3 SIMULATION ENGINE IMPLEMENTATION
  // ==========================================
  simulationState: 'idle',
  simulationConfig: {
    seed: INITIAL_SEED,
    agentCount: INITIAL_AGENT_COUNT,
    simulationSpeed: 1.0,
  },
  simulationMetrics: initialMetrics,
  capacitySummary: CapacityEngine.getSummary(0),
  agents: initialAgents,

  startSimulation: () => {
    set({ simulationState: 'running' });
  },

  pauseSimulation: () => {
    set({ simulationState: 'paused' });
  },

  resetSimulation: () => {
    const { agents } = get();
    const resetList = SimulationEngine.resetAgents(agents);
    set({
      simulationState: 'idle',
      agents: resetList,
      simulationMetrics: {
        totalAgents: resetList.length,
        evacuatedAgents: 0,
        remainingAgents: resetList.length,
        reactingAgents: 0,
        queuedAgents: 0,
        elapsedTime: 0,
        averageEvacuationTime: 0,
        evacuationProgress: 0,
      },
      capacitySummary: CapacityEngine.getSummary(0),
    });
  },

  stepSimulation: (dt) => {
    const { agents, simulationMetrics, simulationState } = get();
    if (simulationState !== 'running') return;

    const { updatedAgents, metrics } = SimulationEngine.step(
      agents,
      dt,
      simulationMetrics.elapsedTime
    );

    const isFinished = metrics.remainingAgents === 0;

    set({
      agents: updatedAgents,
      simulationMetrics: metrics,
      capacitySummary: CapacityEngine.getSummary(metrics.elapsedTime),
      simulationState: isFinished ? 'completed' : 'running',
    });
  },

  setSimulationSpeed: (speed) => {
    const { simulationConfig } = get();
    set({ simulationConfig: { ...simulationConfig, simulationSpeed: speed } });
  },

  setSimulationSeed: (seed) => {
    const { simulationConfig } = get();
    set({ simulationConfig: { ...simulationConfig, seed } });
    get().regeneratePopulation();
  },

  setAgentCount: (count) => {
    const { simulationConfig } = get();
    set({ simulationConfig: { ...simulationConfig, agentCount: count } });
    get().regeneratePopulation();
  },

  regeneratePopulation: () => {
    const { graph, simulationConfig } = get();
    const newAgents = SimulationEngine.initPopulation(
      graph,
      simulationConfig.agentCount,
      simulationConfig.seed
    );
    set({
      simulationState: 'idle',
      agents: newAgents,
      simulationMetrics: {
        totalAgents: newAgents.length,
        evacuatedAgents: 0,
        remainingAgents: newAgents.length,
        reactingAgents: 0,
        queuedAgents: 0,
        elapsedTime: 0,
        averageEvacuationTime: 0,
        evacuationProgress: 0,
      },
      capacitySummary: CapacityEngine.getSummary(0),
    });
  },
}));

