const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: 'mysql.frequencesantec.com',
    port: 3307,
    user: 'santec_ai',
    password: 'izovs0IztGW]kjWX',
    database: 'santec_ai'
  });

  // Check active users vs employee records
  const [users] = await c.query(
    `SELECT u.id, u.name, u.last_name, u.email, u.role, u.status, e.id as emp_id, e.type_contrat
     FROM User u LEFT JOIN Employe e ON u.id = e.user_id
     WHERE u.role = 'USER' AND u.status = 'ACTIVE'`
  );
  console.log('Active employees:', JSON.stringify(users, null, 2));

  // Realistic Tunisian salaries (in TND)
  const salaryData = [
    // user simple - CDD - emp_1770547017740_n16mqmfha
    { empId: 'emp_1770547017740_n16mqmfha', baseSalary: 1800, typeContrat: 'CDD', dateEmbauche: '2025-05-12' },
    // zefzefze zefez (test test) - Stage - emp_1770313264015_wdxobcdkj
    { empId: 'emp_1770313264015_wdxobcdkj', baseSalary: 800, typeContrat: 'Stage', dateEmbauche: '2026-02-01' },
  ];

  // We need to find the 3rd active user (3ases lill) - check if they have an Employe record
  const thirdUser = users.find(u => u.name === '3ases lill' || u.name === '3ases');
  if (thirdUser) {
    console.log('\n3ases lill user:', thirdUser);
    if (!thirdUser.emp_id) {
      // Create Employe record for 3ases lill
      const empId = `emp_${Date.now()}_seed`;
      await c.query(
        `INSERT INTO Employe (id, user_id, nom, prenom, type_contrat, date_embauche, base_salary, hourly_rate, annual_leave, contract_signed_at, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'CDI', '2024-09-15', 2200, ?, 26, '2024-09-15 10:00:00', 'APPROUVE', NOW(), NOW())`,
        [empId, thirdUser.id, '3ases', 'lill', (2200 / 22 / 7).toFixed(2)]
      );
      console.log(`Created Employe record for 3ases lill: ${empId}, CDI, 2200 TND`);
    }
  }

  // Update existing employee records with salary data
  for (const data of salaryData) {
    const hourlyRate = (data.baseSalary / 22 / 7).toFixed(2); // monthly / 22 work days / 7 hours per day
    const contractSignedAt = data.dateEmbauche + ' 09:00:00';

    await c.query(
      `UPDATE Employe SET 
        base_salary = ?, 
        hourly_rate = ?, 
        contract_signed_at = ?,
        type_contrat = ?,
        date_embauche = ?
       WHERE id = ?`,
      [data.baseSalary, hourlyRate, contractSignedAt, data.typeContrat, data.dateEmbauche, data.empId]
    );
    console.log(`Updated ${data.empId}: salary=${data.baseSalary} TND, hourly=${hourlyRate} TND/h, contract=${data.typeContrat}`);
  }

  // Verify the results
  const [updated] = await c.query(
    `SELECT e.id, e.nom, e.prenom, e.type_contrat, e.date_embauche, e.base_salary, e.hourly_rate, e.annual_leave, e.contract_signed_at, e.status
     FROM Employe e WHERE e.status = 'APPROUVE'`
  );
  console.log('\nUpdated employee records:');
  updated.forEach(e => {
    console.log(`  ${(e.prenom + ' ' + e.nom).padEnd(20)} | ${(e.type_contrat || '').padEnd(6)} | Salary: ${e.base_salary} TND | Hourly: ${e.hourly_rate} TND/h | Leave: ${e.annual_leave}j | Hired: ${e.date_embauche ? e.date_embauche.toISOString().split('T')[0] : 'N/A'} | Signed: ${e.contract_signed_at ? 'Yes' : 'No'}`);
  });

  await c.end();
  console.log('\nDone!');
})().catch(console.error);
