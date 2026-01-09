/**
 * Performance monitoring utilities for framework components
 * Tracks render times, memory usage, and component lifecycle metrics
 */

interface PerformanceMetrics {
	componentName: string;
	renderTime: number;
	updateTime: number;
	renderCount: number;
	lastRenderTime: number;
}

interface MemorySnapshot {
	timestamp: number;
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
}

/**
 * Component performance monitor
 * Tracks render times and identifies performance bottlenecks
 */
export class ComponentPerformanceMonitor {
	private metrics: Map<string, PerformanceMetrics> = new Map();
	private memorySnapshots: MemorySnapshot[] = [];
	private readonly maxSnapshots = 100;
	private enabled = false;

	/**
	 * Enable performance monitoring
	 */
	enable(): void {
		this.enabled = true;
		console.log('[MacUI Performance] Monitoring enabled');
	}

	/**
	 * Disable performance monitoring
	 */
	disable(): void {
		this.enabled = false;
		console.log('[MacUI Performance] Monitoring disabled');
	}

	/**
	 * Mark start of component render
	 */
	markRenderStart(componentName: string): void {
		if (!this.enabled) return;
		performance.mark(`${componentName}-render-start`);
	}

	/**
	 * Mark end of component render
	 */
	markRenderEnd(componentName: string): void {
		if (!this.enabled) return;

		const startMark = `${componentName}-render-start`;
		const endMark = `${componentName}-render-end`;

		performance.mark(endMark);

		try {
			performance.measure(`${componentName}-render`, startMark, endMark);
			const entries = performance.getEntriesByName(`${componentName}-render`);
			const measure = entries[0];

			if (!measure) {
				return;
			}

			const metrics = this.metrics.get(componentName) || {
				componentName,
				renderTime: 0,
				updateTime: 0,
				renderCount: 0,
				lastRenderTime: 0,
			};

			metrics.renderCount++;
			metrics.lastRenderTime = measure.duration;
			metrics.renderTime = (metrics.renderTime * (metrics.renderCount - 1) + measure.duration) / metrics.renderCount;

			this.metrics.set(componentName, metrics);

			// Clean up marks
			performance.clearMarks(startMark);
			performance.clearMarks(endMark);
			performance.clearMeasures(`${componentName}-render`);

			// Warn if slow render
			if (measure.duration > 16) {
				console.warn(`[MacUI Performance] Slow render: ${componentName} took ${measure.duration.toFixed(2)}ms`);
			}
		} catch {
			// Mark might not exist, ignore
		}
	}

	/**
	 * Take a memory snapshot
	 */
	takeMemorySnapshot(): void {
		if (!this.enabled) return;

		// @ts-expect-error - performance.memory is non-standard but widely supported
		if (performance.memory) {
			// @ts-expect-error - performance.memory is non-standard but widely supported
			const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;

			this.memorySnapshots.push({
				timestamp: Date.now(),
				usedJSHeapSize,
				totalJSHeapSize,
				jsHeapSizeLimit,
			});

			// Keep only recent snapshots
			if (this.memorySnapshots.length > this.maxSnapshots) {
				this.memorySnapshots.shift();
			}
		}
	}

	/**
	 * Get performance metrics for a component
	 */
	getMetrics(componentName: string): PerformanceMetrics | undefined {
		return this.metrics.get(componentName);
	}

	/**
	 * Get all performance metrics
	 */
	getAllMetrics(): Map<string, PerformanceMetrics> {
		return new Map(this.metrics);
	}

	/**
	 * Get memory snapshots
	 */
	getMemorySnapshots(): MemorySnapshot[] {
		return [...this.memorySnapshots];
	}

	/**
	 * Get performance report
	 */
	getReport(): {
		components: PerformanceMetrics[];
		slowComponents: PerformanceMetrics[];
		totalRenders: number;
		averageRenderTime: number;
		memoryTrend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
	} {
		const components = Array.from(this.metrics.values());
		const slowComponents = components.filter((m) => m.renderTime > 16);
		const totalRenders = components.reduce((sum, m) => sum + m.renderCount, 0);
		const averageRenderTime =
			totalRenders > 0 ? components.reduce((sum, m) => sum + m.renderTime * m.renderCount, 0) / totalRenders : 0;

		// Analyze memory trend
		let memoryTrend: 'increasing' | 'stable' | 'decreasing' | 'unknown' = 'unknown';
		if (this.memorySnapshots.length >= 10) {
			const recent = this.memorySnapshots.slice(-10);
			const first = recent[0];
			const last = recent[recent.length - 1];
			
			if (first && last) {
				const change = ((last.usedJSHeapSize - first.usedJSHeapSize) / first.usedJSHeapSize) * 100;

				if (change > 10) memoryTrend = 'increasing';
				else if (change < -10) memoryTrend = 'decreasing';
				else memoryTrend = 'stable';
			}
		}

		return {
			components,
			slowComponents,
			totalRenders,
			averageRenderTime,
			memoryTrend,
		};
	}

	/**
	 * Clear all metrics
	 */
	clear(): void {
		this.metrics.clear();
		this.memorySnapshots = [];
		console.log('[MacUI Performance] Metrics cleared');
	}

	/**
	 * Log performance report to console
	 */
	logReport(): void {
		const report = this.getReport();

		console.group('[MacUI Performance Report]');
		console.log(`Total renders: ${report.totalRenders}`);
		console.log(`Average render time: ${report.averageRenderTime.toFixed(2)}ms`);
		console.log(`Memory trend: ${report.memoryTrend}`);

		if (report.slowComponents.length > 0) {
			console.group('Slow components (>16ms):');
			report.slowComponents.forEach((m) => {
				console.log(`${m.componentName}: ${m.renderTime.toFixed(2)}ms avg (${m.renderCount} renders)`);
			});
			console.groupEnd();
		}

		console.table(
			report.components.map((m) => ({
				Component: m.componentName,
				'Avg Render (ms)': m.renderTime.toFixed(2),
				'Last Render (ms)': m.lastRenderTime.toFixed(2),
				'Render Count': m.renderCount,
			}))
		);

		console.groupEnd();
	}
}

// Singleton instance
export const performanceMonitor = new ComponentPerformanceMonitor();

// Add to window for debugging
declare global {
	interface Window {
		MacUIPerf?: ComponentPerformanceMonitor;
	}
}

if (typeof window !== 'undefined') {
	window.MacUIPerf = performanceMonitor;
}
