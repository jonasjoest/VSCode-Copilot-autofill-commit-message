/**
 * Minimal type definitions for the VS Code built-in Git extension API.
 *
 * These types are sourced from the vscode.git extension's public API surface.
 * Only the subset needed for SCM input box manipulation is included.
 *
 * @see https://github.com/microsoft/vscode/blob/main/extensions/git/src/api/git.d.ts
 */

import type { Disposable, Event, Uri } from "vscode";

/**
 * Represents the input box in the Source Control viewlet for a Git repository.
 */
export interface InputBox {
  /** Current text value of the SCM commit message input box. */
  value: string;
}

/**
 * Represents a single Git repository in the workspace.
 */
export interface Repository {
  /** The input box (commit message field) for this repository. */
  readonly inputBox: InputBox;

  /** The root URI of this repository's working tree. */
  readonly rootUri: Uri;
}

/**
 * The top-level Git extension API (version 1).
 */
export interface API {
  /** All currently open Git repositories. */
  readonly repositories: Repository[];

  /** Fired when a repository is opened. */
  readonly onDidOpenRepository: Event<Repository>;

  /** Fired when a repository is closed. */
  readonly onDidCloseRepository: Event<Repository>;
}

/**
 * The Git extension's exported interface, obtained via
 * `vscode.extensions.getExtension<GitExtension>('vscode.git')`.
 */
export interface GitExtension {
  /** Whether the Git extension is currently enabled. */
  readonly enabled: boolean;

  /**
   * Get the Git API for the specified version.
   *
   * @param version API version number (currently only 1 is supported).
   * @returns The Git API instance.
   */
  getAPI(version: 1): API;

  /** Fired when the extension's enabled state changes. */
  readonly onDidChangeEnablement: Event<boolean>;
}
