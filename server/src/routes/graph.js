import express from 'express'
import { getDatabase } from '../models/database.js'

const router = express.Router()

// 获取家族图谱数据
router.get('/members', (req, res) => {
  try {
    const db = getDatabase()
    const members = db.prepare('SELECT * FROM family_members').all()
    res.json({ success: true, data: members })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取家族关系
router.get('/relationships', (req, res) => {
  try {
    const db = getDatabase()
    const relationships = db.prepare(`
      SELECT
        r.*,
        m1.name as from_name,
        m2.name as to_name
      FROM family_relationships r
      JOIN family_members m1 ON r.from_member_id = m1.id
      JOIN family_members m2 ON r.to_member_id = m2.id
    `).all()
    res.json({ success: true, data: relationships })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 添加家族成员
router.post('/members', (req, res) => {
  try {
    const { name, gender, birthYear, deathYear, hometown, occupation, bio, avatar } = req.body
    const db = getDatabase()

    const stmt = db.prepare(`
      INSERT INTO family_members (name, gender, birth_year, death_year, hometown, occupation, bio, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(name, gender, birthYear, deathYear, hometown, occupation, bio, avatar)

    res.json({
      success: true,
      data: { id: result.lastInsertRowid, name, gender, birthYear, deathYear, hometown, occupation, bio, avatar }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 添加家族关系
router.post('/relationships', (req, res) => {
  try {
    const { fromMemberId, toMemberId, relationshipType, description, sourceMessageId } = req.body
    const db = getDatabase()

    const stmt = db.prepare(`
      INSERT INTO family_relationships (from_member_id, to_member_id, relationship_type, description, source_message_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    const result = stmt.run(fromMemberId, toMemberId, relationshipType, description, sourceMessageId)

    res.json({
      success: true,
      data: { id: result.lastInsertRowid, fromMemberId, toMemberId, relationshipType, description }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取图谱完整数据（节点+边）
router.get('/full', (req, res) => {
  try {
    const db = getDatabase()

    const nodes = db.prepare('SELECT * FROM family_members').all()
    const edges = db.prepare(`
      SELECT
        r.id,
        r.from_member_id as source,
        r.to_member_id as target,
        r.relationship_type as label,
        r.description
      FROM family_relationships r
    `).all()

    res.json({
      success: true,
      data: { nodes, edges }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router