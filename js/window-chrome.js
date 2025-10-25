console.log('WindowChrome loaded');

/**
 * WindowChrome - Wiederverwendbare UI-Komponenten für Fenster
 *
 * Bündelt gemeinsame UI-Elemente:
 * - Titlebar mit Icon, Titel und Buttons
 * - Toolbar pattern
 * - Status bar
 * - Resize handles
 */
(function () {
    'use strict';

    const WindowChrome = {
        /**
         * Create a standard titlebar
         * @param {Object} config
         * @param {string} config.title - Window title
         * @param {string} config.icon - Icon URL or emoji
         * @param {boolean} config.showClose - Show close button
         * @param {boolean} config.showMinimize - Show minimize button
         * @param {boolean} config.showMaximize - Show maximize button
         * @param {Function} config.onClose - Close callback
         * @param {Function} config.onMinimize - Minimize callback
         * @param {Function} config.onMaximize - Maximize callback
         * @returns {HTMLElement}
         */
        createTitlebar(config) {
            const titlebar = document.createElement('div');
            titlebar.className =
                'window-titlebar flex items-center justify-between px-3 py-2 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700';
            titlebar.style.cssText =
                'height: 32px; cursor: move; user-select: none;';

            // Left side: Icon + Title
            const leftSide = document.createElement('div');
            leftSide.className = 'flex items-center gap-2';

            if (config.icon) {
                const iconEl = document.createElement('span');
                iconEl.className = 'window-icon';

                if (
                    config.icon.startsWith('http') ||
                    config.icon.startsWith('./') ||
                    config.icon.startsWith('/')
                ) {
                    const img = document.createElement('img');
                    img.src = config.icon;
                    img.alt = '';
                    img.style.cssText =
                        'width: 16px; height: 16px; object-fit: contain;';
                    iconEl.appendChild(img);
                } else {
                    // Emoji
                    iconEl.textContent = config.icon;
                    iconEl.style.fontSize = '16px';
                }

                leftSide.appendChild(iconEl);
            }

            const titleEl = document.createElement('span');
            titleEl.className =
                'window-title font-medium text-sm text-gray-800 dark:text-gray-200';
            titleEl.textContent = config.title || 'Untitled';
            titleEl.dataset.titleTarget = 'true'; // For easy title updates
            leftSide.appendChild(titleEl);

            titlebar.appendChild(leftSide);

            // Right side: Control buttons
            const rightSide = document.createElement('div');
            rightSide.className = 'flex items-center gap-1';

            if (config.showMinimize) {
                const minBtn = this._createControlButton(
                    'minimize',
                    '−',
                    config.onMinimize,
                );
                rightSide.appendChild(minBtn);
            }

            if (config.showMaximize) {
                const maxBtn = this._createControlButton(
                    'maximize',
                    '□',
                    config.onMaximize,
                );
                rightSide.appendChild(maxBtn);
            }

            if (config.showClose !== false) {
                const closeBtn = this._createControlButton(
                    'close',
                    '×',
                    config.onClose,
                );
                rightSide.appendChild(closeBtn);
            }

            titlebar.appendChild(rightSide);

            return titlebar;
        },

        /**
         * Create a toolbar
         * @param {Array<Object>} buttons - Button configurations
         * @returns {HTMLElement}
         */
        createToolbar(buttons) {
            const toolbar = document.createElement('div');
            toolbar.className =
                'window-toolbar flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700';

            buttons.forEach((btnConfig) => {
                if (btnConfig.type === 'separator') {
                    const separator = document.createElement('div');
                    separator.className = 'toolbar-separator';
                    separator.style.cssText =
                        'width: 1px; height: 20px; background: currentColor; opacity: 0.2;';
                    toolbar.appendChild(separator);
                } else {
                    const btn = this._createToolbarButton(btnConfig);
                    toolbar.appendChild(btn);
                }
            });

            return toolbar;
        },

        /**
         * Create a status bar
         * @param {Object} config
         * @param {string} config.leftContent - Left side content
         * @param {string} config.rightContent - Right side content
         * @returns {HTMLElement}
         */
        createStatusBar(config) {
            const statusBar = document.createElement('div');
            statusBar.className =
                'window-statusbar flex items-center justify-between px-3 py-1 bg-gray-100 dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400';
            statusBar.style.cssText = 'height: 24px;';

            const leftEl = document.createElement('span');
            leftEl.className = 'statusbar-left';
            leftEl.textContent = config.leftContent || '';
            statusBar.appendChild(leftEl);

            const rightEl = document.createElement('span');
            rightEl.className = 'statusbar-right';
            rightEl.textContent = config.rightContent || '';
            statusBar.appendChild(rightEl);

            return statusBar;
        },

        /**
         * Update titlebar title
         * @param {HTMLElement} titlebar
         * @param {string} newTitle
         */
        updateTitle(titlebar, newTitle) {
            const titleEl = titlebar.querySelector(
                '[data-title-target="true"]',
            );
            if (titleEl) {
                titleEl.textContent = newTitle;
            }
        },

        /**
         * Update status bar content
         * @param {HTMLElement} statusBar
         * @param {string} side - 'left' or 'right'
         * @param {string} content
         */
        updateStatusBar(statusBar, side, content) {
            const target = statusBar.querySelector(`.statusbar-${side}`);
            if (target) {
                target.textContent = content;
            }
        },

        /**
         * Create control button (close, minimize, maximize)
         * @private
         */
        _createControlButton(type, symbol, callback) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `window-control-btn window-${type}-btn`;
            btn.innerHTML = symbol;
            btn.style.cssText =
                'width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background-color 0.2s;';

            // Hover styles
            btn.addEventListener('mouseenter', () => {
                if (type === 'close') {
                    btn.style.backgroundColor = '#ef4444';
                    btn.style.color = '#ffffff';
                } else {
                    btn.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                }
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.backgroundColor = 'transparent';
                btn.style.color = '';
            });

            if (callback) {
                btn.addEventListener('click', callback);
            }

            return btn;
        },

        /**
         * Create toolbar button
         * @private
         */
        _createToolbarButton(config) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className =
                'toolbar-btn px-2 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition';

            if (config.icon) {
                btn.innerHTML = config.icon;
            } else if (config.label) {
                btn.textContent = config.label;
            }

            if (config.title) {
                btn.title = config.title;
            }

            if (config.action) {
                btn.dataset.action = config.action;
            }

            if (config.onClick) {
                btn.addEventListener('click', config.onClick);
            }

            return btn;
        },

        /**
         * Create a complete window frame
         * @param {Object} config
         * @returns {Object} - { frame, titlebar, content, statusbar }
         */
        createWindowFrame(config) {
            const frame = document.createElement('div');
            frame.className =
                'window-frame flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden';

            const titlebar = this.createTitlebar({
                title: config.title || 'Untitled',
                icon: config.icon,
                showClose: config.showClose,
                showMinimize: config.showMinimize,
                showMaximize: config.showMaximize,
                onClose: config.onClose,
                onMinimize: config.onMinimize,
                onMaximize: config.onMaximize,
            });
            frame.appendChild(titlebar);

            if (config.toolbar) {
                const toolbar = this.createToolbar(config.toolbar);
                frame.appendChild(toolbar);
            }

            const content = document.createElement('div');
            content.className = 'window-content flex-1 overflow-auto';
            frame.appendChild(content);

            let statusbar = null;
            if (config.showStatusBar) {
                statusbar = this.createStatusBar({
                    leftContent: config.statusBarLeft || '',
                    rightContent: config.statusBarRight || '',
                });
                frame.appendChild(statusbar);
            }

            return { frame, titlebar, content, statusbar };
        },
    };

    // Export to global scope
    window.WindowChrome = WindowChrome;
})();
