import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, handleSupabaseError } from '../../../lib/supabase'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createHash } from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const { username: rawUsername, password } = req.body as { username: string; password: string }
    const username = (rawUsername || '').trim()
    const passwordInput = (password || '').trim()
    if (!username || !passwordInput) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    // Helper to search a table with multiple strategies
    const client = supabaseAdmin || supabase
    const tryFind = async (table: string) => {
      // or() search by username/email exact
      const exact = await client
        .from(table)
        .select('*')
        .or(`username.eq.${username},email.eq.${username}`)
        .limit(1)
        .maybeSingle()
      if (exact.error) return { data: null as any, error: exact.error }
      if (exact.data) return { data: exact.data, error: null as any }
      // case-insensitive
      const ci = await client
        .from(table)
        .select('*')
        .or(`username.ilike.${username},email.ilike.${username}`)
        .limit(1)
        .maybeSingle()
      return { data: ci.data as any, error: ci.error as any }
    }

    let data: any = null
    let error: any = null

    // Try common admin table names
    for (const table of ['admin_users', 'admins', 'admin']) {
      const resFind = await tryFind(table)
      if (resFind.error) {
        // If the table doesn't exist, continue to next
        const msg = String(resFind.error?.message || '')
        if (
          msg.includes('not exist') ||
          msg.includes('does not exist') ||
          msg.includes('Could not find the table') ||
          msg.includes('schema cache') ||
          msg.includes('relation')
        ) {
          continue
        }
        // Other errors are surfaced
        return handleSupabaseError(resFind.error, res)
      }
      if (resFind.data) {
        data = resFind.data
        break
      }
    }

    if (!data) {
      return res.status(401).json({ error: 'User not found' })
    }

    if (data.is_active === false) {
      return res.status(401).json({ error: 'User is inactive' })
    }

    const storedHash = (data.password_hash || '').trim()

    // Only support SHA-256 (and optional plaintext) to avoid external hashing libs
    let ok = false
    if (/^[a-f0-9]{64}$/i.test(storedHash)) {
      const sha256 = createHash('sha256').update(passwordInput).digest('hex')
      ok = sha256 === storedHash
    } else if (storedHash.startsWith('plain:')) {
      ok = storedHash.slice(6) === passwordInput
    } else if (process.env.ALLOW_PLAINTEXT_ADMIN === 'true') {
      ok = storedHash === passwordInput
    } else {
      return res.status(400).json({ error: 'Unsupported password format. Expected SHA-256 hex or plain:password' })
    }

    if (!ok) return res.status(401).json({ error: 'Password mismatch' })

    // Expose safe fields (including optional name, address if present)
    const { password_hash, ...safe } = data
    return res.status(200).json(safe)
  } catch (e: any) {
    return handleSupabaseError(e, res)
  }
}


