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

    -- 家庭表：数据的归属单位（一个家庭 = 一份共享的家史库）
    CREATE TABLE IF NOT EXISTS families (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 家庭成员：一个用户同一时间只属于一个家庭
    CREATE TABLE IF NOT EXISTS family_memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 家庭数据：按 family_id 作用域存储，家人共享，version 用于冲突检测
    CREATE TABLE IF NOT EXISTS family_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL,
      data_key TEXT NOT NULL,
      value TEXT,
      version TEXT NOT NULL,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (family_id, data_key),
      FOREIGN KEY (family_id) REFERENCES families(id)
    );

    -- 媒体文件：登记归属家庭，禁止匿名访问
    CREATE TABLE IF NOT EXISTS media_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      original_name TEXT,
      mime_type TEXT,
      size INTEGER,
      kind TEXT NOT NULL DEFAULT 'image',
      family_id INTEGER NOT NULL,
      uploaded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families(id)
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_from ON family_relationships(from_member_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_to ON family_relationships(to_member_id);
    CREATE INDEX IF NOT EXISTS idx_capsules_unlock ON time_capsules(unlock_date, is_unlocked);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_codes_code ON invitation_codes(code);
    CREATE INDEX IF NOT EXISTS idx_memberships_family ON family_memberships(family_id);
    CREATE INDEX IF NOT EXISTS idx_memberships_user ON family_memberships(user_id);
    CREATE INDEX IF NOT EXISTS idx_family_data_family ON family_data(family_id);
    CREATE INDEX IF NOT EXISTS idx_media_family ON media_files(family_id);
  `)

  // 种子数据：保证全新部署也能立即注册/登录，避免「没有邀请码也没有管理员」的死锁
  await seedInitialData(database)

  // 保证每个用户都有归属家庭（兼容早期只有账号、没有家庭的数据）
  await ensureFamilies(database)

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
  // 安全：不提供默认密码。未配置时随机生成，避免真实密码泄露在代码里
  const adminPassword = process.env.ADMIN_PASSWORD || `Fv-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`

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

const FAMILY_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateFamilyCode(length = 8) {
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += FAMILY_CODE_CHARS[Math.floor(Math.random() * FAMILY_CODE_CHARS.length)]
  }
  return code
}

/** 生成一个库内唯一的家庭邀请码 */
function uniqueFamilyCode(database) {
  for (let i = 0; i < 10; i += 1) {
    const code = generateFamilyCode()
    const exists = countRows(
      database,
      `SELECT COUNT(*) FROM families WHERE invite_code = '${code}'`
    )
    if (!exists) return code
  }
  throw new Error('无法生成唯一的家庭邀请码')
}

/**
 * 为用户创建家庭并设为 owner。
 * 已经是成员的用户直接跳过，保证幂等。
 */
export function createFamilyForUser(database, user, familyName) {
  const existing = countRows(
    database,
    `SELECT COUNT(*) FROM family_memberships WHERE user_id = ${Number(user.id)}`
  )
  if (existing) return null

  const name = (familyName || `${user.display_name || user.username}的家`).slice(0, 30)
  const code = uniqueFamilyCode(database)

  database.run(
    'INSERT INTO families (name, invite_code, created_by) VALUES (?, ?, ?)',
    [name, code, user.id]
  )
  const familyId = database.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]

  database.run(
    "INSERT INTO family_memberships (family_id, user_id, role) VALUES (?, ?, 'owner')",
    [familyId, user.id]
  )

  return { id: familyId, name, inviteCode: code }
}

/** 确保所有用户都有家庭（早期账号迁移） */
async function ensureFamilies(database) {
  const result = database.exec(`
    SELECT u.id, u.username, u.display_name
    FROM users u
    LEFT JOIN family_memberships m ON m.user_id = u.id
    WHERE m.id IS NULL
  `)

  if (!result.length || !result[0].values.length) return

  const columns = result[0].columns
  const users = result[0].values.map(row => {
    const obj = {}
    columns.forEach((col, idx) => { obj[col] = row[idx] })
    return obj
  })

  for (const user of users) {
    const family = createFamilyForUser(database, user)
    if (family) {
      console.log(`🏠 已为 ${user.username} 创建家庭「${family.name}」，邀请码 ${family.inviteCode}`)
    }
  }
  saveDatabase()
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