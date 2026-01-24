import mysql from 'mysql2/promise'

async function fixEmployeTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  console.log('🚀 Début de la correction de la table Employe...\n')

  try {
    // Désactiver les vérifications de clés étrangères
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0')
    console.log('✓ Vérifications de clés étrangères désactivées')

    // Supprimer l'ancienne table
    await connection.execute('DROP TABLE IF EXISTS `Employe`')
    console.log('✓ Ancienne table Employe supprimée')

    // Créer la nouvelle table avec la bonne structure
    await connection.execute(`
      CREATE TABLE \`Employe\` (
        \`id\` VARCHAR(36) PRIMARY KEY,
        \`user_id\` VARCHAR(36) UNIQUE NOT NULL,
        \`nom\` VARCHAR(255) DEFAULT NULL,
        \`prenom\` VARCHAR(255) DEFAULT NULL,
        \`email\` VARCHAR(255) DEFAULT NULL,
        \`birthday\` DATETIME DEFAULT NULL,
        \`sexe\` ENUM('HOMME', 'FEMME') DEFAULT NULL,
        \`rib\` VARCHAR(24) DEFAULT NULL,
        \`adresse\` VARCHAR(500) DEFAULT NULL,
        \`telephone\` VARCHAR(50) DEFAULT NULL,
        \`date_embauche\` DATETIME DEFAULT NULL,
        \`photo\` TEXT DEFAULT NULL,
        \`cv\` TEXT DEFAULT NULL,
        \`type_contrat\` ENUM('CDI', 'CDD', 'Stage', 'Freelance') DEFAULT NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_employe_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('✓ Nouvelle table Employe créée avec succès')

    // Réactiver les vérifications de clés étrangères
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1')
    console.log('✓ Vérifications de clés étrangères réactivées')

    // Vérifier la structure de la table
    const [columns] = await connection.execute('DESCRIBE `Employe`')
    console.log('\n📋 Structure de la table Employe:')
    console.table(columns)

    console.log('\n✅ Table Employe créée avec succès!')

  } catch (error) {
    console.error('❌ Erreur lors de la correction de la table:', error)
    throw error
  } finally {
    await connection.end()
    console.log('\n🏁 Migration terminée')
  }
}

fixEmployeTable().catch(console.error)
