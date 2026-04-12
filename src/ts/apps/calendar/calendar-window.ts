import { translate } from '../../services/i18n';
import { VirtualFS } from '../../services/virtual-fs.js';
import { BaseWindow, type WindowConfig } from '../../windows/base-window.js';
import { configureInsetWindowShell } from '../../framework/controls/inset-window-shell.js';
import { renderInsetSidebarShellHTML } from '../../framework/controls/inset-sidebar-shell.js';
import { createTrafficLightControlsElement } from '../../framework/controls/traffic-lights.js';
import {
    focusOrCreateWindowByType,
    showAndRegisterWindow,
} from '../../framework/controls/window-lifecycle.js';
import { attachWindowDragZoneBehavior } from '../../framework/controls/window-drag-zone.js';

type CalendarViewMode = 'day' | 'week' | 'month';

interface CalendarSource {
    id: string;
    title: string;
    color: string;
}

interface CalendarEventItem {
    id: string;
    calendarId: string;
    title: string;
    start: string;
    end: string;
    notes?: string;
}

interface CalendarPersistedState {
    calendars: CalendarSource[];
    events: CalendarEventItem[];
}

interface EventDraft {
    id?: string;
    calendarId: string;
    title: string;
    start: string;
    end: string;
    notes: string;
}

const CALENDAR_STORAGE_FILE = '/Users/marvin/Library/Calendars/calendar-data.json';

const DEFAULT_CALENDARS: CalendarSource[] = [
    { id: 'work', title: 'Arbeit', color: '#e11d48' },
    { id: 'private', title: 'Privat', color: '#2563eb' },
    { id: 'holidays', title: 'Feiertage', color: '#f59e0b' },
];

function toDayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDateTimeLocalValue(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): Date {
    return new Date(value);
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date: Date): Date {
    const value = new Date(date);
    const day = value.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    value.setDate(value.getDate() + mondayOffset);
    value.setHours(0, 0, 0, 0);
    return value;
}

function addDays(date: Date, days: number): Date {
    const value = new Date(date);
    value.setDate(value.getDate() + days);
    return value;
}

function sameDay(left: Date, right: Date): boolean {
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
}

function sortEventsByStart(events: CalendarEventItem[]): CalendarEventItem[] {
    return [...events].sort((left, right) => left.start.localeCompare(right.start));
}

function buildDefaultSeed(now: Date): CalendarPersistedState {
    const month = now.getMonth();
    const year = now.getFullYear();

    return {
        calendars: DEFAULT_CALENDARS,
        events: [
            {
                id: 'seed-1',
                calendarId: 'work',
                title: 'Sprint Planung',
                start: new Date(year, month, 3, 9, 30).toISOString(),
                end: new Date(year, month, 3, 10, 30).toISOString(),
                notes: 'Kickoff und Priorisierung der Stories.',
            },
            {
                id: 'seed-2',
                calendarId: 'private',
                title: 'Abendessen mit Freunden',
                start: new Date(year, month, 7, 19, 0).toISOString(),
                end: new Date(year, month, 7, 22, 0).toISOString(),
            },
            {
                id: 'seed-3',
                calendarId: 'holidays',
                title: 'Feiertag',
                start: new Date(year, month, 15, 0, 0).toISOString(),
                end: new Date(year, month, 15, 23, 59).toISOString(),
            },
        ],
    };
}

export class CalendarWindow extends BaseWindow {
    private viewMode: CalendarViewMode = 'month';
    private currentDate = new Date();
    private calendars: CalendarSource[] = [...DEFAULT_CALENDARS];
    private events: CalendarEventItem[] = [];
    private selectedCalendarIds = new Set(DEFAULT_CALENDARS.map(calendar => calendar.id));

    private appRoot: HTMLElement | null = null;
    private viewLabelElement: HTMLElement | null = null;
    private gridContainer: HTMLElement | null = null;
    private miniMonthContainer: HTMLElement | null = null;
    private calendarListContainer: HTMLElement | null = null;
    private editorOverlay: HTMLElement | null = null;
    private editorForm: HTMLFormElement | null = null;
    private editorTitleInput: HTMLInputElement | null = null;
    private editorStartInput: HTMLInputElement | null = null;
    private editorEndInput: HTMLInputElement | null = null;
    private editorCalendarSelect: HTMLSelectElement | null = null;
    private editorNotesInput: HTMLTextAreaElement | null = null;
    private editorDeleteButton: HTMLButtonElement | null = null;
    private activeEditorEventId: string | null = null;
    private layoutResizeObserver: ResizeObserver | null = null;
    private monthScrollContainer: HTMLElement | null = null;
    private monthScrollRafId: number | null = null;
    private suppressMonthScrollSyncUntil = 0;
    private initialMonthPositionRafId: number | null = null;

    constructor(config?: Partial<WindowConfig>) {
        super({
            type: 'calendar',
            title: translate('programs.calendar.label', 'Kalender') || 'Kalender',
            topBarStyle: 'seamless',
            position: { x: 140, y: 84, width: 1120, height: 640 },
            ...config,
        });
    }

    createDOM(): HTMLElement {
        const windowEl = super.createDOM();

        this.titlebarElement = configureInsetWindowShell({
            windowEl,
            titlebarElement: this.titlebarElement,
            shellClassName: 'calendar-window-shell',
            cssVariables: {
                '--calendar-window-radius': '1.125rem',
                '--calendar-sidebar-inset': '0.5rem',
                '--calendar-sidebar-width': '252px',
            },
            contentClassName: 'flex-1 overflow-hidden relative',
        });

        const root = document.createElement('div');
        root.className = 'calendar-app-shell';

        const sidebarShell = document.createElement('div');
        sidebarShell.innerHTML = renderInsetSidebarShellHTML({
            shellTag: 'aside',
            shellClassName: 'calendar-sidebar-shell',
            shellAttributes: {
                'aria-label': translate('calendar.sidebar.ariaLabel', 'Kalender Seitenleiste'),
            },
            panelClassName: 'calendar-sidebar-panel',
            topClassName: 'finder-window-drag-zone calendar-sidebar-top',
            topAttributes: {
                style: 'height:44px;cursor:move;',
            },
            topHtml: '',
            bodyClassName: 'calendar-sidebar-body',
            bodyHtml: `
                <section class="calendar-sidebar-section" aria-labelledby="calendar-list-heading">
                    <h2 id="calendar-list-heading" class="calendar-sidebar-heading">${translate('calendar.sidebar.calendars', 'Kalender')}</h2>
                    <div class="calendar-list" data-calendar-list></div>
                </section>
                <section class="calendar-sidebar-section" aria-labelledby="calendar-mini-heading">
                    <h2 id="calendar-mini-heading" class="calendar-sidebar-heading">${translate('calendar.sidebar.miniMonth', 'Monat')}</h2>
                    <div class="calendar-mini-month" data-calendar-mini-month></div>
                </section>
            `,
        });

        const sidebarTop = sidebarShell.querySelector('.finder-window-drag-zone');
        if (sidebarTop) {
            sidebarTop.appendChild(
                createTrafficLightControlsElement({
                    defaults: { noDrag: true },
                    close: {
                        title: translate('common.close', 'Schließen'),
                        i18nTitleKey: 'common.close',
                        onClick: () => this.close(),
                    },
                    minimize: {
                        title: translate('menu.window.minimize', 'Minimieren'),
                        i18nTitleKey: 'menu.window.minimize',
                        onClick: () => this.minimize(),
                    },
                    maximize: {
                        title: translate('menu.window.zoom', 'Füllen'),
                        i18nTitleKey: 'menu.window.zoom',
                        onClick: () => this.toggleMaximize(),
                    },
                })
            );
        }

        const main = document.createElement('main');
        main.className = 'calendar-main';
        main.id = `${this.id}-calendar-main`;
        main.innerHTML = `
            <header class="calendar-toolbar finder-window-drag-zone">
                <a href="#${this.id}-calendar-main" class="sr-only calendar-skip-link">${translate('calendar.a11y.skipToMain', 'Zum Kalenderinhalt springen')}</a>
                <div class="calendar-toolbar-nav finder-no-drag" role="group" aria-label="${translate('calendar.toolbar.navigation', 'Navigation')}" >
                    <button type="button" class="calendar-nav-button" data-calendar-action="previous">◀</button>
                    <button type="button" class="calendar-nav-button" data-calendar-action="today">${translate('calendar.toolbar.today', 'Heute')}</button>
                    <button type="button" class="calendar-nav-button" data-calendar-action="next">▶</button>
                </div>
                <h1 class="calendar-toolbar-title" data-calendar-current-label>${translate('programs.calendar.label', 'Kalender')}</h1>
                <div class="calendar-toolbar-actions finder-no-drag">
                    <div class="calendar-view-switch" role="tablist" aria-label="${translate('calendar.toolbar.viewSwitcher', 'Ansicht wechseln')}">
                        <button type="button" role="tab" class="calendar-view-switch-button" data-calendar-view="day">${translate('calendar.views.day', 'Tag')}</button>
                        <button type="button" role="tab" class="calendar-view-switch-button" data-calendar-view="week">${translate('calendar.views.week', 'Woche')}</button>
                        <button type="button" role="tab" class="calendar-view-switch-button is-active" data-calendar-view="month">${translate('calendar.views.month', 'Monat')}</button>
                    </div>
                    <button type="button" class="calendar-primary-button" data-calendar-action="create-event">${translate('calendar.actions.newEvent', 'Neuer Termin')}</button>
                </div>
            </header>
            <section class="calendar-grid-wrap" data-calendar-grid-wrap aria-live="polite"></section>
        `;

        root.appendChild(sidebarShell.firstElementChild || sidebarShell);
        root.appendChild(main);
        root.appendChild(this.createEditorOverlay());

        this.contentElement?.appendChild(root);

        this.appRoot = root;
        this.gridContainer = root.querySelector('[data-calendar-grid-wrap]') as HTMLElement | null;
        this.viewLabelElement = root.querySelector(
            '[data-calendar-current-label]'
        ) as HTMLElement | null;
        this.miniMonthContainer = root.querySelector(
            '[data-calendar-mini-month]'
        ) as HTMLElement | null;
        this.calendarListContainer = root.querySelector(
            '[data-calendar-list]'
        ) as HTMLElement | null;

        this.attachEventHandlers();
        this.attachDragHandlers(windowEl);

        this.loadStateFromVfs();
        this.render();
        this.attachLayoutResizeObserver(windowEl);

        return windowEl;
    }

    /**
     * Keep calendar shell layout in sync with window snapping and manual resize.
     * The breakpoints are based on the window width, not viewport media queries.
     */
    private updateResponsiveLayout(): void {
        if (!this.appRoot || !this.element) return;

        const windowWidth = Math.max(0, this.element.getBoundingClientRect().width);
        let layout: 'full' | 'compact' | 'stacked' = 'full';

        // Keep the desktop sidebar layout active longer before stacking.
        if (windowWidth < 700) {
            layout = 'stacked';
        } else if (windowWidth < 1040) {
            layout = 'compact';
        }

        this.appRoot.dataset.calendarLayout = layout;
    }

    private attachLayoutResizeObserver(windowEl: HTMLElement): void {
        this.layoutResizeObserver?.disconnect();

        if (typeof ResizeObserver === 'undefined') {
            this.updateResponsiveLayout();
            return;
        }

        this.layoutResizeObserver = new ResizeObserver(() => {
            this.updateResponsiveLayout();
        });

        this.layoutResizeObserver.observe(windowEl);
        this.updateResponsiveLayout();
    }

    override handleViewportResize(): void {
        super.handleViewportResize();
        this.updateResponsiveLayout();
    }

    override destroy(): void {
        this.layoutResizeObserver?.disconnect();
        this.layoutResizeObserver = null;
        this.detachMonthScrollSync();
        if (this.initialMonthPositionRafId !== null) {
            window.cancelAnimationFrame(this.initialMonthPositionRafId);
            this.initialMonthPositionRafId = null;
        }
        super.destroy();
    }

    private toMonthKey(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    private findMonthSection(monthDate: Date): HTMLElement | null {
        if (!this.gridContainer) return null;
        const monthKey = this.toMonthKey(monthDate);
        return this.gridContainer.querySelector<HTMLElement>(
            `[data-calendar-month-key="${monthKey}"]`
        );
    }

    private scrollGridContainerToSection(
        section: HTMLElement,
        behavior: ScrollBehavior = 'auto'
    ): void {
        if (!this.gridContainer) return;

        let targetTop = 0;
        if (this.monthScrollContainer && this.monthScrollContainer.contains(section)) {
            targetTop = Math.max(0, section.offsetTop - this.monthScrollContainer.offsetTop);
        } else {
            const containerRect = this.gridContainer.getBoundingClientRect();
            const sectionRect = section.getBoundingClientRect();
            targetTop = Math.max(
                0,
                sectionRect.top - containerRect.top + this.gridContainer.scrollTop
            );
        }

        this.gridContainer.scrollTo({ top: targetTop, behavior });
    }

    private scrollMonthIntoView(targetMonth: Date, behavior: ScrollBehavior = 'smooth'): void {
        const section = this.findMonthSection(targetMonth);
        if (section) {
            this.suppressMonthScrollSync(behavior === 'smooth' ? 500 : 120);
            this.scrollGridContainerToSection(section, behavior);
            return;
        }

        this.currentDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
        this.renderGrid();
        this.renderToolbar();
        this.renderMiniMonth();

        const rerendered = this.findMonthSection(this.currentDate);
        this.suppressMonthScrollSync(120);
        if (rerendered) {
            this.scrollGridContainerToSection(rerendered, 'auto');
        }
    }

    private suppressMonthScrollSync(durationMs: number): void {
        const now = performance.now();
        this.suppressMonthScrollSyncUntil = Math.max(
            this.suppressMonthScrollSyncUntil,
            now + Math.max(0, durationMs)
        );
    }

    private syncCurrentMonthFromScroll(): void {
        if (!this.gridContainer || !this.monthScrollContainer || this.viewMode !== 'month') return;

        const sections = Array.from(
            this.monthScrollContainer.querySelectorAll<HTMLElement>('[data-calendar-month-key]')
        );
        if (sections.length === 0) return;

        const containerRect = this.gridContainer.getBoundingClientRect();
        let bestSection: HTMLElement | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const section of sections) {
            const sectionRect = section.getBoundingClientRect();
            const distance = Math.abs(sectionRect.top - containerRect.top);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestSection = section;
            }
        }

        if (!bestSection) return;

        const monthKey = bestSection.dataset.calendarMonthKey;
        if (!monthKey) return;

        const [yearValue, monthValue] = monthKey.split('-');
        const year = Number(yearValue);
        const month = Number(monthValue);
        if (!Number.isFinite(year) || !Number.isFinite(month)) return;

        if (this.currentDate.getFullYear() === year && this.currentDate.getMonth() === month - 1) {
            return;
        }

        this.currentDate = new Date(year, month - 1, 1);
        this.renderToolbar();
        this.renderMiniMonth();
    }

    private onMonthGridScroll = (): void => {
        if (performance.now() < this.suppressMonthScrollSyncUntil) return;
        if (this.monthScrollRafId !== null) return;
        this.monthScrollRafId = window.requestAnimationFrame(() => {
            this.monthScrollRafId = null;
            this.syncCurrentMonthFromScroll();
        });
    };

    private detachMonthScrollSync(): void {
        if (this.gridContainer) {
            this.gridContainer.removeEventListener('scroll', this.onMonthGridScroll);
        }
        if (this.monthScrollRafId !== null) {
            window.cancelAnimationFrame(this.monthScrollRafId);
            this.monthScrollRafId = null;
        }
    }

    private attachMonthScrollSync(): void {
        if (!this.gridContainer) return;
        this.detachMonthScrollSync();
        this.gridContainer.addEventListener('scroll', this.onMonthGridScroll, { passive: true });
    }

    private scheduleInitialMonthPositioning(attempt = 0): void {
        if (!this.gridContainer || this.viewMode !== 'month') return;

        const currentSection = this.findMonthSection(this.currentDate);
        if (!currentSection) return;

        const isLayoutReady =
            this.gridContainer.isConnected &&
            this.gridContainer.scrollHeight > this.gridContainer.clientHeight;

        if (!isLayoutReady && attempt < 10) {
            this.initialMonthPositionRafId = window.requestAnimationFrame(() => {
                this.initialMonthPositionRafId = null;
                this.scheduleInitialMonthPositioning(attempt + 1);
            });
            return;
        }

        this.suppressMonthScrollSync(120);
        this.scrollGridContainerToSection(currentSection, 'auto');
    }

    private createEditorOverlay(): HTMLElement {
        const overlay = document.createElement('section');
        overlay.className = 'calendar-editor-overlay hidden';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = `
            <div class="calendar-editor-backdrop" data-calendar-action="close-editor"></div>
            <div class="calendar-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="calendar-editor-title">
                <h2 id="calendar-editor-title">${translate('calendar.editor.title', 'Termin bearbeiten')}</h2>
                <form class="calendar-editor-form" id="calendar-editor-form" data-calendar-editor-form>
                    <label class="calendar-editor-field">
                        <span>${translate('calendar.editor.fields.title', 'Titel')}</span>
                        <input type="text" required data-calendar-editor-input="title" />
                    </label>
                    <label class="calendar-editor-field">
                        <span>${translate('calendar.editor.fields.start', 'Beginn')}</span>
                        <input type="datetime-local" required data-calendar-editor-input="start" />
                    </label>
                    <label class="calendar-editor-field">
                        <span>${translate('calendar.editor.fields.end', 'Ende')}</span>
                        <input type="datetime-local" required data-calendar-editor-input="end" />
                    </label>
                    <label class="calendar-editor-field">
                        <span>${translate('calendar.editor.fields.calendar', 'Kalender')}</span>
                        <select required data-calendar-editor-input="calendar"></select>
                    </label>
                    <label class="calendar-editor-field">
                        <span>${translate('calendar.editor.fields.notes', 'Notizen')}</span>
                        <textarea rows="2" data-calendar-editor-input="notes"></textarea>
                    </label>
                </form>
                <div class="calendar-editor-actions">
                        <button type="button" class="calendar-secondary-button" data-calendar-action="close-editor">${translate('calendar.actions.cancel', 'Abbrechen')}</button>
                        <button type="button" class="calendar-secondary-button calendar-danger-button" data-calendar-action="delete-event">${translate('calendar.actions.delete', 'Löschen')}</button>
                        <button type="submit" form="calendar-editor-form" class="calendar-primary-button">${translate('calendar.actions.save', 'Speichern')}</button>
                </div>
            </div>
        `;

        this.editorOverlay = overlay;
        this.editorForm = overlay.querySelector(
            '[data-calendar-editor-form]'
        ) as HTMLFormElement | null;
        this.editorTitleInput = overlay.querySelector(
            '[data-calendar-editor-input="title"]'
        ) as HTMLInputElement | null;
        this.editorStartInput = overlay.querySelector(
            '[data-calendar-editor-input="start"]'
        ) as HTMLInputElement | null;
        this.editorEndInput = overlay.querySelector(
            '[data-calendar-editor-input="end"]'
        ) as HTMLInputElement | null;
        this.editorCalendarSelect = overlay.querySelector(
            '[data-calendar-editor-input="calendar"]'
        ) as HTMLSelectElement | null;
        this.editorNotesInput = overlay.querySelector(
            '[data-calendar-editor-input="notes"]'
        ) as HTMLTextAreaElement | null;
        this.editorDeleteButton = overlay.querySelector(
            '[data-calendar-action="delete-event"]'
        ) as HTMLButtonElement | null;

        return overlay;
    }

    private attachEventHandlers(): void {
        if (!this.appRoot) return;

        this.appRoot.addEventListener('click', event => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const actionTarget = target.closest<HTMLElement>('[data-calendar-action]');
            const action = actionTarget?.dataset.calendarAction;

            if (action === 'previous') {
                this.shiftCurrentDate(-1);
                return;
            }
            if (action === 'next') {
                this.shiftCurrentDate(1);
                return;
            }
            if (action === 'today') {
                this.currentDate = new Date();
                this.render();
                return;
            }
            if (action === 'create-event') {
                this.openEditor();
                return;
            }

            const viewTarget = target.closest<HTMLElement>('[data-calendar-view]');
            const requestedView = viewTarget?.dataset.calendarView;
            if (requestedView === 'day' || requestedView === 'week' || requestedView === 'month') {
                this.viewMode = requestedView;
                this.render();
                return;
            }

            if (action === 'close-editor') {
                this.closeEditor();
                return;
            }
            if (action === 'delete-event') {
                this.deleteActiveEvent();
                return;
            }

            const eventTarget = target.closest<HTMLElement>('[data-calendar-event-id]');
            const eventId = eventTarget?.dataset.calendarEventId;
            if (eventId) {
                const current = this.events.find(item => item.id === eventId);
                if (current) this.openEditor(current);
                return;
            }

            const dayTarget = target.closest<HTMLElement>('[data-calendar-day-key]');
            const dayKey = dayTarget?.dataset.calendarDayKey;
            if (dayKey && !action) {
                this.openEditor(undefined, dayKey);
            }
        });

        this.appRoot.addEventListener('change', event => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            if (target.matches('[data-calendar-list-item]')) {
                const input = target as HTMLInputElement;
                const id = input.dataset.calendarListItem;
                if (!id) return;
                if (input.checked) {
                    this.selectedCalendarIds.add(id);
                } else {
                    this.selectedCalendarIds.delete(id);
                }
                this.renderGrid();
            }
        });

        this.appRoot.addEventListener('keydown', event => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (
                event.key === 'Escape' &&
                this.editorOverlay &&
                !this.editorOverlay.classList.contains('hidden')
            ) {
                this.closeEditor();
            }
        });

        if (this.editorForm) {
            this.editorForm.addEventListener('submit', event => {
                event.preventDefault();
                this.saveFromEditor();
            });
        }
    }

    private attachDragHandlers(windowEl: HTMLElement): void {
        const isInteractiveTarget = (target: HTMLElement | null): boolean => {
            if (!target) return false;
            if (target.closest('.finder-no-drag')) return true;
            return Boolean(target.closest('button, input, select, textarea, a, [role="button"]'));
        };

        attachWindowDragZoneBehavior({
            windowEl,
            isInteractiveTarget,
            bringToFront: () => this.bringToFront(),
            isMaximized: () => this.isMaximized,
            toggleMaximize: () => this.toggleMaximize(),
            updatePosition: (x: number, y: number, targetEl: HTMLElement) => {
                this.position.x = x;
                this.position.y = y;
                targetEl.style.left = `${x}px`;
                targetEl.style.top = `${y}px`;
            },
            getSnapCandidate: (target: HTMLElement | null, pointerX: number | null) =>
                this.getSnapCandidate(target, pointerX),
            snapTo: (side: 'left' | 'right') => this.snapTo(side),
            persistState: () => {
                (this as unknown as { _saveState?: () => void })._saveState?.();
            },
        });
    }

    private getSnapCandidate(
        target: HTMLElement | null,
        pointerX: number | null
    ): 'left' | 'right' | null {
        if (!target) return null;
        const viewportWidth = Math.max(window.innerWidth || 0, 0);
        if (viewportWidth <= 0) return null;

        const threshold = Math.max(3, Math.min(14, viewportWidth * 0.0035));
        const rect = target.getBoundingClientRect();

        const pointerDistLeft =
            typeof pointerX === 'number' ? Math.max(0, pointerX) : Math.abs(rect.left);
        if (Math.abs(rect.left) <= threshold || pointerDistLeft <= threshold) return 'left';

        const distRight = viewportWidth - rect.right;
        const pointerDistRight =
            typeof pointerX === 'number'
                ? Math.max(0, viewportWidth - pointerX)
                : Math.abs(distRight);
        if (Math.abs(distRight) <= threshold || pointerDistRight <= threshold) return 'right';

        return null;
    }

    private snapTo(side: 'left' | 'right'): void {
        const target = this.element;
        if (!target) return;

        const metrics = window.computeSnapMetrics?.(side);
        if (!metrics) return;

        target.style.maxWidth = 'none';
        target.style.maxHeight = 'none';
        target.style.position = 'fixed';
        target.style.left = `${metrics.left}px`;
        target.style.top = `${metrics.top}px`;
        target.style.width = `${metrics.width}px`;
        target.style.height = `${metrics.height}px`;
        target.dataset.snapped = side;

        this.position.x = metrics.left;
        this.position.y = metrics.top;
        this.position.width = metrics.width;
        this.position.height = metrics.height;
        this.bringToFront();
    }

    private ensureStoragePath(): void {
        const parts = CALENDAR_STORAGE_FILE.split('/').filter(Boolean);
        const folderParts = parts.slice(0, -1);
        let currentPath = '';

        folderParts.forEach(part => {
            currentPath += `/${part}`;
            if (!VirtualFS.exists(currentPath)) {
                VirtualFS.createFolder(currentPath);
            }
        });
    }

    private loadStateFromVfs(): void {
        this.ensureStoragePath();

        const raw = VirtualFS.readFile(CALENDAR_STORAGE_FILE);
        if (!raw) {
            const seed = buildDefaultSeed(new Date());
            this.calendars = seed.calendars;
            this.events = seed.events;
            this.selectedCalendarIds = new Set(this.calendars.map(calendar => calendar.id));
            this.persistStateToVfs();
            return;
        }

        try {
            const parsed = JSON.parse(raw) as CalendarPersistedState;
            this.calendars =
                Array.isArray(parsed.calendars) && parsed.calendars.length > 0
                    ? parsed.calendars
                    : [...DEFAULT_CALENDARS];
            this.events = Array.isArray(parsed.events) ? parsed.events : [];

            const knownIds = new Set(this.calendars.map(calendar => calendar.id));
            this.events = this.events.filter(item => knownIds.has(item.calendarId));
            this.selectedCalendarIds = new Set(this.calendars.map(calendar => calendar.id));
        } catch {
            const seed = buildDefaultSeed(new Date());
            this.calendars = seed.calendars;
            this.events = seed.events;
            this.selectedCalendarIds = new Set(this.calendars.map(calendar => calendar.id));
            this.persistStateToVfs();
        }
    }

    private persistStateToVfs(): void {
        const payload: CalendarPersistedState = {
            calendars: this.calendars,
            events: this.events,
        };

        const serialized = JSON.stringify(payload, null, 2);
        if (VirtualFS.exists(CALENDAR_STORAGE_FILE)) {
            VirtualFS.writeFile(CALENDAR_STORAGE_FILE, serialized);
        } else {
            VirtualFS.createFile(CALENDAR_STORAGE_FILE, serialized, '📅');
        }
    }

    private shiftCurrentDate(step: number): void {
        if (this.viewMode === 'day') {
            this.currentDate = addDays(this.currentDate, step);
            this.render();
            return;
        } else if (this.viewMode === 'week') {
            this.currentDate = addDays(this.currentDate, step * 7);
            this.render();
            return;
        } else {
            const targetMonth = new Date(
                this.currentDate.getFullYear(),
                this.currentDate.getMonth() + step,
                1
            );
            this.scrollMonthIntoView(targetMonth);
            return;
        }
    }

    private render(): void {
        this.renderToolbar();
        this.renderSidebar();
        this.renderGrid();
        this.renderMiniMonth();
    }

    private renderToolbar(): void {
        if (!this.viewLabelElement || !this.appRoot) return;

        const monthLabel = this.currentDate.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
        });
        this.viewLabelElement.textContent = monthLabel;

        const buttons = this.appRoot.querySelectorAll<HTMLElement>('[data-calendar-view]');
        buttons.forEach(button => {
            const mode = button.dataset.calendarView;
            const isActive = mode === this.viewMode;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            button.setAttribute('tabindex', isActive ? '0' : '-1');
        });
    }

    private renderSidebar(): void {
        if (!this.calendarListContainer) return;

        this.calendarListContainer.innerHTML = '';
        this.calendars.forEach(calendar => {
            const checked = this.selectedCalendarIds.has(calendar.id);
            const row = document.createElement('label');
            row.className = 'calendar-list-item';
            row.innerHTML = `
                <input
                    type="checkbox"
                    ${checked ? 'checked' : ''}
                    data-calendar-list-item="${calendar.id}"
                    aria-label="${calendar.title}"
                />
                <span class="calendar-list-dot" style="--calendar-dot:${calendar.color}"></span>
                <span class="calendar-list-label">${calendar.title}</span>
            `;
            this.calendarListContainer?.appendChild(row);
        });
    }

    private renderMiniMonth(): void {
        if (!this.miniMonthContainer) return;

        const first = startOfMonth(this.currentDate);
        const start = startOfWeek(first);
        const days = Array.from({ length: 42 }, (_, index) => addDays(start, index));

        const heading = this.currentDate.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
        });

        const weekDayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

        const weekDayHeader = weekDayLabels
            .map(label => `<span class="calendar-mini-weekday">${label}</span>`)
            .join('');

        const cells = days
            .map(day => {
                const isCurrentMonth = day.getMonth() === this.currentDate.getMonth();
                const isToday = sameDay(day, new Date());
                return `<button type="button" class="calendar-mini-day ${isCurrentMonth ? '' : 'is-outside'} ${isToday ? 'is-today' : ''}" data-calendar-action="jump-day" data-calendar-day-key="${toDayKey(day)}">${day.getDate()}</button>`;
            })
            .join('');

        this.miniMonthContainer.innerHTML = `
            <div class="calendar-mini-title">${heading}</div>
            <div class="calendar-mini-grid" role="grid" aria-label="${translate('calendar.sidebar.miniMonth', 'Monat')}">
                ${weekDayHeader}
                ${cells}
            </div>
        `;

        this.miniMonthContainer
            .querySelectorAll<HTMLElement>('[data-calendar-action="jump-day"]')
            .forEach(button => {
                button.addEventListener('click', () => {
                    const dayKey = button.dataset.calendarDayKey;
                    if (!dayKey) return;
                    this.currentDate = new Date(`${dayKey}T12:00:00`);
                    this.viewMode = 'day';
                    this.render();
                });
            });
    }

    private getVisibleEvents(): CalendarEventItem[] {
        return this.events.filter(item => this.selectedCalendarIds.has(item.calendarId));
    }

    private renderGrid(): void {
        if (!this.gridContainer) return;

        if (this.viewMode === 'month') {
            this.renderMonthGrid();
            return;
        }

        this.detachMonthScrollSync();
        this.monthScrollContainer = null;

        if (this.viewMode === 'week') {
            this.renderWeekList();
            return;
        }

        this.renderDayList();
    }

    private renderMonthGrid(): void {
        if (!this.gridContainer) return;

        const monthsBefore = 6;
        const monthsAfter = 12;
        const anchorMonth = new Date(
            this.currentDate.getFullYear(),
            this.currentDate.getMonth(),
            1
        );
        const weekLabels = [
            translate('calendar.weekdays.mon', 'Mo'),
            translate('calendar.weekdays.tue', 'Di'),
            translate('calendar.weekdays.wed', 'Mi'),
            translate('calendar.weekdays.thu', 'Do'),
            translate('calendar.weekdays.fri', 'Fr'),
            translate('calendar.weekdays.sat', 'Sa'),
            translate('calendar.weekdays.sun', 'So'),
        ];

        const visibleEvents = this.getVisibleEvents();

        const weekHeaderHtml = weekLabels
            .map(label => `<div class="calendar-grid-weekday">${label}</div>`)
            .join('');

        const sectionsHtml = Array.from(
            { length: monthsBefore + monthsAfter + 1 },
            (_, index) => index - monthsBefore
        )
            .map(offset => {
                const monthDate = new Date(
                    anchorMonth.getFullYear(),
                    anchorMonth.getMonth() + offset,
                    1
                );
                const monthStart = startOfMonth(monthDate);
                const start = startOfWeek(monthStart);
                const monthLabel = monthDate.toLocaleDateString(undefined, {
                    month: 'long',
                    year: 'numeric',
                });
                const dayCellsHtml = Array.from({ length: 42 }, (_, dayIndex) => {
                    const day = addDays(start, dayIndex);
                    const dayKey = toDayKey(day);
                    const dayEvents = sortEventsByStart(
                        visibleEvents.filter(event => toDayKey(new Date(event.start)) === dayKey)
                    );
                    const isOutside = day.getMonth() !== monthDate.getMonth();
                    const isToday = sameDay(day, new Date());

                    const eventHtml = dayEvents
                        .slice(0, 3)
                        .map(event => {
                            const source = this.calendars.find(
                                calendar => calendar.id === event.calendarId
                            );
                            const startTime = new Date(event.start).toLocaleTimeString(undefined, {
                                hour: '2-digit',
                                minute: '2-digit',
                            });
                            return `
                                <button type="button" class="calendar-event-pill" data-calendar-event-id="${event.id}" style="--calendar-event-color:${source?.color || '#2563eb'}">
                                    <span class="calendar-event-time">${startTime}</span>
                                    <span class="calendar-event-title">${event.title}</span>
                                </button>
                            `;
                        })
                        .join('');

                    const overflow =
                        dayEvents.length > 3
                            ? `<div class="calendar-event-overflow">+${dayEvents.length - 3} ${translate('calendar.labels.more', 'mehr')}</div>`
                            : '';

                    return `
                        <article class="calendar-day-cell ${isOutside ? 'is-outside' : ''} ${isToday ? 'is-today' : ''}" data-calendar-day-key="${dayKey}">
                            <header class="calendar-day-cell-header">
                                <span class="calendar-day-number">${day.getDate()}</span>
                            </header>
                            <div class="calendar-day-events">
                                ${eventHtml}
                                ${overflow}
                            </div>
                        </article>
                    `;
                }).join('');

                return `
                    <section class="calendar-month-section" data-calendar-month-key="${this.toMonthKey(monthDate)}" aria-label="${monthLabel}">
                        <h2 class="calendar-month-heading">${monthLabel}</h2>
                        <div class="calendar-month-grid" role="grid" aria-label="${monthLabel}">
                            ${weekHeaderHtml}
                            ${dayCellsHtml}
                        </div>
                    </section>
                `;
            })
            .join('');

        this.gridContainer.innerHTML = `
            <div class="calendar-month-scroll" aria-label="${translate('calendar.views.month', 'Monat')}">
                ${sectionsHtml}
            </div>
        `;

        this.monthScrollContainer =
            this.gridContainer.querySelector<HTMLElement>('.calendar-month-scroll');
        this.attachMonthScrollSync();

        if (this.initialMonthPositionRafId !== null) {
            window.cancelAnimationFrame(this.initialMonthPositionRafId);
            this.initialMonthPositionRafId = null;
        }

        this.scheduleInitialMonthPositioning();
    }

    private renderWeekList(): void {
        if (!this.gridContainer) return;

        const start = startOfWeek(this.currentDate);
        const visibleEvents = this.getVisibleEvents();

        const columns = Array.from({ length: 7 }, (_, offset) => {
            const day = addDays(start, offset);
            const dayKey = toDayKey(day);
            const events = sortEventsByStart(
                visibleEvents.filter(event => toDayKey(new Date(event.start)) === dayKey)
            );

            const eventHtml =
                events.length > 0
                    ? events
                          .map(event => {
                              const source = this.calendars.find(
                                  calendar => calendar.id === event.calendarId
                              );
                              return `
                                <button type="button" class="calendar-week-event" data-calendar-event-id="${event.id}" style="--calendar-event-color:${source?.color || '#2563eb'}">
                                    <strong>${event.title}</strong>
                                    <span>${new Date(event.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                </button>
                              `;
                          })
                          .join('')
                    : `<p class="calendar-empty-slot">${translate('calendar.labels.noEvents', 'Keine Termine')}</p>`;

            return `
                <article class="calendar-week-column" data-calendar-day-key="${dayKey}">
                    <header>
                        <h2>${day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</h2>
                    </header>
                    <div class="calendar-week-events">${eventHtml}</div>
                </article>
            `;
        }).join('');

        this.gridContainer.innerHTML = `<div class="calendar-week-grid">${columns}</div>`;
    }

    private renderDayList(): void {
        if (!this.gridContainer) return;

        const dayKey = toDayKey(this.currentDate);
        const visibleEvents = sortEventsByStart(
            this.getVisibleEvents().filter(event => toDayKey(new Date(event.start)) === dayKey)
        );

        const eventsHtml =
            visibleEvents.length > 0
                ? visibleEvents
                      .map(event => {
                          const source = this.calendars.find(
                              calendar => calendar.id === event.calendarId
                          );
                          return `
                            <button type="button" class="calendar-day-list-item" data-calendar-event-id="${event.id}" style="--calendar-event-color:${source?.color || '#2563eb'}">
                                <strong>${event.title}</strong>
                                <span>${new Date(event.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                <small>${source?.title || ''}</small>
                            </button>
                          `;
                      })
                      .join('')
                : `<p class="calendar-empty-slot">${translate('calendar.labels.noEvents', 'Keine Termine')}</p>`;

        this.gridContainer.innerHTML = `
            <section class="calendar-day-list" data-calendar-day-key="${dayKey}">
                <header>
                    <h2>${this.currentDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
                </header>
                <div class="calendar-day-list-items">${eventsHtml}</div>
            </section>
        `;
    }

    private openEditor(event?: CalendarEventItem, preferredDayKey?: string): void {
        if (
            !this.editorOverlay ||
            !this.editorTitleInput ||
            !this.editorStartInput ||
            !this.editorEndInput ||
            !this.editorCalendarSelect ||
            !this.editorNotesInput
        ) {
            return;
        }

        const baseDate = preferredDayKey
            ? new Date(`${preferredDayKey}T10:00:00`)
            : this.currentDate;

        const start = event ? new Date(event.start) : new Date(baseDate);
        if (!event && preferredDayKey) {
            start.setHours(10, 0, 0, 0);
        }

        const end = event ? new Date(event.end) : addDays(start, 0);
        if (!event) end.setHours(start.getHours() + 1, start.getMinutes(), 0, 0);

        const draft: EventDraft = {
            id: event?.id,
            title: event?.title || '',
            start: toDateTimeLocalValue(start),
            end: toDateTimeLocalValue(end),
            calendarId: event?.calendarId || this.calendars[0]?.id || 'work',
            notes: event?.notes || '',
        };

        this.activeEditorEventId = draft.id || null;

        this.editorTitleInput.value = draft.title;
        this.editorStartInput.value = draft.start;
        this.editorEndInput.value = draft.end;
        this.editorNotesInput.value = draft.notes;

        this.editorCalendarSelect.innerHTML = this.calendars
            .map(
                calendar =>
                    `<option value="${calendar.id}" ${calendar.id === draft.calendarId ? 'selected' : ''}>${calendar.title}</option>`
            )
            .join('');

        if (this.editorDeleteButton) {
            this.editorDeleteButton.classList.toggle('hidden', !draft.id);
        }

        this.editorOverlay.classList.remove('hidden');
        this.editorOverlay.setAttribute('aria-hidden', 'false');
        this.editorTitleInput.focus();
    }

    private closeEditor(): void {
        if (!this.editorOverlay) return;
        this.editorOverlay.classList.add('hidden');
        this.editorOverlay.setAttribute('aria-hidden', 'true');
        this.activeEditorEventId = null;
    }

    private saveFromEditor(): void {
        if (
            !this.editorTitleInput ||
            !this.editorStartInput ||
            !this.editorEndInput ||
            !this.editorCalendarSelect ||
            !this.editorNotesInput
        ) {
            return;
        }

        const title = this.editorTitleInput.value.trim();
        const startValue = this.editorStartInput.value;
        const endValue = this.editorEndInput.value;
        const calendarId = this.editorCalendarSelect.value;

        if (!title || !startValue || !endValue || !calendarId) {
            return;
        }

        const startDate = fromDateTimeLocalValue(startValue);
        const endDate = fromDateTimeLocalValue(endValue);
        if (
            Number.isNaN(startDate.getTime()) ||
            Number.isNaN(endDate.getTime()) ||
            endDate < startDate
        ) {
            return;
        }

        const payload: CalendarEventItem = {
            id:
                this.activeEditorEventId ||
                `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title,
            calendarId,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            notes: this.editorNotesInput.value.trim(),
        };

        if (this.activeEditorEventId) {
            this.events = this.events.map(item =>
                item.id === this.activeEditorEventId ? payload : item
            );
        } else {
            this.events.push(payload);
        }

        this.events = sortEventsByStart(this.events);
        this.persistStateToVfs();
        this.closeEditor();
        this.renderGrid();
        this.renderMiniMonth();
    }

    private deleteActiveEvent(): void {
        if (!this.activeEditorEventId) return;

        this.events = this.events.filter(item => item.id !== this.activeEditorEventId);
        this.persistStateToVfs();
        this.closeEditor();
        this.renderGrid();
        this.renderMiniMonth();
    }

    static focusOrCreate(config?: Partial<WindowConfig>): CalendarWindow {
        return focusOrCreateWindowByType<CalendarWindow>({
            type: 'calendar',
            create: () => CalendarWindow.create(config),
        });
    }

    static create(config?: Partial<WindowConfig>): CalendarWindow {
        const windowInstance = new CalendarWindow(config);
        return showAndRegisterWindow(windowInstance);
    }
}

window.CalendarWindow = CalendarWindow;
