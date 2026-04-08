declare module 'monaco-editor' {
    const monaco: any;
    export = monaco;
}

declare module 'monaco-editor/esm/vs/editor/editor.api.js' {
    const monaco: any;
    export = monaco;
}

declare module 'monaco-editor/*' {
    const monacoSubpath: any;
    export = monacoSubpath;
}
