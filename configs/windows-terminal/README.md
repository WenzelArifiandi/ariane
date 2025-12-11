# Windows Terminal Configuration Backup

This directory contains backup copies of your Windows Terminal configuration files.

## Files

- **settings.json** - Main Windows Terminal settings (3.7KB)
  - Custom color scheme: "LiquidGlassLavender"
  - Custom keybindings (Ctrl+C, Ctrl+V, Ctrl+Shift+F, Alt+Shift+D)
  - Profile configurations for PowerShell, CMD, Ubuntu, Git Bash, etc.
  - Acrylic transparency and custom fonts (FiraCode Nerd Font)

- **state.json** - Windows Terminal state information (265 bytes)
  - Window position, size, and other UI state

- **elevated-state.json** - Elevated (admin) mode state (2 bytes)

## Original Location on Windows

These files are located at:
```
%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\
```

Full path:
```
C:\Users\hello\AppData\Local\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\
```

## How to Restore

### From WSL
```bash
# Copy settings back to Windows Terminal directory
cp ~/ariane/configs/windows-terminal/settings.json \
   /mnt/c/Users/$USER/AppData/Local/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/

cp ~/ariane/configs/windows-terminal/state.json \
   /mnt/c/Users/$USER/AppData/Local/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/

cp ~/ariane/configs/windows-terminal/elevated-state.json \
   /mnt/c/Users/$USER/AppData/Local/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/
```

### From PowerShell (Windows)
```powershell
# Close Windows Terminal first!
# Then copy settings from your ariane repo:

Copy-Item C:\GitHub\ariane\configs\windows-terminal\settings.json `
  $env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\

Copy-Item C:\GitHub\ariane\configs\windows-terminal\state.json `
  $env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\

Copy-Item C:\GitHub\ariane\configs\windows-terminal\elevated-state.json `
  $env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\
```

## Notes

- **Always close Windows Terminal** before restoring config files to avoid conflicts
- After restore, restart Windows Terminal to see changes
- The settings.json file can be edited manually or through Windows Terminal's settings UI
- To update this backup, run the backup commands from WSL or PowerShell

## Updating the Backup

### From WSL
```bash
cd /mnt/c/GitHub/ariane
cp /mnt/c/Users/$USER/AppData/Local/Packages/Microsoft.WindowsTerminal_8wekyb3d8bbwe/LocalState/*.json \
   configs/windows-terminal/
git add configs/windows-terminal/
git commit -m "chore: update Windows Terminal config"
git push
```

### From PowerShell
```powershell
cd C:\GitHub\ariane
Copy-Item $env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\*.json `
  configs\windows-terminal\
git add configs/windows-terminal/
git commit -m "chore: update Windows Terminal config"
git push
```

## Custom Theme: LiquidGlassLavender

Your configuration includes a custom color scheme with:
- Dark background (#1E1E2F)
- Purple/lavender accent colors
- High contrast for readability
- Custom cursor color (#E7D1FF)
