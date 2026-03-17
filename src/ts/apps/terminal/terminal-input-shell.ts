export function getTerminalInputShell(root: ParentNode | null): HTMLElement | null {
    return root?.querySelector('[data-terminal-input-shell]') ?? null;
}

export function syncTerminalInputMetrics(
    inputElement: HTMLInputElement | null,
    root: ParentNode | null
): void {
    if (!inputElement) return;

    const shell = getTerminalInputShell(root);
    const charWidth = Math.max(inputElement.value.length + 0.8, 1.2);
    if (shell) shell.style.width = `${charWidth}ch`;
}

export function focusTerminalInputAtEnd(
    inputElement: HTMLInputElement | null,
    root: ParentNode | null
): void {
    if (!inputElement) return;

    inputElement.focus();
    const valueLength = inputElement.value.length;
    inputElement.setSelectionRange(valueLength, valueLength);
    syncTerminalInputMetrics(inputElement, root);
}

export function setTerminalInputShellFocused(root: ParentNode | null, focused: boolean): void {
    getTerminalInputShell(root)?.classList.toggle('is-focused', focused);
}
