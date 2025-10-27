# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

- fix(storage): prevent TypeError during modal restore on app init
  - Validate DOM element and WindowManager registration before calling Dialog.open()
  - Add fallback to show element directly when dialog instance is missing or throws
  - Add E2E tests to cover invalid modal IDs and transient modal handling

## 2024-06-01

- Initial release notes... 
