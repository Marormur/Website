/**
 * src/ts/constants.ts
 * Typed constants for the macOS-style portfolio site.
 *
 * This file is a migration target for the legacy `js/constants.js`.
 */

export interface AppConstants {
    THEME_PREFERENCE_KEY: string;
    VALID_THEME_PREFERENCES: string[];
    FINDER_STATE_STORAGE_KEY: string;
    OPEN_WINDOWS_KEY: string;
    WINDOW_POSITIONS_KEY: string;
    MODAL_IDS: string[];
    TRANSIENT_MODAL_IDS: Set<string>;
    BASE_Z_INDEX: number;
    MENUBAR_Z_INDEX: number;
    DOCK_Z_INDEX: number;
    MIN_WINDOW_WIDTH: number;
    MIN_WINDOW_HEIGHT: number;
    DEFAULT_WINDOW_WIDTH: number;
    DEFAULT_WINDOW_HEIGHT: number;
    DOCK_MIN_HEIGHT: number;
    DOCK_MAX_HEIGHT: number;
    DOCK_MAGNIFICATION_SCALE: number;
    DOCK_MAGNIFICATION_RANGE: number;
    DESKTOP_ICON_SIZE: number;
    DESKTOP_ICON_SPACING: number;
    RUBBERBAND_MIN_DISTANCE: number;
    WINDOW_ANIMATION_DURATION: number;
    DOCK_ANIMATION_DURATION: number;
    MENU_ANIMATION_DURATION: number;
    GITHUB_CACHE_DURATION: number;
    GITHUB_API_BASE: string;
    SNAP_THRESHOLD: number;
    SNAP_SIDES: string[];
}

export const THEME_PREFERENCE_KEY = 'themePreference';
export const VALID_THEME_PREFERENCES = ['system', 'light', 'dark'];

export const FINDER_STATE_STORAGE_KEY = 'finderState';
export const OPEN_WINDOWS_KEY = 'openWindows';
export const WINDOW_POSITIONS_KEY = 'windowPositions';

export const MODAL_IDS = [
    'projects-modal',
    'about-modal',
    'settings-modal',
    'text-modal',
    'terminal-modal',
    'image-modal',
    'program-info-modal',
];

export const TRANSIENT_MODAL_IDS = new Set<string>(['program-info-modal']);

export const BASE_Z_INDEX = 1000;
export const MENUBAR_Z_INDEX = 10000;
export const DOCK_Z_INDEX = 10000;

export const MIN_WINDOW_WIDTH = 240;
export const MIN_WINDOW_HEIGHT = 160;
export const DEFAULT_WINDOW_WIDTH = 600;
export const DEFAULT_WINDOW_HEIGHT = 400;

export const DOCK_MIN_HEIGHT = 48;
export const DOCK_MAX_HEIGHT = 96;
export const DOCK_MAGNIFICATION_SCALE = 1.5;
export const DOCK_MAGNIFICATION_RANGE = 100; // px

export const DESKTOP_ICON_SIZE = 64;
export const DESKTOP_ICON_SPACING = 24;
export const RUBBERBAND_MIN_DISTANCE = 10; // px

export const WINDOW_ANIMATION_DURATION = 200; // ms
export const DOCK_ANIMATION_DURATION = 150; // ms
export const MENU_ANIMATION_DURATION = 100; // ms

export const GITHUB_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in ms
export const GITHUB_API_BASE = 'https://api.github.com';

export const SNAP_THRESHOLD = 100; // px
export const SNAP_SIDES = ['left', 'right'];

export const APP_CONSTANTS: AppConstants = {
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
    SNAP_SIDES,
};

// Attach to window for legacy JS compatibility
declare global {
    interface Window {
        APP_CONSTANTS?: AppConstants;
    }
}

if (typeof window !== 'undefined') {
    window.APP_CONSTANTS = APP_CONSTANTS;
}

export default APP_CONSTANTS;
