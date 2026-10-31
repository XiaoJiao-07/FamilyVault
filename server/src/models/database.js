import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '../../../data/database.sqlite')

let db = null
let SQL = null

export async function getDatabase() {
  if (!db) {
    if (!SQL) {
      SQL = await initSqlJs()
    }

    // 如果数据库文件存在，加载它
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath)
      db = new SQL.Database(fileBuffer)
    } else {
      db = new SQL.Database()
    }

    // 确保 data 目录存在
    const dataDir = path.dirname(dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
  }
  return db
}

// 保存数据库到文件
function saveDatabase() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

export async function initDatabase() {
  const database = await getDatabase()

  // 创建表
  database.run(`
    -- 采访对象表
    CREATE TABLE IF NOT EXISTS interviewees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER,
      hometown TEXT,
      avatar TEXT,
      relationship TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 采访会话表
    CREATE TABLE IF NOT EXISTS interview_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      interviewee_id INTEGER NOT NULL,
      title TEXT,
      status TEXT DEFAULT 'active',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (interviewee_id) REFERENCES interviewees(id)
    );

    -- 消息表
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ai', 'user')),
      text TEXT NOT NULL,
      audio_url TEXT,
      duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
    );

    -- 家族成员表（知识图谱节点）
    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT,
      birth_year INTEGER,
      death_year INTEGER,
      hometown TEXT,
      occupation TEXT,
      bio TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 家族关系表（知识图谱边）
    CREATE TABLE IF NOT EXISTS family_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_member_id INTEGER NOT NULL,
      to_member_id INTEGER NOT NULL,
      relationship_type TEXT NOT NULL,
      description TEXT,
      source_message_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_member_id) REFERENCES family_members(id),
      FOREIGN KEY (to_member_id) REFERENCES family_members(id),
      FOREIGN KEY (source_message_id) REFERENCES messages(id)
    );

    -- 记忆地点表
    CREATE TABLE IF NOT EXISTS memory_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT,
      description TEXT,
      year INTEGER,
      source_message_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_message_id) REFERENCES messages(id)
    );

    -- 时光胶囊表
    CREATE TABLE IF NOT EXISTS time_capsules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_person TEXT NOT NULL,
      to_person TEXT NOT NULL,
      message_type TEXT NOT NULL CHECK(message_type IN ('audio', 'text', 'video')),
      content TEXT NOT NULL,
      media_url TEXT,
      unlock_date DATETIME NOT NULL,
      is_unlocked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 传家宝表
    CREATE TABLE IF NOT EXISTS heirlooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('recipe', 'craft', 'motto', 'other')),
      content TEXT NOT NULL,
      media_urls TEXT,
      author_name TEXT,
      author_id INTEGER,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES family_members(id)
    );

    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      invitation_code_used TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    );

    -- 邀请码表
    CREATE TABLE IF NOT EXISTS invitation_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      created_by INTEGER,
      max_uses INTEGER DEFAULT 1,
      current_uses INTEGER DEFAULT 0,
      expires_at DATETIME,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    -- 用户数据表（跨设备同步）
    CREATE TABLE IF NOT EXISTS user_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      data_key TEXT NOT NULL,
      value TEXT,
      synced_at DATETIME,
      UNIQUE (user_id, data_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_from ON family_relationships(from_member_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_to ON family_relationships(to_member_id);
    CREATE INDEX IF NOT EXISTS idx_capsules_unlock ON time_capsules(unlock_date, is_unlocked);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_codes_code ON invitation_codes(code);
  `)

  // 种子数据：保证全新部署也能立即注册/登录，避免「没有邀请码也没有管理员」的死锁
  await seedInitialData(database)

  // 保存数据库
  saveDatabase()

  console.log('✅ Database initialized successfully')
}

function countRows(database, sql) {
  const result = database.exec(sql)
  return result.length ? result[0].values[0][0] : 0
}

function createSeedCode(database, createdBy) {
  const code = (process.env.INITIAL_INVITATION_CODE || 'FAMILY2026').toUpperCase()
  const exists = countRows(
    database,
    `SELECT COUNT(*) FROM invitation_codes WHERE code = '${code.replace(/'/g, "''")}'`
  )
  if (exists) return code

  database.run(
    `INSERT INTO invitation_codes (code, created_by, max_uses, current_uses, expires_at, is_active)
     VALUES (?, ?, ?, 0, NULL, 1)`,
    [code, createdBy, 50]
  )
  return code
}

/**
 * 种子数据：全新部署时创建管理员账号 + 初始邀请码，
 * 避免「没有邀请码 → 无法注册 → 无法登录 → 无法生成邀请码」的死锁。
 */
async function seedInitialData(database) {
  const userCount = countRows(database, 'SELECT COUNT(*) FROM users')
  const adminUsername = process.env.ADMIN_USERNAME || 'admin'
  const adminPassword = process.env.ADMIN_PASSWORD || 'FamilyVault@2026'

  if (userCount > 0) {
    // 已有用户但没有可用邀请码时，补一个，否则新成员无法加入
    const activeCodes = countRows(
      database,
      'SELECT COUNT(*) FROM invitation_codes WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime("now"))'
    )
    if (activeCodes === 0) {
      const code = createSeedCode(database, 1)
      saveDatabase()
      console.log(`🎟️  已补充初始邀请码：${code}`)
    }
    return
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10)
  database.run(
    'INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)',
    [adminUsername, '家族管理员', passwordHash, 'admin']
  )
  const code = createSeedCode(database, 1)

  console.log('')
  console.log('┌──────────────────────────────────────────────┐')
  console.log('│  首次部署已完成，已创建初始管理员账号        │')
  console.log('└──────────────────────────────────────────────┘')
  console.log(`   用户名：${adminUsername}`)
  console.log(`   密  码：${adminPassword}`)
  console.log(`   邀请码：${code}（可在注册页直接使用）`)
  console.log('   ⚠️  生产环境请通过 ADMIN_USERNAME / ADMIN_PASSWORD 覆盖默认值')
  console.log('')
}

export function closeDatabase() {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}

// 自动保存（每次修改后）
export function autoSave() {
  saveDatabase()
}