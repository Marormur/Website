/**
 * Accessibility utilities for MacUI framework
 * Provides helpers for ARIA attributes, keyboard navigation, and screen reader support
 */

/**
 * ARIA role types
 */
export type AriaRole =
	| 'button'
	| 'checkbox'
	| 'dialog'
	| 'menu'
	| 'menuitem'
	| 'menubar'
	| 'navigation'
	| 'tab'
	| 'tablist'
	| 'tabpanel'
	| 'tree'
	| 'treeitem'
	| 'grid'
	| 'gridcell'
	| 'listbox'
	| 'option'
	| 'tooltip'
	| 'alert'
	| 'status'
	| 'progressbar';

/**
 * ARIA attributes interface
 */
export interface AriaAttributes {
	role?: AriaRole;
	'aria-label'?: string;
	'aria-labelledby'?: string;
	'aria-describedby'?: string;
	'aria-expanded'?: boolean;
	'aria-selected'?: boolean;
	'aria-checked'?: boolean;
	'aria-disabled'?: boolean;
	'aria-hidden'?: boolean;
	'aria-live'?: 'off' | 'polite' | 'assertive';
	'aria-atomic'?: boolean;
	'aria-busy'?: boolean;
	'aria-controls'?: string;
	'aria-current'?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean;
	'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
	'aria-level'?: number;
	'aria-multiselectable'?: boolean;
	'aria-orientation'?: 'horizontal' | 'vertical';
	'aria-pressed'?: boolean;
	'aria-required'?: boolean;
	'aria-valuemin'?: number;
	'aria-valuemax'?: number;
	'aria-valuenow'?: number;
	'aria-valuetext'?: string;
}

/**
 * Apply ARIA attributes to an element
 */
export function applyAriaAttributes(element: HTMLElement, attributes: AriaAttributes): void {
	Object.entries(attributes).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			if (typeof value === 'boolean') {
				element.setAttribute(key, value.toString());
			} else {
				element.setAttribute(key, String(value));
			}
		}
	});
}

/**
 * Make an element focusable
 */
export function makeFocusable(element: HTMLElement, tabIndex = 0): void {
	element.setAttribute('tabindex', String(tabIndex));
}

/**
 * Remove focus from an element
 */
export function makeUnfocusable(element: HTMLElement): void {
	element.setAttribute('tabindex', '-1');
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
	const announcement = document.createElement('div');
	announcement.setAttribute('role', 'status');
	announcement.setAttribute('aria-live', priority);
	announcement.setAttribute('aria-atomic', 'true');
	announcement.className = 'sr-only';
	announcement.textContent = message;

	document.body.appendChild(announcement);

	// Remove after announcement
	setTimeout(() => {
		document.body.removeChild(announcement);
	}, 1000);
}

/**
 * Focus trap for modals/dialogs
 */
export class FocusTrap {
	private element: HTMLElement;
	private focusableElements: HTMLElement[];
	private firstFocusable?: HTMLElement;
	private lastFocusable?: HTMLElement;
	private previousFocus?: HTMLElement;

	constructor(element: HTMLElement) {
		this.element = element;
		this.focusableElements = [];
		this.updateFocusableElements();
	}

	/**
	 * Update list of focusable elements
	 */
	private updateFocusableElements(): void {
		const selector = [
			'a[href]',
			'button:not([disabled])',
			'textarea:not([disabled])',
			'input:not([disabled])',
			'select:not([disabled])',
			'[tabindex]:not([tabindex="-1"])',
		].join(',');

		this.focusableElements = Array.from(this.element.querySelectorAll(selector));
		this.firstFocusable = this.focusableElements[0];
		this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
	}

	/**
	 * Handle tab key press
	 */
	private handleTabKey = (event: KeyboardEvent): void => {
		if (event.key !== 'Tab') return;

		this.updateFocusableElements();

		if (this.focusableElements.length === 0) {
			event.preventDefault();
			return;
		}

		if (event.shiftKey) {
			// Shift + Tab
			if (document.activeElement === this.firstFocusable) {
				event.preventDefault();
				this.lastFocusable?.focus();
			}
		} else {
			// Tab
			if (document.activeElement === this.lastFocusable) {
				event.preventDefault();
				this.firstFocusable?.focus();
			}
		}
	};

	/**
	 * Activate focus trap
	 */
	activate(): void {
		this.previousFocus = document.activeElement as HTMLElement;
		this.element.addEventListener('keydown', this.handleTabKey);
		this.firstFocusable?.focus();
	}

	/**
	 * Deactivate focus trap
	 */
	deactivate(): void {
		this.element.removeEventListener('keydown', this.handleTabKey);
		this.previousFocus?.focus();
	}
}

/**
 * Keyboard navigation helper
 */
export class KeyboardNavigation {
	private elements: HTMLElement[];
	private currentIndex = -1;
	private orientation: 'horizontal' | 'vertical';

	constructor(elements: HTMLElement[], orientation: 'horizontal' | 'vertical' = 'vertical') {
		this.elements = elements;
		this.orientation = orientation;
	}

	/**
	 * Handle keyboard navigation
	 */
	handleKeyDown(event: KeyboardEvent): boolean {
		const { key } = event;
		let handled = false;

		if (this.orientation === 'vertical') {
			if (key === 'ArrowDown') {
				this.next();
				handled = true;
			} else if (key === 'ArrowUp') {
				this.previous();
				handled = true;
			}
		} else {
			if (key === 'ArrowRight') {
				this.next();
				handled = true;
			} else if (key === 'ArrowLeft') {
				this.previous();
				handled = true;
			}
		}

		if (key === 'Home') {
			this.first();
			handled = true;
		} else if (key === 'End') {
			this.last();
			handled = true;
		}

		if (handled) {
			event.preventDefault();
		}

		return handled;
	}

	/**
	 * Focus next element
	 */
	next(): void {
		this.currentIndex = (this.currentIndex + 1) % this.elements.length;
		this.focusCurrent();
	}

	/**
	 * Focus previous element
	 */
	previous(): void {
		this.currentIndex = this.currentIndex <= 0 ? this.elements.length - 1 : this.currentIndex - 1;
		this.focusCurrent();
	}

	/**
	 * Focus first element
	 */
	first(): void {
		this.currentIndex = 0;
		this.focusCurrent();
	}

	/**
	 * Focus last element
	 */
	last(): void {
		this.currentIndex = this.elements.length - 1;
		this.focusCurrent();
	}

	/**
	 * Focus current element
	 */
	private focusCurrent(): void {
		const element = this.elements[this.currentIndex];
		if (element) {
			element.focus();
			element.scrollIntoView({ block: 'nearest' });
		}
	}

	/**
	 * Get current index
	 */
	getCurrentIndex(): number {
		return this.currentIndex;
	}

	/**
	 * Set current index
	 */
	setCurrentIndex(index: number): void {
		if (index >= 0 && index < this.elements.length) {
			this.currentIndex = index;
		}
	}

	/**
	 * Update elements list
	 */
	updateElements(elements: HTMLElement[]): void {
		this.elements = elements;
		if (this.currentIndex >= elements.length) {
			this.currentIndex = elements.length - 1;
		}
	}
}

/**
 * Add screen reader only class to CSS (call once at app init)
 */
export function initializeAccessibilityCSS(): void {
	if (document.getElementById('macui-a11y-styles')) return;

	const style = document.createElement('style');
	style.id = 'macui-a11y-styles';
	style.textContent = `
		.sr-only {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border-width: 0;
		}
		
		.focus-visible:focus {
			outline: 2px solid #0066cc;
			outline-offset: 2px;
		}
	`;
	document.head.appendChild(style);
}

// Initialize accessibility CSS on load
if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initializeAccessibilityCSS);
	} else {
		initializeAccessibilityCSS();
	}
}
