import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const DEFAULT_DOMAIN = "wavenet.be";
const DEFAULT_OUTPUT_DIR = "./profile-pictures";

type GraphUser = {
	id: string;
	userPrincipalName?: string;
	mail?: string;
	displayName?: string;
};

type GraphUsersResponse = {
	value: GraphUser[];
	"@odata.nextLink"?: string;
};

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function sanitizeFileName(input: string): string {
	return input.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(response: Response): number | null {
	const retryAfter = response.headers.get("retry-after");
	if (!retryAfter) {
		return null;
	}

	const seconds = Number(retryAfter);
	if (Number.isFinite(seconds) && seconds >= 0) {
		return seconds * 1000;
	}

	const timestamp = Date.parse(retryAfter);
	if (Number.isNaN(timestamp)) {
		return null;
	}

	return Math.max(0, timestamp - Date.now());
}

async function fetchAccessToken(): Promise<string> {
	const tenantId = requireEnv("AZURE_TENANT_ID");
	const clientId = requireEnv("AZURE_CLIENT_ID");
	const clientSecret = requireEnv("AZURE_CLIENT_SECRET");

	const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
	const body = new URLSearchParams({
		grant_type: "client_credentials",
		client_id: clientId,
		client_secret: clientSecret,
		scope: GRAPH_SCOPE,
	});

	const response = await fetch(tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
	});

	if (!response.ok) {
		const details = await response.text();
		throw new Error(`Token request failed (${response.status}): ${details}`);
	}

	const json = (await response.json()) as Record<string, unknown>;
	const accessToken = typeof json.access_token === "string" ? json.access_token : undefined;
	if (!accessToken) {
		throw new Error("Token response did not include access_token");
	}
	return accessToken;
}

async function listUsers(accessToken: string, domain: string): Promise<GraphUser[]> {
	const users: GraphUser[] = [];
	let url = `${GRAPH_BASE}/users?$select=id,userPrincipalName,mail,displayName,accountEnabled&$top=999&$count=true&$filter=accountEnabled eq true and endsWith(userPrincipalName,'${domain}')`;

	while (url) {
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				ConsistencyLevel: "eventual",
			},
		});

		if (!response.ok) {
			const details = await response.text();
			throw new Error(`Failed to list users (${response.status}): ${details}`);
		}

		const payload = (await response.json()) as GraphUsersResponse;
		users.push(...payload.value);
		url = payload["@odata.nextLink"] ?? "";
	}

	return users;
}

async function downloadPhoto(accessToken: string, user: GraphUser): Promise<Uint8Array | null> {
	const maxRetries = 5;

	for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
		const response = await fetch(`${GRAPH_BASE}/users/${encodeURIComponent(user.id)}/photo/$value`, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (response.status === 404) {
			return null;
		}

		if (response.ok) {
			return new Uint8Array(await response.arrayBuffer());
		}

		const isRetryable = response.status === 429 || (response.status >= 500 && response.status <= 599);
		if (isRetryable && attempt < maxRetries) {
			const retryAfterMs = getRetryAfterMs(response);
			const backoffMs = 500 * 2 ** (attempt - 1);
			const jitterMs = Math.floor(Math.random() * 250);
			const waitMs = retryAfterMs ?? backoffMs + jitterMs;

			console.warn(
				`Transient photo error for ${user.id} (${response.status}), retry ${attempt}/${maxRetries - 1} in ${waitMs}ms`
			);
			await sleep(waitMs);
			continue;
		}

		const details = await response.text();
		throw new Error(`Failed photo for ${user.id} (${response.status}): ${details}`);
	}

	throw new Error(`Failed photo for ${user.id}: exhausted retries`);
}

async function downloadAll() {
	const domain = process.env.GRAPH_DOMAIN ?? DEFAULT_DOMAIN;
	const outputDir = process.env.GRAPH_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR;

	await mkdir(outputDir, { recursive: true });

	const accessToken = await fetchAccessToken();
	const users = await listUsers(accessToken, domain);

	console.log(`Found ${users.length} users in domain ${domain}`);

	let downloaded = 0;
	let skippedNoPhoto = 0;
	let failed = 0;

	for (const user of users) {
		let photo: Uint8Array | null;
		try {
			photo = await downloadPhoto(accessToken, user);
		} catch (error) {
			failed += 1;
			console.error(`Failed ${user.userPrincipalName ?? user.id}:`, error);
			continue;
		}

		if (!photo) {
			skippedNoPhoto += 1;
			continue;
		}

		const fileStem = sanitizeFileName(user.userPrincipalName ?? user.mail ?? user.id);
		const filePath = path.join(outputDir, `${fileStem}.jpg`);

		await writeFile(filePath, photo);
		downloaded += 1;
		console.log(`Downloaded ${downloaded}/${users.length}: ${filePath}`);
	}

	console.log(`Completed. Downloaded: ${downloaded}, no photo: ${skippedNoPhoto}, failed: ${failed}`);
}

await downloadAll();