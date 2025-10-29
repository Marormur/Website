"use strict";
/**
 * src/ts/storage-utils.ts
 * Small, safe helpers around localStorage with JSON handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getString = getString;
exports.setString = setString;
exports.remove = remove;
exports.getJSON = getJSON;
exports.setJSON = setJSON;
function getString(key) {
    try {
        return localStorage.getItem(key);
    }
    catch {
        return null;
    }
}
function setString(key, value) {
    try {
        localStorage.setItem(key, value);
    }
    catch (err) {
        console.warn(`[storage-utils] setString failed for key="${key}":`, err);
    }
}
function remove(key) {
    try {
        localStorage.removeItem(key);
    }
    catch (err) {
        console.warn(`[storage-utils] remove failed for key="${key}":`, err);
    }
}
function getJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw)
            return fallback;
        return JSON.parse(raw);
    }
    catch (err) {
        console.warn(`[storage-utils] getJSON failed for key="${key}":`, err);
        return fallback;
    }
}
function setJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    }
    catch (err) {
        console.warn(`[storage-utils] setJSON failed for key="${key}":`, err);
    }
}
//# sourceMappingURL=storage-utils.js.map