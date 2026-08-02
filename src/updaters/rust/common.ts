// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as TOML from '@iarna/toml';

/**
 * The contents of a `Cargo.toml` manifest
 */
export interface CargoManifest {
  package?: CargoPackage;
  workspace?: CargoWorkspace;

  dependencies?: CargoDependencies;
  ['dev-dependencies']?: CargoDependencies;
  ['build-dependencies']?: CargoDependencies;
  target?: TargetDependencies;
}

/**
 * Platform-specific dependencies
 */
export interface TargetDependencies {
  [key: string]: {
    dependencies?: CargoDependencies;
    ['dev-dependencies']?: CargoDependencies;
    ['build-dependencies']?: CargoDependencies;
  };
}

export interface CargoWorkspace {
  members?: string[];
  /**
   * Inherited defaults for workspace members, e.g.
   * `[workspace.package] version = "0.1.0"`.
   */
  package?: CargoWorkspacePackage;
}

export interface CargoWorkspacePackage {
  name?: string;
  version?: string;
}

export interface CargoPackage {
  name?: string;
  version?: string | CargoInheritedVersion;
}

/**
 * A `version = { workspace = true }` inheritance marker, resolved against
 * `[workspace.package]` in the workspace root `Cargo.toml`.
 */
export interface CargoInheritedVersion {
  workspace?: boolean;
}

/**
 * Returns whether the package version is inherited from the workspace
 * root via `version.workspace = true`.
 * @param version the parsed `[package].version` value
 */
export function isInheritedVersion(
  version: string | CargoInheritedVersion | undefined
): version is CargoInheritedVersion {
  return (
    typeof version === 'object' &&
    version !== null &&
    version.workspace === true
  );
}

/**
 * Returns whether the manifest declares any dependency on another crate in
 * the workspace with an explicit `{ path = ..., version = ... }`. Such
 * dependencies still need to be bumped in the member manifest when the
 * workspace version changes, even if the member's own version is inherited
 * from the workspace root.
 * @param manifest the parsed manifest
 * @param workspaceCrateNames names of the other crates in the workspace
 */
export function hasVersionedWorkspacePathDeps(
  manifest: CargoManifest,
  workspaceCrateNames: Set<string>
): boolean {
  const deps: CargoDependencies = {};
  for (const depKind of DEP_KINDS) {
    Object.assign(deps, manifest[depKind]);
  }
  if (manifest.target) {
    for (const targetName in manifest.target) {
      for (const depKind of DEP_KINDS) {
        Object.assign(deps, manifest.target[targetName][depKind]);
      }
    }
  }
  return Object.entries(deps).some(([name, dep]) => {
    if (!workspaceCrateNames.has(name)) {
      return false;
    }
    return (
      typeof dep === 'object' &&
      dep !== null &&
      typeof dep.path === 'string' &&
      typeof dep.version === 'string'
    );
  });
}

export interface CargoDependencies {
  [key: string]: string | CargoDependency;
}

export interface CargoDependency {
  version?: string;
  path?: string;
  registry?: string;
}

export type DepKind =
  | 'dependencies'
  | 'dev-dependencies'
  | 'build-dependencies';

/**
 * All possible dependency kinds for `CargoManifest`,
 * typed properly.
 */
export const DEP_KINDS: DepKind[] = [
  'dependencies',
  'dev-dependencies',
  'build-dependencies',
];

export function parseCargoManifest(content: string): CargoManifest {
  return TOML.parse(content) as CargoManifest;
}

/**
 * A `Cargo.lock` lockfile
 */
export interface CargoLockfile {
  // sic. the key is singular, but it's an array
  package?: CargoLockfilePackage[];
}

export interface CargoLockfilePackage {
  name: string;
  version: string;
}

export function parseCargoLockfile(content: string): CargoLockfile {
  return TOML.parse(content) as CargoLockfile;
}
