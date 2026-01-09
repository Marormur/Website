/**
 * Drag & Drop Framework
 * 
 * Generalized drag and drop system that works across all apps.
 * Supports dragging elements, data transfer, visual feedback, and drop zones.
 */

export interface DragData {
    type: string;
    data: any;
}

export interface DragOptions {
    element: HTMLElement;
    data: DragData;
    dragImage?: HTMLElement;
    onDragStart?: (event: DragEvent) => void;
    onDragEnd?: (event: DragEvent) => void;
}

export interface DropZoneOptions {
    element: HTMLElement;
    acceptTypes: string[];
    onDragEnter?: (event: DragEvent, data: DragData) => void;
    onDragOver?: (event: DragEvent, data: DragData) => void;
    onDragLeave?: (event: DragEvent) => void;
    onDrop?: (event: DragEvent, data: DragData) => void;
}

/**
 * Drag & Drop Manager
 * 
 * @example
 * ```typescript
 * const dragDrop = DragDropManager.getInstance();
 * 
 * // Make element draggable
 * dragDrop.makeDraggable({
 *     element: fileElement,
 *     data: { type: 'file', data: fileInfo },
 *     onDragStart: () => console.log('Drag started')
 * });
 * 
 * // Create drop zone
 * dragDrop.makeDropZone({
 *     element: folderElement,
 *     acceptTypes: ['file'],
 *     onDrop: (event, data) => this.moveFile(data.data)
 * });
 * ```
 */
export class DragDropManager {
    private static instance: DragDropManager;
    private currentDragData: DragData | null = null;
    private dragOptions: Map<HTMLElement, DragOptions> = new Map();
    private dropZones: Map<HTMLElement, DropZoneOptions> = new Map();

    private constructor() {}

    static getInstance(): DragDropManager {
        if (!DragDropManager.instance) {
            DragDropManager.instance = new DragDropManager();
        }
        return DragDropManager.instance;
    }

    /**
     * Make an element draggable
     */
    makeDraggable(options: DragOptions): () => void {
        const { element, data, dragImage, onDragStart, onDragEnd } = options;

        element.draggable = true;
        this.dragOptions.set(element, options);

        const handleDragStart = (event: DragEvent) => {
            this.currentDragData = data;
            
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('application/json', JSON.stringify(data));
                
                if (dragImage) {
                    event.dataTransfer.setDragImage(dragImage, 0, 0);
                }
            }

            element.classList.add('dragging');
            onDragStart?.(event);
        };

        const handleDragEnd = (event: DragEvent) => {
            this.currentDragData = null;
            element.classList.remove('dragging');
            onDragEnd?.(event);
        };

        element.addEventListener('dragstart', handleDragStart);
        element.addEventListener('dragend', handleDragEnd);

        // Return cleanup function
        return () => {
            element.draggable = false;
            element.removeEventListener('dragstart', handleDragStart);
            element.removeEventListener('dragend', handleDragEnd);
            this.dragOptions.delete(element);
        };
    }

    /**
     * Make an element a drop zone
     */
    makeDropZone(options: DropZoneOptions): () => void {
        const { element, acceptTypes, onDragEnter, onDragOver, onDragLeave, onDrop } = options;

        this.dropZones.set(element, options);

        const handleDragEnter = (event: DragEvent) => {
            if (!this.currentDragData || !acceptTypes.includes(this.currentDragData.type)) {
                return;
            }

            event.preventDefault();
            element.classList.add('drag-over');
            onDragEnter?.(event, this.currentDragData);
        };

        const handleDragOver = (event: DragEvent) => {
            if (!this.currentDragData || !acceptTypes.includes(this.currentDragData.type)) {
                return;
            }

            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
            onDragOver?.(event, this.currentDragData);
        };

        const handleDragLeave = (event: DragEvent) => {
            element.classList.remove('drag-over');
            onDragLeave?.(event);
        };

        const handleDrop = (event: DragEvent) => {
            event.preventDefault();
            element.classList.remove('drag-over');

            if (!this.currentDragData || !acceptTypes.includes(this.currentDragData.type)) {
                return;
            }

            onDrop?.(event, this.currentDragData);
        };

        element.addEventListener('dragenter', handleDragEnter);
        element.addEventListener('dragover', handleDragOver);
        element.addEventListener('dragleave', handleDragLeave);
        element.addEventListener('drop', handleDrop);

        // Return cleanup function
        return () => {
            element.removeEventListener('dragenter', handleDragEnter);
            element.removeEventListener('dragover', handleDragOver);
            element.removeEventListener('dragleave', handleDragLeave);
            element.removeEventListener('drop', handleDrop);
            this.dropZones.delete(element);
        };
    }

    /**
     * Get current drag data (useful for complex scenarios)
     */
    getCurrentDragData(): DragData | null {
        return this.currentDragData;
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.dragOptions.clear();
        this.dropZones.clear();
        this.currentDragData = null;
    }
}

// Singleton instance
export const dragDropManager = DragDropManager.getInstance();
