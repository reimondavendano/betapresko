'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, PenSquare } from 'lucide-react'

type CustomSetting = { 
  id: string; 
  setting_key: string; 
  setting_value: string; 
  setting_type: string; 
  description: string | null; 
  setting_category: string; 
  created_at: string 
}

export default function AdminCustomSettings() {
  const pageSize = 5
  const [rows, setRows] = useState<CustomSetting[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<CustomSetting | null>(null)
  const [settingKey, setSettingKey] = useState('')
  const [settingValue, setSettingValue] = useState('')
  const [settingType, setSettingType] = useState('text')
  const [description, setDescription] = useState('')
  const [settingCategory, setSettingCategory] = useState('')
  const [existsOpen, setExistsOpen] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingIds, setDeletingIds] = useState<string[]>([])

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total])

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const cats = Array.from(new Set(rows.map(r => r.setting_category)))
    return cats.sort()
  }, [rows])

  const fetchRows = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ 
        page: String(page), 
        pageSize: String(pageSize), 
        search,
        category: selectedCategory
      })
      const res = await fetch(`/api/admin/custom-settings?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load')
      setRows(json.data || [])
      setTotal(json.total || 0)
      setSelectedIds([])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRows() }, [page, search, selectedCategory])

  const openAdd = () => { 
    setEditing(null); 
    setSettingKey(''); 
    setSettingValue(''); 
    setSettingType('text'); 
    setDescription(''); 
    setSettingCategory(''); 
    setEditOpen(true) 
  }
  
  const openEdit = (row: CustomSetting) => { 
    setEditing(row); 
    setSettingKey(row.setting_key); 
    setSettingValue(row.setting_value); 
    setSettingType(row.setting_type); 
    setDescription(row.description || ''); 
    setSettingCategory(row.setting_category); 
    setEditOpen(true) 
  }

  const saveCustomSetting = async () => {
    if (!settingKey.trim() || !settingValue.trim() || !settingType.trim() || !settingCategory.trim()) return
    
    if (editing) {
      await fetch('/api/admin/custom-settings', { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          id: editing.id, 
          setting_key: settingKey.trim(),
          setting_value: settingValue.trim(),
          setting_type: settingType.trim(),
          description: description.trim() || null,
          setting_category: settingCategory.trim()
        }) 
      })
    } else {
      const res = await fetch('/api/admin/custom-settings', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          setting_key: settingKey.trim(),
          setting_value: settingValue.trim(),
          setting_type: settingType.trim(),
          description: description.trim() || null,
          setting_category: settingCategory.trim()
        }) 
      })
      if (!res.ok) {
        const j = await res.json().catch(()=>({}))
        if (res.status === 409) setExistsOpen(true)
        else alert(j?.error || 'Failed to add custom setting')
        return
      }
    }
    setEditOpen(false)
    await fetchRows()
  }

  const confirmDelete = (ids: string[]) => { setDeletingIds(ids); setConfirmOpen(true) }
  const doDelete = async () => {
    await fetch('/api/admin/custom-settings', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: deletingIds }) })
    setConfirmOpen(false); setDeletingIds([]); await fetchRows()
  }

  const toggleSelectAll = (checked: boolean) => { setSelectedIds(checked ? rows.map(r => r.id) : []) }
  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id]
      }
      return prev.filter(x => x !== id)
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-6 pb-6">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 
          p-4 bg-gradient-to-br from-[#99BCC0] via-[#8FB6BA] to-[#6fa3a9] 
          text-white rounded-t-lg">

          <h1 className="text-lg sm:text-2xl font-bold">Manage Custom Settings</h1>

          <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
            <button
              className="flex items-center justify-center px-3 py-2 text-sm sm:text-base 
                bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60"
              disabled={selectedIds.length === 0}
              onClick={() => confirmDelete(selectedIds)}
            >
              <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
              Delete
            </button>
            <button
              className="flex items-center justify-center px-3 py-2 text-sm sm:text-base 
                bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              Add New Setting
            </button>
          </div>
        </div>


      {/* Table wrapper */}
      <div className="bg-white shadow overflow-hidden sm:rounded-b-lg">
        {/* Search and filter row */}
        <div className="px-6 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-2 w-full sm:w-auto">
            <Input 
              placeholder="Search settings..." 
              value={search} 
              onChange={e=>{setPage(1);setSearch(e.target.value)}} 
              className="w-full sm:w-64" 
            />
            <Select 
              value={selectedCategory || "all"} 
              onValueChange={(value) => {setPage(1); setSelectedCategory(value === "all" ? "" : value)}}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Total */}
          <div className="text-xs text-gray-500 text-right sm:text-left">
            Total: {total}
          </div>
        </div>

        
        <div className="bg-white shadow overflow-x-auto sm:overflow-hidden sm:rounded-b-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input type="checkbox" className="h-4 w-4 text-indigo-600" checked={selectedIds.length===rows.length && rows.length>0} onChange={(e)=>toggleSelectAll(e.target.checked)} />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length===0 && (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">{loading? 'Loading...' : 'No data'}</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" className="h-4 w-4 text-indigo-600" checked={selectedIds.includes(r.id)} onChange={(e)=>toggleSelect(r.id, e.target.checked)} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{r.setting_category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{r.setting_key}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 max-w-xs truncate" title={r.setting_value}>{r.setting_value}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{r.setting_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 max-w-xs truncate" title={r.description || ''}>{r.description || '-'}</div>
                  </td>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing? 'Edit Custom Setting' : 'Add Custom Setting'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input 
                  value={settingCategory} 
                  onChange={e=>setSettingCategory(e.target.value)} 
                  placeholder="e.g., pricing, system, notifications" 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Setting Key</label>
                <Input 
                  value={settingKey} 
                  onChange={e=>setSettingKey(e.target.value)} 
                  placeholder="e.g., discount_rate, maintenance_reminder" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Setting Value</label>
                <Input 
                  value={settingValue} 
                  onChange={e=>setSettingValue(e.target.value)} 
                  placeholder="e.g., 0.10, true, 24" 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Setting Type</label>
                <Select value={settingType} onValueChange={setSettingType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={description} 
                onChange={e=>setDescription(e.target.value)} 
                placeholder="Optional description of what this setting controls" 
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={()=>setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveCustomSetting}>{editing? 'Update' : 'Add'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
          <div className="text-sm">This setting key already exists in the selected category.</div>
          <div className="flex justify-end pt-4">
            <Button onClick={()=>setExistsOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}


