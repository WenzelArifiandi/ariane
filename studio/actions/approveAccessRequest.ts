import {DocumentActionComponent, DocumentActionProps, useClient} from 'sanity'

const ApproveAccessRequest: DocumentActionComponent = (props: DocumentActionProps) => {
  const client = useClient({apiVersion: '2023-10-01'})
  const docId = props.id
  const type = props.type
  const draft = props.draft as any
  const published = props.published as any
  const doc = draft || published

  if (type !== 'accessRequest') return null
  const status = doc?.status || 'pending'
  if (status === 'approved') return null

  return {
    label: 'Approve',
    tone: 'positive',
    onHandle: async () => {
      try {
        const email: string = doc?.email || ''
        if (!email || !email.includes('@')) throw new Error('Missing email')
        // Create approvedUser if not exists
        const existing = await client.fetch(
          `*[_type == "approvedUser" && email == $email][0]{_id}`,
          {email},
        )
        if (!existing?._id) {
          await client.create({_type: 'approvedUser', email})
        }
        // Mark request approved
        await client.patch(docId).set({status: 'approved'}).commit({autoGenerateArrayKeys: true})
        // Best-effort: mark user approved in Auth0 app_metadata
        try {
          const resp = await fetch('/api/approve-user', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email}),
          })
          // 200 = updated, 202 = user not in Auth0 yet (first login pending)
          if (!resp.ok && resp.status !== 202) {
            // Log and continue; do not block Studio UX
            const text = await resp.text()
            console.warn('Auth0 approval failed:', resp.status, text)
          }
        } catch (e) {
          console.warn('Auth0 approval call error:', e)
        }
        props.onComplete?.()
      } catch (e) {
        console.error(e)
        props.onComplete?.()
      }
    },
  }
}

export default ApproveAccessRequest
