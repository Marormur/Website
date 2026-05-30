import {
    FRAMEWORK_TOOLBAR_BASE_CLASS,
    FRAMEWORK_TOOLBAR_END_SECTION_CLASS,
    FRAMEWORK_TOOLBAR_SECTION_CLASS,
} from '../../framework/navigation/toolbar.js';

type ToolbarContext = 'system' | 'document';

interface ToolbarButtonConfig {
    id?: string;
    className?: string;
    action?: string;
    hookAction: string;
    label: string;
    title: string;
    i18nKey?: string;
    i18nTitleKey?: string;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

function renderToolbarButton(config: ToolbarButtonConfig): string {
    const className = ['text-editor-btn', 'macui-button', config.className]
        .filter(Boolean)
        .join(' ');
    const idAttr = config.id ? ` id="${escapeHtml(config.id)}"` : '';
    const dataActionAttr = config.action ? ` data-action="${escapeHtml(config.action)}"` : '';
    const dataI18nAttr = config.i18nKey ? ` data-i18n="${escapeHtml(config.i18nKey)}"` : '';
    const dataI18nTitleAttr = config.i18nTitleKey
        ? ` data-i18n-title="${escapeHtml(config.i18nTitleKey)}"`
        : '';
    const label = escapeHtml(config.label);

    return `<button type="button"${idAttr} class="${escapeHtml(className)}"${dataActionAttr} data-text-editor-action="${escapeHtml(config.hookAction)}" title="${escapeHtml(config.title)}"${dataI18nAttr}${dataI18nTitleAttr}>${label}</button>`;
}

export function buildTextEditorToolbarHTML(context: ToolbarContext): string {
    if (context === 'document') {
        return `
            <div class="text-editor-toolbar ${FRAMEWORK_TOOLBAR_BASE_CLASS} flex-none" data-text-editor-toolbar-context="document">
                <div class="text-editor-toolbar-group ${FRAMEWORK_TOOLBAR_SECTION_CLASS}">
                    ${renderToolbarButton({ className: 'btn-new', action: 'textEditorDocument:clear', hookAction: 'clear', title: 'Neu', label: 'Neu' })}
                    ${renderToolbarButton({ className: 'btn-open', action: 'textEditorDocument:open', hookAction: 'open', title: 'Öffnen', label: 'Öffnen' })}
                    ${renderToolbarButton({ className: 'text-editor-btn-accent btn-save', action: 'textEditorDocument:save', hookAction: 'save', title: 'Speichern', label: 'Speichern' })}
                </div>
                <div class="text-editor-toolbar-divider" aria-hidden="true"></div>
                <div class="text-editor-toolbar-group ${FRAMEWORK_TOOLBAR_SECTION_CLASS}">
                    ${renderToolbarButton({ className: 'btn-bold', action: 'textEditorDocument:bold', hookAction: 'bold', title: 'Fett', label: 'B' })}
                    ${renderToolbarButton({ className: 'btn-italic', action: 'textEditorDocument:italic', hookAction: 'italic', title: 'Kursiv', label: 'I' })}
                    ${renderToolbarButton({ className: 'btn-underline text-editor-btn-underline', action: 'textEditorDocument:underline', hookAction: 'underline', title: 'Unterstrichen', label: 'U' })}
                </div>
                <div class="text-editor-toolbar-divider" aria-hidden="true"></div>
                <div class="text-editor-toolbar-group text-editor-toolbar-group-right ${FRAMEWORK_TOOLBAR_SECTION_CLASS} ${FRAMEWORK_TOOLBAR_END_SECTION_CLASS}">
                    ${renderToolbarButton({ className: 'btn-find', action: 'textEditorDocument:find', hookAction: 'find', title: 'Suchen', label: 'Suchen' })}
                    ${renderToolbarButton({ className: 'btn-wrap', action: 'textEditorDocument:toggleWrap', hookAction: 'toggleWrap', title: 'Zeilenumbruch', label: 'Wrap' })}
                </div>
                <input type="file" class="file-input" accept=".txt,.md,.markdown" style="display:none">
            </div>
        `;
    }

    return `
        <div id="text-toolbar" class="text-editor-toolbar ${FRAMEWORK_TOOLBAR_BASE_CLASS} flex-none" data-text-editor-toolbar-context="system">
            <div class="text-editor-toolbar-group ${FRAMEWORK_TOOLBAR_SECTION_CLASS}">
                ${renderToolbarButton({ action: 'textEditor:clear', hookAction: 'clear', title: 'Neu', label: 'Neu', i18nKey: 'textEditor.toolbar.clear', i18nTitleKey: 'textEditor.toolbar.clear' })}
                ${renderToolbarButton({ action: 'textEditor:open', hookAction: 'open', title: 'Öffnen', label: 'Öffnen', i18nKey: 'textEditor.toolbar.open', i18nTitleKey: 'textEditor.toolbar.open' })}
                ${renderToolbarButton({ id: 'text-save-button', className: 'text-editor-btn-accent', action: 'textEditor:save', hookAction: 'save', title: 'Speichern', label: 'Speichern', i18nKey: 'textEditor.toolbar.save', i18nTitleKey: 'textEditor.toolbar.save' })}
            </div>
            <div class="text-editor-toolbar-divider" aria-hidden="true"></div>
            <div class="text-editor-toolbar-group ${FRAMEWORK_TOOLBAR_SECTION_CLASS}">
                ${renderToolbarButton({ action: 'textEditor:bold', hookAction: 'bold', title: 'Fett', label: 'B', i18nTitleKey: 'textEditor.toolbar.bold' })}
                ${renderToolbarButton({ action: 'textEditor:italic', hookAction: 'italic', title: 'Kursiv', label: 'I', i18nTitleKey: 'textEditor.toolbar.italic' })}
                ${renderToolbarButton({ className: 'text-editor-btn-underline', action: 'textEditor:underline', hookAction: 'underline', title: 'Unterstrichen', label: 'U', i18nTitleKey: 'textEditor.toolbar.underline' })}
                ${renderToolbarButton({ action: 'textEditor:strikethrough', hookAction: 'strikethrough', title: 'Durchgestrichen', label: 'S', i18nTitleKey: 'textEditor.toolbar.strikeThrough' })}
            </div>
            <div class="text-editor-toolbar-divider" aria-hidden="true"></div>
            <div class="text-editor-toolbar-group ${FRAMEWORK_TOOLBAR_SECTION_CLASS}">
                ${renderToolbarButton({ action: 'textEditor:heading1', hookAction: 'heading1', title: 'Überschrift 1', label: 'H1', i18nTitleKey: 'textEditor.toolbar.heading1' })}
                ${renderToolbarButton({ action: 'textEditor:heading2', hookAction: 'heading2', title: 'Überschrift 2', label: 'H2', i18nTitleKey: 'textEditor.toolbar.heading2' })}
                ${renderToolbarButton({ action: 'textEditor:heading3', hookAction: 'heading3', title: 'Überschrift 3', label: 'H3', i18nTitleKey: 'textEditor.toolbar.heading3' })}
            </div>
            <div class="text-editor-toolbar-divider" aria-hidden="true"></div>
            <div class="text-editor-toolbar-group ${FRAMEWORK_TOOLBAR_SECTION_CLASS}">
                ${renderToolbarButton({ action: 'textEditor:unorderedList', hookAction: 'unorderedList', title: 'Aufzählung', label: 'Liste', i18nTitleKey: 'textEditor.toolbar.unorderedList' })}
                ${renderToolbarButton({ action: 'textEditor:orderedList', hookAction: 'orderedList', title: 'Nummerierte Liste', label: '1. Liste', i18nTitleKey: 'textEditor.toolbar.orderedList' })}
                ${renderToolbarButton({ action: 'textEditor:alignLeft', hookAction: 'alignLeft', title: 'Links ausrichten', label: 'Links', i18nTitleKey: 'textEditor.toolbar.alignLeft' })}
                ${renderToolbarButton({ action: 'textEditor:alignCenter', hookAction: 'alignCenter', title: 'Zentrieren', label: 'Mitte', i18nTitleKey: 'textEditor.toolbar.alignCenter' })}
                ${renderToolbarButton({ action: 'textEditor:alignRight', hookAction: 'alignRight', title: 'Rechts ausrichten', label: 'Rechts', i18nTitleKey: 'textEditor.toolbar.alignRight' })}
            </div>
            <div class="text-editor-toolbar-divider" aria-hidden="true"></div>
            <div class="text-editor-toolbar-group text-editor-toolbar-group-right ${FRAMEWORK_TOOLBAR_SECTION_CLASS} ${FRAMEWORK_TOOLBAR_END_SECTION_CLASS}">
                ${renderToolbarButton({ action: 'textEditor:insertLink', hookAction: 'insertLink', title: 'Link einfügen', label: 'Link', i18nTitleKey: 'textEditor.toolbar.insertLink' })}
                ${renderToolbarButton({ action: 'textEditor:findReplace', hookAction: 'findReplace', title: 'Suchen und Ersetzen', label: 'Suchen', i18nTitleKey: 'textEditor.toolbar.findReplace' })}
            </div>
            <input type="file" id="text-file-input"
                accept=".txt,.md,.markdown,.html,.htm,.css,.scss,.js,.jsx,.ts,.tsx,.json,.yml,.yaml,.xml,.csv,.tsv,.ini,.cfg,.conf,.env,.gitignore,.log,.c,.h,.cpp,.hpp,.java,.kt,.swift,.cs,.py,.rb,.php,.rs,.go,.sh,.bash,.zsh,.fish,.ps1,.bat"
                style="display:none">
        </div>
    `;
}
