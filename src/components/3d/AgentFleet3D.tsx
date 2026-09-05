/**
 * 3D Agent Fleet Rendering Component
 * Displays 100-200 simulated occupants with real-time physical kinematics and behavior-coded shaders.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useEvacuateStore } from '../../store/useEvacuateStore';
import { SimulatedAgent } from '../../simulation/types';

export const AgentFleet3D: React.FC = () => {
  const {
    agents,
    activeFloor,
    selectedAgentId,
    setSelectedAgentId,
    showAgents,
  } = useEvacuateStore();

  if (!showAgents) return null;

  // Filter agents matching the currently visible floor
  const visibleAgents = useMemo(() => {
    return agents.filter((agent) => {
      // If evacuated and on ground level (floor 1), show them outside if activeFloor is 1 or all
      if (agent.status === 'evacuated') {
        return activeFloor === 'all' || activeFloor === 1;
      }
      if (activeFloor === 'all') return true;
      return agent.currentFloor === activeFloor;
    });
  }, [agents, activeFloor]);

  return (
    <group name="simulated-agent-fleet">
      {visibleAgents.map((agent) => {
        const isSelected = selectedAgentId === agent.id;
        const isEvacuated = agent.status === 'evacuated';
        const isReacting = agent.status === 'reacting';
        const isQueued = agent.status === 'queued';

        return (
          <group
            key={agent.id}
            position={[agent.position.x, agent.position.y + 0.1, agent.position.z]}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAgentId(agent.id);
            }}
          >
            {/* Selection Highlight Beacon */}
            {isSelected && (
              <mesh position={[0, 1.4, 0]}>
                <ringGeometry args={[0.3, 0.4, 16]} />
                <meshBasicMaterial color="#ec4899" side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Agent Body (Cylinder / Capsule) */}
            <mesh position={[0, 0.45, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.7, 10]} />
              <meshStandardMaterial
                color={isSelected ? '#ec4899' : agent.color}
                emissive={
                  isReacting
                    ? '#f59e0b'
                    : isQueued
                    ? '#f97316'
                    : isEvacuated
                    ? '#22c55e'
                    : agent.color
                }
                emissiveIntensity={
                  isSelected ? 0.8 : isReacting ? 0.4 : isQueued ? 0.35 : 0.2
                }
                roughness={0.4}
                metalness={0.2}
                transparent={isEvacuated}
                opacity={isEvacuated ? 0.6 : 1.0}
              />
            </mesh>

            {/* Agent Head */}
            <mesh position={[0, 0.9, 0]}>
              <sphereGeometry args={[0.13, 10, 10]} />
              <meshStandardMaterial
                color={isSelected ? '#ec4899' : '#f8fafc'}
                roughness={0.3}
              />
            </mesh>

            {/* Wheelchair base indicator for mobilityType === 'wheelchair' */}
            {agent.mobilityType === 'wheelchair' && (
              <mesh position={[0, 0.15, 0]}>
                <boxGeometry args={[0.45, 0.2, 0.45]} />
                <meshStandardMaterial color="#0284c7" wireframe />
              </mesh>
            )}

            {/* Reaction Delay Ring (Pulsing amber ring while reacting) */}
            {isReacting && (
              <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.25, 0.35, 16]} />
                <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Queued Indicator (Amber marker overhead) */}
            {isQueued && (
              <mesh position={[0, 1.2, 0]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial color="#f97316" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};
