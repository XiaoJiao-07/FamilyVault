import express from 'express'
import { getDatabase, autoSave, generateFamilyCode } from '../models/database.js'
import { authRequired } from './auth.js'

const router = express.Router()

router.use(authRequired)

function queryOne(db, sql, params = []) {
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params)
    if (stmt.step()) return stmt.getAsObject()
    return null
  } finally {
    stmt.free()
  }
}

function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql)
  const rows = []
  try {
    stmt.bind(params)
    while (stmt.step()) rows.push(stmt.getAsObject())
    return rows
  } finally {
    stmt.free()
  }
}

function currentUserId(req) {
  return Number(req.user.sub)
}

function getMembership(db, userId) {
  return queryOne(db, 'SELECT * FROM family_memberships WHERE user_id = ?', [userId])
}

function familyPayload(db, familyId) {
  const family = queryOne(db, 'SELECT * FROM families WHERE id = ?', [familyId])
  if (!family) return null

  const members = queryAll(
    db,
    `SELECT m.user_id, m.role, m.joined_at, u.username, u.display_name, u.last_login_at
     FROM family_memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.family_id = ?
     ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, m.joined_at ASC`,
    [familyId]
  ).map(m => ({
    userId: m.user_id,
    username: m.username,
    displayName: m.display_name || m.username,
    role: m.role,
    joinedAt: m.joined_at,
    lastLoginAt: m.last_login_at
  }))

  return {
    id: family.id,
    name: family.name,
    inviteCode: family.invite_code,
    createdAt: family.created_at,
    members
  }
}

/** 当前用户的家庭信息（含成员与邀请码） */
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase()
    const membership = getMembership(db, currentUserId(req))
    if (!membership) {
      return res.json({ success: true, data: null })
    }
    return res.json({
      success: true,
      data: familyPayload(db, membership.family_id),
      role: membership.role
    })
  } catch (error) {
    console.error('get family failed:', error)
    return res.status(500).json({ success: false, message: '获取家庭信息失败' })
  }
})

/** 重命名家庭（owner） */
router.put('/', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim()
    if (!name || name.length > 30) {
      return res.status(400).json({ success: false, message: '家庭名不能为空且不超过 30 个字' })
    }

    const db = await getDatabase()
    const membership = getMembership(db, currentUserId(req))
    if (!membership) {
      return res.status(404).json({ success: false, message: '你还没有家庭' })
    }
    if (membership.role !== 'owner') {
      return res.status(403).json({ success: false, message: '只有家庭创建者可以改名' })
    }

    db.run('UPDATE families SET name = ? WHERE id = ?', [name, membership.family_id])
    autoSave()

    return res.json({ success: true, data: familyPayload(db, membership.family_id) })
  } catch (error) {
    console.error('rename family failed:', error)
    return res.status(500).json({ success: false, message: '改名失败' })
  }
})

/** 用家庭邀请码加入另一个家庭 */
router.post('/join', async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase()
    if (!code) {
      return res.status(400).json({ success: false, message: '请输入家庭邀请码' })
    }

    const db = await getDatabase()
    const userId = currentUserId(req)
    const target = queryOne(db, 'SELECT * FROM families WHERE invite_code = ?', [code])
    if (!target) {
      return res.status(404).json({ success: false, message: '邀请码无效' })
    }

    const membership = getMembership(db, userId)
    if (membership && Number(membership.family_id) === Number(target.id)) {
      return res.status(400).json({ success: false, message: '你已在这个家庭中' })
    }

    if (membership) {
      const others = queryOne(
        db,
        'SELECT COUNT(*) AS c FROM family_memberships WHERE family_id = ? AND user_id <> ?',
        [membership.family_id, userId]
      )
      const otherCount = Number(others?.c || 0)

      if (otherCount > 0) {
        return res.status(409).json({
          success: false,
          message: '你当前家庭还有其他成员，请先由创建者移除你，或使用另一个账号加入'
        })
      }

      // 只有自己一人的旧家庭：连同数据一起清理，避免产生孤儿家庭
      db.run('DELETE FROM family_data WHERE family_id = ?', [membership.family_id])
      db.run('DELETE FROM family_memberships WHERE family_id = ?', [membership.family_id])
      db.run('DELETE FROM families WHERE id = ?', [membership.family_id])
    }

    db.run(
      "INSERT INTO family_memberships (family_id, user_id, role) VALUES (?, ?, 'member')",
      [target.id, userId]
    )
    autoSave()

    return res.json({ success: true, data: familyPayload(db, target.id), role: 'member' })
  } catch (error) {
    console.error('join family failed:', error)
    return res.status(500).json({ success: false, message: '加入失败，请稍后重试' })
  }
})

/** 重置家庭邀请码（owner），用于旧码外泄后作废 */
router.post('/invite/rotate', async (req, res) => {
  try {
    const db = await getDatabase()
    const membership = getMembership(db, currentUserId(req))
    if (!membership) {
      return res.status(404).json({ success: false, message: '你还没有家庭' })
    }
    if (membership.role !== 'owner') {
      return res.status(403).json({ success: false, message: '只有家庭创建者可以重置邀请码' })
    }

    let code = ''
    for (let i = 0; i < 10; i += 1) {
      const candidate = generateFamilyCode()
      if (!queryOne(db, 'SELECT id FROM families WHERE invite_code = ?', [candidate])) {
        code = candidate
        break
      }
    }
    if (!code) {
      return res.status(500).json({ success: false, message: '生成失败，请重试' })
    }

    db.run('UPDATE families SET invite_code = ? WHERE id = ?', [code, membership.family_id])
    autoSave()

    return res.json({ success: true, data: familyPayload(db, membership.family_id) })
  } catch (error) {
    console.error('rotate invite failed:', error)
    return res.status(500).json({ success: false, message: '重置失败' })
  }
})

export default router
