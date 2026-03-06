import logger from '../../core/logger.js';
/**
 * Bundle size analyzer for MacUI framework
 * Helps identify large components and optimize bundle size
 */

interface ComponentSize {
    name: string;
    size: number; // Estimated size in bytes
    dependencies: string[];
}

/**
 * Bundle analyzer utility
 * Analyzes component sizes and dependencies
 */
export class BundleAnalyzer {
    private componentSizes: Map<string, ComponentSize> = new Map();

    /**
     * Register a component with its estimated size
     */
    registerComponent(name: string, size: number, dependencies: string[] = []): void {
        this.componentSizes.set(name, { name, size, dependencies });
    }

    /**
     * Get total bundle size
     */
    getTotalSize(): number {
        return Array.from(this.componentSizes.values()).reduce((sum, c) => sum + c.size, 0);
    }

    /**
     * Get component sizes sorted by size
     */
    getComponentsSortedBySize(): ComponentSize[] {
        return Array.from(this.componentSizes.values()).sort((a, b) => b.size - a.size);
    }

    /**
     * Get largest components
     */
    getLargestComponents(count = 5): ComponentSize[] {
        return this.getComponentsSortedBySize().slice(0, count);
    }

    /**
     * Get size report
     */
    getReport(): {
        totalSize: number;
        totalSizeKB: number;
        gzippedEstimate: number;
        componentCount: number;
        largestComponents: ComponentSize[];
        averageSize: number;
    } {
        const totalSize = this.getTotalSize();
        const componentCount = this.componentSizes.size;

        return {
            totalSize,
            totalSizeKB: totalSize / 1024,
            gzippedEstimate: totalSize * 0.3, // Rough estimate: 30% of original
            componentCount,
            largestComponents: this.getLargestComponents(),
            averageSize: componentCount > 0 ? totalSize / componentCount : 0,
        };
    }

    /**
     * Log bundle report to console
     */
    logReport(): void {
        const report = this.getReport();

        logger.group('FRAMEWORK', '[MacUI Bundle Analysis]');
        logger.debug('FRAMEWORK', `Total size: ${report.totalSizeKB.toFixed(2)} KB`);
        logger.debug(
            'FRAMEWORK',
            `Gzipped estimate: ${(report.gzippedEstimate / 1024).toFixed(2)} KB`
        );
        logger.debug('FRAMEWORK', `Component count: ${report.componentCount}`);
        logger.debug(
            'FRAMEWORK',
            `Average component size: ${(report.averageSize / 1024).toFixed(2)} KB`
        );

        logger.group('FRAMEWORK', 'Largest components:');
        report.largestComponents.forEach(c => {
            logger.debug('FRAMEWORK', `${c.name}: ${(c.size / 1024).toFixed(2)} KB`);
        });
        logger.groupEnd();

        logger.groupEnd();
    }

    /**
     * Check if bundle size exceeds target
     */
    exceedsTarget(targetKB: number): boolean {
        return this.getTotalSize() / 1024 > targetKB;
    }
}

// Singleton instance
export const bundleAnalyzer = new BundleAnalyzer();

// Register framework components with estimated sizes
// These are rough estimates based on code lines and complexity
bundleAnalyzer.registerComponent('Button', 3000, ['BaseComponent']);
bundleAnalyzer.registerComponent('Input', 3800, ['BaseComponent']);
bundleAnalyzer.registerComponent('Toast', 2200, ['BaseComponent']);
bundleAnalyzer.registerComponent('ToastManager', 3100, ['Toast']);
bundleAnalyzer.registerComponent('Badge', 1700, ['BaseComponent']);
bundleAnalyzer.registerComponent('EmptyState', 1900, ['BaseComponent']);
bundleAnalyzer.registerComponent('ErrorBoundary', 3800, ['BaseComponent']);
bundleAnalyzer.registerComponent('Tooltip', 4200, ['BaseComponent']);
bundleAnalyzer.registerComponent('ContextMenu', 4950, ['BaseComponent']);
bundleAnalyzer.registerComponent('KeyboardShortcuts', 5850, []);
bundleAnalyzer.registerComponent('DragDropManager', 4950, []);
bundleAnalyzer.registerComponent('Tree', 5340, ['BaseComponent']);
bundleAnalyzer.registerComponent('VirtualList', 3450, ['BaseComponent']);
bundleAnalyzer.registerComponent('Table', 5580, ['BaseComponent']);
bundleAnalyzer.registerComponent('StateManager', 7290, []);

// Add to window for debugging
declare global {
    interface Window {
        MacUIBundle?: BundleAnalyzer;
    }
}

if (typeof window !== 'undefined') {
    window.MacUIBundle = bundleAnalyzer;
}
