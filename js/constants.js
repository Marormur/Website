/**
 * constants.js
 * Zentrale Konstanten für den macOS Desktop-Klon
 */

// ============================================================================
// Theme System
// ============================================================================
const THEME_PREFERENCE_KEY = 'themePreference';
const VALID_THEME_PREFERENCES = ['system', 'light', 'dark'];

// ============================================================================
// Storage Keys
// ============================================================================
const FINDER_STATE_STORAGE_KEY = 'finderState';
const OPEN_WINDOWS_KEY = 'openWindows';
const WINDOW_POSITIONS_KEY = 'windowPositions';

// ============================================================================
// Modal Management
// ============================================================================
const MODAL_IDS = [
    "finder-modal",
    "projects-modal",
    "about-modal",
    "settings-modal",
    "text-modal",
    "image-modal",
    "program-info-modal"
];

const TRANSIENT_MODAL_IDS = new Set(["program-info-modal"]);

// ============================================================================
// Z-Index Management
// ============================================================================
const BASE_Z_INDEX = 1000;
const MENUBAR_Z_INDEX = 10000;
const DOCK_Z_INDEX = 10000;

// ============================================================================
// Window Dimensions & Constraints
// ============================================================================
const MIN_WINDOW_WIDTH = 240;
const MIN_WINDOW_HEIGHT = 160;
const DEFAULT_WINDOW_WIDTH = 600;
const DEFAULT_WINDOW_HEIGHT = 400;

// ============================================================================
// Dock Configuration
// ============================================================================
const DOCK_MIN_HEIGHT = 48;
const DOCK_MAX_HEIGHT = 96;
const DOCK_MAGNIFICATION_SCALE = 1.5;
const DOCK_MAGNIFICATION_RANGE = 100; // px

// ============================================================================
// Desktop Configuration
// ============================================================================
const DESKTOP_ICON_SIZE = 64;
const DESKTOP_ICON_SPACING = 24;
const RUBBERBAND_MIN_DISTANCE = 10; // Mindestdistanz für Rubberband-Auswahl

// ============================================================================
// Animation & Timing
// ============================================================================
const WINDOW_ANIMATION_DURATION = 200; // ms
const DOCK_ANIMATION_DURATION = 150; // ms
const MENU_ANIMATION_DURATION = 100; // ms

// ============================================================================
// GitHub Integration
// ============================================================================
const GITHUB_CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten in ms
const GITHUB_API_BASE = 'https://api.github.com';

// ============================================================================
// Snap Behavior
// ============================================================================
const SNAP_THRESHOLD = 100; // px - Abstand zur Bildschirmkante für Snap
const SNAP_SIDES = ['left', 'right']; // Verfügbare Snap-Positionen

// Export für globale Verwendung
if (typeof window !== 'undefined') {
    window.APP_CONSTANTS = {
        THEME_PREFERENCE_KEY,
        VALID_THEME_PREFERENCES,
        FINDER_STATE_STORAGE_KEY,
        OPEN_WINDOWS_KEY,
        WINDOW_POSITIONS_KEY,
        MODAL_IDS,
        TRANSIENT_MODAL_IDS,
        BASE_Z_INDEX,
        MENUBAR_Z_INDEX,
        DOCK_Z_INDEX,
        MIN_WINDOW_WIDTH,
        MIN_WINDOW_HEIGHT,
        DEFAULT_WINDOW_WIDTH,
        DEFAULT_WINDOW_HEIGHT,
        DOCK_MIN_HEIGHT,
        DOCK_MAX_HEIGHT,
        DOCK_MAGNIFICATION_SCALE,
        DOCK_MAGNIFICATION_RANGE,
        DESKTOP_ICON_SIZE,
        DESKTOP_ICON_SPACING,
        RUBBERBAND_MIN_DISTANCE,
        WINDOW_ANIMATION_DURATION,
        DOCK_ANIMATION_DURATION,
        MENU_ANIMATION_DURATION,
        GITHUB_CACHE_DURATION,
        GITHUB_API_BASE,
        SNAP_THRESHOLD,
        SNAP_SIDES
    };
}
