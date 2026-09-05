/**
 * Simulation Constants for EVACUATE-AI Phase A
 * Defines fixed physics timesteps, human kinematic parameters, and spatial tolerances.
 */

// Fixed physics simulation timestep (20 Hz)
export const FIXED_TIMESTEP = 0.05;

// Maximum simulation steps per render frame to prevent browser lag spikes
export const MAX_STEPS_PER_FRAME = 10;

// Human personal space and collision avoidance thresholds (in meters)
export const DEFAULT_PERSONAL_SPACE_RADIUS = 0.45; // Standard human radius
export const WHEELCHAIR_PERSONAL_SPACE_RADIUS = 0.65; // Wheelchair/reduced mobility radius
export const MIN_FOLLOW_DISTANCE = 0.85; // Distance at which following agent starts to decelerate
export const STOP_FOLLOW_DISTANCE = 0.48; // Distance at which following agent halts to prevent overlap

// Speed reduction multiplier on stairs (downward/upward movement)
export const STAIRCASE_SPEED_FACTOR = 0.55;

// Spatial grid cell size for fast 2D neighbor queries per floor (in meters)
export const SPATIAL_GRID_CELL_SIZE = 2.0;
