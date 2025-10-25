console.log('WindowChrome loaded');

(function () {
  'use strict';

  type ControlType = 'close' | 'minimize' | 'maximize';

  type TitlebarConfig = {
    title?: string;
    icon?: string;
    showClose?: boolean;
    showMinimize?: boolean;
    showMaximize?: boolean;
    onClose?: () => void;
    onMinimize?: () => void;
    onMaximize?: () => void;
  };

  type ToolbarSeparator = { type: 'separator' };
  type ToolbarButtonCfg = {
    label?: string;
    icon?: string;
    title?: string;
    action?: string;
    onClick?: (e: MouseEvent) => void;
  };
  type ToolbarItem = ToolbarSeparator | ToolbarButtonCfg;

  type StatusBarConfig = {
    leftContent?: string;
    rightContent?: string;
  };

  type WindowFrameConfig = TitlebarConfig & {
    toolbar?: ToolbarItem[];
    showStatusBar?: boolean;
    statusBarLeft?: string;
    statusBarRight?: string;
  };

  type WindowFrameParts = {
    frame: HTMLElement;
    titlebar: HTMLElement;
    content: HTMLElement;
    statusbar: HTMLElement | null;
  };

  function createControlButton(type: ControlType, symbol: string, callback?: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `window-control-btn window-${type}-btn`;
    btn.innerHTML = symbol;
    btn.style.cssText =
      'width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: background-color 0.2s;';

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
      btn.addEventListener('click', () => callback());
    }

    return btn;
  }

  function createToolbarButton(config: ToolbarButtonCfg): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toolbar-btn px-2 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition';

    if (config.icon) {
      btn.innerHTML = config.icon;
    } else if (config.label) {
      btn.textContent = config.label;
    }

    if (config.title) btn.title = config.title;
    if (config.action) btn.dataset.action = config.action;
    if (config.onClick) btn.addEventListener('click', config.onClick);

    return btn;
  }

  const WindowChrome = {
    createTitlebar(config: TitlebarConfig): HTMLElement {
      const titlebar = document.createElement('div');
      titlebar.className =
        'window-titlebar flex items-center justify-between px-3 py-2 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700';
      titlebar.style.cssText = 'height: 32px; cursor: move; user-select: none;';

      const leftSide = document.createElement('div');
      leftSide.className = 'flex items-center gap-2';

      if (config.icon) {
        const iconEl = document.createElement('span');
        iconEl.className = 'window-icon';

        if (config.icon.startsWith('http') || config.icon.startsWith('./') || config.icon.startsWith('/')) {
          const img = document.createElement('img');
          img.src = config.icon;
          img.alt = '';
          img.style.cssText = 'width: 16px; height: 16px; object-fit: contain;';
          iconEl.appendChild(img);
        } else {
          iconEl.textContent = config.icon;
          iconEl.style.fontSize = '16px';
        }

        leftSide.appendChild(iconEl);
      }

      const titleEl = document.createElement('span');
      titleEl.className = 'window-title font-medium text-sm text-gray-800 dark:text-gray-200';
      titleEl.textContent = config.title || 'Untitled';
      (titleEl as HTMLElement).dataset.titleTarget = 'true';
      leftSide.appendChild(titleEl);

      titlebar.appendChild(leftSide);

      const rightSide = document.createElement('div');
      rightSide.className = 'flex items-center gap-1';

      if (config.showMinimize) {
        rightSide.appendChild(createControlButton('minimize', '−', config.onMinimize));
      }
      if (config.showMaximize) {
        rightSide.appendChild(createControlButton('maximize', '□', config.onMaximize));
      }
      if (config.showClose !== false) {
        rightSide.appendChild(createControlButton('close', '×', config.onClose));
      }

      titlebar.appendChild(rightSide);

      return titlebar;
    },

    createToolbar(buttons: ToolbarItem[]): HTMLElement {
      const toolbar = document.createElement('div');
      toolbar.className =
        'window-toolbar flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700';

      buttons.forEach((btn) => {
        if ((btn as ToolbarSeparator).type === 'separator') {
          const separator = document.createElement('div');
          separator.className = 'toolbar-separator';
          separator.style.cssText = 'width: 1px; height: 20px; background: currentColor; opacity: 0.2;';
          toolbar.appendChild(separator);
        } else {
          toolbar.appendChild(createToolbarButton(btn as ToolbarButtonCfg));
        }
      });

      return toolbar;
    },

    createStatusBar(config: StatusBarConfig): HTMLElement {
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

    updateTitle(titlebar: HTMLElement, newTitle: string): void {
      const titleEl = titlebar.querySelector('[data-title-target="true"]');
      if (titleEl) (titleEl as HTMLElement).textContent = newTitle;
    },

    updateStatusBar(statusBar: HTMLElement, side: 'left' | 'right', content: string): void {
      const target = statusBar.querySelector(`.statusbar-${side}`);
      if (target) (target as HTMLElement).textContent = content;
    },

    createWindowFrame(config: WindowFrameConfig): WindowFrameParts {
      const frame = document.createElement('div');
      frame.className = 'window-frame flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden';

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

      let statusbar: HTMLElement | null = null;
      if (config.showStatusBar) {
        statusbar = this.createStatusBar({
          leftContent: config.statusBarLeft || '',
          rightContent: config.statusBarRight || '',
        });
        frame.appendChild(statusbar);
      }

      return { frame, titlebar, content, statusbar };
    },
  } as const;

  (window as unknown as { WindowChrome: typeof WindowChrome }).WindowChrome = WindowChrome;
})();
