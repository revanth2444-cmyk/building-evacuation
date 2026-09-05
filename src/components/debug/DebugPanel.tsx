/**
 * Developer / Debug Panel Component
 * Fulfills Phase 2 requirements:
 * - View graph nodes & filter by floor/type
 * - View graph edges with physical metrics (distance, time, capacity, width, accessibility)
 * - Select nodes & edges
 * - Calculate A* routes between any two nodes or to nearest exit
 * - Display calculated route metrics and step-by-step navigation
 * - Validate graph topology and test fault injection
 */

import React, { useState } from 'react';
import {
  Activity,
  ChevronRight,
  ChevronDown,
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Route,
  Network,
  Cpu,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Zap,
  Layers,
  ArrowRight,
  Accessibility,
  Users,
} from 'lucide-react';
import { useEvacuateStore } from '../../store/useEvacuateStore';
import { FloorId } from '../../types/building';
import { getNodeColor } from '../3d/GraphOverlay3D';
import { BehaviorProfile } from '../../simulation/types';

type TabType = 'pathfinding' | 'agents' | 'nodes' | 'edges' | 'validator';

export const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pathfinding');
  const [nodeFilterFloor, setNodeFilterFloor] = useState<FloorId | 'all'>('all');
  const [nodeSearch, setNodeSearch] = useState('');
  const [edgeFilterFloor, setEdgeFilterFloor] = useState<FloorId | 'all'>('all');
  const [agentSearch, setAgentSearch] = useState('');
  const [agentFilterProfile, setAgentFilterProfile] = useState<BehaviorProfile | 'all'>('all');
  const [agentFilterFloor, setAgentFilterFloor] = useState<FloorId | 'all'>('all');

  const {
    graph,
    validationReport,
    routeStartNodeId,
    routeTargetNodeId,
    isWheelchairOnly,
    computedRoute,
    selectedNodeId,
    selectedEdgeId,
    selectedAgentId,
    agents,
    setRouteStartNode,
    setRouteTargetNode,
    setIsWheelchairOnly,
    calculateRoute,
    clearRoute,
    setSelectedNode,
    setSelectedEdge,
    setSelectedAgentId,
    toggleEdgeBlocked,
    resetAllEdges,
    runValidation,
    injectTestFault,
  } = useEvacuateStore();

  const allNodes = Array.from(graph.nodes.values());
  const allEdges = Array.from(graph.edges.values());

  // Filtered nodes
  const filteredNodes = allNodes.filter((node) => {
    if (nodeFilterFloor !== 'all' && node.floor !== nodeFilterFloor) return false;
    if (nodeSearch.trim()) {
      const q = nodeSearch.toLowerCase();
      return (
        node.id.toLowerCase().includes(q) ||
        node.name.toLowerCase().includes(q) ||
        node.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered edges (canonical unique edges for display)
  const filteredEdges = allEdges.filter((edge) => {
    const fromNode = graph.nodes.get(edge.fromNodeId);
    if (!fromNode) return false;
    if (edgeFilterFloor !== 'all' && fromNode.floor !== edgeFilterFloor) return false;
    return true;
  });

  // Filtered agents
  const filteredAgents = agents.filter((agent) => {
    if (agentFilterFloor !== 'all' && agent.currentFloor !== agentFilterFloor) return false;
    if (agentFilterProfile !== 'all' && agent.profile !== agentFilterProfile) return false;
    if (agentSearch.trim()) {
      const q = agentSearch.toLowerCase();
      return (
        agent.id.toLowerCase().includes(q) ||
        agent.name.toLowerCase().includes(q) ||
        agent.profile.toLowerCase().includes(q) ||
        agent.status.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Room nodes for convenient Start Node dropdown
  const roomNodes = allNodes
    .filter((n) => n.type === 'room')
    .sort((a, b) => b.floor - a.floor || a.name.localeCompare(b.name));

  // Exit nodes
  const exitNodes = allNodes.filter((n) => n.isExit);

  return (
    <div
      className={`absolute top-20 right-4 z-20 transition-all duration-300 select-none ${
        isOpen ? 'w-[440px] max-h-[85vh]' : 'w-auto'
      }`}
    >
      <div className="flex flex-col h-full rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl text-white font-sans overflow-hidden">
        {/* Panel Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span className="font-mono text-xs font-bold tracking-wider text-slate-200">
              DEVELOPER & GRAPH DEBUG ENGINE
            </span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {isOpen && (
          <>
            {/* Tab Navigation */}
            <div className="flex items-center border-b border-slate-800 bg-slate-950/40 text-xs font-mono">
              <button
                onClick={() => setActiveTab('pathfinding')}
                className={`flex-1 py-2 px-1 text-center transition-colors border-b-2 flex items-center justify-center gap-1 text-[11px] ${
                  activeTab === 'pathfinding'
                    ? 'border-sky-500 text-sky-400 bg-slate-800/40 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Route className="w-3 h-3" />
                ROUTE
              </button>
              <button
                onClick={() => setActiveTab('agents')}
                className={`flex-1 py-2 px-1 text-center transition-colors border-b-2 flex items-center justify-center gap-1 text-[11px] ${
                  activeTab === 'agents'
                    ? 'border-sky-500 text-sky-400 bg-slate-800/40 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3 h-3" />
                AGENTS ({agents.length})
              </button>
              <button
                onClick={() => setActiveTab('nodes')}
                className={`flex-1 py-2 px-1 text-center transition-colors border-b-2 flex items-center justify-center gap-1 text-[11px] ${
                  activeTab === 'nodes'
                    ? 'border-sky-500 text-sky-400 bg-slate-800/40 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Network className="w-3 h-3" />
                NODES
              </button>
              <button
                onClick={() => setActiveTab('edges')}
                className={`flex-1 py-2 px-1 text-center transition-colors border-b-2 flex items-center justify-center gap-1 text-[11px] ${
                  activeTab === 'edges'
                    ? 'border-sky-500 text-sky-400 bg-slate-800/40 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-3 h-3" />
                EDGES
              </button>
              <button
                onClick={() => setActiveTab('validator')}
                className={`flex-1 py-2 px-1 text-center transition-colors border-b-2 flex items-center justify-center gap-1 text-[11px] ${
                  activeTab === 'validator'
                    ? 'border-amber-500 text-amber-400 bg-slate-800/40 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3 h-3" />
                VALIDATOR
              </button>
            </div>

            {/* Panel Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(85vh-90px)] text-xs">
              {/* ========================================================= */}
              {/* TAB 1: A* PATHFINDING CONTROLLER                          */}
              {/* ========================================================= */}
              {activeTab === 'pathfinding' && (
                <div className="space-y-4">
                  {/* Start Node Selector */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-[11px] text-slate-400 flex items-center justify-between">
                      <span>ORIGIN NODE (ROOM / LOCATION):</span>
                      <span className="text-sky-400 font-mono">
                        {graph.nodes.get(routeStartNodeId)?.name ?? routeStartNodeId}
                      </span>
                    </label>
                    <select
                      value={routeStartNodeId}
                      onChange={(e) => setRouteStartNode(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 font-mono text-xs text-white focus:ring-1 focus:ring-sky-500 outline-none"
                    >
                      {roomNodes.map((r) => (
                        <option key={r.id} value={r.id}>
                          [F{r.floor}] {r.name} ({r.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Node Selector */}
                  <div className="space-y-1.5">
                    <label className="font-mono text-[11px] text-slate-400 flex items-center justify-between">
                      <span>DESTINATION TARGET:</span>
                      <span className="text-emerald-400 font-mono">
                        {routeTargetNodeId === 'NEAREST_EXIT'
                          ? 'OPTIMAL GROUND EXIT'
                          : graph.nodes.get(routeTargetNodeId)?.name ?? routeTargetNodeId}
                      </span>
                    </label>
                    <select
                      value={routeTargetNodeId}
                      onChange={(e) => setRouteTargetNode(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 font-mono text-xs text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                    >
                      <option value="NEAREST_EXIT">
                        ⚡ AUTOMATIC: Nearest Safe Ground Exit (IBC / NFPA)
                      </option>
                      <optgroup label="Ground Floor Exits">
                        {exitNodes.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            [F1] {ex.name} ({ex.id})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Specific Rooms">
                        {roomNodes.map((r) => (
                          <option key={r.id} value={r.id}>
                            [F{r.floor}] {r.name} ({r.id})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Constraints: Wheelchair Accessible */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700">
                    <div className="flex items-center gap-2">
                      <Accessibility className="w-4 h-4 text-sky-400" />
                      <div>
                        <div className="font-medium text-white">ADA / Wheelchair Constraint</div>
                        <div className="text-[10px] text-slate-400">
                          Step-free routing (excludes emergency staircases)
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isWheelchairOnly}
                      onChange={(e) => setIsWheelchairOnly(e.target.checked)}
                      className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                    />
                  </div>

                  {/* Execution Action Button */}
                  <div className="flex gap-2">
                    <button
                      onClick={calculateRoute}
                      className="flex-1 py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all active:scale-[0.98]"
                    >
                      <Zap className="w-4 h-4" />
                      COMPUTE A* EVACUATION ROUTE
                    </button>
                    {computedRoute && (
                      <button
                        onClick={clearRoute}
                        className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                        title="Clear Route"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>

                  {/* A* Route Computational Results */}
                  {computedRoute && (
                    <div className="space-y-3 pt-3 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[11px] text-slate-300 flex items-center gap-1.5">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${
                              computedRoute.pathFound ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          />
                          {computedRoute.pathFound
                            ? 'A* OPTIMAL PATH SOLVED'
                            : 'NO VIABLE PATH FOUND'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          Solved in {computedRoute.computationTimeMs}ms
                        </span>
                      </div>

                      {computedRoute.pathFound ? (
                        <>
                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/80 font-mono">
                            <div>
                              <span className="text-slate-400 text-[10px]">TOTAL DISTANCE</span>
                              <div className="text-emerald-400 text-sm font-bold">
                                {computedRoute.totalDistance} m
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px]">EST. EGRESS TIME</span>
                              <div className="text-sky-400 text-sm font-bold">
                                {computedRoute.totalTraversalTime} sec
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px]">FLOORS TRAVERSED</span>
                              <div className="text-white font-bold">
                                {computedRoute.floorsTraversed.map((f) => `F${f}`).join(' → ')}
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px]">NODES EXPLORED</span>
                              <div className="text-white font-bold">
                                {computedRoute.exploredNodeCount} nodes
                              </div>
                            </div>
                          </div>

                          {/* Step-by-Step Egress Instructions */}
                          <div className="space-y-1.5">
                            <span className="font-mono text-[11px] text-slate-400">
                              STEP-BY-STEP EGRESS TRAJECTORY ({computedRoute.steps.length} STEPS):
                            </span>
                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                              {computedRoute.steps.map((step, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 rounded bg-slate-800/40 border border-slate-700/60 text-[11px] flex items-start gap-2"
                                >
                                  <span className="font-mono font-bold text-sky-400 text-[10px] pt-0.5">
                                    #{idx + 1}
                                  </span>
                                  <div className="flex-1">
                                    <div className="text-slate-200">{step.instruction}</div>
                                    <div className="font-mono text-[9px] text-slate-400 mt-0.5">
                                      {step.distance}m · Floor {step.floor}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs">
                          Cannot find evacuation route from origin to destination. Corridors or
                          emergency stairwells along the path may be blocked or inaccessible.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: AGENTS FLEET INSPECTOR                             */}
              {/* ========================================================= */}
              {activeTab === 'agents' && (
                <div className="space-y-3">
                  {/* Search and Filters */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by ID, name, status..."
                        value={agentSearch}
                        onChange={(e) => setAgentSearch(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={agentFilterFloor}
                        onChange={(e) =>
                          setAgentFilterFloor(
                            e.target.value === 'all' ? 'all' : (Number(e.target.value) as FloorId)
                          )
                        }
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white outline-none"
                      >
                        <option value="all">All Floors</option>
                        <option value="5">F5 (Penthouse)</option>
                        <option value="4">F4 (Boardroom)</option>
                        <option value="3">F3 (Labs)</option>
                        <option value="2">F2 (Open Desk)</option>
                        <option value="1">F1 (Lobby)</option>
                      </select>
                      <select
                        value={agentFilterProfile}
                        onChange={(e) =>
                          setAgentFilterProfile(e.target.value as BehaviorProfile | 'all')
                        }
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white outline-none"
                      >
                        <option value="all">All Profiles</option>
                        <option value="NORMAL">Normal</option>
                        <option value="FAMILIAR">Familiar</option>
                        <option value="UNFAMILIAR">Unfamiliar</option>
                        <option value="DELAYED">Delayed</option>
                        <option value="PANIC">Panic</option>
                        <option value="NON_COMPLIANT">Non-Compliant</option>
                        <option value="REDUCED_MOBILITY">Reduced Mobility</option>
                      </select>
                    </div>
                  </div>

                  {/* Filtered Agent List */}
                  <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                    {filteredAgents.map((agent) => {
                      const isSelected = selectedAgentId === agent.id;
                      return (
                        <div
                          key={agent.id}
                          onClick={() => setSelectedAgentId(agent.id)}
                          className={`p-2 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-sky-950 border-sky-500'
                              : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: agent.color }}
                              />
                              <span className="font-bold text-white font-mono text-xs">
                                {agent.id}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                {agent.profile}
                              </span>
                            </div>
                            <span
                              className={`font-mono text-[9px] px-1.5 py-0.5 rounded border uppercase font-semibold ${
                                agent.status === 'evacuated'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : agent.status === 'evacuating'
                                  ? 'bg-sky-950 text-sky-300 border-sky-800'
                                  : agent.status === 'queued'
                                  ? 'bg-orange-950 text-orange-300 border-orange-800'
                                  : agent.status === 'reacting'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {agent.status}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                            <span>Floor {agent.currentFloor}</span>
                            <span>{agent.currentSpeed} m/s</span>
                            <span>
                              Wp: {agent.currentWaypointIndex}/{agent.routeWaypoints.length}
                            </span>
                            <span>{agent.distanceTraveled}m moved</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: GRAPH NODES INSPECTOR                              */}
              {/* ========================================================= */}
              {activeTab === 'nodes' && (
                <div className="space-y-3">
                  {/* Search and Floor Filter */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by ID or name..."
                        value={nodeSearch}
                        onChange={(e) => setNodeSearch(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 font-mono outline-none"
                      />
                    </div>
                    <select
                      value={nodeFilterFloor}
                      onChange={(e) =>
                        setNodeFilterFloor(
                          e.target.value === 'all' ? 'all' : (Number(e.target.value) as FloorId)
                        )
                      }
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 text-xs font-mono text-white outline-none"
                    >
                      <option value="all">All Floors</option>
                      <option value="5">F5</option>
                      <option value="4">F4</option>
                      <option value="3">F3</option>
                      <option value="2">F2</option>
                      <option value="1">F1</option>
                    </select>
                  </div>

                  {/* Node List */}
                  <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                    {filteredNodes.map((node) => {
                      const isSelected = selectedNodeId === node.id;
                      return (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node.id)}
                          className={`p-2 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-sky-950 border-sky-500'
                              : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: getNodeColor(node.type) }}
                              />
                              <span className="font-semibold text-white truncate max-w-[220px]">
                                {node.name}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                              F{node.floor}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-sky-400 mt-1 truncate">
                            {node.id}
                          </div>
                          <div className="font-mono text-[9px] text-slate-400 flex items-center gap-3 mt-1">
                            <span>TYPE: {node.type}</span>
                            <span>
                              POS: [{node.position.x}, {node.position.y}, {node.position.z}]
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: GRAPH EDGES INSPECTOR                              */}
              {/* ========================================================= */}
              {activeTab === 'edges' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-slate-400">
                      REGISTERED EDGES ({filteredEdges.length})
                    </span>
                    <button
                      onClick={resetAllEdges}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      RESET OVERRIDES
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1 font-mono">
                    {filteredEdges.map((edge) => {
                      const isSelected = selectedEdgeId === edge.id;
                      return (
                        <div
                          key={edge.id}
                          onClick={() => setSelectedEdge(edge.id)}
                          className={`p-2 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-950 border-indigo-500'
                              : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-indigo-400 font-semibold truncate max-w-[240px]">
                              {edge.id}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded ${
                                edge.isBlocked
                                  ? 'bg-red-950 text-red-300 border border-red-800'
                                  : 'bg-emerald-950 text-emerald-300'
                              }`}
                            >
                              {edge.isBlocked ? 'BLOCKED' : 'PASSABLE'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                            <span>{edge.distance}m</span>
                            <span>{edge.traversalTime}s</span>
                            <span>W: {edge.width}m</span>
                            <span>{edge.accessibility ? 'ADA' : 'STEPS'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 4: GRAPH VALIDATOR SUITE                              */}
              {/* ========================================================= */}
              {activeTab === 'validator' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                    <div>
                      <div className="font-bold text-white text-sm">Topological Validation</div>
                      <div className="text-slate-400 text-[11px]">
                        {validationReport?.errorCount === 0
                          ? 'All rooms connected · Exits reachable · No orphaned nodes'
                          : `${validationReport?.errorCount} critical issues detected`}
                      </div>
                    </div>
                    <button
                      onClick={runValidation}
                      className="px-2.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      RE-RUN
                    </button>
                  </div>

                  {/* Fault Injection Simulation Testing */}
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700 space-y-2">
                    <span className="font-mono text-[10px] text-amber-400 uppercase font-bold">
                      Inject Test Anomaly (Demonstrate Detection):
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
                      <button
                        onClick={() => injectTestFault('disconnect_room')}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-center border border-slate-700"
                      >
                        Disconnect Room 501
                      </button>
                      <button
                        onClick={() => injectTestFault('block_stairs')}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-center border border-slate-700"
                      >
                        Block West Stairs
                      </button>
                      <button
                        onClick={() => injectTestFault('isolate_exit')}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-center border border-slate-700"
                      >
                        Block Ground Exits
                      </button>
                    </div>
                  </div>

                  {/* Detected Issues List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {validationReport?.issues.length === 0 ? (
                      <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Graph topology passed all verification checks!</span>
                      </div>
                    ) : (
                      validationReport?.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                            issue.severity === 'error'
                              ? 'bg-red-950/40 border-red-800 text-red-200'
                              : 'bg-amber-950/40 border-amber-800 text-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>{issue.title}</span>
                            <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-black/40">
                              {issue.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">{issue.description}</p>
                          {issue.suggestion && (
                            <p className="text-[10px] text-slate-400 italic">
                              Fix: {issue.suggestion}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
