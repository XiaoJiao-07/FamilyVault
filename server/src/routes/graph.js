import express from 'express'
import { getDatabase, autoSave } from '../models/database.js'

const router = express.Router()

// 获取家族图谱数据
router.get('/members', async (req, res) => {
  try {
    const db = await getDatabase()
    const result = db.exec('SELECT * FROM family_members')

    let members = []
    if (result.length > 0) {
      const columns = result[0].columns
      members = result[0].values.map(row => {
        const obj = {}
        columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
    }

    res.json({ success: true, data: members })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取家族关系
router.get('/relationships', async (req, res) => {
  try {
    const db = await getDatabase()
    const result = db.exec(`
      SELECT
        r.*,
        m1.name as from_name,
        m2.name as to_name
      FROM family_relationships r
      JOIN family_members m1 ON r.from_member_id = m1.id
      JOIN family_members m2 ON r.to_member_id = m2.id
    `)

    let relationships = []
    if (result.length > 0) {
      const columns = result[0].columns
      relationships = result[0].values.map(row => {
        const obj = {}
        columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
    }

    res.json({ success: true, data: relationships })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 添加家族成员
router.post('/members', async (req, res) => {
  try {
    const { name, gender, birthYear, deathYear, hometown, occupation, bio, avatar } = req.body
    const db = await getDatabase()

    db.run(
      'INSERT INTO family_members (name, gender, birth_year, death_year, hometown, occupation, bio, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, gender, birthYear, deathYear, hometown, occupation, bio, avatar]
    )
    autoSave()

    const result = db.exec('SELECT last_insert_rowid() as id')
    const id = result[0].values[0][0]

    res.json({
      success: true,
      data: { id, name, gender, birthYear, deathYear, hometown, occupation, bio, avatar }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 添加家族关系
router.post('/relationships', async (req, res) => {
  try {
    const { fromMemberId, toMemberId, relationshipType, description, sourceMessageId } = req.body
    const db = await getDatabase()

    db.run(
      'INSERT INTO family_relationships (from_member_id, to_member_id, relationship_type, description, source_message_id) VALUES (?, ?, ?, ?, ?)',
      [fromMemberId, toMemberId, relationshipType, description, sourceMessageId]
    )
    autoSave()

    const result = db.exec('SELECT last_insert_rowid() as id')
    const id = result[0].values[0][0]

    res.json({
      success: true,
      data: { id, fromMemberId, toMemberId, relationshipType, description }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取图谱完整数据（节点 + 边）
router.get('/full', async (req, res) => {
  try {
    const db = await getDatabase()

    const nodesResult = db.exec('SELECT * FROM family_members')
    let nodes = []
    if (nodesResult.length > 0) {
      const columns = nodesResult[0].columns
      nodes = nodesResult[0].values.map(row => {
        const obj = {}
        columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
    }

    const edgesResult = db.exec(`
      SELECT
        r.id,
        r.from_member_id as source,
        r.to_member_id as target,
        r.relationship_type as label,
        r.description
      FROM family_relationships r
    `)
    let edges = []
    if (edgesResult.length > 0) {
      const columns = edgesResult[0].columns
      edges = edgesResult[0].values.map(row => {
        const obj = {}
        columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
    }

    res.json({
      success: true,
      data: { nodes, edges }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router