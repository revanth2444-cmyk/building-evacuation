/**
 * 3D Building Digital Twin & Computational Graph Scene
 * Renders the 5-story facility, stairwells, elevator shaft, and graph overlay with OrbitControls.
 */

import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { BuildingFloor } from './BuildingFloor';
import { GraphOverlay3D } from './GraphOverlay3D';
import { AgentFleet3D } from './AgentFleet3D';
import { useEvacuateStore } from '../../store/useEvacuateStore';
import { buildingRegistry } from '../../data/buildingRegistry';
import { FloorId } from '../../types/building';

export const BuildingScene: React.FC = () => {
  const {
    activeFloor,
    cameraPreset,
    showBuildingMesh,
    selectedObjectId,
    setSelectedObject,
  } = useEvacuateStore();

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  // Camera presets controller
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const controls = controlsRef.current;
    const camera = cameraRef.current;

    switch (cameraPreset) {
      case 'isometric':
        camera.position.set(38, 32, 42);
        controls.target.set(0, 8, 0);
        break;
      case 'top_down':
        camera.position.set(0, 52, 0.1);
        controls.target.set(0, 8, 0);
        break;
      case 'front':
        camera.position.set(0, 10, 48);
        controls.target.set(0, 8, 0);
        break;
      case 'perspective':
        camera.position.set(24, 18, 30);
        controls.target.set(0, 6, 0);
        break;
    }
    controls.update();
  }, [cameraPreset]);

  // Handle camera elevation adjustment when single floor is selected
  useEffect(() => {
    if (!controlsRef.current) return;
    if (activeFloor !== 'all') {
      const targetY = (activeFloor - 1) * 4.0 + 1.5;
      controlsRef.current.target.set(0, targetY, 0);
      controlsRef.current.update();
    } else {
      controlsRef.current.target.set(0, 8, 0);
      controlsRef.current.update();
    }
  }, [activeFloor]);

  const floors: FloorId[] = [1, 2, 3, 4, 5];

  return (
    <div className="w-full h-full relative bg-slate-950 select-none">
      <Canvas
        shadows
        className="w-full h-full"
        onPointerMissed={() => setSelectedObject(null)}
      >
        <PerspectiveCamera ref={cameraRef} makeDefault position={[38, 32, 42]} fov={45} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.06}
          maxPolarAngle={Math.PI / 2 - 0.02} // Don't clip under ground
          minDistance={10}
          maxDistance={120}
        />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[25, 45, 30]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-25, 30, -30]} intensity={0.4} />

        {/* Ground Plane Grid */}
        <Grid
          position={[0, -0.2, 0]}
          args={[100, 100]}
          cellColor="#334155"
          sectionColor="#0284c7"
          fadeDistance={80}
          cellThickness={0.6}
          sectionThickness={1.2}
        />

        {/* 1. ARCHITECTURAL FLOORS F1 - F5 */}
        {showBuildingMesh && (
          <group name="building-floors">
            {floors.map((floor) => {
              const isGhosted = activeFloor !== 'all' && activeFloor !== floor;
              // If active floor is selected, upper floors can be hidden to allow top-down inspection
              if (activeFloor !== 'all' && floor > activeFloor) {
                return null;
              }
              return (
                <BuildingFloor
                  key={`floor-${floor}`}
                  floor={floor}
                  isGhosted={isGhosted}
                />
              );
            })}

            {/* 2. EMERGENCY STAIRCASES (WEST & EAST) */}
            {buildingRegistry.stairs.map((stair) => {
              const isSelected = selectedObjectId === stair.id;
              return (
                <group
                  key={stair.id}
                  position={[stair.position.x, 0, stair.position.z]}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedObject(stair.id);
                  }}
                >
                  {/* Stairwell Enclosure (Glass / Wireframe column) */}
                  <mesh position={[0, 9.5, 0]}>
                    <boxGeometry args={[stair.dimensions.x, 20, stair.dimensions.z]} />
                    <meshStandardMaterial
                      color={isSelected ? '#ec4899' : '#f59e0b'}
                      transparent
                      opacity={isSelected ? 0.45 : 0.15}
                      wireframe={false}
                    />
                  </mesh>
                </group>
              );
            })}

            {/* 3. CENTRAL ELEVATOR SHAFT (EXPLICITLY UNSAFE FOR EVACUATION) */}
            {buildingRegistry.elevators.map((elev) => {
              const isSelected = selectedObjectId === elev.id;
              return (
                <group
                  key={elev.id}
                  position={[elev.position.x, 0, elev.position.z]}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedObject(elev.id);
                  }}
                >
                  <mesh position={[0, 9.5, 0]}>
                    <boxGeometry args={[elev.dimensions.x, 20, elev.dimensions.z]} />
                    <meshStandardMaterial
                      color={isSelected ? '#ec4899' : '#ef4444'}
                      transparent
                      opacity={isSelected ? 0.45 : 0.12}
                    />
                  </mesh>
                </group>
              );
            })}
          </group>
        )}

        {/* 4. 3D COMPUTATIONAL GRAPH OVERLAY */}
        <GraphOverlay3D />

        {/* 5. 3D AGENT-BASED OCCUPANT FLEET */}
        <AgentFleet3D />
      </Canvas>
    </div>
  );
};
