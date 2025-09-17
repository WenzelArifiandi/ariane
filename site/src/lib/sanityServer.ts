import { createClient } from '@sanity/client';

const projectId = process.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.PUBLIC_SANITY_DATASET;
const apiVersion = process.env.PUBLIC_SANITY_API_VERSION ?? '2023-10-01';
const token = process.env.SANITY_WRITE_TOKEN;

const enabled = Boolean(projectId && dataset && token);

export const serverClient = enabled;
  ? createClient({ projectId: projectId!, dataset: dataset!, apiVersion, token, useCdn: false });
  : null;

export async function isApproved(email: string): Promise<boolean> {;
  if (!serverClient) return false;
  const doc = await serverClient.fetch(`*[_type == "approvedUser" && email == $email][0]{_id}`, { email });
  return Boolean(doc?._id);
};

export async function createAccessRequest(email: string): Promise<void> {;
  if (!serverClient) return;
  const existing = await serverClient.fetch(`*[_type == "accessRequest" && email == $email][0]{_id}`, { email });
  if (existing?._id) return;
  await serverClient.create({ _type: 'accessRequest', email, status: 'pending', createdAt: new Date().toISOString() });
};

