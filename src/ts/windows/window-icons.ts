/**
 * PURPOSE: Centralized icon paths for window/program metadata.
 * WHY: Avoid scattered hardcoded paths and prevent stale asset references.
 */
export const WINDOW_ICONS = {
    finder: './img/sucher.png',
    textEditor: './img/notepad.png',
    terminal: './img/terminal.png',
    photos: './img/photos-app-icon.svg',
    launchpad: './img/launchpad.png',
    profile: './img/profil.jpg',
    settings: './img/settings.png',
    default: './img/sucher.png',
} as const;
