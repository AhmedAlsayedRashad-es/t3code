import { executeAtomQuery, runAtomCommand } from "@t3tools/client-runtime/state/runtime";
import { CommandId, type EnvironmentId } from "@t3tools/contracts";

import { resolveOnboardingProjectId } from "../onboarding/projectImport.logic";
import { appAtomRegistry } from "../rpc/atomRegistry";
import { agentSessionImport, agentSessionScan } from "../state/agentSessions";
import { readProjects } from "../state/entities";
import { projectEnvironment } from "../state/projects";
import { newProjectId } from "./utils";

export interface ImportAllAgentSessionsResult {
  readonly projectCount: number;
  readonly importedThreadCount: number;
  readonly skippedThreadCount: number;
  readonly failedProjectCount: number;
}

/**
 * Rescans Claude Code and Codex history on each environment, adds every
 * project found, and imports its threads. Imports skip transcripts that are
 * already imported, so running it again only brings in new sessions.
 */
export async function importAllAgentSessions(
  environmentIds: ReadonlyArray<EnvironmentId>,
): Promise<ImportAllAgentSessionsResult> {
  let projectCount = 0;
  let importedThreadCount = 0;
  let skippedThreadCount = 0;
  let failedProjectCount = 0;
  for (const environmentId of environmentIds) {
    const scan = await executeAtomQuery(
      appAtomRegistry,
      agentSessionScan({ environmentId, input: {} }),
      { label: "Scan agent sessions", reportFailure: false, refresh: true },
    );
    if (scan._tag === "Failure") {
      failedProjectCount += 1;
      continue;
    }
    for (const candidate of scan.value.candidates) {
      let projectId = resolveOnboardingProjectId(readProjects(), environmentId, candidate);
      if (projectId === null) {
        projectId = newProjectId();
        const created = await runAtomCommand(
          appAtomRegistry,
          projectEnvironment.create,
          {
            environmentId,
            input: {
              projectId,
              commandId: CommandId.make(`agent-sessions:project:create:${projectId}`),
              title: candidate.title,
              workspaceRoot: candidate.path,
              createWorkspaceRootIfMissing: false,
              defaultModelSelection: null,
            },
          },
          { label: "Add imported project", reportFailure: false },
        );
        if (created._tag === "Failure") {
          failedProjectCount += 1;
          continue;
        }
      }
      const imported = await runAtomCommand(
        appAtomRegistry,
        agentSessionImport,
        { environmentId, input: { projectId, expectedWorkspaceRoot: candidate.path } },
        { label: "Import agent sessions", reportFailure: false },
      );
      if (imported._tag === "Failure") {
        failedProjectCount += 1;
        continue;
      }
      projectCount += 1;
      importedThreadCount += imported.value.importedCount;
      skippedThreadCount += imported.value.skippedCount;
    }
  }
  return { projectCount, importedThreadCount, skippedThreadCount, failedProjectCount };
}
