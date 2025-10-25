// Ambient types for WindowChrome globals

declare type WindowChromeToolbarItem =
  | { type: 'separator' }
  | { label?: string; icon?: string; title?: string; action?: string; onClick?: () => void };

declare interface WindowChromeTitlebarOptions {
  title: string;
  icon?: string;
  showClose?: boolean;
  showMinimize?: boolean;
  showMaximize?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

declare interface WindowChromeStatusBarOptions {
  leftContent?: string;
  rightContent?: string;
}

declare interface WindowChromeAPI {
  createTitlebar(config: WindowChromeTitlebarOptions): HTMLElement;
  createToolbar(buttons: WindowChromeToolbarItem[]): HTMLElement;
  createStatusBar(config: WindowChromeStatusBarOptions): HTMLElement;
  updateTitle(titlebar: HTMLElement, newTitle: string): void;
  updateStatusBar(statusBar: HTMLElement, side: 'left' | 'right', content: string): void;
  createWindowFrame(config: {
    title?: string;
    icon?: string;
    showClose?: boolean;
    showMinimize?: boolean;
    showMaximize?: boolean;
    onClose?: () => void;
    onMinimize?: () => void;
    onMaximize?: () => void;
    toolbar?: WindowChromeToolbarItem[];
    showStatusBar?: boolean;
    statusBarLeft?: string;
    statusBarRight?: string;
  }): { frame: HTMLElement; titlebar: HTMLElement; content: HTMLElement; statusbar: HTMLElement | null };
}

declare const WindowChrome: WindowChromeAPI;

// Note: Window interface extension moved to types/index.d.ts to avoid duplicate identifiers
