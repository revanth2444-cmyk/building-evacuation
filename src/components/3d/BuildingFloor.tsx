/**
 * 3D Building Floor Architecture Component
 * Renders floor slabs, room envelopes, doors, corridors, stairs, and exits.
 */

import React from 'react';
import { buildingRegistry, getFloorElevation } from '../../data/buildingRegistry';
import { useEvacuateStore } from '../../store/useEvacuateStore';
import { FloorId } from '../../types/building';

interface BuildingFloorProps {
  floor: FloorId;
  isGhosted?: boolean;
}

export const BuildingFloor: React.FC<BuildingFloorProps> = ({ floor, isGhosted = false }) => {
  const { selectedObjectId, setSelectedObject } = useEvacuateStore();
  const y = getFloorElevation(floor);

  // Filter building registry items on this floor
  const rooms = buildingRegistry.rooms.filter((r) => r.floor === floor);
  const doors = buildingRegistry.doors.filter((d) => d.floor === floor);
  const corridors = buildingRegistry.corridorSegments.filter((c) => c.floor === floor);
  const junctions = buildingRegistry.junctions.filter((j) => j.floor === floor);
  const exits = buildingRegistry.exits.filter((e) => e.floor === floor);

  const opacityMultiplier = isGhosted ? 0.15 : 1.0;

  return (
    <group position={[0, y, 0]} name={`Floor-${floor}`}>
      {/* 1. STRUCTURAL FLOOR SLAB */}
      <mesh
        position={[0, -0.1, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          // Deselect or keep floor context
        }}
      >
        <boxGeometry args={[36, 0.2, 24]} />
        <meshStandardMaterial
          color={isGhosted ? '#0f172a' : '#1e293b'}
          roughness={0.8}
          metalness={0.1}
          transparent={isGhosted}
          opacity={isGhosted ? 0.2 : 0.9}
        />
      </mesh>

      {/* 2. CORRIDOR WALKWAYS */}
      {corridors.map((corr) => {
        const isSelected = selectedObjectId === corr.id;
        return (
          <mesh
            key={corr.id}
            position={[corr.position.x, 0.02, corr.position.z]}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedObject(corr.id);
            }}
          >
            <boxGeometry args={[corr.dimensions.x, 0.05, corr.dimensions.z]} />
            <meshStandardMaterial
              color={isSelected ? '#f43f5e' : '#334155'}
              roughness={0.6}
              transparent
              opacity={0.7 * opacityMultiplier}
            />
          </mesh>
        );
      })}

      {/* 3. JUNCTIONS */}
      {junctions.map((junc) => {
        const isSelected = selectedObjectId === junc.id;
        return (
          <mesh
            key={junc.id}
            position={[junc.position.x, 0.03, junc.position.z]}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedObject(junc.id);
            }}
          >
            <cylinderGeometry args={[junc.radius, junc.radius, 0.06, 16]} />
            <meshStandardMaterial
              color={isSelected ? '#ec4899' : '#475569'}
              roughness={0.5}
              transparent
              opacity={0.8 * opacityMultiplier}
            />
          </mesh>
        );
      })}

      {/* 4. ROOMS */}
      {rooms.map((room) => {
        const isSelected = selectedObjectId === room.id;

        // Room color tint by category
        let roomColor = '#0284c7'; // default light blue
        if (room.roomType === 'lobby') roomColor = '#059669'; // emerald
        if (room.roomType === 'conference') roomColor = '#7c3aed'; // violet
        if (room.roomType === 'lab') roomColor = '#ea580c'; // orange
        if (room.roomType === 'server_room') roomColor = '#dc2626'; // red
        if (room.roomType === 'restroom') roomColor = '#0d9488'; // teal

        return (
          <group
            key={room.id}
            position={[room.position.x, 0, room.position.z]}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedObject(room.id);
            }}
          >
            {/* Room Floor Pad */}
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[room.dimensions.x - 0.2, 0.04, room.dimensions.z - 0.2]} />
              <meshStandardMaterial
                color={isSelected ? '#ec4899' : roomColor}
                roughness={0.7}
                transparent
                opacity={(isSelected ? 0.85 : 0.35) * opacityMultiplier}
              />
            </mesh>

            {/* Room Translucent Boundary Walls (Low height to allow clear graph visualization) */}
            <mesh position={[0, 0.75, 0]}>
              <boxGeometry args={[room.dimensions.x, 1.5, room.dimensions.z]} />
              <meshStandardMaterial
                color={isSelected ? '#f43f5e' : '#38bdf8'}
                wireframe={false}
                transparent
                opacity={(isSelected ? 0.35 : 0.08) * opacityMultiplier}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* 5. DOORS */}
      {doors.map((door) => {
        const isSelected = selectedObjectId === door.id;
        return (
          <mesh
            key={door.id}
            position={[door.position.x, 1.1, door.position.z]}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedObject(door.id);
            }}
          >
            <boxGeometry args={[door.dimensions.x, door.dimensions.y, door.dimensions.z]} />
            <meshStandardMaterial
              color={isSelected ? '#ec4899' : door.isFireRated ? '#f59e0b' : '#3b82f6'}
              roughness={0.4}
              transparent
              opacity={0.75 * opacityMultiplier}
            />
          </mesh>
        );
      })}

      {/* 6. GROUND DISCHARGE EXITS (Floor 1) */}
      {exits.map((exit) => {
        const isSelected = selectedObjectId === exit.id;
        return (
          <group
            key={exit.id}
            position={[exit.position.x, 0.1, exit.position.z]}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedObject(exit.id);
            }}
          >
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[exit.dimensions.x, 0.1, exit.dimensions.z]} />
              <meshStandardMaterial
                color={isSelected ? '#ec4899' : '#22c55e'}
                emissive="#15803d"
                emissiveIntensity={0.6}
              />
            </mesh>
            {/* Exit Banner Archway */}
            <mesh position={[0, 1.3, 0]}>
              <boxGeometry args={[exit.dimensions.x, 2.4, 0.2]} />
              <meshStandardMaterial
                color="#22c55e"
                transparent
                opacity={0.4 * opacityMultiplier}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
