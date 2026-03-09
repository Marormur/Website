# JSDoc Standards

Guidelines for documenting TypeScript code in this project.
All public APIs **must** follow these standards.

## Required for Public APIs

Every exported function, class, method, and property should have:

1. **Description** – what it does (first line is the summary)
2. `@param` – for each parameter (name and description)
3. `@returns` – description of the return value (omit for `void`)
4. `@throws` – for any exceptions that can be raised
5. `@example` – at least one usage example

## Template

```typescript
/**
 * Short description of what this does.
 *
 * Longer explanation if needed, including edge cases,
 * side effects, or important constraints.
 *
 * @param paramName - Parameter description
 * @param options - Optional configuration object
 * @param options.foo - Specific option description
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * ```typescript
 * const result = myFunction('input', { foo: true });
 * console.log(result); // Expected output
 * ```
 */
function myFunction(paramName: string, options?: { foo: boolean }): string { ... }
```

## Class Documentation

```typescript
/**
 * Short class description.
 *
 * Longer explanation, invariants, lifecycle notes.
 *
 * @example
 * ```typescript
 * const instance = MyClass.getInstance();
 * instance.doSomething();
 * ```
 */
export class MyClass {
    /**
     * Creates a new instance.
     *
     * @param config - Configuration options
     */
    constructor(config: MyConfig) { ... }

    /**
     * Does something useful.
     *
     * @param input - The input value
     * @returns Processed result
     */
    doSomething(input: string): string { ... }
}
```

## Module-Level Documentation

```typescript
/**
 * @module my-module
 *
 * Brief description of what this module provides.
 * Include notable exports, design patterns, or usage constraints.
 */
```

## Tagging Guidelines

| Tag | When to Use |
|-----|-------------|
| `@param name - desc` | Always for each parameter |
| `@returns desc` | Always unless return type is `void` |
| `@throws {Type} desc` | When the function can throw |
| `@example` | Always for public APIs |
| `@deprecated desc` | When removing an API in a future version |
| `@internal` | For implementation details that TypeDoc should exclude |
| `@see` | To link related APIs |
| `@since version` | When the API was added (optional) |

## What NOT to Document

- Private implementation details (use `@internal` or `private` modifier)
- Obvious type information already in the signature
- Auto-generated code

## Coverage Goals

| Area | Target |
|------|--------|
| Core Services (`src/ts/services/`, `src/ts/core/`) | 100% |
| Window System (`src/ts/windows/`) | 100% |
| UI Components (`src/ts/ui/`) | 90% |
| Apps (`src/ts/apps/`) | 80% |
| Framework (`src/ts/framework/`) | 70% |
| Utils (`src/ts/utils/`) | 70% |

## Generating Docs

```bash
# Generate API reference to docs/api/
npm run docs:generate

# Preview in browser
npm run docs:serve

# Watch mode during development
npm run docs:watch
```
