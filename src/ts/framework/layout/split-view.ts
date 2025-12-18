import { h, VNode } from '../../core/vdom.js';
import { BaseComponent } from '../core/component.js';
import { ComponentConfig } from '../core/types.js';

export interface SplitViewProps extends ComponentConfig {
    direction?: 'horizontal' | 'vertical';
    initialSize?: number;
    minSize?: number;
    maxSize?: number;
    left: VNode | string;
    right: VNode | string;
    onResize?: (newSize: number) => void;
}

export interface SplitViewState {
    size: number;
    isDragging: boolean;
}

export class SplitView extends BaseComponent<SplitViewProps, SplitViewState> {
    private startPos = 0;
    private startSize = 0;

    constructor(props: SplitViewProps) {
        super(props);
        this.state = {
            size: props.initialSize ?? 200,
            isDragging: false,
        };
    }

    private onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        this.startPos = this.props.direction === 'vertical' ? e.clientY : e.clientX;
        this.startSize = this.state.size;

        this.setState({ isDragging: true });

        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
        document.body.classList.add('select-none');
    };

    private onMouseMove = (e: MouseEvent) => {
        if (!this.state.isDragging) return;

        const currentPos = this.props.direction === 'vertical' ? e.clientY : e.clientX;
        const delta = currentPos - this.startPos;

        const min = this.props.minSize ?? 100;
        const max = this.props.maxSize ?? 600;

        let newSize = Math.max(min, Math.min(this.startSize + delta, max));

        // Optional: Ensure minimum space for the other side if container width is known
        if (this.element) {
            const total =
                this.props.direction === 'vertical'
                    ? this.element.clientHeight
                    : this.element.clientWidth;
            const minRight = 100; // Hardcoded safety for now
            newSize = Math.min(newSize, total - minRight);
        }

        if (newSize !== this.state.size) {
            this.setState({ size: newSize });
            if (this.props.onResize) {
                this.props.onResize(newSize);
            }
        }
    };

    private onMouseUp = () => {
        this.setState({ isDragging: false });
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.body.classList.remove('select-none');
    };

    render(): VNode {
        const isHorizontal = this.props.direction !== 'vertical';
        const sizeStyle = isHorizontal
            ? { width: `${this.state.size}px` }
            : { height: `${this.state.size}px` };

        const containerClass = `flex h-full w-full overflow-hidden ${isHorizontal ? 'flex-row' : 'flex-col'} ${this.props.className || ''}`;
        const resizerClass = `split-view-resizer shrink-0 ${isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'} bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 transition-colors`;

        return h(
            'div',
            { className: containerClass },
            h(
                'div',
                {
                    className: 'shrink-0 overflow-auto',
                    style: sizeStyle,
                },
                this.props.left
            ),
            h('div', {
                className: resizerClass,
                onmousedown: this.onMouseDown,
            }),
            h('div', { className: 'flex-1 min-w-0 min-h-0 overflow-auto' }, this.props.right)
        );
    }

    onDestroy(): void {
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
    }
}
