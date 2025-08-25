'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, PenSquare } from 'lucide-react'

type HP = { id: string; value: number; display_name: string; is_active: boolean; created_at: string }

export default function AdminHP() {
  const pageSize = 5
  const [rows, setRows] = useState<HP[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<HP | null>(null)
  const [value, setValue] = useState<string>('')
  const [display, setDisplay] = useState('')
  const [existsOpen, setExistsOpen] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total])

  const fetchRows = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })
      const res = await fetch(`/api/admin/horsepower?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load')
      setRows(json.data || [])
      setTotal(json.total || 0)
      setSelectedIds([])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRows() }, [page, search])

  const openAdd = () => { setEditing(null); setValue(''); setDisplay(''); setEditOpen(true) }
  const openEdit = (row: HP) => { setEditing(row); setValue(String(row.value)); setDisplay(row.display_name); setEditOpen(true) }

  const saveRow = async () => {
    const num = Number(value)
    if (Number.isNaN(num) || !display.trim()) return
    if (editing) {
      await fetch('/api/admin/horsepower', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, value: num, display_name: display.trim() }) })
    } else {
      const res = await fetch('/api/admin/horsepower', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: num, display_name: display.trim() }) })
      if (!res.ok) {
        const j = await res.json().catch(()=>({}))
        if (res.status === 409) setExistsOpen(true)
        else alert(j?.error || 'Failed to add horsepower option')
        return
      }
    }
    setEditOpen(false)
    await fetchRows()
  }

  const confirmDelete = (ids: string[]) => { setDeletingIds(ids); setConfirmOpen(true) }
  const doDelete = async () => {
    await fetch('/api/admin/horsepower', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: deletingIds }) })
    setConfirmOpen(false); setDeletingIds([]); await fetchRows()
  }

  const toggleSelectAll = (checked: boolean) => { setSelectedIds(checked ? rows.map(r => r.id) : []) }
  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter(x => x !== id))
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-6 pb-6">
        {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gradient-to-br from-[#99BCC0] via-[#8FB6BA] to-[#6fa3a9] text-white rounded-t-lg">
        <h1 className="text-lg sm:text-2xl font-bold">Manage Horsepower</h1>
        <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
          <button
            className="flex items-center justify-center px-3 py-2 text-sm sm:text-base bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60"
            disabled={selectedIds.length === 0}
            onClick={() => confirmDelete(selectedIds)}
          >
            <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
            Delete
          </button>
          <button
            className="flex items-center justify-center px-3 py-2 text-sm sm:text-base bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
            onClick={openAdd}
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            Add New
          </button>
        </div>
      </div>

      {/* Table wrapper */}
      <div className="bg-white shadow overflow-hidden sm:rounded-b-lg">
        {/* Search row */}
        <div className="px-6 py-3 border-b flex items-center justify-between">
          <Input placeholder="Search..." value={search} onChange={e=>{setPage(1);setSearch(e.target.value)}} className="w-64" />
          <div className="text-xs text-gray-500">Total: {total}</div>
        </div>

        <div className="bg-white shadow overflow-x-auto sm:overflow-hidden sm:rounded-b-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input type="checkbox" className="h-4 w-4 text-indigo-600" checked={selectedIds.length===rows.length && rows.length>0} onChange={(e)=>toggleSelectAll(e.target.checked)} />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length===0 && (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">{loading? 'Loading...' : 'No data'}</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" className="h-4 w-4 text-indigo-600" checked={selectedIds.includes(r.id)} onChange={(e)=>toggleSelect(r.id, e.target.checked)} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{r.value}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{r.display_name}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-500">{r.is_active ? 'Yes' : 'No'}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium w-36">
                    <div className="flex justify-center space-x-2">
                      <button onClick={()=>openEdit(r)} className="text-yellow-500 hover:text-yellow-600" aria-label="Edit">
                        <PenSquare className="h-5 w-5" />
                      </button>
                      <button onClick={()=>confirmDelete([r.id])} className="text-red-500 hover:text-red-600" aria-label="Delete">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 flex items-center justify-between text-sm">
          <div>Page {page} of {pageCount}</div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</Button>
            <Button variant="outline" disabled={page===pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>Next</Button>
          </div>
        </div>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing? 'Edit Horsepower' : 'Add Horsepower'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Value</label>
              <Input value={value} onChange={e=>setValue(e.target.value)} placeholder="e.g. 1.5" />
            </div>
            <div>
              <label className="text-sm font-medium">Display name</label>
              <Input value={display} onChange={e=>setDisplay(e.target.value)} placeholder="e.g. 1.5 HP" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=>setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveRow}>{editing? 'Update' : 'Add'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Confirmation</DialogTitle>
          </DialogHeader>
          <div className="text-sm">Do you want to delete {deletingIds.length} record{deletingIds.length>1?'s':''}?</div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={()=>setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exists dialog */}
      <Dialog open={existsOpen} onOpenChange={setExistsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate</DialogTitle>
          </DialogHeader>
          <div className="text-sm">This record already exists.</div>
          <div className="flex justify-end pt-4">
            <Button onClick={()=>setExistsOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}


