/**
 * SCM Commit Message Tool — VS Code Extension
 *
 * Registers Language Model tools (`vscode.lm.registerTool`) so that GitHub
 * Copilot's agent mode can read and update the Source Control commit message
 * input box without manual user intervention.
 *
 * Two tools are provided:
 *   1. **getCommitMessage**    — reads the current SCM input box value
 *   2. **updateCommitMessage** — sets / appends / prepends / replaces the value
 *
 * @module extension
 */

import * as vscode from "vscode";

import type { API as GitAPI, GitExtension, Repository } from "./git";

/* ------------------------------------------------------------------ */
/*  Git helper                                                        */
/* ------------------------------------------------------------------ */

/**
 * Resolve the first Git repository in the workspace via the built-in
 * `vscode.git` extension.
 *
 * @returns The first {@link Repository} instance.
 * @throws If the Git extension is missing, disabled, or no repositories exist.
 */
async function getGitRepository(): Promise<Repository> {
  /* Obtain the built-in Git extension -------------------------------- */
  const gitExtension =
    vscode.extensions.getExtension<GitExtension>("vscode.git");

  if (!gitExtension) {
    throw new Error(
      "Git extension (vscode.git) is not installed or not available.",
    );
  }

  /* Activate the extension if it has not started yet ----------------- */
  if (!gitExtension.isActive) {
    await gitExtension.activate();
  }

  const git: GitAPI = gitExtension.exports.getAPI(1);

  if (git.repositories.length === 0) {
    throw new Error(
      "No Git repositories found in the current workspace. " +
        "Open a folder that contains a Git repository first.",
    );
  }

  /* Return the first repository (covers single-repo workspaces) ------ */
  return git.repositories[0];
}

/* ------------------------------------------------------------------ */
/*  Tool: getCommitMessage                                            */
/* ------------------------------------------------------------------ */

/**
 * Language Model tool that reads the current value of the SCM commit message
 * input box and returns it as text.  If the box is empty the tool still
 * succeeds and returns an empty string.
 */
class GetCommitMessageTool
  implements vscode.LanguageModelTool<Record<string, never>>
{
  /**
   * Invoke the tool — read the SCM input box value.
   *
   * @param _options Tool invocation options (no input parameters expected).
   * @param _token   Cancellation token.
   * @returns A {@link vscode.LanguageModelToolResult} containing the current
   *          commit message text (may be empty).
   */
  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const repo = await getGitRepository();

    /** Current value in the SCM commit message input box. */
    const currentValue: string = repo.inputBox.value;

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(currentValue),
    ]);
  }

  /**
   * Prepare invocation — provide a human-readable status message.
   */
  async prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<
      Record<string, never>
    >,
    _token: vscode.CancellationToken,
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: "Reading current SCM commit message…",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Tool: updateCommitMessage                                         */
/* ------------------------------------------------------------------ */

/** Input schema for the updateCommitMessage tool. */
interface UpdateCommitMessageInput {
  /** The commit message text to set, append, or prepend. */
  message: string;
  /** How to merge with existing content. Defaults to `"append"`. */
  mode?: "append" | "replace" | "prepend";
}

/**
 * Language Model tool that sets or updates the SCM commit message input box.
 *
 * Supports three modes:
 * - **append** *(default)*: adds the new message after any existing text,
 *   separated by a blank line.  Existing content is never lost.
 * - **replace**: overwrites the input box entirely.
 * - **prepend**: inserts the new message before existing text.
 */
class UpdateCommitMessageTool
  implements vscode.LanguageModelTool<UpdateCommitMessageInput>
{
  /**
   * Invoke the tool — modify the SCM input box value.
   *
   * @param options Tool invocation options containing `message` and optional `mode`.
   * @param _token  Cancellation token.
   * @returns A {@link vscode.LanguageModelToolResult} confirming the action taken.
   */
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<UpdateCommitMessageInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.LanguageModelToolResult> {
    const { message, mode = "append" } = options.input;

    const repo = await getGitRepository();

    /** Text currently in the SCM input box (may be empty). */
    const currentValue: string = repo.inputBox.value.trim();

    /** The final value that will be written to the input box. */
    let updatedValue: string;

    /** Human-readable description of what was done, returned to the LLM. */
    let resultDescription: string;

    if (!currentValue) {
      /* ---- Input box is empty: always set regardless of mode -------- */
      updatedValue = message;
      resultDescription = `Commit message set to:\n${message}`;
    } else {
      switch (mode) {
        case "replace":
          updatedValue = message;
          resultDescription =
            `Commit message replaced. New message:\n${message}`;
          break;

        case "prepend":
          updatedValue = `${message}\n\n${currentValue}`;
          resultDescription =
            `New text prepended before existing message.\n` +
            `Full message:\n${updatedValue}`;
          break;

        case "append":
        default:
          updatedValue = `${currentValue}\n\n${message}`;
          resultDescription =
            `New text appended after existing message.\n` +
            `Full message:\n${updatedValue}`;
          break;
      }
    }

    repo.inputBox.value = updatedValue;

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(resultDescription),
    ]);
  }

  /**
   * Prepare invocation — provide a human-readable status message
   * (no user confirmation required).
   */
  async prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<UpdateCommitMessageInput>,
    _token: vscode.CancellationToken,
  ): Promise<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: "Updating SCM commit message…",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Extension lifecycle                                               */
/* ------------------------------------------------------------------ */

/**
 * Called by VS Code when the extension is activated.
 *
 * Registers both Language Model tools so they appear in Copilot agent mode.
 *
 * @param context Extension context for managing disposables.
 */
export function activate(context: vscode.ExtensionContext): void {
  /* Register the "get" tool ------------------------------------------ */
  context.subscriptions.push(
    vscode.lm.registerTool(
      "scm-commit-message-tool_getCommitMessage",
      new GetCommitMessageTool(),
    ),
  );

  /* Register the "update" tool --------------------------------------- */
  context.subscriptions.push(
    vscode.lm.registerTool(
      "scm-commit-message-tool_updateCommitMessage",
      new UpdateCommitMessageTool(),
    ),
  );

  /* Inform the user (output channel only — no intrusive popup) ------- */
  const outputChannel = vscode.window.createOutputChannel(
    "SCM Commit Message Tool",
  );
  outputChannel.appendLine(
    "SCM Commit Message Tool activated — 2 LM tools registered.",
  );
  context.subscriptions.push(outputChannel);
}

/**
 * Called by VS Code when the extension is deactivated.
 * All disposables registered via `context.subscriptions` are cleaned up
 * automatically.
 */
export function deactivate(): void {
  /* No-op: subscriptions handle cleanup. */
}
