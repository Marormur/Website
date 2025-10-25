console.log('WindowTabs loaded');

/**
 * WindowTabs - Tab-based UI for managing multiple window instances
 * 
 * Provides browser-like tab interface for switching between multiple instances
 * of the same window type (e.g., multiple terminals, text editors)
 */
(function () {
    'use strict';

    /**
     * Tab Manager for a window type
     * Manages tabs for instances of a specific type
     */
    class WindowTabManager {
        /**
         * @param {Object} config
         * @param {string} config.containerId - ID of the tab bar container element
         * @param {InstanceManager} config.instanceManager - Associated instance manager
         * @param {Function} config.onTabSwitch - Callback when tab is switched
         * @param {Function} config.onTabClose - Callback when tab is closed
         * @param {Function} config.onNewTab - Callback when new tab is requested
         */
        constructor(config) {
            this.containerId = config.containerId;
            this.instanceManager = config.instanceManager;
            this.onTabSwitch = config.onTabSwitch || (() => {});
            this.onTabClose = config.onTabClose || (() => {});
            this.onNewTab = config.onNewTab || (() => {});
            
            this.tabBarElement = null;
            this.tabsContainer = null;
            this.newTabButton = null;
            
            this.init();
        }

        /**
         * Initialize tab bar UI
         */
        init() {
            const container = document.getElementById(this.containerId);
            if (!container) {
                console.warn(`Tab container ${this.containerId} not found`);
                return;
            }

            // Create tab bar structure
            this.tabBarElement = document.createElement('div');
            this.tabBarElement.className = 'window-tab-bar flex items-center bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700';
            this.tabBarElement.setAttribute('role', 'tablist');

            // Tabs container (scrollable)
            this.tabsContainer = document.createElement('div');
            this.tabsContainer.className = 'window-tabs-container flex-1 flex items-center overflow-x-auto';
            
            // New tab button
            this.newTabButton = document.createElement('button');
            this.newTabButton.className = 'new-tab-button px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors';
            this.newTabButton.innerHTML = '<span class="text-lg">+</span>';
            this.newTabButton.setAttribute('aria-label', 'New tab');
            this.newTabButton.title = 'New tab (⌘N)';
            
            this.newTabButton.addEventListener('click', () => {
                this.onNewTab();
            });

            this.tabBarElement.appendChild(this.tabsContainer);
            this.tabBarElement.appendChild(this.newTabButton);
            
            container.appendChild(this.tabBarElement);
        }

        /**
         * Create a tab element for an instance
         * @param {BaseWindowInstance} instance
         * @returns {HTMLElement}
         */
        createTab(instance) {
            const tab = document.createElement('div');
            tab.className = 'window-tab flex items-center gap-2 px-4 py-2 border-r border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-[120px] max-w-[200px]';
            tab.dataset.instanceId = instance.instanceId;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', 'false');

            // Tab title
            const title = document.createElement('span');
            title.className = 'tab-title flex-1 truncate text-sm';
            title.textContent = instance.title;

            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'tab-close-btn text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 text-lg leading-none';
            closeBtn.innerHTML = '×';
            closeBtn.setAttribute('aria-label', 'Close tab');
            closeBtn.title = 'Close tab (⌘W)';
            
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(instance.instanceId);
            });

            // Tab click to switch
            tab.addEventListener('click', () => {
                this.switchToTab(instance.instanceId);
            });

            tab.appendChild(title);
            tab.appendChild(closeBtn);

            return tab;
        }

        /**
         * Add tab for an instance
         * @param {BaseWindowInstance} instance
         */
        addTab(instance) {
            if (!this.tabsContainer) return;

            const tab = this.createTab(instance);
            this.tabsContainer.appendChild(tab);

            // Make this tab active
            this.setActiveTab(instance.instanceId);

            // Listen for instance title changes
            instance.on('stateChanged', (data) => {
                if (data.newState && instance.title !== tab.querySelector('.tab-title').textContent) {
                    this.updateTabTitle(instance.instanceId, instance.title);
                }
            });
        }

        /**
         * Remove tab for an instance
         * @param {string} instanceId
         */
        removeTab(instanceId) {
            if (!this.tabsContainer) return;

            const tab = this.tabsContainer.querySelector(`[data-instance-id="${instanceId}"]`);
            if (tab) {
                tab.remove();
            }
        }

        /**
         * Update tab title
         * @param {string} instanceId
         * @param {string} newTitle
         */
        updateTabTitle(instanceId, newTitle) {
            if (!this.tabsContainer) return;

            const tab = this.tabsContainer.querySelector(`[data-instance-id="${instanceId}"]`);
            if (tab) {
                const titleElement = tab.querySelector('.tab-title');
                if (titleElement) {
                    titleElement.textContent = newTitle;
                }
            }
        }

        /**
         * Set active tab
         * @param {string} instanceId
         */
        setActiveTab(instanceId) {
            if (!this.tabsContainer) return;

            // Remove active class from all tabs
            const allTabs = this.tabsContainer.querySelectorAll('.window-tab');
            allTabs.forEach(tab => {
                tab.classList.remove('bg-white', 'dark:bg-gray-900', 'border-b-2', 'border-blue-500');
                tab.setAttribute('aria-selected', 'false');
            });

            // Add active class to selected tab
            const activeTab = this.tabsContainer.querySelector(`[data-instance-id="${instanceId}"]`);
            if (activeTab) {
                activeTab.classList.add('bg-white', 'dark:bg-gray-900', 'border-b-2', 'border-blue-500');
                activeTab.setAttribute('aria-selected', 'true');
                
                // Scroll into view if needed
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }

        /**
         * Switch to a tab
         * @param {string} instanceId
         */
        switchToTab(instanceId) {
            this.setActiveTab(instanceId);
            this.instanceManager.setActiveInstance(instanceId);
            this.onTabSwitch(instanceId);
        }

        /**
         * Close a tab
         * @param {string} instanceId
         */
        closeTab(instanceId) {
            const instance = this.instanceManager.getInstance(instanceId);
            if (instance) {
                // Call the close callback first
                this.onTabClose(instanceId);
                
                // Remove the tab from UI
                this.removeTab(instanceId);
                
                // Destroy the instance
                this.instanceManager.destroyInstance(instanceId);
                
                // Switch to the last remaining tab if any
                const remainingInstances = this.instanceManager.getAllInstances();
                if (remainingInstances.length > 0) {
                    const lastInstance = remainingInstances[remainingInstances.length - 1];
                    this.switchToTab(lastInstance.instanceId);
                }
            }
        }

        /**
         * Get all tab elements
         * @returns {NodeList}
         */
        getAllTabs() {
            return this.tabsContainer ? this.tabsContainer.querySelectorAll('.window-tab') : [];
        }

        /**
         * Get tab at index
         * @param {number} index
         * @returns {HTMLElement|null}
         */
        getTabAtIndex(index) {
            const tabs = this.getAllTabs();
            return tabs[index] || null;
        }

        /**
         * Switch to tab by index
         * @param {number} index
         */
        switchToTabByIndex(index) {
            const tab = this.getTabAtIndex(index);
            if (tab) {
                const instanceId = tab.dataset.instanceId;
                this.switchToTab(instanceId);
            }
        }

        /**
         * Switch to next tab
         */
        switchToNextTab() {
            const tabs = Array.from(this.getAllTabs());
            const activeTab = this.tabsContainer.querySelector('.window-tab[aria-selected="true"]');
            
            if (!activeTab || tabs.length === 0) return;
            
            const currentIndex = tabs.indexOf(activeTab);
            const nextIndex = (currentIndex + 1) % tabs.length;
            const nextTab = tabs[nextIndex];
            
            if (nextTab) {
                this.switchToTab(nextTab.dataset.instanceId);
            }
        }

        /**
         * Switch to previous tab
         */
        switchToPreviousTab() {
            const tabs = Array.from(this.getAllTabs());
            const activeTab = this.tabsContainer.querySelector('.window-tab[aria-selected="true"]');
            
            if (!activeTab || tabs.length === 0) return;
            
            const currentIndex = tabs.indexOf(activeTab);
            const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            const prevTab = tabs[prevIndex];
            
            if (prevTab) {
                this.switchToTab(prevTab.dataset.instanceId);
            }
        }

        /**
         * Clear all tabs
         */
        clearAllTabs() {
            if (this.tabsContainer) {
                this.tabsContainer.innerHTML = '';
            }
        }

        /**
         * Destroy tab manager
         */
        destroy() {
            if (this.tabBarElement) {
                this.tabBarElement.remove();
                this.tabBarElement = null;
            }
            this.tabsContainer = null;
            this.newTabButton = null;
        }
    }

    // Export to global scope
    window.WindowTabManager = WindowTabManager;

})();
