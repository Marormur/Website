// Ambient types for Dialog system

declare interface DialogOptions {
  closeButton?: string;
  persistent?: boolean;
}

declare class Dialog {
  constructor(id: string, options?: DialogOptions);
  open(): void;
  close(): void;
  isOpen(): boolean;
}

declare interface Window {
  Dialog: typeof Dialog;
}
