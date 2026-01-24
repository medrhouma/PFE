import mysql from 'mysql2/promise'

async function migrateEmploye() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  console.log('🚀 Début de la migration de la table Employe...\n')

  try {
    // Create Employe table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Employe (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36) UNIQUE NOT NULL,
        nom VARCHAR(255),
        prenom VARCHAR(255),
        email VARCHAR(255),
        birthday DATETIME,
        sexe ENUM('HOMME', 'FEMME'),
        rib VARCHAR(24),
        adresse VARCHAR(500),
        telephone VARCHAR(50),
        date_embauche DATETIME,
        photo TEXT,
        cv TEXT,
        type_contrat ENUM('CDI', 'CDD', 'Stage', 'Freelance'),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
      )
    `)
    console.log('✅ Table Employe créée avec succès')

    // Verify the table was created
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'Employe'
    `)
    console.log(`✅ Vérification: ${(tables as any[]).length} table(s) trouvée(s)`)

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    throw error
  } finally {
    await connection.end()
    console.log('\n🏁 Migration terminée')
  }
}

migrateEmploye().catch(console.error)
