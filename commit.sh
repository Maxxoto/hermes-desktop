#!/bin/bash
cd /home/maxxoto/hermes-desktop
git add -A
git commit -m "feat: Apple Liquid Glass UI - crenspire glass-ui patterns

- Implemented glass CSS variables (--glass-blur, --glass-opacity, etc.)
- Added layered gradient backgrounds with reflection overlays  
- Added inset shadows for edge definition (glass-shadow-inset)
- Updated glass-surface with proper blur and shadow stacking
- Redesigned ConnectionConfigPage with logo and glass card
- Updated CommandPalette with reflection overlay and ESC badge
- Updated ChatInput with send-btn-glass (glow + shadow)
- Updated StatusBar with glow-green/glow-red indicators
- Added light mode glass overrides
- All 202 tests passing"
git push origin v0.2-epic6-command-palette
