import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * API endpoint to fetch markdown documentation files for editing
 * Requires Cloudflare Access authentication
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Check authentication via Cloudflare Access headers
    const cfAccessJwt = request.headers.get('cf-access-jwt-assertion');
    const cfAccessEmail = request.headers.get('cf-access-authenticated-user-email');

    if (!cfAccessJwt || !cfAccessEmail) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        message: 'Please authenticate via Cloudflare Access'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const filePath = url.searchParams.get('filePath');

    if (!filePath) {
      return new Response(JSON.stringify({
        error: 'Missing filePath parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file path to ensure it's within the docs directory
    if (!filePath.startsWith('src/content/docs/') || !filePath.endsWith('.md')) {
      return new Response(JSON.stringify({
        error: 'Invalid file path',
        message: 'Only markdown files in docs directory can be accessed'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construct absolute path
    const absolutePath = join(process.cwd(), filePath);

    // Read the file
    const content = await readFile(absolutePath, 'utf-8');

    return new Response(JSON.stringify({
      success: true,
      content,
      filePath,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error reading file:', error);

    if ((error as any).code === 'ENOENT') {
      return new Response(JSON.stringify({
        error: 'File not found',
        message: 'The requested file does not exist'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Read failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};