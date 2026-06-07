import { Router } from 'express'
import { db } from '../database'
import jwt from 'jsonwebtoken'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'pdd-166-secret-key'

function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '未登录' })
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期' })
  }
}

router.use(authMiddleware)

router.get('/', (req: any, res) => {
  const meds = db.prepare(
    'SELECT * FROM medications WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId)
  res.json(meds.map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    name: m.name,
    dosage: m.dosage,
    frequency: m.frequency,
    time: m.time,
    startDate: m.start_date,
    endDate: m.end_date,
    notes: m.notes,
    active: !!m.active,
    createdAt: m.created_at
  })))
})

router.post('/', (req: any, res) => {
  const { name, dosage, frequency, time, startDate, endDate, notes, active } = req.body

  const result = db.prepare(`
    INSERT INTO medications (user_id, name, dosage, frequency, time, start_date, end_date, notes, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.userId, name, dosage, frequency, time, startDate, endDate || null, notes, active !== false ? 1 : 0)

  const med: any = db.prepare('SELECT * FROM medications WHERE id = ?').get(result.lastInsertRowid)
  res.json({
    id: med.id,
    userId: med.user_id,
    name: med.name,
    dosage: med.dosage,
    frequency: med.frequency,
    time: med.time,
    startDate: med.start_date,
    endDate: med.end_date,
    notes: med.notes,
    active: !!med.active,
    createdAt: med.created_at
  })
})

router.put('/:id', (req: any, res) => {
  const { name, dosage, frequency, time, startDate, endDate, notes, active } = req.body

  db.prepare(`
    UPDATE medications SET
    name = ?, dosage = ?, frequency = ?, time = ?, start_date = ?, end_date = ?, notes = ?, active = ?
    WHERE id = ? AND user_id = ?
  `).run(name, dosage, frequency, time, startDate, endDate || null, notes, active !== false ? 1 : 0, req.params.id, req.userId)

  const med: any = db.prepare('SELECT * FROM medications WHERE id = ?').get(req.params.id)
  res.json({
    id: med.id,
    userId: med.user_id,
    name: med.name,
    dosage: med.dosage,
    frequency: med.frequency,
    time: med.time,
    startDate: med.start_date,
    endDate: med.end_date,
    notes: med.notes,
    active: !!med.active,
    createdAt: med.created_at
  })
})

router.delete('/:id', (req: any, res) => {
  db.prepare('DELETE FROM medications WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  db.prepare('DELETE FROM medication_logs WHERE medication_id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ success: true })
})

router.post('/:id/log', (req: any, res) => {
  const med: any = db.prepare('SELECT * FROM medications WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!med) return res.status(404).json({ error: '用药不存在' })

  const result = db.prepare(`
    INSERT INTO medication_logs (user_id, medication_id, medication_name, dosage, taken_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(req.userId, med.id, med.name, med.dosage)

  const log: any = db.prepare('SELECT * FROM medication_logs WHERE id = ?').get(result.lastInsertRowid)
  res.json({
    id: log.id,
    userId: log.user_id,
    medicationId: log.medication_id,
    medicationName: log.medication_name,
    dosage: log.dosage,
    takenAt: log.taken_at
  })
})

router.get('/logs', (req: any, res) => {
  const { date, medicationId } = req.query
  let query = 'SELECT * FROM medication_logs WHERE user_id = ?'
  const params: any[] = [req.userId]

  if (date) {
    query += ' AND DATE(taken_at) = ?'
    params.push(date)
  }
  if (medicationId) {
    query += ' AND medication_id = ?'
    params.push(medicationId)
  }

  query += ' ORDER BY taken_at DESC'

  const logs = db.prepare(query).all(...params)
  res.json(logs.map((l: any) => ({
    id: l.id,
    userId: l.user_id,
    medicationId: l.medication_id,
    medicationName: l.medication_name,
    dosage: l.dosage,
    takenAt: l.taken_at
  })))
})

router.delete('/logs/:id', (req: any, res) => {
  db.prepare('DELETE FROM medication_logs WHERE id = ? AND user_id = ?').run(req.params.id, req.userId)
  res.json({ success: true })
})

router.get('/today-status', (req: any, res) => {
  const today = new Date().toISOString().split('T')[0]
  const logs = db.prepare(`
    SELECT medication_id, taken_at FROM medication_logs
    WHERE user_id = ? AND DATE(taken_at) = ?
  `).all(req.userId, today)

  const status: Record<number, string> = {}
  logs.forEach((log: any) => {
    status[log.medication_id] = log.taken_at
  })
  res.json(status)
})

export default router
