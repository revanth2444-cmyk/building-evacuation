/**
 * 3D Graph Overlay Component
 * Renders Graph Nodes, Edges, and the Computed A* Evacuation Route in 3D world space.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useEvacuateStore } from '../../store/useEvacuateStore';
import { GraphNodeType } from '../../graph/types';
import { FloorId } from '../../types/building';

// Color coding for Graph Nodes based on category
export const getNodeColor = (type: GraphNodeType): string => {
  switch (type) {
    case 'exit':
      return '#22c55e'; // Bright green for safe exit
    case 'emergency_staircase':
    case 'stair_landing':
      return '#f59e0b'; // Amber for vertical stair egress
    case 'door':
      return '#3b82f6'; // Blue for doors
    case 'room':
      return '#06b6d4'; // Cyan for rooms
    case 'junction':
      return '#a855f7'; // Purple for corridor junctions
    case 'corridor':
    case 'corridor_segment':
      return '#64748b'; // Slate for corridor segments
    case 'elevator':
      return '#ef4444'; // Red for unsafe elevator
    default:
      return '#94a3b8';
  }
};

export const GraphOverlay3D: React.FC = () => {
  const {
    graph,
    activeFloor,
    selectedNodeId,
    selectedEdgeId,
    computedRoute,
    showGraphNodes,
    showGraphEdges,
    showRoutePath,
    setSelectedNode,
    setSelectedEdge,
  } = useEvacuateStore();

  // Filter nodes according to active floor
  const visibleNodes = useMemo(() => {
    if (!showGraphNodes) return [];
    return Array.from(graph.nodes.values()).filter((node) => {
      if (activeFloor === 'all') return true;
      return node.floor === activeFloor;
    });
  }, [graph, activeFloor, showGraphNodes]);

  // Filter edges according to active floor (avoid duplicate rendering of bidirectional pairs)
  const visibleEdges = useMemo(() => {
    if (!showGraphEdges) return [];
    const renderedSet = new Set<string>();
    const edgesList: {
      id: string;
      fromPos: [number, number, number];
      toPos: [number, number, number];
      isBlocked: boolean;
      hazardState: string;
      isVertical: boolean;
      isSelected: boolean;
    }[] = [];

    for (const edge of graph.edges.values()) {
      const fromNode = graph.nodes.get(edge.fromNodeId);
      const toNode = graph.nodes.get(edge.toNodeId);
      if (!fromNode || !toNode) continue;

      // Filter by floor
      if (activeFloor !== 'all') {
        if (fromNode.floor !== activeFloor && toNode.floor !== activeFloor) {
          continue;
        }
      }

      // Check duplicate counterpart
      const canonicalKey = [edge.fromNodeId, edge.toNodeId].sort().join('__');
      if (renderedSet.has(canonicalKey)) continue;
      renderedSet.add(canonicalKey);

      edgesList.push({
        id: edge.id,
        fromPos: [fromNode.position.x, fromNode.position.y + 0.3, fromNode.position.z],
        toPos: [toNode.position.x, toNode.position.y + 0.3, toNode.position.z],
        isBlocked: edge.isBlocked,
        hazardState: edge.hazardState,
        isVertical: !!edge.isVerticalTransition,
        isSelected: selectedEdgeId === edge.id,
      });
    }

    return edgesList;
  }, [graph, activeFloor, showGraphEdges, selectedEdgeId]);

  // Compute 3D tube geometry for the calculated A* route
  const routeCurvePoints = useMemo(() => {
    if (!showRoutePath || !computedRoute || !computedRoute.pathFound) return null;
    if (computedRoute.waypoints.length < 2) return null;

    const pts = computedRoute.waypoints.map(
      (p) => new THREE.Vector3(p.x, p.y + 0.45, p.z)
    );

    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
  }, [showRoutePath, computedRoute]);

  return (
    <group name="evac-graph-overlay">
      {/* 1. GRAPH EDGES */}
      {visibleEdges.map((edge) => {
        const from = new THREE.Vector3(...edge.fromPos);
        const to = new THREE.Vector3(...edge.toPos);
        const points = [from, to];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

        let color = '#38bdf8'; // light cyan
        let lineWidth = 2;
        if (edge.isBlocked) {
          color = '#ef4444'; // red
        } else if (edge.hazardState !== 'none') {
          color = '#f97316'; // orange
        } else if (edge.isVertical) {
          color = '#fbbf24'; // amber for stairs
        }

        if (edge.isSelected) {
          color = '#ec4899'; // pink for selected
        }

        return (
          <primitive
            key={edge.id}
            object={new THREE.Line(
              lineGeo,
              new THREE.LineBasicMaterial({
                color: new THREE.Color(color),
                linewidth: lineWidth,
                transparent: true,
                opacity: edge.isBlocked ? 0.4 : 0.85,
              })
            )}
            onClick={(e: { stopPropagation: () => void }) => {
              e.stopPropagation();
              setSelectedEdge(edge.id);
            }}
          />
        );
      })}

      {/* 2. GRAPH NODES */}
      {visibleNodes.map((node) => {
        const isSelected = selectedNodeId === node.id;
        const isRoutePoint =
          computedRoute?.nodeIds?.includes(node.id) ?? false;
        const color = getNodeColor(node.type);
        const radius = node.isExit ? 0.55 : node.type === 'room' ? 0.45 : 0.3;

        return (
          <mesh
            key={node.id}
            position={[node.position.x, node.position.y + 0.3, node.position.z]}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedNode(node.id);
            }}
          >
            <sphereGeometry args={[isSelected ? radius * 1.4 : radius, 16, 16]} />
            <meshStandardMaterial
              color={isSelected ? '#ec4899' : isRoutePoint ? '#22c55e' : color}
              emissive={isSelected ? '#ec4899' : isRoutePoint ? '#16a34a' : color}
              emissiveIntensity={isSelected ? 0.8 : isRoutePoint ? 0.6 : 0.25}
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
        );
      })}

      {/* 3. A* EVACUATION ROUTE HIGHLIGHT (Thick glowing tube + Waypoint pulses) */}
      {routeCurvePoints && (
        <group name="a-star-evacuation-route">
          {/* Glowing tube along route */}
          <mesh>
            <tubeGeometry args={[routeCurvePoints, 64, 0.18, 8, false]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#4ade80"
              emissiveIntensity={0.9}
              transparent
              opacity={0.9}
              roughness={0.2}
            />
          </mesh>

          {/* Waypoint beacons */}
          {computedRoute?.waypoints.map((wp, idx) => (
            <mesh
              key={`wp-${idx}`}
              position={[wp.x, wp.y + 0.45, wp.z]}
            >
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshStandardMaterial
                color={idx === 0 ? '#38bdf8' : idx === computedRoute.waypoints.length - 1 ? '#22c55e' : '#fbbf24'}
                emissive={idx === 0 ? '#38bdf8' : idx === computedRoute.waypoints.length - 1 ? '#22c55e' : '#fbbf24'}
                emissiveIntensity={1.0}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};
