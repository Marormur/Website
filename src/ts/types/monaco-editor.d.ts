declare module 'monaco-editor' {
    const monaco: any;
    export = monaco;
}

declare module 'monaco-editor/editor/editor.api.js' {
    const monaco: any;
    export = monaco;
}

declare module 'monaco-editor/*' {
    const monacoSubpath: any;
    export = monacoSubpath;
}
