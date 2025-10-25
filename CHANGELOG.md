# Changelog

All notable changes to this project will be documented in this file.

- Logger system for centralized logging
- refactor(ts): migrate ActionBus to TypeScript with strict types and legacy global API preserved
  - New source: src/ts/action-bus.ts → emits to js/action-bus.js
  - Removed explicit any casts; added typed helpers for Window and FinderSystem
  - No runtime API changes; data-action flows remain fully compatible
- CODEBASE_IMPROVEMENTS.md with organizational tasks
- TYPESCRIPT_MIGRATION_PLAN.md with detailed migration strategy
- API Docs: Generated JSDoc and in-app “📖 API Docs” link (index.html)
- Observability: Global ErrorHandler (window.onerror/unhandledrejection) and PerfMonitor (performance marks/measures)

### Changed
- Reorganized documentation structure:
  - `docs/guides/` - User guides and quickstarts
  - `docs/migration/` - Migration guides
- Finder keyboard shortcuts integrated with tab manager (Cmd/Ctrl+W routes to tab close + instance cleanup)

- NEXT_STEPS.md (consolidated into TODO.md)
- PR_README.md (outdated)

### Fixed
- ActionBus for declarative event handling
- WindowChrome for reusable UI components
- GitHub Actions CI/CD pipeline

- Refactored from monolithic app.js to modular architecture
- Improved documentation structure

### Security
- Initial security audit completed
