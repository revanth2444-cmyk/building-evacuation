/**
 * Building Asset Registry Types
 * Represents physical architectural entities in the 5-floor building digital twin.
 */

export type FloorId = 1 | 2 | 3 | 4 | 5;

export type RoomCategory =
  | 'office'
  | 'conference'
  | 'lab'
  | 'server_room'
  | 'restroom'
  | 'storage'
  | 'lobby'
  | 'utility';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox3D {
  min: Vector3D;
  max: Vector3D;
}

/**
 * Base 3D Digital Twin Object
 */
export interface DigitalTwinObject {
  id: string; // Deterministic ID: e.g. "F1_ROOM_101", "F2_DOOR_203", "STAIR_WEST"
  name: string;
  floor: FloorId;
  position: Vector3D; // Center point in 3D world space (meters)
  dimensions: Vector3D; // Width (X), Height (Y), Depth (Z)
  category: string;
  metadata?: Record<string, unknown>;
}

export interface BuildingRoom extends DigitalTwinObject {
  category: 'room';
  roomType: RoomCategory;
  roomNumber: string; // e.g., "101", "204"
  capacity: number; // Max occupant capacity
  doorIds: string[]; // Connected door digital twin IDs
  isSprinklerEquipped: boolean;
  hasHazardousMaterials?: boolean;
}

export interface BuildingDoor extends DigitalTwinObject {
  category: 'door';
  connectedFromId: string; // Room ID or Corridor segment ID
  connectedToId: string; // Corridor segment ID or Room ID
  width: number; // Clear width in meters (e.g. 0.9m)
  isFireRated: boolean;
  isEmergencyExitDoor: boolean;
  isLocked: boolean;
  isADACompliant: boolean; // Wheelchair accessible
}

export interface CorridorSegment extends DigitalTwinObject {
  category: 'corridor_segment';
  width: number; // Width in meters (e.g., 2.0m)
  startPoint: Vector3D;
  endPoint: Vector3D;
  connectedJunctionIds: string[];
}

export interface BuildingJunction extends DigitalTwinObject {
  category: 'junction';
  radius: number;
  connectedSegmentIds: string[];
}

export interface EmergencyStaircase extends DigitalTwinObject {
  category: 'emergency_staircase';
  stairId: 'STAIR_WEST' | 'STAIR_EAST';
  connectedFloors: FloorId[];
  isPressurized: boolean; // Smoke-proof pressurized stairwell
  width: number; // Tread width (e.g., 1.2m)
  floorLandings: {
    floor: FloorId;
    landingPosition: Vector3D;
    doorId: string;
  }[];
}

export interface BuildingElevator extends DigitalTwinObject {
  category: 'elevator';
  elevatorId: 'ELEV_CENTRAL';
  connectedFloors: FloorId[];
  isSafeEvacuationRoute: false; // Never treated as safe evacuation route during emergency
  shaftPosition: Vector3D;
}

export interface BuildingExit extends DigitalTwinObject {
  category: 'exit';
  exitCode: string; // e.g., "EXIT_NORTH", "EXIT_SOUTH"
  dischargeType: 'exterior_muster_point' | 'parking_lot' | 'avenue_courtyard';
  isWheelchairAccessible: boolean;
  width: number;
}

/**
 * Full Building Asset Registry
 */
export interface BuildingAssetRegistry {
  id: string;
  name: string;
  totalFloors: 5;
  floorHeight: number; // 4.0 meters per floor
  buildingBounds: {
    width: number; // X axis: e.g., 40m
    height: number; // Y axis: 5 * 4m = 20m
    depth: number; // Z axis: e.g., 30m
  };
  rooms: BuildingRoom[];
  corridorSegments: CorridorSegment[];
  junctions: BuildingJunction[];
  doors: BuildingDoor[];
  stairs: EmergencyStaircase[];
  elevators: BuildingElevator[];
  exits: BuildingExit[];
}
