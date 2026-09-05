/**
 * 3D Object, Graph Entity, & Simulated Agent Inspector
 * Displays detailed digital twin metadata, computational node/edge mapping,
 * and comprehensive agent behavioral telemetry.
 */

import React from 'react';
import {
  MapPin,
  Maximize2,
  Users,
  Navigation,
  AlertTriangle,
  Flame,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  User,
  HeartPulse,
  Activity,
  Footprints,
} from 'lucide-react';
import { useEvacuateStore } from '../../store/useEvacuateStore';
import { DigitalTwinMapper } from '../../graph/mapping';
import { getNodeColor } from '../3d/GraphOverlay3D';
import { CapacityEngine } from '../../simulation/capacityEngine';

export const ObjectInspector: React.FC = () => {
  const {
    graph,
    agents,
    simulationMetrics,
    selectedObjectId,
    selectedNodeId,
    selectedEdgeId,
    selectedAgentId,
    setSelectedObject,
    setSelectedNode,
    setSelectedEdge,
    setSelectedAgentId,
    setRouteStartNode,
    setRouteTargetNode,
    calculateRoute,
    toggleEdgeBlocked,
    setEdgeHazard,
  } = useEvacuateStore();

  if (!selectedObjectId && !selectedNodeId && !selectedEdgeId && !selectedAgentId) {
    return null;
  }

  // Active agent (if any)
  const activeAgent = selectedAgentId ? agents.find((a) => a.id === selectedAgentId) : null;
  // Active node (if any)
  const activeNode = selectedNodeId ? graph.nodes.get(selectedNodeId) : null;
  // Active edge (if any)
  const activeEdge = selectedEdgeId ? graph.edges.get(selectedEdgeId) : null;

  // Active object's nodes and edges
  const mappedNodes = selectedObjectId
    ? DigitalTwinMapper.getNodesForObject(graph, selectedObjectId)
    : [];
  const mappedEdges = selectedObjectId
    ? DigitalTwinMapper.getEdgesForObject(graph, selectedObjectId)
    : [];

  const handleSetStart = (nodeId: string) => {
    setRouteStartNode(nodeId);
    calculateRoute();
  };

  const handleSetTarget = (nodeId: string) => {
    setRouteTargetNode(nodeId);
    calculateRoute();
  };

  return (
    <div className="absolute bottom-6 left-4 z-10 w-96 max-h-[70vh] overflow-y-auto p-4 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl text-white font-sans text-xs select-none">
      {/* Header with Close */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            {activeAgent
              ? 'SIMULATED AGENT INSPECTOR'
              : activeEdge
              ? 'GRAPH EDGE INSPECTOR'
              : activeNode
              ? 'GRAPH NODE INSPECTOR'
              : 'DIGITAL TWIN INSPECTOR'}
          </span>
        </div>
        <button
          onClick={() => {
            setSelectedObject(null);
            setSelectedNode(null);
            setSelectedEdge(null);
            setSelectedAgentId(null);
          }}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 1. SIMULATED AGENT VIEW */}
      {activeAgent && (
        <div className="mt-3 space-y-3">
          {/* Agent Title & Profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-full"
                style={{ backgroundColor: activeAgent.color }}
              />
              <div>
                <span className="font-mono font-bold text-white text-sm">
                  {activeAgent.id}
                </span>
                <div className="text-[10px] text-slate-400">{activeAgent.name}</div>
              </div>
            </div>
            <span
              className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                activeAgent.status === 'evacuated'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : activeAgent.status === 'evacuating'
                  ? 'bg-sky-950 text-sky-300 border-sky-800 animate-pulse'
                  : activeAgent.status === 'queued'
                  ? 'bg-orange-950 text-orange-300 border-orange-800'
                  : activeAgent.status === 'reacting'
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {activeAgent.status}
            </span>
          </div>

          {/* Core Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 text-[10px]">CURRENT FLOOR</span>
              <div className="text-white font-bold">Floor {activeAgent.currentFloor}</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">MOBILITY TYPE</span>
              <div className="text-sky-300 font-bold uppercase">{activeAgent.mobilityType}</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">WALKING SPEED</span>
              <div className="text-white font-bold">{activeAgent.currentSpeed} m/s</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">REACTION TIME</span>
              <div className="text-white font-bold">
                {activeAgent.reactionRemaining > 0
                  ? `${activeAgent.reactionRemaining}s remaining`
                  : `${activeAgent.reactionTime}s (cleared)`}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">AWARENESS</span>
              <div className="text-emerald-400 font-bold">
                {(activeAgent.awareness * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">PANIC LEVEL</span>
              <div
                className={`font-bold ${
                  activeAgent.panicLevel > 0.6 ? 'text-red-400' : 'text-slate-300'
                }`}
              >
                {(activeAgent.panicLevel * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">COMPLIANCE</span>
              <div className="text-white font-bold">
                {(activeAgent.compliance * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">DISTANCE TRAVELED</span>
              <div className="text-white font-bold">{activeAgent.distanceTraveled} m</div>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 text-[10px]">3D POSITION</span>
              <div className="text-slate-300 text-[10px]">
                X: {activeAgent.position.x}m, Y: {activeAgent.position.y}m, Z: {activeAgent.position.z}m
              </div>
            </div>
          </div>

          {/* Route & Target Exit */}
          <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700 space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">DESIGNATED EXIT:</span>
              <span className="text-emerald-400 font-bold">{activeAgent.targetExitId}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">WAYPOINT PROGRESS:</span>
              <span className="text-sky-300">
                {activeAgent.currentWaypointIndex} / {activeAgent.routeWaypoints.length} nodes
              </span>
            </div>
            {/* Queue & Capacity Telemetry */}
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700">
              <span className="text-slate-400">QUEUE WAIT TIME:</span>
              <span className={activeAgent.queueWaitTime > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                {activeAgent.queueWaitTime}s
              </span>
            </div>
            {activeAgent.currentQueueId && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">QUEUED AT:</span>
                <span className="text-amber-300 font-semibold">{activeAgent.currentQueueId}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">CONGESTION LEVEL:</span>
              <span
                className={`font-bold ${
                  activeAgent.currentCongestionState === 'CRITICAL'
                    ? 'text-red-400'
                    : activeAgent.currentCongestionState === 'HIGH'
                    ? 'text-amber-400'
                    : activeAgent.currentCongestionState === 'MEDIUM'
                    ? 'text-sky-400'
                    : 'text-slate-400'
                }`}
              >
                {activeAgent.currentCongestionState}
              </span>
            </div>
            {activeAgent.evacuationTime && (
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700">
                <span className="text-slate-400">TOTAL EVACUATION TIME:</span>
                <span className="text-emerald-400 font-bold">
                  {activeAgent.evacuationTime} seconds
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. GRAPH EDGE VIEW */}
      {!activeAgent && activeEdge && (
        <div className="mt-3 space-y-3">
          <div>
            <span className="font-mono text-[10px] text-slate-400">EDGE ID</span>
            <div className="font-mono text-xs font-bold text-indigo-400 break-all">
              {activeEdge.id}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2.5 rounded-lg border border-slate-800 font-mono">
            <div>
              <span className="text-slate-400 text-[10px]">DISTANCE</span>
              <div className="text-white font-bold">{activeEdge.distance} m</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">TRAVERSAL TIME</span>
              <div className="text-white font-bold">{activeEdge.traversalTime} s</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">CLEAR WIDTH</span>
              <div className="text-white font-bold">{activeEdge.width} m</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">CAPACITY</span>
              <div className="text-white font-bold">{activeEdge.capacity} /min</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">ACCESSIBLE (ADA)</span>
              <div className={activeEdge.accessibility ? 'text-emerald-400' : 'text-amber-400'}>
                {activeEdge.accessibility ? 'YES' : 'NO (STAIRS)'}
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">STATUS</span>
              <div className={activeEdge.isBlocked ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                {activeEdge.isBlocked ? 'BLOCKED' : 'PASSABLE'}
              </div>
            </div>
          </div>

          {/* Fault & Simulation Controls */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Edge Simulation Overrides</span>
            <div className="flex gap-2">
              <button
                onClick={() => toggleEdgeBlocked(activeEdge.id)}
                className={`flex-1 py-1.5 px-2 rounded font-mono text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  activeEdge.isBlocked
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {activeEdge.isBlocked ? 'UNBLOCK EDGE' : 'BLOCK EDGE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. GRAPH NODE VIEW */}
      {!activeAgent && activeNode && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getNodeColor(activeNode.type) }}
              />
              <span className="font-semibold text-white text-sm">{activeNode.name}</span>
            </div>
            <div className="font-mono text-[10px] text-sky-400 break-all mt-0.5">
              {activeNode.id}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2.5 rounded-lg border border-slate-800 font-mono">
            <div>
              <span className="text-slate-400 text-[10px]">TYPE</span>
              <div className="text-white font-bold uppercase">{activeNode.type}</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">FLOOR</span>
              <div className="text-white font-bold">Floor {activeNode.floor}</div>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 text-[10px]">3D COORDINATES</span>
              <div className="text-white">
                X: {activeNode.position.x}m, Y: {activeNode.position.y}m, Z: {activeNode.position.z}m
              </div>
            </div>
            {activeNode.capacity && (
              <div>
                <span className="text-slate-400 text-[10px]">MAX OCCUPANCY</span>
                <div className="text-white font-bold">{activeNode.capacity} persons</div>
              </div>
            )}
            <div>
              <span className="text-slate-400 text-[10px]">EGRESS DISCHARGE</span>
              <div className={activeNode.isExit ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {activeNode.isExit ? 'SAFE GROUND EXIT' : 'INTERNAL NODE'}
              </div>
            </div>
          </div>

          {/* Digital Twin Mapping Link */}
          {activeNode.digitalTwinId && (
            <div className="p-2 rounded bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 font-mono">3D DIGITAL TWIN OBJECT</span>
              <div className="font-mono text-xs text-amber-300 font-semibold">
                {activeNode.digitalTwinId}
              </div>
            </div>
          )}

          {/* Infrastructure Capacity Telemetry (Phase B) */}
          {(() => {
            const targetId = activeNode.digitalTwinId || activeNode.id.replace('NODE_', '');
            const metrics = CapacityEngine.getMetrics(targetId, simulationMetrics.elapsedTime);
            if (!metrics) return null;
            return (
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-sky-500/30 space-y-2 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">
                    CAPACITY TELEMETRY ({metrics.type.toUpperCase()})
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      metrics.state === 'AVAILABLE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : metrics.state === 'BUSY'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : metrics.state === 'CONGESTED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : metrics.state === 'FULL'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {metrics.state}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px]">FLOW RATE:</span>
                    <div className="text-white font-bold">{metrics.flowRate} p/s</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">CURRENT QUEUE:</span>
                    <div className={metrics.currentQueueLength > 0 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                      {metrics.currentQueueLength} agents
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">OCCUPANCY:</span>
                    <div className="text-white font-bold">
                      {metrics.currentOccupancy}
                      {metrics.maxOccupancy ? ` / ${metrics.maxOccupancy}` : ''}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">UTILIZATION:</span>
                    <div className="text-sky-300 font-bold">
                      {(metrics.utilization * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">THROUGHPUT:</span>
                    <div className="text-white font-bold">{metrics.currentThroughput} p/s</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">TOTAL DISCHARGED:</span>
                    <div className="text-emerald-400 font-bold">{metrics.totalProcessed}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick Route Actions */}
          <div className="pt-2 border-t border-slate-800 flex gap-2">
            <button
              onClick={() => handleSetStart(activeNode.id)}
              className="flex-1 py-1.5 px-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <Navigation className="w-3 h-3" />
              SET START
            </button>
            <button
              onClick={() => handleSetTarget(activeNode.id)}
              className="flex-1 py-1.5 px-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <ArrowRight className="w-3 h-3" />
              SET TARGET
            </button>
          </div>
        </div>
      )}

      {/* 4. DIGITAL TWIN OBJECT VIEW (When selecting 3D mesh object) */}
      {!activeAgent && !activeNode && !activeEdge && selectedObjectId && (
        <div className="mt-3 space-y-3">
          <div>
            <span className="font-mono text-[10px] text-slate-400">3D OBJECT ID</span>
            <div className="font-mono text-sm font-bold text-amber-400 break-all">
              {selectedObjectId}
            </div>
          </div>

          {/* Infrastructure Capacity Telemetry for Selected 3D Object */}
          {(() => {
            const metrics = CapacityEngine.getMetrics(selectedObjectId, simulationMetrics.elapsedTime);
            if (!metrics) return null;
            return (
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-sky-500/30 space-y-2 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">
                    CAPACITY TELEMETRY ({metrics.type.toUpperCase()})
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      metrics.state === 'AVAILABLE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : metrics.state === 'BUSY'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : metrics.state === 'CONGESTED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : metrics.state === 'FULL'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {metrics.state}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px]">FLOW RATE:</span>
                    <div className="text-white font-bold">{metrics.flowRate} p/s</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">CURRENT QUEUE:</span>
                    <div className={metrics.currentQueueLength > 0 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                      {metrics.currentQueueLength} agents
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">OCCUPANCY:</span>
                    <div className="text-white font-bold">
                      {metrics.currentOccupancy}
                      {metrics.maxOccupancy ? ` / ${metrics.maxOccupancy}` : ''}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">UTILIZATION:</span>
                    <div className="text-sky-300 font-bold">
                      {(metrics.utilization * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">THROUGHPUT:</span>
                    <div className="text-white font-bold">{metrics.currentThroughput} p/s</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">TOTAL DISCHARGED:</span>
                    <div className="text-emerald-400 font-bold">{metrics.totalProcessed}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Mapped Graph Nodes */}
          <div>
            <span className="font-mono text-[10px] text-slate-400">
              MAPPED GRAPH NODES ({mappedNodes.length})
            </span>
            <div className="mt-1 space-y-1">
              {mappedNodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNode(n.id)}
                  className="w-full text-left p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-between transition-colors font-mono"
                >
                  <span className="text-sky-300 text-[11px] truncate">{n.name}</span>
                  <span className="text-[10px] text-slate-400">{n.type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
