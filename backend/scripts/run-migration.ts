import { prisma } from '../src/config/database'

async function main() {
  console.log('Running migration: add password token columns...')

  try {
    // Check if columns already exist
    const checkQuery = await prisma.$queryRaw<any[]>`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('setup_password_token', 'setup_token_expires_at', 'reset_password_token', 'reset_token_expires_at')
    `

    const existingColumns = checkQuery.map(r => r.COLUMN_NAME)
    console.log('Existing columns:', existingColumns)

    if (!existingColumns.includes('setup_password_token')) {
      await prisma.$executeRaw`ALTER TABLE users ADD COLUMN setup_password_token VARCHAR(255) NULL`
      console.log('Added column: setup_password_token')
    }

    if (!existingColumns.includes('setup_token_expires_at')) {
      await prisma.$executeRaw`ALTER TABLE users ADD COLUMN setup_token_expires_at DATETIME NULL`
      console.log('Added column: setup_token_expires_at')
    }

    if (!existingColumns.includes('reset_password_token')) {
      await prisma.$executeRaw`ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255) NULL`
      console.log('Added column: reset_password_token')
    }

    if (!existingColumns.includes('reset_token_expires_at')) {
      await prisma.$executeRaw`ALTER TABLE users ADD COLUMN reset_token_expires_at DATETIME NULL`
      console.log('Added column: reset_token_expires_at')
    }

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
