# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Lint
npm run lint

# Package for publishing
npm run vscode:prepublish
```

## Testing

Press `F5` in VS Code to launch the Extension Development Host for testing.

## Architecture

This is a VS Code extension for PML (Programmable Macro Language) providing:
- Syntax highlighting
- Code completion (autocomplete)
- Signature help (parameter hints)
- Document symbols (method/function navigation)
- Code snippets
- Code obfuscation (Uglify command)

### Core Files

- `src/extension.ts` - Main entry point. Contains:
  - `PmlSignatureHelpProvider` - Parameter hints when typing method calls
  - `PmlDocumentSymbolProvider` - Outline navigation for methods/functions
  - `GetObjectList` - Completion provider for autocomplete
  - `GetType()` - Type inference from variable assignments
  - `GetMethodOutputType()` - Method chaining type resolution
  - `get_AllVariables()` - Variable extraction and tracking

- `src/functions.ts` - Utility functions for parsing PML syntax

- `src/Uglifier.ts` - Code obfuscation command (`extension.pmlUglify`)

### Data Files (in `src/`)

| File | Purpose |
|------|---------|
| `dictionary.json` | PML library definitions with methods, snippets, markdown docs (5.7MB) |
| `dictionary_inhouse.json` | Supplementary in-house library definitions |
| `methodtable.json` | Method name → input/output type mappings |
| `attributetable.json` | Object attribute type mappings |
| `attributetable_inhouse.json` | Supplementary attribute definitions |
| `pmlcommand.json` | PML command definitions |

### Type System

The extension tracks variable types using the `varString` interface:
- Variables are extracted from method parameters, function definitions, and member declarations
- Type inference works by pattern matching on assignments (e.g., `!var = 'text'` → string)
- Method chaining resolves types through `methodtable.json` and `attributetable.json`

### Supported File Extensions

`.pmlfrm`, `.pmlmac`, `.pmlfnc`, `.pmlobj`, `.pmldat`, `.pmlcmd`, `.mac`

## PML Language Notes

- Local variables: `!varname`
- Global variables: `!!varname` or `!this.varname`
- Comments: `--` (line) or `$*` (inline)
- Object instantiation: `!var = object typename()`
