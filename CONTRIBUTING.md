# 🤝 Contributing to Marvin's Portfolio Website

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Git

### Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/Marormur/Website.git
    cd Website
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start development environment (VS Code):
    - Tasks: "Dev Environment: Start All" (Tailwind Watch, TS Watch, Dev Server)

    Oder manuell:

    ```bash
    # Terminal 1
    npm run watch:css
    # Terminal 2 (optional bei TS-Änderungen)
    npm run typecheck:watch
    # Terminal 3
    npm run dev
    ```

4. Open http://127.0.0.1:5173 in your browser

## 🔄 Development Workflow

### File Organization

- **Source Files**: `src/` directory
    - `src/css/` - CSS source files
    - `src/input.css` - Tailwind CSS input
- **JavaScript Modules**: `js/` directory
    - Core modules (window-manager, action-bus, api, etc.)
- **Documentation**: `docs/` directory
- **Tests**: `tests/` directory

### Making Changes

1. Create a new branch:

    ```bash
    git checkout -b feature/your-feature-name
    ```

2. Make your changes following the code style guidelines

3. Test your changes (quick smoke first):

    ```bash
    # Quick smoke on Chromium (GitHub API mocked)
    $env:MOCK_GITHUB='1'; npm run test:e2e:quick
    # Full suite on Chromium
    npm run test:e2e:chromium
    ```

4. Build CSS:

    ```bash
    npm run build:css
    ```

5. Commit your changes:
    ```bash
    git add .
    git commit -m "feat: description of your changes"
    ```

## 📝 Code Style

### JavaScript

- Use modern ES6+ syntax
- Use `const` and `let`, avoid `var`
- Use descriptive variable names
- Add comments for complex logic
- Follow existing patterns in the codebase

### HTML

- Use semantic HTML5 elements
- Use `data-action` attributes for event handling where possible
- Keep markup clean and readable
- Use Tailwind CSS classes for styling

### CSS

- Prefer Tailwind utility classes
- Use `src/css/style.css` for custom CSS that can't be achieved with Tailwind
- Use CSS variables for theming (defined in `:root`)

### TypeScript

This project uses TypeScript for improved type safety. See [docs/TYPESCRIPT_GUIDELINES.md](./docs/TYPESCRIPT_GUIDELINES.md) for:

- Best practices and patterns
- Migration guide for converting JS to TS
- Type coverage targets and enforcement
- Common issues and troubleshooting

Quick TypeScript workflow:

```bash
npm run typecheck         # Check types
npm run type:report       # Measure & detail coverage
npm run build:ts          # Build TypeScript to JavaScript
```

### Module System

When adding new functionality:

1. **Use existing modules** when possible (WindowManager, ActionBus, API)
2. **Create new modules** in `js/` directory if needed
3. **Register windows** in `js/window-configs.js`
4. **Register actions** using `ActionBus.register()`

### Example: Adding a New Window

1. Add window configuration to `js/window-configs.js`:

    ```javascript
    {
        id: 'calculator-modal',
        type: 'persistent',
        programKey: 'programs.calculator',
        icon: './img/calculator.png',
        closeButtonId: 'close-calculator-modal'
    }
    ```

2. Add HTML modal structure to `index.html`

3. Use `data-action` attributes for interactions:
    ```html
    <button data-action="closeWindow" data-window-id="calculator-modal">
        Close
    </button>
    ```

### Example: Adding a Custom Action

```javascript
// Register in app.js or module file
ActionBus.register('myAction', (params, element) => {
    console.log('Action triggered with params:', params);
    // Your logic here
});

// Use in HTML
<button data-action="myAction" data-custom-param="value">
    Click me
</button>;
```

## 🧪 Testing

### Running Tests

```bash
# Install Playwright browsers (first time only)
npm run pw:install

# Run all tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

### Writing Tests

- Place E2E tests in `tests/e2e/`
- Use descriptive test names
- Test both happy path and edge cases
- Follow existing test patterns

Example test structure:

```javascript
test('should open window when clicking icon', async ({ page }) => {
    await page.goto('/');
    await page.click(
        '[data-action="openWindow"][data-window-id="finder-modal"]'
    );
    await expect(page.locator('#finder-modal')).toBeVisible();
});
```

## 📤 Pull Request Process

1. **Update documentation** if you've changed functionality
2. **Add tests** for new features
3. **Ensure all tests pass** (`npm run test:e2e`)
4. **Build CSS** (`npm run build:css`)
5. **Update README** if adding major features
6. **Create Pull Request** with clear description:
    - What changes were made
    - Why they were made
    - How to test them

### PR Title Format

Use conventional commits format:

- `feat: Add calculator window`
- `fix: Resolve theme toggle issue`
- `docs: Update architecture documentation`
- `refactor: Simplify menu system`
- `test: Add launchpad tests`
- `chore: Update dependencies`

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description** of the bug
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Screenshots** if applicable
6. **Browser/OS** information

## 💡 Suggesting Features

Feature suggestions are welcome! Please:

1. Check existing issues first
2. Provide clear use case
3. Explain expected behavior
4. Consider how it fits with existing architecture

## 📚 Resources

- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [Refactoring Guide](./docs/REFACTORING.md)
- [Quick Start Guide](./docs/QUICKSTART.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## ❓ Questions?

Feel free to open an issue for any questions or clarifications!

---

**Happy Contributing! 🎉**
