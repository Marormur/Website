/**
 * MacUI Framework Utilities
 * Production polish utilities for performance, bundle analysis, and accessibility
 */

export { ComponentPerformanceMonitor, performanceMonitor } from './performance-monitor';
export { BundleAnalyzer, bundleAnalyzer } from './bundle-analyzer';
export {
	type AriaRole,
	type AriaAttributes,
	applyAriaAttributes,
	makeFocusable,
	makeUnfocusable,
	announceToScreenReader,
	FocusTrap,
	KeyboardNavigation,
	initializeAccessibilityCSS,
} from './accessibility';
