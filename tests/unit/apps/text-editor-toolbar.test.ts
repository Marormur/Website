import { describe, expect, it } from 'vitest';
import { buildTextEditorToolbarHTML } from '../../../src/ts/apps/text-editor/text-editor-toolbar.ts';

describe('text editor toolbar template', () => {
    it('uses framework toolbar and button base classes for system toolbar', () => {
        const html = buildTextEditorToolbarHTML('system');

        expect(html).toContain('class="text-editor-toolbar app-toolbar');
        expect(html).toContain('class="text-editor-btn macui-button');
        expect(html).toContain('data-action="textEditor:clear"');
        expect(html).toContain('data-text-editor-action="clear"');
        expect(html).toContain('id="text-save-button"');
    });

    it('uses consistent hook actions for document toolbar', () => {
        const html = buildTextEditorToolbarHTML('document');

        expect(html).toContain('data-text-editor-toolbar-context="document"');
        expect(html).toContain('data-action="textEditorDocument:clear"');
        expect(html).toContain('data-text-editor-action="toggleWrap"');
        expect(html).toContain('class="text-editor-btn macui-button');
    });
});
