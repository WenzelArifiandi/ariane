/* eslint-env node */
/* global fetch, console, process */
// Approve a user in Auth0 by setting app_metadata.approved = true
// Deployed as a Vercel serverless function under the Studio project.
// Env required on Vercel (Studio project):
//   AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({error: 'Method not allowed'}))
    return
  }

  try {
    const {email} = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({error: 'Invalid email'})
      return
    }

    const domain = process.env.AUTH0_DOMAIN
    const clientId = process.env.AUTH0_CLIENT_ID
    const clientSecret = process.env.AUTH0_CLIENT_SECRET
    if (!domain || !clientId || !clientSecret) {
      res.status(500).json({error: 'Missing Auth0 server configuration'})
      return
    }

    const audience = `https://${domain}/api/v2/`
    // Get management API token
    const tokenResp = await fetch(`https://${domain}/oauth/token`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience,
        grant_type: 'client_credentials',
      }),
    })
    if (!tokenResp.ok) {
      const text = await tokenResp.text()
      res.status(502).json({error: 'Failed to obtain Auth0 token', detail: text})
      return
    }
    const {access_token} = await tokenResp.json()

    // Find user by email
    const userResp = await fetch(
      `https://${domain}/api/v2/users-by-email?email=${encodeURIComponent(email)}`,
      {
        headers: {Authorization: `Bearer ${access_token}`},
      },
    )
    if (!userResp.ok) {
      const text = await userResp.text()
      res.status(502).json({error: 'Auth0 users-by-email failed', detail: text})
      return
    }
    const users = await userResp.json()
    const user = Array.isArray(users) ? users[0] : undefined
    if (!user || !user.user_id) {
      // User hasn't logged in yet. Return 202 so caller can still proceed locally.
      res
        .status(202)
        .json({
          status: 'pending',
          message: 'Auth0 user not found yet; will apply after first login.',
        })
      return
    }

    // Merge app_metadata.approved = true
    const patchResp = await fetch(
      `https://${domain}/api/v2/users/${encodeURIComponent(user.user_id)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({app_metadata: {...(user.app_metadata || {}), approved: true}}),
      },
    )
    if (!patchResp.ok) {
      const text = await patchResp.text()
      res.status(502).json({error: 'Failed to update Auth0 user metadata', detail: text})
      return
    }

    res.status(200).json({status: 'ok', user_id: user.user_id})
  } catch (err) {
    console.error('[approve-user] error', err)
    res.status(500).json({error: 'Internal error'})
  }
}
