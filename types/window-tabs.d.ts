/**
 * Type definitions for Window Tabs System
 * 
 * This module provides a tab interface for multi-instance windows.
 * It integrates with InstanceManager to provide a tabbed UI for switching
 * between multiple instances of the same window type (e.g., multiple terminals,
 * multiple text editors, multiple Finder windows).
 */

/**
 * Minimal interface for an instance managed by WindowTabs.
 * This allows the tab system to work with any instance manager
 * without tight coupling.
 */
interface WindowTabInstance {
  instanceId: string;
  title: string;
  focus?: () => void;
  blur?: () => void;
  destroy?: () => void;
  show?: () => void;
  hide?: () => void;
}

/**
 * Configuration for creating a new instance.
 */
interface WindowTabInstanceConfig {
  id?: string;
  type?: string;
  title?: string;
  initialState?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Manager interface that WindowTabs expects.
 * This is a structural interface that matches InstanceManager API.
 */
interface WindowTabInstanceManager {
  getAllInstances(): WindowTabInstance[];
  getActiveInstance(): WindowTabInstance | null;
  getAllInstanceIds(): string[];
  getInstance(id: string): WindowTabInstance | null;
  setActiveInstance(id: string): void;
  createInstance(config?: Partial<WindowTabInstanceConfig>): WindowTabInstance | null;
  destroyInstance(id: string): void;
  getInstanceCount?: () => number;
}

/**
 * Options for creating a WindowTabs controller.
 */
interface WindowTabsOptions {
  /** Whether to show the "+" button for creating new instances. Default: true */
  addButton?: boolean;
  /** Optional callback to get the title for a newly created instance */
  onCreateInstanceTitle?: () => string | undefined;
}

/**
 * Controller returned by WindowTabs.create().
 * Provides methods to interact with the tab bar UI.
 */
interface WindowTabsController {
  /** The DOM element containing the tab bar */
  el: HTMLElement;
  /** Re-render the tab bar to reflect current manager state */
  refresh(): void;
  /** Destroy the tab bar and remove all UI elements */
  destroy(): void;
  /** Update the title of a specific tab */
  setTitle(instanceId: string, title: string): void;
}

/**
 * WindowTabs API for creating tab bars.
 */
interface WindowTabsAPI {
  /**
   * Create a window tabs bar bound to a specific InstanceManager.
   * 
   * @param manager - The instance manager to bind to
   * @param mountEl - The DOM element to mount the tab bar in
   * @param options - Optional configuration
   * @returns A controller for interacting with the tab bar
   */
  create(
    manager: WindowTabInstanceManager,
    mountEl: HTMLElement,
    options?: WindowTabsOptions
  ): WindowTabsController;
}

// Legacy WindowTabManager adapter removed; use WindowTabs.create instead.

/**
 * The WindowTabs global API.
 * Available as window.WindowTabs after the module loads.
 */
declare const WindowTabs: WindowTabsAPI;
