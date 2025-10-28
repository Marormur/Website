"use strict";
/**
 * src/ts/constants.ts
 * Typed constants for the macOS-style portfolio site.
 *
 * This file is a migration target for the legacy `js/constants.js`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_CONSTANTS = exports.SNAP_SIDES = exports.SNAP_THRESHOLD = exports.GITHUB_API_BASE = exports.GITHUB_CACHE_DURATION = exports.MENU_ANIMATION_DURATION = exports.DOCK_ANIMATION_DURATION = exports.WINDOW_ANIMATION_DURATION = exports.RUBBERBAND_MIN_DISTANCE = exports.DESKTOP_ICON_SPACING = exports.DESKTOP_ICON_SIZE = exports.DOCK_MAGNIFICATION_RANGE = exports.DOCK_MAGNIFICATION_SCALE = exports.DOCK_MAX_HEIGHT = exports.DOCK_MIN_HEIGHT = exports.DEFAULT_WINDOW_HEIGHT = exports.DEFAULT_WINDOW_WIDTH = exports.MIN_WINDOW_HEIGHT = exports.MIN_WINDOW_WIDTH = exports.DOCK_Z_INDEX = exports.MENUBAR_Z_INDEX = exports.BASE_Z_INDEX = exports.TRANSIENT_MODAL_IDS = exports.MODAL_IDS = exports.WINDOW_POSITIONS_KEY = exports.OPEN_WINDOWS_KEY = exports.FINDER_STATE_STORAGE_KEY = exports.VALID_THEME_PREFERENCES = exports.THEME_PREFERENCE_KEY = void 0;
exports.THEME_PREFERENCE_KEY = 'themePreference';
exports.VALID_THEME_PREFERENCES = ['system', 'light', 'dark'];
exports.FINDER_STATE_STORAGE_KEY = 'finderState';
exports.OPEN_WINDOWS_KEY = 'openWindows';
exports.WINDOW_POSITIONS_KEY = 'windowPositions';
exports.MODAL_IDS = [
    'finder-modal',
    'projects-modal',
    'about-modal',
    'settings-modal',
    'text-modal',
    'terminal-modal',
    'image-modal',
    'program-info-modal',
];
exports.TRANSIENT_MODAL_IDS = new Set(['program-info-modal']);
exports.BASE_Z_INDEX = 1000;
exports.MENUBAR_Z_INDEX = 10000;
exports.DOCK_Z_INDEX = 10000;
exports.MIN_WINDOW_WIDTH = 240;
exports.MIN_WINDOW_HEIGHT = 160;
exports.DEFAULT_WINDOW_WIDTH = 600;
exports.DEFAULT_WINDOW_HEIGHT = 400;
exports.DOCK_MIN_HEIGHT = 48;
exports.DOCK_MAX_HEIGHT = 96;
exports.DOCK_MAGNIFICATION_SCALE = 1.5;
exports.DOCK_MAGNIFICATION_RANGE = 100; // px
exports.DESKTOP_ICON_SIZE = 64;
exports.DESKTOP_ICON_SPACING = 24;
exports.RUBBERBAND_MIN_DISTANCE = 10; // px
exports.WINDOW_ANIMATION_DURATION = 200; // ms
exports.DOCK_ANIMATION_DURATION = 150; // ms
exports.MENU_ANIMATION_DURATION = 100; // ms
exports.GITHUB_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in ms
exports.GITHUB_API_BASE = 'https://api.github.com';
exports.SNAP_THRESHOLD = 100; // px
exports.SNAP_SIDES = ['left', 'right'];
exports.APP_CONSTANTS = {
    THEME_PREFERENCE_KEY: exports.THEME_PREFERENCE_KEY,
    VALID_THEME_PREFERENCES: exports.VALID_THEME_PREFERENCES,
    FINDER_STATE_STORAGE_KEY: exports.FINDER_STATE_STORAGE_KEY,
    OPEN_WINDOWS_KEY: exports.OPEN_WINDOWS_KEY,
    WINDOW_POSITIONS_KEY: exports.WINDOW_POSITIONS_KEY,
    MODAL_IDS: exports.MODAL_IDS,
    TRANSIENT_MODAL_IDS: exports.TRANSIENT_MODAL_IDS,
    BASE_Z_INDEX: exports.BASE_Z_INDEX,
    MENUBAR_Z_INDEX: exports.MENUBAR_Z_INDEX,
    DOCK_Z_INDEX: exports.DOCK_Z_INDEX,
    MIN_WINDOW_WIDTH: exports.MIN_WINDOW_WIDTH,
    MIN_WINDOW_HEIGHT: exports.MIN_WINDOW_HEIGHT,
    DEFAULT_WINDOW_WIDTH: exports.DEFAULT_WINDOW_WIDTH,
    DEFAULT_WINDOW_HEIGHT: exports.DEFAULT_WINDOW_HEIGHT,
    DOCK_MIN_HEIGHT: exports.DOCK_MIN_HEIGHT,
    DOCK_MAX_HEIGHT: exports.DOCK_MAX_HEIGHT,
    DOCK_MAGNIFICATION_SCALE: exports.DOCK_MAGNIFICATION_SCALE,
    DOCK_MAGNIFICATION_RANGE: exports.DOCK_MAGNIFICATION_RANGE,
    DESKTOP_ICON_SIZE: exports.DESKTOP_ICON_SIZE,
    DESKTOP_ICON_SPACING: exports.DESKTOP_ICON_SPACING,
    RUBBERBAND_MIN_DISTANCE: exports.RUBBERBAND_MIN_DISTANCE,
    WINDOW_ANIMATION_DURATION: exports.WINDOW_ANIMATION_DURATION,
    DOCK_ANIMATION_DURATION: exports.DOCK_ANIMATION_DURATION,
    MENU_ANIMATION_DURATION: exports.MENU_ANIMATION_DURATION,
    GITHUB_CACHE_DURATION: exports.GITHUB_CACHE_DURATION,
    GITHUB_API_BASE: exports.GITHUB_API_BASE,
    SNAP_THRESHOLD: exports.SNAP_THRESHOLD,
    SNAP_SIDES: exports.SNAP_SIDES,
};
if (typeof window !== 'undefined') {
    window.APP_CONSTANTS = exports.APP_CONSTANTS;
}
exports.default = exports.APP_CONSTANTS;
//# sourceMappingURL=constants.js.map