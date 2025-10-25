# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Documentation cleanup and reorganization
- Logger system for centralized logging
- CODEBASE_IMPROVEMENTS.md with organizational tasks
- TYPESCRIPT_MIGRATION_PLAN.md with detailed migration strategy

### Changed
- Reorganized documentation structure:
  - `docs/architecture/` - Architecture documentation
  - `docs/guides/` - User guides and quickstarts
  - `docs/migration/` - Migration guides
  - `docs/project/` - Project management (TODO, Roadmap)
  - `docs/archive/` - Historical documentation

### Removed
- NEXT_STEPS.md (consolidated into TODO.md)
- PR_README.md (outdated)

## [1.0.0] - 2025-10-25

### Added
- Multi-instance window system
- WindowManager for centralized window management
- ActionBus for declarative event handling
- WindowChrome for reusable UI components
- Terminal and TextEditor multi-instance support
- Comprehensive E2E test suite
- GitHub Actions CI/CD pipeline

### Changed
- Refactored from monolithic app.js to modular architecture
- Improved documentation structure

### Security
- Initial security audit completed
