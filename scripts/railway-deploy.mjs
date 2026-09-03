import { spawnSync } from "node:child_process";

const project = required("RAILWAY_PROJECT_ID");
const environment = required("RAILWAY_ENVIRONMENT");
const environmentId = required("RAILWAY_ENVIRONMENT_ID");
const serviceId = required("RAILWAY_SERVICE_ID");
const revision = process.env.GITHUB_SHA?.slice(0, 12) ?? "local";

await verifyProjectToken();

const common = [
  "--project",
  project,
  "--environment",
  environmentId,
  "--service",
  serviceId,
];
const upload = railway([
  "up",
  "--detach",
  "--json",
  ...common,
  "--message",
  `${environment} deploy ${revision}`,
]);
const deploymentId = parseDeploymentId(upload);

if (!deploymentId) {
  throw new Error("Railway did not return a deployment ID.");
}

console.log(`Waiting for Railway deployment ${deploymentId} in ${environment}...`);

for (let attempt = 1; attempt <= 60; attempt += 1) {
  const deployments = JSON.parse(
    railway(["deployment", "list", ...common, "--limit", "20", "--json"]),
  );
  const deployment = deployments.find(({ id }) => id === deploymentId);

  if (!deployment) {
    console.log(`Railway deployment ${deploymentId} is not visible yet.`);
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    continue;
  }

  console.log(`Railway status: ${deployment.status}`);

  if (deployment.status === "SUCCESS") {
    console.log(`Railway deployment ${deploymentId} is healthy.`);
    process.exit(0);
  }

  if (["FAILED", "CRASHED", "REMOVED", "CANCELLED"].includes(deployment.status)) {
    printFailureLogs(deploymentId);
    process.exit(1);
  }

  await new Promise((resolve) => setTimeout(resolve, 10_000));
}

console.error(`Timed out waiting for Railway deployment ${deploymentId}.`);
printFailureLogs(deploymentId);
process.exit(1);

function required(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function railway(args, { allowFailure = false, inherit = false } = {}) {
  const result = spawnSync("pnpm", ["exec", "railway", ...args], {
    encoding: "utf8",
    env: process.env,
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !allowFailure) {
    const output = sanitize(
      [result.stdout, result.stderr]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join("\n"),
    );
    const detail = output ? `\n${output.slice(-8_000)}` : "";

    throw new Error(
      `railway ${args[0]} failed with exit code ${result.status}.${detail}`,
    );
  }

  return result.stdout?.trim() ?? "";
}

async function verifyProjectToken() {
  const token = required("RAILWAY_TOKEN");
  const response = await fetch("https://backboard.railway.com/graphql/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Project-Access-Token": token,
      "User-Agent": "redakt-trylle-deploy/1.0",
      "x-source": process.env.RAILWAY_CALLER ?? "redakt-trylle-deploy",
    },
    body: JSON.stringify({
      query: `
        query ProjectToken {
          projectToken {
            project { id }
            environment { id }
          }
        }
      `,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await parseJsonResponse(response);
  const errors = payload.errors
    ?.map(({ message }) => message)
    .filter(Boolean)
    .join("; ");

  if (!response.ok || errors) {
    const reason = sanitize(errors || response.statusText || "unknown error");
    throw new Error(
      `Railway project-token preflight failed (HTTP ${response.status}): ${reason}`,
    );
  }

  const scope = payload.data?.projectToken;

  if (!scope?.project?.id || !scope.environment?.id) {
    throw new Error("Railway project-token preflight returned no project scope.");
  }

  if (scope.project.id !== project || scope.environment.id !== environmentId) {
    throw new Error(
      [
        "Railway project token targets the wrong scope.",
        `Expected project ${project}, environment ${environmentId}.`,
        `Received project ${scope.project.id}, environment ${scope.environment.id}.`,
      ].join(" "),
    );
  }

  console.log(
    `Railway token scope verified for project ${project}, environment ${environmentId}.`,
  );
}

async function parseJsonResponse(response) {
  const body = await response.text();

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(
      `Railway project-token preflight returned invalid JSON (HTTP ${response.status}).`,
    );
  }
}

function parseDeploymentId(output) {
  for (const line of output.split("\n").reverse()) {
    try {
      const deploymentId = JSON.parse(line).deploymentId;

      if (deploymentId) {
        return deploymentId;
      }
    } catch {
      // Railway may emit informational lines before its final JSON object.
    }
  }

  throw new Error(
    `Railway did not return a deployment ID.\n${sanitize(output).slice(-8_000)}`,
  );
}

function sanitize(value) {
  let sanitized = value;

  for (const secret of [
    process.env.RAILWAY_TOKEN,
    process.env.RAILWAY_API_TOKEN,
  ].filter(Boolean)) {
    sanitized = sanitized.replaceAll(secret, "***");
  }

  return sanitized;
}

function printFailureLogs(deploymentId) {
  console.error(`Railway deployment ${deploymentId} did not become healthy.`);
  railway(["logs", deploymentId, "--build", ...common, "--lines", "200"], {
    allowFailure: true,
    inherit: true,
  });
  railway(["logs", deploymentId, "--deployment", ...common, "--lines", "200"], {
    allowFailure: true,
    inherit: true,
  });
}
