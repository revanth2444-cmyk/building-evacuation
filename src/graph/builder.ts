/**
 * Evacuation Graph Builder Module
 * Compiles the BuildingAssetRegistry into an indexed, deterministic computational graph.
 */

import {
  BuildingAssetRegistry,
  EmergencyStaircase,
  FloorId,
  Vector3D,
} from '../types/building';
import { EvacuationGraph, GraphEdge, GraphNode, HazardState } from './types';

// Standard building egress physical parameters (IBC / NFPA 101)
const WALKING_SPEED_LEVEL = 1.25; // meters per second on flat surfaces
const WALKING_SPEED_STAIRS = 0.65; // meters per second descending stairs
const CAPACITY_PER_METER_WIDTH = 60; // occupants per meter of clear width per minute

export class GraphBuilder {
  /**
   * Builds the complete computational evacuation graph from the building asset registry.
   */
  public static buildGraph(registry: BuildingAssetRegistry): EvacuationGraph {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();
    const adjacency = new Map<string, string[]>();

    const digitalTwinToNodeMap = new Map<string, string[]>();
    const digitalTwinToEdgeMap = new Map<string, string[]>();
    const nodeToDigitalTwinMap = new Map<string, string>();
    const edgeToDigitalTwinMap = new Map<string, string>();

    // Helper: Register a node
    const addNode = (node: GraphNode) => {
      nodes.set(node.id, node);
      if (!adjacency.has(node.id)) {
        adjacency.set(node.id, []);
      }

      // Track digital twin mapping
      if (node.digitalTwinId) {
        nodeToDigitalTwinMap.set(node.id, node.digitalTwinId);
        const existing = digitalTwinToNodeMap.get(node.digitalTwinId) || [];
        existing.push(node.id);
        digitalTwinToNodeMap.set(node.digitalTwinId, existing);
      }
    };

    // Helper: Register an edge (deterministic bidirectional pair or single directed)
    const addEdge = (
      fromId: string,
      toId: string,
      props: {
        width: number;
        accessibility: boolean;
        capacity?: number;
        digitalTwinId?: string;
        isVerticalTransition?: boolean;
        isBlocked?: boolean;
        hazardState?: HazardState;
      }
    ) => {
      const fromNode = nodes.get(fromId);
      const toNode = nodes.get(toId);
      if (!fromNode || !toNode) {
        console.warn(`Cannot create edge: Node ${fromId} or ${toId} does not exist.`);
        return;
      }

      const dx = toNode.position.x - fromNode.position.x;
      const dy = toNode.position.y - fromNode.position.y;
      const dz = toNode.position.z - fromNode.position.z;
      const distance = Math.max(0.1, Number(Math.hypot(dx, dy, dz).toFixed(2)));

      const speed = props.isVerticalTransition ? WALKING_SPEED_STAIRS : WALKING_SPEED_LEVEL;
      const traversalTime = Number((distance / speed).toFixed(2));
      const capacity = props.capacity ?? Math.round(props.width * CAPACITY_PER_METER_WIDTH);

      // Deterministic Edge IDs
      const forwardEdgeId = `EDGE_${fromId}__${toId}`;
      const forwardEdge: GraphEdge = {
        id: forwardEdgeId,
        fromNodeId: fromId,
        toNodeId: toId,
        distance,
        traversalTime,
        capacity,
        width: props.width,
        accessibility: props.accessibility,
        isBlocked: props.isBlocked ?? false,
        hazardState: props.hazardState ?? 'none',
        bidirectional: true,
        digitalTwinId: props.digitalTwinId,
        isVerticalTransition: props.isVerticalTransition ?? false,
      };

      edges.set(forwardEdgeId, forwardEdge);
      adjacency.get(fromId)?.push(forwardEdgeId);

      if (props.digitalTwinId) {
        edgeToDigitalTwinMap.set(forwardEdgeId, props.digitalTwinId);
        const existing = digitalTwinToEdgeMap.get(props.digitalTwinId) || [];
        existing.push(forwardEdgeId);
        digitalTwinToEdgeMap.set(props.digitalTwinId, existing);
      }

      // Reverse Edge for Bidirectional Network
      const reverseEdgeId = `EDGE_${toId}__${fromId}`;
      const reverseEdge: GraphEdge = {
        id: reverseEdgeId,
        fromNodeId: toId,
        toNodeId: fromId,
        distance,
        traversalTime,
        capacity,
        width: props.width,
        accessibility: props.accessibility,
        isBlocked: props.isBlocked ?? false,
        hazardState: props.hazardState ?? 'none',
        bidirectional: true,
        digitalTwinId: props.digitalTwinId,
        isVerticalTransition: props.isVerticalTransition ?? false,
      };

      edges.set(reverseEdgeId, reverseEdge);
      adjacency.get(toId)?.push(reverseEdgeId);

      if (props.digitalTwinId) {
        edgeToDigitalTwinMap.set(reverseEdgeId, props.digitalTwinId);
        const existing = digitalTwinToEdgeMap.get(props.digitalTwinId) || [];
        existing.push(reverseEdgeId);
        digitalTwinToEdgeMap.set(props.digitalTwinId, existing);
      }
    };

    // ==========================================
    // 1. BUILD ROOM NODES
    // ==========================================
    for (const room of registry.rooms) {
      const nodeId = `NODE_${room.id}`;
      addNode({
        id: nodeId,
        name: room.name,
        type: 'room',
        floor: room.floor,
        position: { ...room.position },
        digitalTwinId: room.id,
        capacity: room.capacity,
        isAccessible: true,
        metadata: {
          roomType: room.roomType,
          roomNumber: room.roomNumber,
          isSprinklerEquipped: room.isSprinklerEquipped,
        },
      });
    }

    // ==========================================
    // 2. BUILD CORRIDOR SEGMENTS & JUNCTIONS
    // ==========================================
    for (const junc of registry.junctions) {
      const nodeId = `NODE_${junc.id}`;
      addNode({
        id: nodeId,
        name: junc.name,
        type: 'junction',
        floor: junc.floor,
        position: { ...junc.position },
        digitalTwinId: junc.id,
        isAccessible: true,
      });
    }

    for (const seg of registry.corridorSegments) {
      const nodeId = `NODE_${seg.id}`;
      addNode({
        id: nodeId,
        name: seg.name,
        type: 'corridor_segment',
        floor: seg.floor,
        position: { ...seg.position },
        digitalTwinId: seg.id,
        isAccessible: true,
      });

      // Connect Corridor Segment to its Connected Junctions
      for (const juncId of seg.connectedJunctionIds) {
        const juncNodeId = `NODE_${juncId}`;
        addEdge(juncNodeId, nodeId, {
          width: seg.width,
          accessibility: true,
          digitalTwinId: seg.id,
        });
      }
    }

    // ==========================================
    // 3. BUILD DOOR NODES & CONNECTIVITY
    // ==========================================
    for (const door of registry.doors) {
      const doorNodeId = `NODE_${door.id}`;
      addNode({
        id: doorNodeId,
        name: door.name,
        type: 'door',
        floor: door.floor,
        position: { ...door.position },
        digitalTwinId: door.id,
        isAccessible: door.isADACompliant,
        metadata: {
          isFireRated: door.isFireRated,
          isLocked: door.isLocked,
          isEmergencyExitDoor: door.isEmergencyExitDoor,
        },
      });

      // Link door to connectedFrom (Room or Junction or Corridor)
      const fromNodeId = `NODE_${door.connectedFromId}`;
      if (nodes.has(fromNodeId)) {
        addEdge(fromNodeId, doorNodeId, {
          width: door.width,
          accessibility: door.isADACompliant,
          digitalTwinId: door.id,
          isBlocked: door.isLocked,
        });
      }

      // Link door to connectedTo (Corridor or Landing or Exit)
      const toNodeId = `NODE_${door.connectedToId}`;
      // Note: for stair landing or exit, the target node might be created in subsequent steps
    }

    // ==========================================
    // 4. BUILD EMERGENCY STAIRCASES & FLOOR TRANSITIONS
    // ==========================================
    for (const stair of registry.stairs) {
      for (const landing of stair.floorLandings) {
        const landingNodeId = `NODE_${stair.stairId}_LANDING_F${landing.floor}`;
        addNode({
          id: landingNodeId,
          name: `${stair.name} - Floor ${landing.floor} Landing`,
          type: 'stair_landing',
          floor: landing.floor,
          position: { ...landing.landingPosition },
          digitalTwinId: stair.id,
          isAccessible: false, // Stairwells have steps, not accessible for standard wheelchairs
          metadata: {
            stairId: stair.stairId,
            isPressurized: stair.isPressurized,
          },
        });

        // Connect landing to its Floor Door
        const stairDoorNodeId = `NODE_${landing.doorId}`;
        if (nodes.has(stairDoorNodeId)) {
          addEdge(stairDoorNodeId, landingNodeId, {
            width: stair.width,
            accessibility: false,
            digitalTwinId: landing.doorId,
          });
        }
      }

      // Connect adjacent floor landings with vertical stair flights
      const sortedFloors = [...stair.connectedFloors].sort((a, b) => a - b);
      for (let i = 0; i < sortedFloors.length - 1; i++) {
        const lowerFloor = sortedFloors[i];
        const upperFloor = sortedFloors[i + 1];

        const lowerLandingId = `NODE_${stair.stairId}_LANDING_F${lowerFloor}`;
        const upperLandingId = `NODE_${stair.stairId}_LANDING_F${upperFloor}`;

        addEdge(upperLandingId, lowerLandingId, {
          width: stair.width,
          accessibility: false,
          isVerticalTransition: true,
          digitalTwinId: stair.id,
          capacity: Math.round(stair.width * 45), // stair capacity per minute
        });
      }
    }

    // ==========================================
    // 5. BUILD EXITS & DISCHARGE CONNECTIONS
    // ==========================================
    for (const exit of registry.exits) {
      const exitNodeId = `NODE_${exit.id}`;
      addNode({
        id: exitNodeId,
        name: exit.name,
        type: 'exit',
        floor: exit.floor,
        position: { ...exit.position },
        digitalTwinId: exit.id,
        isExit: true,
        isAccessible: exit.isWheelchairAccessible,
        metadata: {
          exitCode: exit.exitCode,
          dischargeType: exit.dischargeType,
        },
      });
    }

    // Connect Floor 1 doors & exits
    // 1. South Exit connects to Door F1_DOOR_101_B
    addEdge('NODE_F1_DOOR_101_B', 'NODE_F1_EXIT_SOUTH', {
      width: 2.4,
      accessibility: true,
      digitalTwinId: 'F1_EXIT_SOUTH',
    });

    // 2. North Exit connects to Door F1_DOOR_EXIT_NORTH
    addEdge('NODE_F1_DOOR_EXIT_NORTH', 'NODE_F1_EXIT_NORTH', {
      width: 2.0,
      accessibility: true,
      digitalTwinId: 'F1_EXIT_NORTH',
    });

    // 3. West Stair discharge connects on F1 directly to Exit West
    addEdge('NODE_STAIR_WEST_LANDING_F1', 'NODE_F1_EXIT_WEST', {
      width: 1.4,
      accessibility: false,
      digitalTwinId: 'F1_EXIT_WEST',
    });

    // 4. East Stair discharge connects on F1 directly to Exit East
    addEdge('NODE_STAIR_EAST_LANDING_F1', 'NODE_F1_EXIT_EAST', {
      width: 1.4,
      accessibility: false,
      digitalTwinId: 'F1_EXIT_EAST',
    });

    // Resolve any remaining doors whose connectedToId was just built
    for (const door of registry.doors) {
      const doorNodeId = `NODE_${door.id}`;
      const toNodeId = `NODE_${door.connectedToId}`;
      if (nodes.has(toNodeId) && nodes.has(doorNodeId)) {
        const edgeKey = `EDGE_${doorNodeId}__${toNodeId}`;
        if (!edges.has(edgeKey)) {
          addEdge(doorNodeId, toNodeId, {
            width: door.width,
            accessibility: door.isADACompliant,
            digitalTwinId: door.id,
            isBlocked: door.isLocked,
          });
        }
      }
    }

    // ==========================================
    // 6. ELEVATOR BANK (EXPLICITLY UNSAFE FOR EVACUATION)
    // ==========================================
    for (const elevator of registry.elevators) {
      for (const floor of elevator.connectedFloors) {
        const elevNodeId = `NODE_${elevator.elevatorId}_F${floor}`;
        const y = (floor - 1) * registry.floorHeight;
        addNode({
          id: elevNodeId,
          name: `${elevator.name} - Floor ${floor}`,
          type: 'elevator',
          floor,
          position: { x: elevator.shaftPosition.x, y, z: elevator.shaftPosition.z },
          digitalTwinId: elevator.id,
          isAccessible: true,
          metadata: {
            isSafeEvacuationRoute: false,
            warning: 'Elevators are recalled and deactivated during building evacuation.',
          },
        });

        // Connect elevator to central junction on each floor
        const centralJuncId = `NODE_F${floor}_JUNC_CENTRAL`;
        if (nodes.has(centralJuncId)) {
          // Edge between elevator and corridor junction is accessible but marked BLOCKED for evacuation
          addEdge(centralJuncId, elevNodeId, {
            width: 1.2,
            accessibility: true,
            isBlocked: true, // Elevators must NOT automatically be used as evacuation routes!
            digitalTwinId: elevator.id,
          });
        }
      }

      // Vertical shaft transitions: marked blocked / unsafe
      const floors = [...elevator.connectedFloors].sort((a, b) => a - b);
      for (let i = 0; i < floors.length - 1; i++) {
        const fLow = floors[i];
        const fHigh = floors[i + 1];
        addEdge(`NODE_${elevator.elevatorId}_F${fHigh}`, `NODE_${elevator.elevatorId}_F${fLow}`, {
          width: 1.5,
          accessibility: true,
          isVerticalTransition: true,
          isBlocked: true, // Elevators disabled during fire/evacuation
          digitalTwinId: elevator.id,
        });
      }
    }

    return {
      nodes,
      edges,
      adjacency,
      digitalTwinToNodeMap,
      digitalTwinToEdgeMap,
      nodeToDigitalTwinMap,
      edgeToDigitalTwinMap,
    };
  }
}
