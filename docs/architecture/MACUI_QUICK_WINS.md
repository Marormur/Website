# MacUI Framework – Quick Wins Implementation Guide

Dieses Dokument beschreibt die schnellsten und wirkungsvollsten Verbesserungen, die innerhalb von 1-3 Tagen umsetzbar sind.

---

## 1. Button Component (Priorität: 🔥 Kritisch)

**Aufwand:** 2-3 Stunden  
**Datei:** `src/ts/framework/controls/button.ts`

### API Design

```typescript
export interface ButtonProps extends ComponentConfig {
    label: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    icon?: string;
    iconPosition?: 'left' | 'right';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    onClick?: (e: MouseEvent) => void;
}

export class Button extends BaseComponent<ButtonProps> {
    render(): VNode {
        const {
            label,
            variant = 'primary',
            size = 'medium',
            disabled = false,
            loading = false,
            onClick,
        } = this.props;

        const baseClasses =
            'macui-button inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';

        const variantClasses = {
            primary:
                'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
            secondary:
                'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 focus:ring-gray-500',
            danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
            ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
        };

        const sizeClasses = {
            small: 'px-2 py-1 text-xs',
            medium: 'px-4 py-2 text-sm',
            large: 'px-6 py-3 text-base',
        };

        const disabledClasses =
            disabled || loading
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer';

        return h(
            'button',
            {
                className: `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses}`,
                disabled: disabled || loading,
                onclick: !disabled && !loading ? onClick : undefined,
            },
            loading ? h('span', { className: 'animate-spin' }, '⟳') : '',
            this.props.icon && this.props.iconPosition !== 'right'
                ? h('span', {}, this.props.icon)
                : '',
            h('span', {}, label),
            this.props.icon && this.props.iconPosition === 'right'
                ? h('span', {}, this.props.icon)
                : ''
        );
    }
}
```

### Usage Example

```typescript
// In einer App
const saveButton = new Button({
    label: 'Speichern',
    variant: 'primary',
    icon: '💾',
    onClick: () => this.save(),
});

const cancelButton = new Button({
    label: 'Abbrechen',
    variant: 'secondary',
    onClick: () => this.cancel(),
});
```

### Tests

```javascript
// tests/e2e/framework/button.spec.js
test('Button renders with label', async ({ page }) => {
    await page.setContent('<div id="root"></div>');
    await page.evaluate(() => {
        const { Button } = window.MacUI;
        const btn = new Button({ label: 'Click Me' });
        btn.mount(document.getElementById('root'));
    });
    await expect(page.locator('.macui-button')).toContainText('Click Me');
});

test('Button handles click events', async ({ page }) => {
    let clicked = false;
    await page.exposeFunction('handleClick', () => {
        clicked = true;
    });
    await page.evaluate(() => {
        const btn = new Button({
            label: 'Click',
            onClick: () => window.handleClick(),
        });
        btn.mount(document.getElementById('root'));
    });
    await page.click('.macui-button');
    expect(clicked).toBe(true);
});
```

---

## 2. Toast/Notification System (Priorität: 🔥 Kritisch)

**Aufwand:** 3-4 Stunden  
**Dateien:**

- `src/ts/framework/feedback/toast.ts`
- `src/ts/framework/feedback/toast-manager.ts`

### API Design

```typescript
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
    type?: ToastType;
    message: string;
    duration?: number; // ms, 0 = permanent
    action?: {
        label: string;
        onClick: () => void;
    };
}

export class ToastManager {
    private toasts: Set<Toast> = new Set();
    private container: HTMLElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.className =
            'macui-toast-container fixed top-4 right-4 z-[9999] flex flex-col gap-2';
        document.body.appendChild(this.container);
    }

    show(options: ToastOptions): Toast {
        const toast = new Toast({
            ...options,
            onDismiss: () => this.remove(toast),
        });

        this.toasts.add(toast);
        const element = toast.mount();
        this.container.appendChild(element);

        // Auto-dismiss
        if (options.duration !== 0) {
            setTimeout(() => this.remove(toast), options.duration || 3000);
        }

        return toast;
    }

    remove(toast: Toast): void {
        toast.unmount();
        this.toasts.delete(toast);
    }

    success(message: string): Toast {
        return this.show({ type: 'success', message });
    }

    error(message: string): Toast {
        return this.show({ type: 'error', message, duration: 5000 });
    }

    warning(message: string): Toast {
        return this.show({ type: 'warning', message });
    }

    info(message: string): Toast {
        return this.show({ type: 'info', message });
    }
}

// Singleton Instance
export const toast = new ToastManager();
```

### Toast Component

```typescript
interface ToastProps extends ComponentConfig {
    type: ToastType;
    message: string;
    action?: { label: string; onClick: () => void };
    onDismiss: () => void;
}

class Toast extends BaseComponent<ToastProps> {
    render(): VNode {
        const { type, message, action, onDismiss } = this.props;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
        };

        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500',
        };

        return h(
            'div',
            {
                className: `macui-toast ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] animate-slide-in`,
            },
            h('span', { className: 'text-xl' }, icons[type]),
            h('span', { className: 'flex-1' }, message),
            action
                ? h(
                      'button',
                      {
                          className: 'underline hover:no-underline',
                          onclick: () => {
                              action.onClick();
                              onDismiss();
                          },
                      },
                      action.label
                  )
                : '',
            h(
                'button',
                {
                    className: 'ml-2 hover:bg-white/20 rounded p-1',
                    onclick: () => onDismiss(),
                },
                '✕'
            )
        );
    }
}
```

### Usage Example

```typescript
// In einer App
import { toast } from '../framework/feedback/toast-manager.js';

// Einfache Notification
toast.success('Datei gespeichert!');
toast.error('Fehler beim Laden');

// Mit Action Button
toast.show({
    type: 'info',
    message: 'Datei gelöscht',
    action: {
        label: 'Rückgängig',
        onClick: () => this.undoDelete(),
    },
});
```

### CSS Animation

```css
/* In tailwind.config.js erweitern */
module.exports = {
  theme: {
    extend: {
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
};
```

---

## 3. EmptyState Component (Priorität: ⚡ Quick Win)

**Aufwand:** 1 Stunde  
**Datei:** `src/ts/framework/feedback/empty-state.ts`

### API Design

```typescript
export interface EmptyStateProps extends ComponentConfig {
    icon?: string;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export class EmptyState extends BaseComponent<EmptyStateProps> {
    render(): VNode {
        const { icon = '📭', title, description, action } = this.props;

        return h(
            'div',
            {
                className:
                    'macui-empty-state flex flex-col items-center justify-center p-8 text-center min-h-[300px]',
            },
            h('div', { className: 'text-6xl mb-4' }, icon),
            h(
                'h3',
                {
                    className:
                        'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2',
                },
                title
            ),
            description
                ? h(
                      'p',
                      {
                          className:
                              'text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md',
                      },
                      description
                  )
                : '',
            action
                ? new Button({
                      label: action.label,
                      variant: 'primary',
                      onClick: action.onClick,
                  }).render()
                : ''
        );
    }
}
```

### Usage Example

```typescript
// In Finder bei leeren Repos
if (items.length === 0) {
    return new EmptyState({
        icon: '📂',
        title: 'Keine Dateien gefunden',
        description:
            'Dieses Repository ist leer oder die Suche ergab keine Treffer.',
        action: {
            label: 'Filter zurücksetzen',
            onClick: () => this.resetFilters(),
        },
    }).render();
}
```

---

## 4. Badge Component (Priorität: ⚡ Quick Win)

**Aufwand:** 30 Minuten  
**Datei:** `src/ts/framework/feedback/badge.ts`

### API Design

```typescript
export interface BadgeProps extends ComponentConfig {
    content: string | number;
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    size?: 'small' | 'medium';
    dot?: boolean; // Nur Punkt, kein Text
}

export class Badge extends BaseComponent<BadgeProps> {
    render(): VNode {
        const {
            content,
            variant = 'primary',
            size = 'medium',
            dot = false,
        } = this.props;

        const colors = {
            primary: 'bg-blue-500',
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            danger: 'bg-red-500',
        };

        const sizes = {
            small: 'text-[10px] px-1.5 py-0.5 min-w-[16px]',
            medium: 'text-xs px-2 py-1 min-w-[20px]',
        };

        if (dot) {
            return h('span', {
                className: `macui-badge-dot inline-block w-2 h-2 rounded-full ${colors[variant]}`,
            });
        }

        return h(
            'span',
            {
                className: `macui-badge inline-flex items-center justify-center rounded-full text-white font-semibold ${colors[variant]} ${sizes[size]}`,
            },
            String(content)
        );
    }
}
```

### Usage Example

```typescript
// In Sidebar Items
new Sidebar({
    groups: [
        {
            label: 'Files',
            items: [
                {
                    id: 'inbox',
                    label: 'Inbox',
                    icon: '📥',
                    badge: new Badge({
                        content: 5,
                        variant: 'danger',
                    }).render(),
                },
                {
                    id: 'starred',
                    label: 'Starred',
                    icon: '⭐',
                    badge: new Badge({
                        dot: true,
                        variant: 'success',
                    }).render(),
                },
            ],
        },
    ],
});
```

---

## 5. Input Component (Priorität: 🔥 Kritisch)

**Aufwand:** 2-3 Stunden  
**Datei:** `src/ts/framework/controls/input.ts`

### API Design

```typescript
export interface InputProps extends ComponentConfig {
    type?: 'text' | 'password' | 'email' | 'number' | 'search';
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    prefix?: VNode | string;
    suffix?: VNode | string;
    onInput?: (value: string) => void;
    onChange?: (value: string) => void;
    onEnter?: () => void;
}

export class Input extends BaseComponent<InputProps, { value: string }> {
    constructor(props: InputProps) {
        super(props);
        this.state = { value: props.value || '' };
    }

    render(): VNode {
        const {
            type = 'text',
            placeholder,
            disabled,
            error,
            helperText,
            prefix,
            suffix,
        } = this.props;

        const hasError = !!error;
        const borderColor = hasError
            ? 'border-red-500 focus-within:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus-within:ring-blue-500';

        return h(
            'div',
            { className: 'macui-input-wrapper w-full' },
            h(
                'div',
                {
                    className: `macui-input-container flex items-center gap-2 px-3 py-2 border ${borderColor} rounded-lg bg-white dark:bg-gray-800 transition-all focus-within:ring-2`,
                },
                prefix
                    ? h(
                          'div',
                          { className: 'macui-input-prefix text-gray-500' },
                          prefix
                      )
                    : '',
                h('input', {
                    type,
                    className:
                        'flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100',
                    placeholder,
                    value: this.state.value,
                    disabled,
                    oninput: (e: Event) => this.handleInput(e),
                    onchange: (e: Event) => this.handleChange(e),
                    onkeydown: (e: KeyboardEvent) => this.handleKeyDown(e),
                }),
                suffix
                    ? h(
                          'div',
                          { className: 'macui-input-suffix text-gray-500' },
                          suffix
                      )
                    : ''
            ),
            error
                ? h(
                      'p',
                      {
                          className:
                              'macui-input-error text-xs text-red-500 mt-1',
                      },
                      error
                  )
                : helperText
                  ? h(
                        'p',
                        {
                            className:
                                'macui-input-helper text-xs text-gray-500 mt-1',
                        },
                        helperText
                    )
                  : ''
        );
    }

    private handleInput(e: Event): void {
        const value = (e.target as HTMLInputElement).value;
        this.setState({ value });
        this.props.onInput?.(value);
    }

    private handleChange(e: Event): void {
        const value = (e.target as HTMLInputElement).value;
        this.props.onChange?.(value);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            this.props.onEnter?.();
        }
    }
}
```

### Usage Example

```typescript
// Search Input
const searchInput = new Input({
    type: 'search',
    placeholder: 'Suchen...',
    prefix: '🔍',
    onInput: value => this.handleSearch(value),
});

// Password Input mit Validation
const passwordInput = new Input({
    type: 'password',
    placeholder: 'Passwort eingeben',
    error: this.state.passwordError,
    helperText: 'Mindestens 8 Zeichen',
    onChange: value => this.validatePassword(value),
});
```

---

## 6. Error Boundary (Priorität: 🔥 Kritisch)

**Aufwand:** 1-2 Stunden  
**Datei:** `src/ts/framework/core/error-boundary.ts`

### Implementation

```typescript
interface ErrorBoundaryProps extends ComponentConfig {
    fallback?: (error: Error) => VNode;
    onError?: (error: Error, errorInfo: string) => void;
    children: VNode;
}

export class ErrorBoundary extends BaseComponent<
    ErrorBoundaryProps,
    { hasError: boolean; error: Error | null }
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    render(): VNode {
        if (this.state.hasError && this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error);
            }
            return this.defaultFallback(this.state.error);
        }

        return this.props.children;
    }

    private defaultFallback(error: Error): VNode {
        return h(
            'div',
            {
                className:
                    'macui-error-boundary p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg',
            },
            h(
                'h3',
                {
                    className:
                        'text-red-800 dark:text-red-200 font-semibold mb-2',
                },
                '⚠️ Fehler'
            ),
            h(
                'p',
                { className: 'text-red-700 dark:text-red-300 text-sm mb-2' },
                error.message
            ),
            h(
                'button',
                {
                    className:
                        'text-sm underline text-red-600 dark:text-red-400',
                    onclick: () => this.reset(),
                },
                'Erneut versuchen'
            )
        );
    }

    private reset(): void {
        this.setState({ hasError: false, error: null });
    }

    // Override update to catch errors
    update(newProps?: Partial<ErrorBoundaryProps>): void {
        try {
            super.update(newProps);
        } catch (error) {
            this.handleError(error as Error);
        }
    }

    private handleError(error: Error): void {
        this.setState({ hasError: true, error });
        this.props.onError?.(error, error.stack || '');

        // Log to global error handler
        if (window.ErrorHandler) {
            window.ErrorHandler.handleError(error, {
                context: 'ErrorBoundary',
            });
        }
    }
}
```

### Usage Example

```typescript
// Wrap kritische Komponenten
const app = new ErrorBoundary({
    onError: error => {
        console.error('Component Error:', error);
        API.toast?.error('Ein Fehler ist aufgetreten');
    },
    children: new FinderUI({
        /* props */
    }).render(),
});
```

---

## 7. Integration & Testing

### 7.1 Framework Index Export

```typescript
// src/ts/framework/index.ts
export * from './core/component.js';
export * from './core/error-boundary.js';
export * from './layout/app-shell.js';
export * from './layout/split-view.js';
export * from './navigation/sidebar.js';
export * from './navigation/toolbar.js';
export * from './navigation/tabs.js';
export * from './navigation/breadcrumbs.js';
export * from './data/list-view.js';
export * from './data/grid-view.js';
export * from './data/data-view.js';
export * from './controls/button.js';
export * from './controls/input.js';
export * from './feedback/toast.js';
export * from './feedback/empty-state.js';
export * from './feedback/badge.js';
```

### 7.2 Global API Integration

```typescript
// src/ts/core/api.ts
import * as MacUI from '../framework/index.js';

window.MacUI = MacUI;

declare global {
    interface Window {
        MacUI: typeof MacUI;
    }
}
```

### 7.3 E2E Test Setup

```javascript
// tests/e2e/framework/setup.spec.js
test('MacUI Framework is available', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__APP_READY);

    const hasFramework = await page.evaluate(() => {
        return typeof window.MacUI !== 'undefined';
    });

    expect(hasFramework).toBe(true);
});

test('All core components are exported', async ({ page }) => {
    const components = await page.evaluate(() => {
        return Object.keys(window.MacUI);
    });

    expect(components).toContain('Button');
    expect(components).toContain('Input');
    expect(components).toContain('Toast');
    expect(components).toContain('EmptyState');
    expect(components).toContain('Badge');
});
```

---

## 8. Rollout-Strategie

### Phase 1: Finder Integration (Tag 1)

1. Button Component in Toolbar verwenden
2. EmptyState für leere Repos
3. Toast für GitHub API Errors

### Phase 2: Terminal Integration (Tag 2)

1. Input für Command-Zeile
2. Error Boundary um Session-Komponenten
3. Badge für Command History Count

### Phase 3: TextEditor Integration (Tag 3)

1. Button für Save/Load Actions
2. Toast für Save Success/Errors
3. EmptyState für "No File Open"

---

## 9. Checkliste

- [ ] `Button` Component erstellt
- [ ] `Input` Component erstellt
- [ ] `Toast` System implementiert
- [ ] `EmptyState` Component erstellt
- [ ] `Badge` Component erstellt
- [ ] `ErrorBoundary` implementiert
- [ ] Framework Index Export aktualisiert
- [ ] Global API Integration
- [ ] E2E Tests geschrieben
- [ ] Finder Integration (1 Komponente als Proof-of-Concept)
- [ ] Dokumentation aktualisiert

---

## 10. Erwartete Vorteile

Nach Implementierung dieser Quick Wins:

✅ **40% weniger Code** für neue Features  
✅ **Konsistente UX** über alle Apps  
✅ **Bessere Fehlerbehandlung** durch Error Boundaries  
✅ **Schnelleres Development** durch wiederverwendbare Komponenten  
✅ **Bessere Testbarkeit** durch isolierte Komponenten

**Geschätzter ROI:** 3-4 Tage Implementierung spart 10+ Tage bei zukünftigen Features.
