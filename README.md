# SCM Commit Message Tool — VS Code Extension

A lightweight VS Code extension that exposes **Language Model tools** so that
GitHub Copilot's agent mode can automatically read and update the Source Control
(Git) commit message input box.

## Features

| Tool | Purpose |
|------|---------|
| `scm-commit-message-tool_getCommitMessage` | Read the current SCM input box text |
| `scm-commit-message-tool_updateCommitMessage` | Set / append / prepend / replace the SCM input box text |

### Update modes

| Mode | Behavior |
|------|----------|
| `append` *(default)* | Adds new text **after** any existing content, separated by a blank line. Existing text is never lost. |
| `prepend` | Adds new text **before** existing content. |
| `replace` | Overwrites the input box entirely. Use with care. |

When the input box is **empty**, all modes behave identically — they simply set
the message.

### Iterative session support

In a typical Copilot agent session the agent may make multiple rounds of
changes.  Because the default mode is `append`, each subsequent call adds a
new paragraph describing the latest changes while preserving the earlier
description.  The result is a growing, complete commit message that reflects
the entire session.

## Requirements

- **VS Code ≥ 1.95.0**
- **Git extension** (`vscode.git`) — built into VS Code
- **GitHub Copilot** extension with agent mode enabled

## Installation

### From source

```bash
git clone https://github.com/jonasjoest/VSCode-Copilot-autofill-commit-message.git
cd VSCode-Copilot-autofill-commit-message
npm install
npm run compile
npm run package          # produces scm-commit-message-tool-0.1.0.vsix
code --install-extension scm-commit-message-tool-0.1.0.vsix --force
```

### Manual (from .vsix)

```bash
npm install
npm run compile
npx @vscode/vsce package --no-dependencies
code --install-extension scm-commit-message-tool-*.vsix --force
```

## Usage with Copilot Agent Mode

Once installed, the tools appear automatically in Copilot's agent mode tool
list.  Add instructions to your project's `.github/copilot-instructions.md`
to tell the agent to call the tool after making code changes.

No manual invocation is needed — the agent handles everything.

### Copilot Instructions Example

Add the following to your `.github/copilot-instructions.md`:

```markdown
## SCM Commit Message (MUST Follow)

**CRITICAL - MUST:**
- **After making code changes, ALWAYS update the SCM commit message** using the
  `scm-commit-message-tool_updateCommitMessage` tool
- Call the tool with a concise, **conventional-commit-style** message describing
  the changes just made (e.g., `feat(backend): add invoice validation endpoint`)
- Use the **default `append` mode** so that earlier descriptions from the same
  session are preserved — never use `replace` unless explicitly consolidating
- For multi-step sessions, call the tool after **each logical group of changes**
  rather than once at the very end
- Before updating, you MAY call `scm-commit-message-tool_getCommitMessage` to
  read the current message and avoid duplicating content
```

### Example agent flow

1. Agent makes code changes.
2. Agent calls `scm-commit-message-tool_updateCommitMessage` with a concise
   message like `feat(backend): add invoice validation endpoint`.
3. If the agent makes more changes, it calls the tool again — the new
   description is **appended** to the existing message.
4. When the session is complete the SCM input box contains a full description
   of all changes, ready to commit.

## Development

```bash
npm run watch    # recompile on changes
```

Reload the VS Code window (`Developer: Reload Window`) to pick up changes
after recompilation.

## How it works

The extension uses the **stable** `vscode.lm.registerTool` API (available
since VS Code 1.93) and declares the tools in `package.json` under
`contributes.languageModelTools`.  When Copilot's agent requests a tool call,
VS Code activates the extension and invokes the corresponding tool
implementation which accesses the Git extension's `Repository.inputBox.value`
property.

## License

MIT — see [LICENSE](LICENSE) for details.
