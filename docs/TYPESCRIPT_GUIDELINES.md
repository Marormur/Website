# TypeScript Guidelines

**Project:** macOS-Style Portfolio Website
**Last Updated:** October 28, 2025
**TypeScript Version:** 5.x
**Strict Mode:** ✅ Enabled
**Build System:** ✅ esbuild IIFE Bundle

---

> NOTE: TypeScript migration is complete. Prefer the TypeScript sources in `src/ts/` for development and edits. The `js/` directory contains emitted JavaScript output and legacy artifacts. A modern **esbuild bundle pipeline** is available for production builds (`npm run build:bundle` → `js/app.bundle.js`).

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Build Systems](#build-systems)
3. [TypeScript Configuration](#typescript-configuration)
4. [File Organization](#file-organization)
5. [Type Safety Rules](#type-safety-rules)
6. [Common Patterns](#common-patterns)
7. [Migration Guide](#migration-guide)
8. [Troubleshooting](#troubleshooting)

---

## Build Systems

### Modern Bundle Build (Recommended for Production)

**Status:** ✅ Available (October 28, 2025)

The project now includes a modern **esbuild-based bundle pipeline** that produces a single IIFE bundle for production use:

```bash
# Build bundle once
npm run build:bundle

# Watch mode (rebuilds on file changes)
npm run dev:bundle

# VS Code Task (recommended)
"Dev Environment: Start All (Bundle)"  # CSS + TS + Bundle + Server
```

**Output:** `js/app.bundle.js` (~285kb + sourcemap)

#### How It Works

1. **Entry Point:** `src/ts/compat/expose-globals.ts`
   - Imports all core modules as side-effects (legacy globals register themselves)
   - Explicitly exports modern modules (e.g., `DOMUtils`) to `window.*`
   - Sets `window.__BUNDLE_READY__ = true` for test/probe detection

2. **Build Script:** `scripts/build-esbuild.mjs`
   - Bundles with esbuild in IIFE format
   - GlobalName: `App` (exposed as `window.App`)
   - Sourcemaps enabled for debugging
   - Watch mode support via `context()` API

3. **Configuration:**
   ```javascript
   {
     bundle: true,
     platform: 'browser',
     target: ['es2019'],
     format: 'iife',
     globalName: 'App',
     sourcemap: true
   }
   ```

#### Adding Modules to Bundle

To include a new module in the bundle:

1. **Create your TypeScript module:** `src/ts/my-module.ts`
2. **Add to compatibility adapter:** `src/ts/compat/expose-globals.ts`
   ```typescript
   // Import for side-effects (if IIFE pattern)
   import '../my-module';
   
   // OR import explicitly (if exports pattern)
   import * as MyModule from '../my-module';
   // ... then expose on window if needed
   w['MyModule'] ??= MyModule;
   ```
3. **Rebuild bundle:** `npm run build:bundle`

**See:** CHANGELOG.md section "Build - Esbuild bundle (compat adapter) ✅"

---

### Legacy Build (Individual Module Compilation)

**Status:** ✅ Still supported (for gradual migration)

Individual TypeScript modules are compiled separately:

```bash
# Build all TypeScript modules
npm run build:ts

# Watch mode
npm run typecheck:watch

# Output: js/*.js (one file per src/ts/*.ts)
```

**Note:** After build, `scripts/fix-ts-exports.js` runs automatically to remove CommonJS artifacts from compiled output (temporary workaround until full bundle migration).

---

## Quick Start

### Running Type Checks

```bash
# Check all TypeScript/JavaScript files
npm run typecheck

# Watch mode for development
npm run typecheck:watch

# Measure type coverage
npm run type:coverage
```

### Creating a New TypeScript Module (Bundle Pattern)

**Recommended for new modules (clean exports):**

```typescript
// src/ts/my-module.ts
'use strict';

/**
 * MyModule - Brief description
 */

interface MyModuleOptions {
    setting1: string;
    setting2?: number;
}

class MyModule {
    private options: MyModuleOptions;

    constructor(options: MyModuleOptions) {
        this.options = options;
    }

    public doSomething(): void {
        // Implementation
    }
}

// Clean export (will be bundled)
export { MyModule };
export type { MyModuleOptions };
```

**Then add to bundle adapter:**

```typescript
// src/ts/compat/expose-globals.ts
import { MyModule } from '../my-module';
w['MyModule'] ??= MyModule;
```

**Build:** `npm run build:bundle`

---

### Creating a New TypeScript Module (Legacy IIFE)

**For standalone modules (bypasses bundle):**

```typescript
// src/ts/my-module.ts
'use strict';

// ... implementation ...

// IIFE: Immediately register on window
(function () {
    declare global {
        interface Window {
            MyModule: typeof MyModule;
        }
    }
    window.MyModule = MyModule;
})();

export {}; // Ensure this is a module
```

### Build & Use

```bash
# Build TypeScript to JavaScript
npm run build:ts        # Individual modules → js/*.js
npm run build:bundle    # Bundle → js/app.bundle.js
```

---

## TypeScript Configuration

### Current tsconfig.json Settings

```jsonc
{
    "compilerOptions": {
        // ✅ Strict Mode (Level 6/6 - Paranoid)
        "strict": true, // All strict checks enabled
        "noUncheckedIndexedAccess": true, // Array/object safety

        // JavaScript Compatibility
        "allowJs": true, // Allow .js files
        "checkJs": false, // Don't check .js (yet)
        "noEmit": true, // No emit from this config

        // Modern JavaScript
        "target": "ES2020",
        "module": "ESNext",
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "moduleResolution": "bundler",

        // Developer Experience
        "skipLibCheck": true,
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,

        // Source Maps
        "sourceMap": true,
        "inlineSourceMap": false,
        "inlineSources": true,
    },
}
```

### Strictness Levels

```
Level 1: loose      → noEmit, checkJs: false           ✅ Achieved
Level 2: checked    → checkJs: true                    ⏳ Future
Level 3: explicit   → noImplicitAny: true              ✅ Achieved
Level 4: null-safe  → strictNullChecks: true           ✅ Achieved
Level 5: strict     → strict: true                     ✅ Achieved
Level 6: paranoid   → noUncheckedIndexedAccess: true   ✅ Achieved (Current)
```

**Current Level:** 6/6 - Paranoid Mode 🎯

---

## File Organization

### Directory Structure

```
src/ts/              TypeScript source files
  ├── *.ts           Individual modules
  └── ...
js/                  Compiled JavaScript output
  ├── *.js           Auto-generated from src/ts/*.ts
  ├── *.js.map       Source maps
  └── ...
types/               Ambient type definitions
  ├── index.d.ts     Central Window interface (SINGLE SOURCE OF TRUTH)
  ├── *.d.ts         Type definitions for modules
  └── ...
```

### Naming Conventions

- **TypeScript source:** `src/ts/kebab-case.ts`
- **Compiled output:** `js/kebab-case.js` (same name)
- **Type definitions:** `types/kebab-case.d.ts`
- **Classes:** `PascalCase`
- **Functions/variables:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Interfaces:** `PascalCase` (no `I` prefix)

### File Headers

Always include a JSDoc header:

```typescript
/**
 * ModuleName - Brief one-line description
 *
 * Detailed explanation of the module's purpose.
 * Include usage examples if helpful.
 *
 * @example
 * const instance = new ModuleName({ option: 'value' });
 * instance.doSomething();
 */
```

---

## Type Safety Rules

### ✅ DO: Use Strict Types

```typescript
// ✅ Good - Explicit types
function processData(input: string): number {
    return parseInt(input, 10);
}

// ✅ Good - Type inference is fine for simple cases
const count = 42; // TypeScript infers: number

// ✅ Good - Explicit return type for public APIs
class Calculator {
    public add(a: number, b: number): number {
        return a + b;
    }
}
```

### ❌ DON'T: Use `any`

```typescript
// ❌ Bad - Defeats type safety
function process(data: any): any {
    return data.value;
}

// ✅ Good - Use proper types
interface DataInput {
    value: string;
}

function process(data: DataInput): string {
    return data.value;
}

// ✅ Good - Use `unknown` if type is truly unknown
function process(data: unknown): string {
    if (typeof data === 'object' && data !== null && 'value' in data) {
        return String((data as { value: unknown }).value);
    }
    throw new Error('Invalid data');
}
```

### ✅ DO: Handle Null/Undefined

```typescript
// ✅ Good - Check for null/undefined
function getLength(str: string | null): number {
    return str?.length ?? 0;
}

// ✅ Good - Type guard
function processElement(el: HTMLElement | null): void {
    if (!el) return;
    el.classList.add('active');
}

// ✅ Good - Non-null assertion (only when certain)
const element = document.getElementById('my-id')!; // ! means "I know it exists"
```

### ✅ DO: Use Type Guards

```typescript
// ✅ Good - Type guard function
function isString(value: unknown): value is string {
    return typeof value === 'string';
}

// Usage
function process(value: unknown): void {
    if (isString(value)) {
        console.log(value.toUpperCase()); // TypeScript knows it's a string
    }
}
```

### ✅ DO: Use Generics for Reusability

```typescript
// ✅ Good - Generic class
class Collection<T> {
    private items: T[] = [];

    add(item: T): void {
        this.items.push(item);
    }

    get(index: number): T | undefined {
        return this.items[index];
    }
}

// Usage
const numbers = new Collection<number>();
numbers.add(42);

const strings = new Collection<string>();
strings.add('hello');
```

---

## Common Patterns

### Window Interface Extensions

**⚠️ IMPORTANT:** All Window interface extensions MUST go in `types/index.d.ts` only!

```typescript
// ❌ DON'T: Add Window extensions in individual .d.ts files
// types/my-module.d.ts
declare interface Window {
    // ❌ Creates duplicate identifier error
    MyModule: typeof MyModule;
}

// ✅ DO: Add to types/index.d.ts instead
// types/index.d.ts
declare interface Window {
    MyModule: typeof MyModule;
    AnotherModule: typeof AnotherModule;
    // ... all Window extensions in one place
}
```

### Event Listeners with Types

```typescript
// ✅ Good - Typed event listener
button.addEventListener('click', (event: MouseEvent) => {
    console.log(event.clientX, event.clientY);
});

// ✅ Good - Custom event with type
const customEvent = new CustomEvent<{ value: string }>('myEvent', {
    detail: { value: 'hello' },
});
```

### DOM Manipulation with Types

```typescript
// ✅ Good - Type assertion for specific element types
const input = document.querySelector<HTMLInputElement>('#my-input');
if (input) {
    input.value = 'new value'; // TypeScript knows it has .value
}

// ✅ Good - Null check
const element = document.getElementById('my-id');
if (!element) {
    console.warn('Element not found');
    return;
}
element.textContent = 'Hello';
```

### Class Inheritance

```typescript
// Base class
class BaseWindowInstance {
    protected instanceId: string;

    constructor(id: string) {
        this.instanceId = id;
    }

    public getId(): string {
        return this.instanceId;
    }
}

// Derived class
class TerminalInstance extends BaseWindowInstance {
    private commandHistory: string[] = [];

    constructor(id: string) {
        super(id);
    }

    public executeCommand(cmd: string): void {
        this.commandHistory.push(cmd);
        // Execute command...
    }
}
```

### Interface vs Type

```typescript
// ✅ Use Interface for object shapes (can be extended)
interface WindowConfig {
    id: string;
    title: string;
    icon?: string;
}

// Extending interface
interface ExtendedWindowConfig extends WindowConfig {
    size: { width: number; height: number };
}

// ✅ Use Type for unions, intersections, utilities
type Theme = 'light' | 'dark' | 'system';
type ReadonlyWindowConfig = Readonly<WindowConfig>;
type PartialWindowConfig = Partial<WindowConfig>;
```

### Utility Types

```typescript
// Pick - Select specific properties
type WindowIdentity = Pick<WindowConfig, 'id' | 'title'>;

// Omit - Exclude specific properties
type WindowWithoutIcon = Omit<WindowConfig, 'icon'>;

// Partial - Make all properties optional
type OptionalWindowConfig = Partial<WindowConfig>;

// Required - Make all properties required
type RequiredWindowConfig = Required<WindowConfig>;

// Record - Create object type with specific keys
type WindowRegistry = Record<string, WindowConfig>;
```

---

## Migration Guide

### Migrating a JavaScript Module to TypeScript

#### Step 1: Create TypeScript Source

```typescript
// src/ts/my-module.ts
'use strict';

// Add types for existing functionality
interface MyModuleOptions {
    name: string;
    enabled?: boolean;
}

class MyModule {
    private name: string;
    private enabled: boolean;

    constructor(options: MyModuleOptions) {
        this.name = options.name;
        this.enabled = options.enabled ?? true;
    }

    public getName(): string {
        return this.name;
    }
}

window.MyModule = MyModule;

export {};
```

#### Step 2: Create Type Definitions

```typescript
// types/my-module.d.ts
interface MyModuleOptions {
    name: string;
    enabled?: boolean;
}

declare class MyModule {
    constructor(options: MyModuleOptions);
    getName(): string;
}

declare const MyModule: typeof MyModule;

// Note: Window extension goes in types/index.d.ts, not here!
```

#### Step 3: Add to types/index.d.ts

```typescript
// types/index.d.ts
declare interface Window {
    // ... existing extensions
    MyModule: typeof MyModule;
}
```

#### Step 4: Build and Test

```bash
npm run build:ts
npm run typecheck
npm run test:e2e
```

#### Step 5: Update index.html

```html
<!-- Remove old JS file -->
<!-- <script src="./js/my-module.js"></script> -->

<!-- Add compiled TS output -->
<script src="./js/my-module.js"></script>
```

### Common Migration Issues

#### Issue: "Cannot find module"

**Problem:** TypeScript can't find your module.

**Solution:** Check `tsconfig.json` includes pattern:

```jsonc
{
    "include": [
        "js/**/*.js",
        "js/**/*.ts",
        "src/ts/**/*.ts",
        "types/**/*.d.ts",
    ],
}
```

#### Issue: "Duplicate identifier 'Window'"

**Problem:** Multiple files extend Window interface.

**Solution:** Move all Window extensions to `types/index.d.ts`:

```typescript
// ❌ Remove from individual files
// types/my-module.d.ts
// declare interface Window { ... }

// ✅ Add to central file
// types/index.d.ts
declare interface Window {
    MyModule: typeof MyModule;
    OtherModule: typeof OtherModule;
}
```

#### Issue: "Object is possibly 'null'"

**Problem:** Strict null checks enabled.

**Solution:** Add null checks:

```typescript
// ❌ Error: Object is possibly 'null'
const element = document.getElementById('my-id');
element.textContent = 'Hello';

// ✅ Add null check
const element = document.getElementById('my-id');
if (!element) return;
element.textContent = 'Hello';

// ✅ Or use optional chaining
element?.classList.add('active');
```

#### Issue: "Property does not exist on type"

**Problem:** Accessing property that TypeScript doesn't know about.

**Solution:** Add type assertion or extend interface:

```typescript
// ❌ Error: Property 'customProp' does not exist
window.customProp = 'value';

// ✅ Extend Window interface in types/index.d.ts
declare interface Window {
    customProp?: string;
}
```

---

## Troubleshooting

### Type Coverage Below Target

**Goal:** 90% type coverage (currently 76.53%)

**Check current coverage:**

```bash
npm run type:coverage
```

**Common sources of low coverage:**

1. **Untyped DOM operations** - Add type assertions
2. **Legacy JavaScript files** - Migrate to TypeScript
3. **Third-party libraries** - Add `@types/*` packages or create `.d.ts`

**Improvement strategies:**

```typescript
// ❌ Low coverage - implicit any
const data = JSON.parse(jsonString);

// ✅ High coverage - explicit type
interface MyData {
    name: string;
    count: number;
}
const data: MyData = JSON.parse(jsonString);
```

### Build Errors

**"Cannot find module"**

- Check file exists in `src/ts/`
- Verify `tsconfig.json` includes pattern
- Run `npm run build:ts`

**"Duplicate identifier"**

- Check for duplicate Window extensions
- Consolidate in `types/index.d.ts`

**"Property does not exist"**

- Add type definition
- Extend interface if needed
- Use type assertion if certain

### Runtime Errors

**"exports is not defined"**

This was fixed with `scripts/fix-ts-exports.js` post-build processor.

If you see this error:

1. Check `package.json` has `"build:ts:fix-exports"` script
2. Verify `fix-ts-exports.js` runs after TypeScript compilation
3. Check compiled `.js` files don't contain `Object.defineProperty(exports, ...)`

### ESLint Warnings

**Triple-slash references:**

ESLint warns about `/// <reference path="..." />` but these are correct for ambient declarations in `types/index.d.ts`. Ignore these warnings.

---

## Best Practices Checklist

### Before Committing

- [ ] Run `npm run typecheck` - all checks pass
- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run type:coverage` - coverage maintained or improved
- [ ] Run `npm run test:e2e` - all tests pass
- [ ] Update relevant `.d.ts` files if API changed
- [ ] Add Window extensions to `types/index.d.ts` only
- [ ] Document complex types with JSDoc comments

### Code Review Checklist

- [ ] No `any` types (except documented legacy interfaces)
- [ ] Null checks where needed
- [ ] Type guards for runtime checks
- [ ] Generics for reusable code
- [ ] Interfaces for public APIs
- [ ] JSDoc for exported functions/classes
- [ ] Proper error handling

---

## Additional Resources

### Internal Documentation

- [TypeScript Migration Plan](./migration/TYPESCRIPT.md)
- [TypeScript Status](./migration/TYPESCRIPT_STATUS.md)
- [Project TODO](./project/TODO.md)

### External Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

---

## Questions or Issues?

- Check [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
- Review existing TypeScript files in `src/ts/` for examples
- Consult `types/index.d.ts` for Window interface patterns
- Run `npm run typecheck` to validate changes

**Last Updated:** October 28, 2025
**TypeScript Version:** 5.x
**Project Strictness Level:** 6/6 (Paranoid Mode) 🎯
**Build System:** esbuild IIFE Bundle (js/app.bundle.js)
