# js/ (Build-Output)

Dieser Ordner enthält generierten JavaScript-Code:

- tsc kompiliert `src/ts/**/*.ts` nach `js/` (siehe `tsconfig.tsbuild.json`)
- esbuild erzeugt das Bundle `js/app.bundle.js`

Bitte hier nichts manuell bearbeiten. Quellcode liegt in `src/ts/`.

Legacy-Hinweis:

- Alle ehemaligen Legacy-Skripte wurden migriert. Der Ordner `js/legacy/` wird nicht mehr benötigt und kann entfernt werden.
