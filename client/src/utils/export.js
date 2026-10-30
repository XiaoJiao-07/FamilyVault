// 数据导出工具

export const exportData = {
  // 导出为 JSON
  toJSON(data, filename = 'familyvault-export') {
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    downloadBlob(blob, `${filename}.json`)
  },

  // 导出为 CSV
  toCSV(data, filename = 'familyvault-export') {
    if (!Array.isArray(data) || data.length === 0) {
      console.error('CSV 导出需要数组数据')
      return
    }

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          let cell = row[header]
          if (cell === null || cell === undefined) return ''
          cell = String(cell).replace(/"/g, '""')
          return `"${cell}"`
        }).join(',')
      )
    ]

    const csvStr = csvRows.join('\n')
    const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, `${filename}.csv`)
  },

  // 导出为 TXT
  toTXT(text, filename = 'familyvault-export') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, `${filename}.txt`)
  },

  // 导出完整数据包
  exportFullPackage(familyData) {
    const dataPackage = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      app: 'FamilyVault',
      data: familyData
    }
    this.toJSON(dataPackage, `familyvault-backup-${Date.now()}`)
  },

  // 导入数据
  importFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          if (data.app !== 'FamilyVault') {
            reject(new Error('无效的数据文件'))
            return
          }
          resolve(data.data)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }
}

// 下载 Blob
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 生成家族报告
export function generateFamilyReport(familyData) {
  const report = {
    title: 'FamilyVault 家族报告',
    generatedAt: new Date().toLocaleString('zh-CN'),
    summary: {
      totalMembers: familyData.members?.length || 0,
      totalStories: familyData.stories?.length || 0,
      totalLocations: familyData.locations?.length || 0,
      totalCapsules: familyData.capsules?.length || 0,
      totalHeirlooms: familyData.heirlooms?.length || 0
    },
    members: familyData.members || [],
    stories: familyData.stories || [],
    locations: familyData.locations || [],
    capsules: familyData.capsules || [],
    heirlooms: familyData.heirlooms || []
  }

  return report
}

export default exportData
