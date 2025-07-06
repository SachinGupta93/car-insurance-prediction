# Troubleshooting TypeScript Module Resolution Issues

## Issue: Cannot find module './insurance/...' errors

If you're seeing module resolution errors in your IDE for the insurance components, try these solutions:

### Solution 1: Restart TypeScript Language Server (VS Code)
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "TypeScript: Restart TS Server"
3. Press Enter

### Solution 2: Clear TypeScript Cache
1. Close VS Code
2. Delete `.vscode` folder in your project (if exists)
3. Restart VS Code

### Solution 3: Reload Window
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "Developer: Reload Window"
3. Press Enter

### Solution 4: Check File Existence
Run this command to verify all files exist:
```bash
ls -la src/components/insurance/
```

### Solution 5: Update TypeScript/Language Server
```bash
npm install -g typescript
npm install -g @typescript-eslint/parser
```

### Solution 6: Clear Node Modules and Reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

### Solution 7: Check Import Paths
The insurance components are now available via index exports:
```typescript
// New way (using index exports)
import { InsuranceDashboard, ClaimsManagement } from './insurance';

// Old way (direct imports) - still works
import InsuranceDashboard from './insurance/InsuranceDashboard';
```

## Current File Structure
```
src/
├── components/
│   ├── insurance/
│   │   ├── index.ts (new)
│   │   ├── InsuranceDashboard.tsx
│   │   ├── ClaimsManagement.tsx
│   │   ├── InsuranceMarketplace.tsx
│   │   └── InsuranceResources.tsx
│   └── InsurancePage.tsx
```

## If Issues Persist

1. **Check TypeScript version**: `npx tsc --version`
2. **Verify tsconfig.json**: Make sure paths are configured correctly
3. **Check file permissions**: Ensure all files are readable
4. **Try manual import**: Test importing one component at a time

## Quick Fix Commands

Run these commands in your terminal:
```bash
# Navigate to frontend directory
cd d:/Car-damage-prediction/frontend

# Clear cache and reinstall
npm run clean
npm install

# Check TypeScript compilation
npx tsc --noEmit

# Start development server
npm run dev
```

## Expected Result
After applying these fixes, you should see:
- ✅ No TypeScript errors in terminal
- ✅ No red squiggly lines in VS Code
- ✅ All imports resolve correctly
- ✅ IntelliSense works properly