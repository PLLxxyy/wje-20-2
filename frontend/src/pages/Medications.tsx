import { useEffect, useState } from 'react'
import api from '@/utils/api'
import MedicationForm from '@/components/MedicationForm'
import { Medication, MedicationLog } from '@/types'
import { Plus, Trash2, Edit, Clock, ListTodo, X, Calendar } from 'lucide-react'

export default function Medications() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [logs, setLogs] = useState<MedicationLog[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'medications' | 'history'>('medications')
  const [filterMedId, setFilterMedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)

  const fetchMedications = async () => {
    try {
      const res = await api.get('/medications')
      setMedications(res.data)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const params = filterMedId ? { medicationId: filterMedId } : {}
      const res = await api.get('/medications/logs', { params })
      setLogs(res.data)
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    fetchMedications()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchLogs()
    }
  }, [activeTab, filterMedId])

  const handleCreate = async (data: Partial<Medication>) => {
    await api.post('/medications', data)
    setShowForm(false)
    fetchMedications()
  }

  const handleUpdate = async (id: number, data: Partial<Medication>) => {
    await api.put(`/medications/${id}`, data)
    setEditingId(null)
    fetchMedications()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这个用药提醒吗？')) return
    await api.delete(`/medications/${id}`)
    fetchMedications()
  }

  const handleToggle = async (med: Medication) => {
    await api.put(`/medications/${med.id}`, { active: !med.active })
    fetchMedications()
  }

  const handleViewHistory = (medId: number) => {
    setFilterMedId(medId)
    setActiveTab('history')
  }

  const groupLogsByDate = () => {
    const groups: Record<string, MedicationLog[]> = {}
    logs.forEach(log => {
      const date = new Date(log.takenAt).toLocaleDateString('zh-CN')
      if (!groups[date]) groups[date] = []
      groups[date].push(log)
    })
    return groups
  }

  const filterMedName = filterMedId ? medications.find(m => m.id === filterMedId)?.name : null

  if (loading) return <div className="text-center py-20 text-gray-500">加载中...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">用药提醒</h1>
        {activeTab === 'medications' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增用药
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('medications'); setFilterMedId(null) }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'medications'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            用药管理
          </div>
        </button>
        <button
          onClick={() => { setActiveTab('history'); setFilterMedId(null) }}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'history'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4" />
            服用记录
          </div>
        </button>
      </div>

      {activeTab === 'medications' ? (
        <>
          {showForm && (
            <MedicationForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          )}

          <div className="space-y-3">
            {medications.map(med => (
              <div key={med.id} className={`bg-white rounded-lg border ${med.active ? 'border-gray-200' : 'border-gray-100 opacity-60'} p-6`}>
                {editingId === med.id ? (
                  <MedicationForm
                    onSubmit={(data) => handleUpdate(med.id, data)}
                    onCancel={() => setEditingId(null)}
                    initial={med}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${med.active ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">{med.name}</h3>
                          <p className="text-sm text-gray-500">{med.dosage} · {med.frequency} · {med.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewHistory(med.id)}
                          className="px-3 py-1 text-xs text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100"
                        >
                          服药记录
                        </button>
                        <button
                          onClick={() => handleToggle(med)}
                          className={`px-3 py-1 text-xs rounded-full ${med.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {med.active ? '已启用' : '已停用'}
                        </button>
                        <button
                          onClick={() => setEditingId(med.id)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(med.id)}
                          className="p-2 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {med.notes && (
                      <p className="text-sm text-gray-500 ml-13">{med.notes}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      开始日期: {new Date(med.startDate).toLocaleDateString('zh-CN')}
                      {med.endDate && ` · 结束日期: ${new Date(med.endDate).toLocaleDateString('zh-CN')}`}
                    </p>
                  </>
                )}
              </div>
            ))}

            {medications.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <p>暂无用药提醒</p>
                <p className="text-sm mt-1">点击上方按钮添加用药计划</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {filterMedName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>正在查看: <strong>{filterMedName}</strong> 的服药记录</span>
                <button
                  onClick={() => setFilterMedId(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {logsLoading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无服药记录</p>
              <p className="text-sm mt-1">
                {filterMedName ? '该药品暂无服药记录' : '在首页点击"已服"按钮记录服药时间'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupLogsByDate()).map(([date, dayLogs]) => (
                <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">{date}</span>
                    <span className="text-xs text-gray-400 ml-2">共 {dayLogs.length} 次</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {dayLogs.map(log => (
                      <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{log.medicationName}</p>
                            <p className="text-xs text-gray-500">{log.dosage}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">
                            {new Date(log.takenAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-xs text-gray-400">已服用</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
