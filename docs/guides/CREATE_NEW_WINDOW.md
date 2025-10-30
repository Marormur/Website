# How-To: Neues Fenster/Neue App erstellen

Ziel: In wenigen Schritten einen neuen Fenstertyp anlegen, Tabs integrieren und die Menubar korrekt bedienen.

## 1) Tab-Inhalt (BaseTab ableiten)

Datei: `src/ts/my-feature-view.ts`

1. `class MyFeatureView extends BaseTab`
2. `createDOM()` implementieren: DOM erzeugen, `this.element` setzen
3. Optional: `render()`, `onShow()`, `onHide()`
4. Zustand über `this.contentState` halten und bei Änderungen `updateContentState({...})` aufrufen
5. Tabtitel via `this.setTitle('…')` aktualisieren, wenn sich der sichtbare Name ändern soll

Minimalgerüst:

```ts
export class MyFeatureView extends BaseTab {
    constructor(cfg?: Partial<TabConfig>) {
        super({
            type: 'my-feature-view',
            title: cfg?.title || 'My Feature',
            ...cfg,
        });
    }
    createDOM(): HTMLElement {
        const el = document.createElement('div');
        el.className = 'tab-content hidden w-full h-full';
        el.textContent = 'Hello from MyFeature!';
        this.element = el;
        return el;
    }
}
(window as any).MyFeatureView = MyFeatureView;
```

## 2) Fensterklasse (BaseWindow ableiten)

Datei: `src/ts/my-feature-window.ts`

1. `class MyFeatureWindow extends BaseWindow`
2. `createDOM()` optional überschreiben: Stelle eine Tabbar bereit (empfohlen: `WindowTabs`)
3. In `show()` mindestens eine neue Tab-Instanz erzeugen und hinzufügen

Minimalgerüst mit WindowTabs:

```ts
export class MyFeatureWindow extends BaseWindow {
    tabsController: any | null = null;
    constructor(cfg: any = {}) {
        super({ type: 'my-feature', ...cfg });
    }
    createDOM(): HTMLElement {
        const el = super.createDOM();
        const bar = el.querySelector(`#${this.id}-tabs`) as HTMLElement;
        const mount = document.createElement('div');
        bar.appendChild(mount);
        const mgr = (window as any).InstanceManager
            ? new (window as any).InstanceManager({
                  type: 'my-feature',
                  instanceClass: (window as any).MyFeatureView,
              })
            : null;
        if (mgr)
            this.tabsController = (window as any).WindowTabs.create(
                mgr,
                mount,
                {}
            );
        return el;
    }
    show(): void {
        super.show();
        if (this.tabs.size === 0) {
            this.addTab(new (window as any).MyFeatureView({ title: 'Tab 1' }));
        }
    }
}
(window as any).MyFeatureWindow = MyFeatureWindow;
```

Hinweis: In vielen bestehenden Fenstern wird bereits ein `InstanceManager` verwendet; richte ihn analog zum Finder ein, damit Tabs erstellt/vernichtet werden können und `WindowTabs` korrekt funktioniert.

## 3) Fenster öffnen

Du kannst das Fenster entweder über die „neue“ API oder über die Legacy-Schiene öffnen:

- Neue API: `const w = new MyFeatureWindow(); w.show(); (window as any).WindowRegistry.registerWindow(w);`
- Legacy: `API.window.open('my-feature-modal')` – sofern in `window-configs.ts` entsprechende Konfiguration vorliegt

Durch die Registrierung im WindowManager übernimmt `BaseWindow` automatisch die Menubar‑Integration.

## 4) Best Practices

- State immer über `updateContentState` ändern, niemals direkt auf `contentState` schreiben.
- `setTitle` nutzen, wenn der Tab-Namen dynamisch ist (z. B. Dateiname, Ordnername).
- Bei aufwändigen Rendern sparsam re-rendern; nutze eventuelle Caches (vgl. FinderView GitHub Cache).
- Nutze i18n-Attribute (`data-i18n`/`data-i18n-title`/`data-i18n-placeholder`) – `BaseWindow` triggert die Anwendung von Übersetzungen beim Erzeugen des DOMs.
