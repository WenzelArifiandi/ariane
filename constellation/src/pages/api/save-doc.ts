import type { APIRoute } from 'astro';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * API endpoint to save markdown documentation files
 * Requires Cloudflare Access authentication
 */
export const POST: APIRoute = async ({ request }) => {
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

    const { filePath, content } = await request.json();

    if (!filePath || content === undefined) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        message: 'filePath and content are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file path to ensure it's within the docs directory
    if (!filePath.startsWith('src/content/docs/') || !filePath.endsWith('.md')) {
      return new Response(JSON.stringify({
        error: 'Invalid file path',
        message: 'Only markdown files in docs directory can be edited'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construct absolute path
    const absolutePath = join(process.cwd(), filePath);

    // Save the file
    await writeFile(absolutePath, content, 'utf-8');

    return new Response(JSON.stringify({
      success: true,
      message: `File saved successfully by ${cfAccessEmail}`,
      filePath,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error saving file:', error);

    return new Response(JSON.stringify({
      error: 'Save failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};