# Script to update TypeScript import paths after restructuring
# Maps filenames to their new locations (relative to src/ts/)

$fileLocations = @{
    # Core
    'api.js' = 'core'
    'app-init.js' = 'core'
    'app-ready.js' = 'core'
    'constants.js' = 'core'
    'logger.js' = 'core'
    'error-handler.js' = 'core'
    'perf-monitor.js' = 'core'

    # Windows
    'base-window.js' = 'windows'
    'base-window-instance.js' = 'windows'
    'base-tab.js' = 'windows'
    'window-manager.js' = 'windows'
    'window-registry.js' = 'windows'
    'window-chrome.js' = 'windows'
    'window-configs.js' = 'windows'
    'window-tabs.js' = 'windows'
    'instance-manager.js' = 'windows'
    'preview-instance-manager.js' = 'windows'
    'preview-window-instance.js' = 'windows'
    'multi-instance-demo.js' = 'windows'
    'multi-instance-integration.js' = 'windows'

    # Apps - Finder
    'finder.js' = 'apps/finder'
    'finder-instance.js' = 'apps/finder'
    'finder-window.js' = 'apps/finder'
    'finder-view.js' = 'apps/finder'

    # Apps - Terminal
    'terminal.js' = 'apps/terminal'
    'terminal-instance.js' = 'apps/terminal'
    'terminal-window.js' = 'apps/terminal'
    'terminal-session.js' = 'apps/terminal'

    # Apps - Text Editor
    'text-editor.js' = 'apps/text-editor'
    'text-editor-instance.js' = 'apps/text-editor'
    'text-editor-window.js' = 'apps/text-editor'
    'text-editor-document.js' = 'apps/text-editor'

    # Apps - Photos
    'photos-app.js' = 'apps/photos'
    'image-viewer-utils.js' = 'apps/photos'

    # UI
    'desktop.js' = 'ui'
    'dock.js' = 'ui'
    'launchpad.js' = 'ui'
    'menu.js' = 'ui'
    'menubar-utils.js' = 'ui'
    'context-menu.js' = 'ui'
    'dialog.js' = 'ui'
    'dialog-utils.js' = 'ui'
    'action-bus.js' = 'ui'
    'keyboard-shortcuts.js' = 'ui'
    'icons.js' = 'ui'
    'snap-utils.js' = 'ui'
    'dom-utils.js' = 'ui'

    # Services
    'github-api.js' = 'services'
    'virtual-fs.js' = 'services'
    'storage.js' = 'services'
    'storage-utils.js' = 'services'
    'session-manager.js' = 'services'
    'multi-window-session.js' = 'services'
    'i18n.js' = 'services'
    'theme.js' = 'services'
    'system.js' = 'services'
    'program-actions.js' = 'services'
    'program-menu-sync.js' = 'services'
    'settings.js' = 'services'
}

function Get-RelativePath($from, $to) {
    # Calculate relative path from one folder to another
    $fromParts = $from -split '/'
    $toParts = $to -split '/'

    # Find common base
    $commonLength = 0
    for ($i = 0; $i -lt [Math]::Min($fromParts.Length, $toParts.Length); $i++) {
        if ($fromParts[$i] -eq $toParts[$i]) {
            $commonLength++
        } else {
            break
        }
    }

    # Count how many levels to go up
    $upLevels = $fromParts.Length - $commonLength

    # Build relative path
    $relativeParts = @()
    for ($i = 0; $i -lt $upLevels; $i++) {
        $relativeParts += '..'
    }

    # Add remaining path segments from target
    for ($i = $commonLength; $i -lt $toParts.Length; $i++) {
        $relativeParts += $toParts[$i]
    }

    return ($relativeParts -join '/')
}

$tsRoot = "c:\Users\marvin\Repos\Website\src\ts"
$files = Get-ChildItem -Path $tsRoot -Recurse -Filter "*.ts" | Where-Object { $_.Name -ne 'globals.d.ts' }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }

    # Determine current file's location relative to src/ts/
    $currentDir = $file.DirectoryName.Replace($tsRoot, '').TrimStart('\').Replace('\', '/')
    if (-not $currentDir) { $currentDir = '.' }

    $modified = $false

    # Find all imports matching pattern: from './filename.js' or from "./filename.js"
    $pattern = "from\s+['""](\./[\w\-]+\.js)['""]"
    $matches = [regex]::Matches($content, $pattern)

    foreach ($match in $matches) {
        $oldImport = $match.Groups[1].Value
        $filename = Split-Path $oldImport -Leaf

        if ($fileLocations.ContainsKey($filename)) {
            $targetFolder = $fileLocations[$filename]

            # Calculate relative path from current directory to target directory
            $relativePath = Get-RelativePath -from $currentDir -to $targetFolder
            $newImport = "$relativePath/$filename"

            # Normalize path (avoid single .)
            if ($newImport -eq "./$filename") {
                $newImport = "./$filename"
            } elseif ($newImport -notmatch '^\.') {
                $newImport = "./$newImport"
            }

            # Replace in content
            $content = $content -replace [regex]::Escape($oldImport), $newImport
            $modified = $true
        }
    }

    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.FullName.Replace($tsRoot, 'src/ts'))"
    }
}

Write-Host ""
Write-Host "Done! Import paths updated."
