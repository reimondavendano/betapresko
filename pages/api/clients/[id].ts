import type { NextApiRequest, NextApiResponse } from 'next'
import { clientApi } from './clientApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Client ID is required' })
  }

  if (req.method === 'GET') {
    try {
      const client = await clientApi.getClientById(id)
      
      if (!client) {
        return res.status(404).json({ error: 'Client not found' })
      }

      return res.status(200).json(client)
    } catch (error) {
      console.error('Error fetching client:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
  
  if (req.method === 'PATCH') {
    try {
      const updateData = req.body
      
      const updatedClient = await clientApi.updateClient(id, updateData)
      
      if (!updatedClient) {
        return res.status(404).json({ error: 'Client not found' })
      }

      return res.status(200).json(updatedClient)
    } catch (error) {
      console.error('Error updating client:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}
