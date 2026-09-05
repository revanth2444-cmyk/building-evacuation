/**
 * Building Asset Registry: EVACUATE-AI 5-Floor Digital Twin
 * Contains deterministic digital twin representations for all physical entities across Floors 1 to 5.
 */

import {
  BuildingAssetRegistry,
  BuildingDoor,
  BuildingElevator,
  BuildingExit,
  BuildingJunction,
  BuildingRoom,
  CorridorSegment,
  EmergencyStaircase,
  FloorId,
} from '../types/building';

const FLOOR_HEIGHT = 4.0;
export const getFloorElevation = (floor: FloorId): number => (floor - 1) * FLOOR_HEIGHT;

// Helper to generate rooms across floors
const generateRooms = (): BuildingRoom[] => {
  const rooms: BuildingRoom[] = [
    // FLOOR 1
    {
      id: 'F1_ROOM_101',
      name: 'Main Lobby & Reception',
      floor: 1,
      category: 'room',
      roomType: 'lobby',
      roomNumber: '101',
      position: { x: 0, y: 0, z: 6 },
      dimensions: { x: 12, y: 3.5, z: 8 },
      capacity: 80,
      doorIds: ['F1_DOOR_101_A', 'F1_DOOR_101_B'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F1_ROOM_102',
      name: 'Security & Operations Center',
      floor: 1,
      category: 'room',
      roomType: 'utility',
      roomNumber: '102',
      position: { x: -9, y: 0, z: 6 },
      dimensions: { x: 6, y: 3.5, z: 8 },
      capacity: 10,
      doorIds: ['F1_DOOR_102'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F1_ROOM_103',
      name: 'Northwest Administrative Office',
      floor: 1,
      category: 'room',
      roomType: 'office',
      roomNumber: '103',
      position: { x: -8, y: 0, z: -6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 18,
      doorIds: ['F1_DOOR_103'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F1_ROOM_104',
      name: 'Northeast Conference Room Alpha',
      floor: 1,
      category: 'room',
      roomType: 'conference',
      roomNumber: '104',
      position: { x: 8, y: 0, z: -6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 25,
      doorIds: ['F1_DOOR_104'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F1_ROOM_105',
      name: 'First Floor Restrooms',
      floor: 1,
      category: 'room',
      roomType: 'restroom',
      roomNumber: '105',
      position: { x: 9, y: 0, z: 6 },
      dimensions: { x: 6, y: 3.5, z: 8 },
      capacity: 8,
      doorIds: ['F1_DOOR_105'],
      isSprinklerEquipped: true,
    },

    // FLOOR 2
    {
      id: 'F2_ROOM_201',
      name: 'Open Workspace Alpha',
      floor: 2,
      category: 'room',
      roomType: 'office',
      roomNumber: '201',
      position: { x: -8, y: 4, z: -6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 35,
      doorIds: ['F2_DOOR_201'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F2_ROOM_202',
      name: 'Conference Room Beta',
      floor: 2,
      category: 'room',
      roomType: 'conference',
      roomNumber: '202',
      position: { x: 8, y: 4, z: -6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 20,
      doorIds: ['F2_DOOR_202'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F2_ROOM_203',
      name: 'Executive Office 203',
      floor: 2,
      category: 'room',
      roomType: 'office',
      roomNumber: '203',
      position: { x: -8, y: 4, z: 6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 8,
      doorIds: ['F2_DOOR_203'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F2_ROOM_204',
      name: 'Staff Breakroom & Pantry',
      floor: 2,
      category: 'room',
      roomType: 'utility',
      roomNumber: '204',
      position: { x: 8, y: 4, z: 6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 25,
      doorIds: ['F2_DOOR_204'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F2_ROOM_205',
      name: 'Second Floor Restrooms',
      floor: 2,
      category: 'room',
      roomType: 'restroom',
      roomNumber: '205',
      position: { x: -4, y: 4, z: 8 },
      dimensions: { x: 4, y: 3.5, z: 4 },
      capacity: 8,
      doorIds: ['F2_DOOR_205'],
      isSprinklerEquipped: true,
    },

    // FLOOR 3
    {
      id: 'F3_ROOM_301',
      name: 'Software Engineering Lab',
      floor: 3,
      category: 'room',
      roomType: 'lab',
      roomNumber: '301',
      position: { x: -8, y: 8, z: -6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 30,
      doorIds: ['F3_DOOR_301'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F3_ROOM_302',
      name: 'Hardware Testing Lab',
      floor: 3,
      category: 'room',
      roomType: 'lab',
      roomNumber: '302',
      position: { x: 8, y: 8, z: -6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 20,
      doorIds: ['F3_DOOR_302'],
      isSprinklerEquipped: true,
      hasHazardousMaterials: true,
    },
    {
      id: 'F3_ROOM_303',
      name: 'Datacenter & Server Room',
      floor: 3,
      category: 'room',
      roomType: 'server_room',
      roomNumber: '303',
      position: { x: -8, y: 8, z: 6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 6,
      doorIds: ['F3_DOOR_303'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F3_ROOM_304',
      name: 'Collaborative Commons',
      floor: 3,
      category: 'room',
      roomType: 'conference',
      roomNumber: '304',
      position: { x: 8, y: 8, z: 6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 25,
      doorIds: ['F3_DOOR_304'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F3_ROOM_305',
      name: 'Third Floor Restrooms',
      floor: 3,
      category: 'room',
      roomType: 'restroom',
      roomNumber: '305',
      position: { x: -4, y: 8, z: 8 },
      dimensions: { x: 4, y: 3.5, z: 4 },
      capacity: 8,
      doorIds: ['F3_DOOR_305'],
      isSprinklerEquipped: true,
    },

    // FLOOR 4
    {
      id: 'F4_ROOM_401',
      name: 'Product Design Studio',
      floor: 4,
      category: 'room',
      roomType: 'office',
      roomNumber: '401',
      position: { x: -8, y: 12, z: -6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 25,
      doorIds: ['F4_DOOR_401'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F4_ROOM_402',
      name: 'Executive Boardroom Gamma',
      floor: 4,
      category: 'room',
      roomType: 'conference',
      roomNumber: '402',
      position: { x: 8, y: 12, z: -6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 28,
      doorIds: ['F4_DOOR_402'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F4_ROOM_403',
      name: 'Research & Archive Vault',
      floor: 4,
      category: 'room',
      roomType: 'storage',
      roomNumber: '403',
      position: { x: -8, y: 12, z: 6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 10,
      doorIds: ['F4_DOOR_403'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F4_ROOM_404',
      name: 'Strategy War Room',
      floor: 4,
      category: 'room',
      roomType: 'conference',
      roomNumber: '404',
      position: { x: 8, y: 12, z: 6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 15,
      doorIds: ['F4_DOOR_404'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F4_ROOM_405',
      name: 'Fourth Floor Restrooms',
      floor: 4,
      category: 'room',
      roomType: 'restroom',
      roomNumber: '405',
      position: { x: -4, y: 12, z: 8 },
      dimensions: { x: 4, y: 3.5, z: 4 },
      capacity: 8,
      doorIds: ['F4_DOOR_405'],
      isSprinklerEquipped: true,
    },

    // FLOOR 5
    {
      id: 'F5_ROOM_501',
      name: 'CEO Executive Suite',
      floor: 5,
      category: 'room',
      roomType: 'office',
      roomNumber: '501',
      position: { x: -8, y: 16, z: -6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 12,
      doorIds: ['F5_DOOR_501'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F5_ROOM_502',
      name: 'C-Suite Briefing Center',
      floor: 5,
      category: 'room',
      roomType: 'conference',
      roomNumber: '502',
      position: { x: 8, y: 16, z: -6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 22,
      doorIds: ['F5_DOOR_502'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F5_ROOM_503',
      name: 'Observation & Terrace Lounge',
      floor: 5,
      category: 'room',
      roomType: 'office',
      roomNumber: '503',
      position: { x: -8, y: 16, z: 6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 20,
      doorIds: ['F5_DOOR_503'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F5_ROOM_504',
      name: 'Investor Relations Chamber',
      floor: 5,
      category: 'room',
      roomType: 'conference',
      roomNumber: '504',
      position: { x: 8, y: 16, z: 6 },
      dimensions: { x: 8, y: 3.5, z: 6 },
      capacity: 16,
      doorIds: ['F5_DOOR_504'],
      isSprinklerEquipped: true,
    },
    {
      id: 'F5_ROOM_505',
      name: 'Fifth Floor Restrooms',
      floor: 5,
      category: 'room',
      roomType: 'restroom',
      roomNumber: '505',
      position: { x: -4, y: 16, z: 8 },
      dimensions: { x: 4, y: 3.5, z: 4 },
      capacity: 8,
      doorIds: ['F5_DOOR_505'],
      isSprinklerEquipped: true,
    },
  ];
  return rooms;
};

// Generate corridor network for all 5 floors
const generateCorridors = (): {
  segments: CorridorSegment[];
  junctions: BuildingJunction[];
} => {
  const segments: CorridorSegment[] = [];
  const junctions: BuildingJunction[] = [];

  const floors: FloorId[] = [1, 2, 3, 4, 5];

  floors.forEach((floor) => {
    const y = getFloorElevation(floor);

    // Junctions
    const jCentral: BuildingJunction = {
      id: `F${floor}_JUNC_CENTRAL`,
      name: `Floor ${floor} Central Junction`,
      floor,
      category: 'junction',
      position: { x: 0, y, z: 0 },
      dimensions: { x: 2.5, y: 3.5, z: 2.5 },
      radius: 1.5,
      connectedSegmentIds: [
        `F${floor}_CORR_NORTH`,
        `F${floor}_CORR_SOUTH`,
        `F${floor}_CORR_WEST`,
        `F${floor}_CORR_EAST`,
      ],
    };

    const jNorth: BuildingJunction = {
      id: `F${floor}_JUNC_NORTH`,
      name: `Floor ${floor} North Junction`,
      floor,
      category: 'junction',
      position: { x: 0, y, z: -8 },
      dimensions: { x: 2.5, y: 3.5, z: 2.5 },
      radius: 1.5,
      connectedSegmentIds: [`F${floor}_CORR_NORTH`],
    };

    const jSouth: BuildingJunction = {
      id: `F${floor}_JUNC_SOUTH`,
      name: `Floor ${floor} South Junction`,
      floor,
      category: 'junction',
      position: { x: 0, y, z: 8 },
      dimensions: { x: 2.5, y: 3.5, z: 2.5 },
      radius: 1.5,
      connectedSegmentIds: [`F${floor}_CORR_SOUTH`],
    };

    const jWest: BuildingJunction = {
      id: `F${floor}_JUNC_WEST`,
      name: `Floor ${floor} West Stairway Junction`,
      floor,
      category: 'junction',
      position: { x: -14, y, z: 0 },
      dimensions: { x: 2.5, y: 3.5, z: 2.5 },
      radius: 1.5,
      connectedSegmentIds: [`F${floor}_CORR_WEST`],
    };

    const jEast: BuildingJunction = {
      id: `F${floor}_JUNC_EAST`,
      name: `Floor ${floor} East Stairway Junction`,
      floor,
      category: 'junction',
      position: { x: 14, y, z: 0 },
      dimensions: { x: 2.5, y: 3.5, z: 2.5 },
      radius: 1.5,
      connectedSegmentIds: [`F${floor}_CORR_EAST`],
    };

    junctions.push(jCentral, jNorth, jSouth, jWest, jEast);

    // Corridor Segments
    segments.push(
      {
        id: `F${floor}_CORR_NORTH`,
        name: `Floor ${floor} North Corridor`,
        floor,
        category: 'corridor_segment',
        position: { x: 0, y, z: -4 },
        dimensions: { x: 2.4, y: 3.5, z: 8 },
        width: 2.4,
        startPoint: { x: 0, y, z: 0 },
        endPoint: { x: 0, y, z: -8 },
        connectedJunctionIds: [`F${floor}_JUNC_CENTRAL`, `F${floor}_JUNC_NORTH`],
      },
      {
        id: `F${floor}_CORR_SOUTH`,
        name: `Floor ${floor} South Corridor`,
        floor,
        category: 'corridor_segment',
        position: { x: 0, y, z: 4 },
        dimensions: { x: 2.4, y: 3.5, z: 8 },
        width: 2.4,
        startPoint: { x: 0, y, z: 0 },
        endPoint: { x: 0, y, z: 8 },
        connectedJunctionIds: [`F${floor}_JUNC_CENTRAL`, `F${floor}_JUNC_SOUTH`],
      },
      {
        id: `F${floor}_CORR_WEST`,
        name: `Floor ${floor} West Corridor Wing`,
        floor,
        category: 'corridor_segment',
        position: { x: -7, y, z: 0 },
        dimensions: { x: 14, y: 3.5, z: 2.2 },
        width: 2.2,
        startPoint: { x: 0, y, z: 0 },
        endPoint: { x: -14, y, z: 0 },
        connectedJunctionIds: [`F${floor}_JUNC_CENTRAL`, `F${floor}_JUNC_WEST`],
      },
      {
        id: `F${floor}_CORR_EAST`,
        name: `Floor ${floor} East Corridor Wing`,
        floor,
        category: 'corridor_segment',
        position: { x: 7, y, z: 0 },
        dimensions: { x: 14, y: 3.5, z: 2.2 },
        width: 2.2,
        startPoint: { x: 0, y, z: 0 },
        endPoint: { x: 14, y, z: 0 },
        connectedJunctionIds: [`F${floor}_JUNC_CENTRAL`, `F${floor}_JUNC_EAST`],
      }
    );
  });

  return { segments, junctions };
};

// Generate Doors connecting rooms, stairs, and exits
const generateDoors = (): BuildingDoor[] => {
  const doors: BuildingDoor[] = [];
  const floors: FloorId[] = [1, 2, 3, 4, 5];

  floors.forEach((floor) => {
    const y = getFloorElevation(floor);

    // Common floor doors
    if (floor === 1) {
      doors.push(
        {
          id: 'F1_DOOR_101_A',
          name: 'Main Lobby North Door',
          floor: 1,
          category: 'door',
          position: { x: 0, y, z: 2 },
          dimensions: { x: 1.8, y: 2.4, z: 0.3 },
          connectedFromId: 'F1_ROOM_101',
          connectedToId: 'F1_CORR_SOUTH',
          width: 1.8,
          isFireRated: true,
          isEmergencyExitDoor: true,
          isLocked: false,
          isADACompliant: true,
        },
        {
          id: 'F1_DOOR_101_B',
          name: 'Main Lobby South Exit Door',
          floor: 1,
          category: 'door',
          position: { x: 0, y, z: 10 },
          dimensions: { x: 2.2, y: 2.4, z: 0.3 },
          connectedFromId: 'F1_ROOM_101',
          connectedToId: 'F1_EXIT_SOUTH',
          width: 2.2,
          isFireRated: true,
          isEmergencyExitDoor: true,
          isLocked: false,
          isADACompliant: true,
        },
        {
          id: 'F1_DOOR_102',
          name: 'Security Center Access Door',
          floor: 1,
          category: 'door',
          position: { x: -6, y, z: 4 },
          dimensions: { x: 1.0, y: 2.2, z: 0.3 },
          connectedFromId: 'F1_ROOM_102',
          connectedToId: 'F1_CORR_SOUTH',
          width: 1.0,
          isFireRated: true,
          isEmergencyExitDoor: false,
          isLocked: false,
          isADACompliant: true,
        },
        {
          id: 'F1_DOOR_103',
          name: 'Admin Office 103 Door',
          floor: 1,
          category: 'door',
          position: { x: -4, y, z: -6 },
          dimensions: { x: 1.0, y: 2.2, z: 0.3 },
          connectedFromId: 'F1_ROOM_103',
          connectedToId: 'F1_CORR_NORTH',
          width: 1.0,
          isFireRated: false,
          isEmergencyExitDoor: false,
          isLocked: false,
          isADACompliant: true,
        },
        {
          id: 'F1_DOOR_104',
          name: 'Conference Alpha 104 Door',
          floor: 1,
          category: 'door',
          position: { x: 4, y, z: -6 },
          dimensions: { x: 1.2, y: 2.2, z: 0.3 },
          connectedFromId: 'F1_ROOM_104',
          connectedToId: 'F1_CORR_NORTH',
          width: 1.2,
          isFireRated: false,
          isEmergencyExitDoor: false,
          isLocked: false,
          isADACompliant: true,
        },
        {
          id: 'F1_DOOR_105',
          name: 'Floor 1 Restrooms Door',
          floor: 1,
          category: 'door',
          position: { x: 6, y, z: 4 },
          dimensions: { x: 1.0, y: 2.2, z: 0.3 },
          connectedFromId: 'F1_ROOM_105',
          connectedToId: 'F1_CORR_SOUTH',
          width: 1.0,
          isFireRated: false,
          isEmergencyExitDoor: false,
          isLocked: false,
          isADACompliant: true,
        },
        // Ground Exits Doors
        {
          id: 'F1_DOOR_EXIT_NORTH',
          name: 'North Ground Discharge Exit Door',
          floor: 1,
          category: 'door',
          position: { x: 0, y, z: -10 },
          dimensions: { x: 2.0, y: 2.4, z: 0.3 },
          connectedFromId: 'F1_JUNC_NORTH',
          connectedToId: 'F1_EXIT_NORTH',
          width: 2.0,
          isFireRated: true,
          isEmergencyExitDoor: true,
          isLocked: false,
          isADACompliant: true,
        }
      );
    } else {
      // Floors 2 to 5 standard doors
      const numPrefix = floor * 100;
      doors.push(
        {
          id: `F${floor}_DOOR_${numPrefix + 1}`,
          name: `Room ${numPrefix + 1} Door`,
          floor,
          category: 'door',
          position: { x: -4, y, z: -6 },
          dimensions: { x: 1.0, y: 2.2, z: 0.3 },
          connectedFromId: `F${floor}_ROOM_${numPrefix + 1}`,
          connectedToId: `F${floor}_CORR_NORTH`,
          width: 1.0,
          isFireRated: false,
          isEmergencyExitDoor: false,
          isLocked: false,
          isADACompliant: true,
        },
        {
          id: `F${floor}_DOOR_${numPrefix + 2}`,
          name: `Room ${numPrefix + 2} Door`,
          floor,
          category: 'door',
          position: { x: 4, y, z: -6 },
          dimensions: { x: 1.0, y: 2.2, z: 0.3 },
          connectedFromId: `F${floor}_ROOM_${numPrefix + 2}`,
          connectedToId: `F${floor}_CORR_NORTH`,
          width: 1.0,
          isFireRated: floor === 3, // Datacenter/Lab fire rated
          isEmergencyExitDoor: false,
          isLocked: false,
          isADACompliant: true,
        },
        {
          id: `F${floor}_DOOR_${numPrefix + 3}`,
          name: `Room ${numPrefix + 3} Door`,
          floor,
          category: 'door',
          position: { x: -4, y, z: 6 },
          dimensions: { x: 1.0, y: 2.2, z: 0.3 },
          connectedFromId: `F${floor}_ROOM_${numPrefix + 3}`,
          connectedToId: `F${floor}_CORR_SOUTH`,
          width: 1.0,
          isFireRated: floor === 3, // Datacenter
          isEmergencyExitDoor: false,
          isLocked: false,
          isADACompliant: true,
        },
        {
          id: `F${floor}_DOOR_${numPrefix + 4}`,
          name: `Room ${numPrefix + 4} Door`,
          floor,
          category: 'door',
          position: { x: 4, y, z: 6 },
          dimensions: { x: 1.0, y: 2.2, z: 0.3 },
          connectedFromId: `F${floor}_ROOM_${numPrefix + 4}`,
          connectedToId: `F${floor}_CORR_SOUTH`,
          width: 1.0,
          isFireRated: false,
          isEmergencyExitDoor: false,
          isLocked: false,
          isADACompliant: true,
        },
        {
          id: `F${floor}_DOOR_${numPrefix + 5}`,
          name: `Floor ${floor} Restrooms Door`,
          floor,
          category: 'door',
          position: { x: -2, y, z: 7.5 },
          dimensions: { x: 1.0, y: 2.2, z: 0.3 },
          connectedFromId: `F${floor}_ROOM_${numPrefix + 5}`,
          connectedToId: `F${floor}_CORR_SOUTH`,
          width: 1.0,
          isFireRated: false,
          isEmergencyExitDoor: false,
          isLocked: false,
          isADACompliant: true,
        }
      );
    }

    // Stair Doors on each floor
    doors.push(
      {
        id: `F${floor}_DOOR_STAIR_WEST`,
        name: `Floor ${floor} West Stairwell Fire Door`,
        floor,
        category: 'door',
        position: { x: -14.5, y, z: -2 },
        dimensions: { x: 1.2, y: 2.3, z: 0.3 },
        connectedFromId: `F${floor}_JUNC_WEST`,
        connectedToId: `STAIR_WEST_LANDING_F${floor}`,
        width: 1.2,
        isFireRated: true,
        isEmergencyExitDoor: true,
        isLocked: false,
        isADACompliant: false, // Stair door leads to stairs (non-wheelchair egress)
      },
      {
        id: `F${floor}_DOOR_STAIR_EAST`,
        name: `Floor ${floor} East Stairwell Fire Door`,
        floor,
        category: 'door',
        position: { x: 14.5, y, z: 2 },
        dimensions: { x: 1.2, y: 2.3, z: 0.3 },
        connectedFromId: `F${floor}_JUNC_EAST`,
        connectedToId: `STAIR_EAST_LANDING_F${floor}`,
        width: 1.2,
        isFireRated: true,
        isEmergencyExitDoor: true,
        isLocked: false,
        isADACompliant: false,
      }
    );
  });

  return doors;
};

// Emergency Staircases spanning F1 to F5
const generateStairs = (): EmergencyStaircase[] => {
  const stairWest: EmergencyStaircase = {
    id: 'STAIR_WEST',
    name: 'Emergency Staircase West (Pressurized)',
    floor: 1,
    category: 'emergency_staircase',
    stairId: 'STAIR_WEST',
    connectedFloors: [1, 2, 3, 4, 5],
    isPressurized: true,
    width: 1.3,
    position: { x: -15, y: 8, z: -4 },
    dimensions: { x: 3.5, y: 20, z: 5 },
    floorLandings: [
      { floor: 1, landingPosition: { x: -15, y: 0, z: -4 }, doorId: 'F1_DOOR_STAIR_WEST' },
      { floor: 2, landingPosition: { x: -15, y: 4, z: -4 }, doorId: 'F2_DOOR_STAIR_WEST' },
      { floor: 3, landingPosition: { x: -15, y: 8, z: -4 }, doorId: 'F3_DOOR_STAIR_WEST' },
      { floor: 4, landingPosition: { x: -15, y: 12, z: -4 }, doorId: 'F4_DOOR_STAIR_WEST' },
      { floor: 5, landingPosition: { x: -15, y: 16, z: -4 }, doorId: 'F5_DOOR_STAIR_WEST' },
    ],
  };

  const stairEast: EmergencyStaircase = {
    id: 'STAIR_EAST',
    name: 'Emergency Staircase East (Pressurized)',
    floor: 1,
    category: 'emergency_staircase',
    stairId: 'STAIR_EAST',
    connectedFloors: [1, 2, 3, 4, 5],
    isPressurized: true,
    width: 1.3,
    position: { x: 15, y: 8, z: 4 },
    dimensions: { x: 3.5, y: 20, z: 5 },
    floorLandings: [
      { floor: 1, landingPosition: { x: 15, y: 0, z: 4 }, doorId: 'F1_DOOR_STAIR_EAST' },
      { floor: 2, landingPosition: { x: 15, y: 4, z: 4 }, doorId: 'F2_DOOR_STAIR_EAST' },
      { floor: 3, landingPosition: { x: 15, y: 8, z: 4 }, doorId: 'F3_DOOR_STAIR_EAST' },
      { floor: 4, landingPosition: { x: 15, y: 12, z: 4 }, doorId: 'F4_DOOR_STAIR_EAST' },
      { floor: 5, landingPosition: { x: 15, y: 16, z: 4 }, doorId: 'F5_DOOR_STAIR_EAST' },
    ],
  };

  return [stairWest, stairEast];
};

// Elevators (explicitly unsafe for evacuation)
const generateElevators = (): BuildingElevator[] => {
  return [
    {
      id: 'ELEV_CENTRAL',
      name: 'Central Passenger Elevator Shaft',
      floor: 1,
      category: 'elevator',
      elevatorId: 'ELEV_CENTRAL',
      connectedFloors: [1, 2, 3, 4, 5],
      isSafeEvacuationRoute: false,
      shaftPosition: { x: -2.5, y: 8, z: 2 },
      position: { x: -2.5, y: 8, z: 2 },
      dimensions: { x: 2.8, y: 20, z: 2.8 },
    },
  ];
};

// Building Exits (Ground floor discharge points)
const generateExits = (): BuildingExit[] => {
  return [
    {
      id: 'F1_EXIT_NORTH',
      name: 'Ground Discharge Exit North (Muster Point A)',
      floor: 1,
      category: 'exit',
      exitCode: 'EXIT_NORTH',
      dischargeType: 'exterior_muster_point',
      isWheelchairAccessible: true,
      width: 2.4,
      position: { x: 0, y: 0, z: -12 },
      dimensions: { x: 2.4, y: 2.6, z: 1.0 },
    },
    {
      id: 'F1_EXIT_SOUTH',
      name: 'Main Public Discharge Exit South (Courtyard)',
      floor: 1,
      category: 'exit',
      exitCode: 'EXIT_SOUTH',
      dischargeType: 'avenue_courtyard',
      isWheelchairAccessible: true,
      width: 2.8,
      position: { x: 0, y: 0, z: 12 },
      dimensions: { x: 2.8, y: 2.6, z: 1.0 },
    },
    {
      id: 'F1_EXIT_WEST',
      name: 'West Stairway Exterior Discharge Door',
      floor: 1,
      category: 'exit',
      exitCode: 'EXIT_WEST',
      dischargeType: 'parking_lot',
      isWheelchairAccessible: false, // Step threshold
      width: 1.4,
      position: { x: -17, y: 0, z: -4 },
      dimensions: { x: 1.4, y: 2.4, z: 1.0 },
    },
    {
      id: 'F1_EXIT_EAST',
      name: 'East Stairway Exterior Discharge Door',
      floor: 1,
      category: 'exit',
      exitCode: 'EXIT_EAST',
      dischargeType: 'parking_lot',
      isWheelchairAccessible: false,
      width: 1.4,
      position: { x: 17, y: 0, z: 4 },
      dimensions: { x: 1.4, y: 2.4, z: 1.0 },
    },
  ];
};

// Assembled Building Asset Registry Singleton
const { segments: corridorSegments, junctions } = generateCorridors();

export const buildingRegistry: BuildingAssetRegistry = {
  id: 'REGISTRY_BLDG_EVAC_01',
  name: 'Five-Story High-Tech Research Facility',
  totalFloors: 5,
  floorHeight: FLOOR_HEIGHT,
  buildingBounds: {
    width: 36, // -18 to +18
    height: 20, // 5 * 4m
    depth: 26, // -13 to +13
  },
  rooms: generateRooms(),
  corridorSegments,
  junctions,
  doors: generateDoors(),
  stairs: generateStairs(),
  elevators: generateElevators(),
  exits: generateExits(),
};
