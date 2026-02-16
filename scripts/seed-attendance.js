/**
 * Seed Attendance Data for 2026
 * Generates realistic attendance records for all active employees
 * from January 1, 2026 to February 16, 2026
 */
const mysql = require('mysql2/promise');
const crypto = require('crypto');

function uuid() { return crypto.randomUUID(); }

// Tunisian 2026 holidays (from DB)
const HOLIDAYS_2026 = [
  '2026-01-01', // Nouvel An
  '2026-01-14', // Fête de la Révolution
  '2026-01-16', // Isra et Miraj
  '2026-03-20', // Fête de l'Indépendance + Aïd el-Fitr
  '2026-03-21', // Aïd el-Fitr 2ème jour
  '2026-04-09', // Journée des Martyrs
  '2026-05-01', // Fête du Travail
  '2026-05-27', // Aïd el-Adha 1er jour
  '2026-05-28', // Aïd el-Adha 2ème jour
  '2026-06-17', // Ras El Am El Hijri
  '2026-07-25', // Fête de la République
  '2026-08-13', // Journée de la Femme
  '2026-08-26', // Mouled
  '2026-10-15', // Fête de l'Évacuation
];

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

function isHoliday(dateStr) {
  return HOLIDAYS_2026.includes(dateStr);
}

function isWorkDay(date) {
  const dateStr = date.toISOString().split('T')[0];
  return !isWeekend(date) && !isHoliday(dateStr);
}

function dateToStr(d) {
  return d.toISOString().split('T')[0];
}

/**
 * Generate a random check-in time for a session
 * 
 * Employee profiles:
 * - "punctual": arrives on time or slightly early
 * - "normal": usually on time, sometimes 5-15 min late
 * - "late_prone": frequently 10-30 min late
 * - "early_bird": always early
 */
function generateCheckInTime(date, sessionType, profile) {
  const d = new Date(date);
  
  if (sessionType === 'MORNING') {
    // Session starts at 09:00
    switch (profile) {
      case 'early_bird':
        // 08:30 - 08:55
        d.setHours(8, 30 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 60), 0);
        break;
      case 'punctual':
        // 08:55 - 09:05 (mostly on time, tiny variation)
        d.setHours(8, 55 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
        break;
      case 'normal': {
        // 70% on time (08:55-09:05), 20% slightly late (09:05-09:20), 10% late (09:20-09:45)
        const roll = Math.random();
        if (roll < 0.70) {
          d.setHours(8, 55 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
        } else if (roll < 0.90) {
          d.setHours(9, 5 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 60), 0);
        } else {
          d.setHours(9, 20 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 60), 0);
        }
        break;
      }
      case 'late_prone': {
        // 30% on time, 40% late (09:10-09:30), 30% very late (09:30-10:00)
        const roll = Math.random();
        if (roll < 0.30) {
          d.setHours(8, 55 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
        } else if (roll < 0.70) {
          d.setHours(9, 10 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 60), 0);
        } else {
          d.setHours(9, 30 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 60), 0);
        }
        break;
      }
    }
  } else {
    // AFTERNOON - Session starts at 13:00
    switch (profile) {
      case 'early_bird':
        d.setHours(12, 50 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
        break;
      case 'punctual':
        d.setHours(12, 55 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
        break;
      case 'normal': {
        const roll = Math.random();
        if (roll < 0.75) {
          d.setHours(12, 58 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 60), 0);
        } else if (roll < 0.92) {
          d.setHours(13, 5 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 60), 0);
        } else {
          d.setHours(13, 20 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 60), 0);
        }
        break;
      }
      case 'late_prone': {
        const roll = Math.random();
        if (roll < 0.35) {
          d.setHours(12, 58 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 60), 0);
        } else if (roll < 0.70) {
          d.setHours(13, 10 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 60), 0);
        } else {
          d.setHours(13, 25 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 60), 0);
        }
        break;
      }
    }
  }
  
  return d;
}

/**
 * Generate check-out time based on check-in
 */
function generateCheckOutTime(checkIn, sessionType, profile) {
  const d = new Date(checkIn);
  
  if (sessionType === 'MORNING') {
    // Should leave around 12:00
    switch (profile) {
      case 'early_bird':
      case 'punctual':
        // Stays until 12:00-12:10
        d.setHours(12, Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
        break;
      case 'normal': {
        const roll = Math.random();
        if (roll < 0.80) {
          d.setHours(12, Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
        } else {
          // Sometimes leaves early: 11:30-11:55
          d.setHours(11, 30 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 60), 0);
        }
        break;
      }
      case 'late_prone': {
        const roll = Math.random();
        if (roll < 0.60) {
          d.setHours(12, Math.floor(Math.random() * 15), Math.floor(Math.random() * 60), 0);
        } else {
          d.setHours(11, 25 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 60), 0);
        }
        break;
      }
    }
  } else {
    // AFTERNOON - Should leave around 17:00
    switch (profile) {
      case 'early_bird':
        // Stays until 17:00-17:15
        d.setHours(17, Math.floor(Math.random() * 15), Math.floor(Math.random() * 60), 0);
        break;
      case 'punctual':
        d.setHours(17, Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
        break;
      case 'normal': {
        const roll = Math.random();
        if (roll < 0.75) {
          d.setHours(17, Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
        } else {
          d.setHours(16, 30 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 60), 0);
        }
        break;
      }
      case 'late_prone': {
        const roll = Math.random();
        if (roll < 0.50) {
          d.setHours(17, Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
        } else {
          d.setHours(16, 20 + Math.floor(Math.random() * 35), Math.floor(Math.random() * 60), 0);
        }
        break;
      }
    }
  }
  
  return d;
}

function computeDuration(checkIn, checkOut) {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
}

function computeStatus(durationMinutes) {
  if (durationMinutes >= 135) return 'FULL';
  if (durationMinutes >= 15) return 'PARTIAL';
  return 'PARTIAL';
}

(async () => {
  const c = await mysql.createConnection({
    host: 'mysql.frequencesantec.com',
    port: 3307,
    user: 'santec_ai',
    password: 'izovs0IztGW]kjWX',
    database: 'santec_ai'
  });

  // Get active employees
  const [users] = await c.query("SELECT id, name, last_name FROM User WHERE role = 'USER' AND status = 'ACTIVE'");
  console.log(`Found ${users.length} active employees:`);
  users.forEach(u => console.log(`  - ${u.name} ${u.last_name} (${u.id.substring(0, 8)}...)`));

  if (users.length === 0) {
    console.log('No active employees found. Exiting.');
    await c.end();
    return;
  }

  // Assign random profiles to each employee
  const profiles = ['early_bird', 'punctual', 'normal', 'normal', 'late_prone'];
  const employeeProfiles = {};
  users.forEach((u, i) => {
    // Distribute profiles: ensure variety
    employeeProfiles[u.id] = profiles[i % profiles.length];
    console.log(`  Profile for ${u.name}: ${employeeProfiles[u.id]}`);
  });

  // Clear existing attendance sessions for 2026
  const [delResult] = await c.query(
    "DELETE FROM attendance_sessions WHERE date >= '2026-01-01' AND date <= '2026-02-16'"
  );
  console.log(`\nCleared ${delResult.affectedRows} existing sessions.`);

  // Generate attendance data from Jan 1, 2026 to Feb 16, 2026
  const startDate = new Date(2026, 0, 1); // Jan 1
  const endDate = new Date(2026, 1, 16);  // Feb 16
  
  const sql = `INSERT INTO attendance_sessions 
    (id, user_id, date, session_type, check_in_time, check_out_time, duration_minutes, status, anomaly_detected, anomaly_reason, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

  let totalInserted = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalPartial = 0;

  const current = new Date(startDate);
  while (current <= endDate) {
    if (!isWorkDay(current)) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    const dateStr = dateToStr(current);

    for (const user of users) {
      const profile = employeeProfiles[user.id];
      
      // Determine attendance for this day
      // Absence probability varies by profile
      let absenceChance;
      switch (profile) {
        case 'early_bird': absenceChance = 0.02; break;  // 2% absence
        case 'punctual': absenceChance = 0.03; break;      // 3%
        case 'normal': absenceChance = 0.05; break;        // 5%
        case 'late_prone': absenceChance = 0.08; break;    // 8%
        default: absenceChance = 0.05;
      }

      // Full day absent
      if (Math.random() < absenceChance) {
        totalAbsent++;
        continue; // No record = absent
      }

      // Half day absent (morning only or afternoon only)
      const halfAbsentChance = profile === 'late_prone' ? 0.10 : 0.04;
      const isHalfAbsent = Math.random() < halfAbsentChance;
      const missMorning = isHalfAbsent && Math.random() < 0.5;
      const missAfternoon = isHalfAbsent && !missMorning;

      // MORNING SESSION
      if (!missMorning) {
        const checkIn = generateCheckInTime(current, 'MORNING', profile);
        const checkOut = generateCheckOutTime(checkIn, 'MORNING', profile);
        const duration = computeDuration(checkIn, checkOut);
        const status = computeStatus(duration);
        
        // Detect lateness: if check-in after 09:05
        let anomalyDetected = false;
        let anomalyReason = null;
        const checkInHour = checkIn.getHours();
        const checkInMin = checkIn.getMinutes();
        if (checkInHour > 9 || (checkInHour === 9 && checkInMin > 5)) {
          anomalyDetected = true;
          const lateMin = (checkInHour - 9) * 60 + checkInMin;
          anomalyReason = `Retard matin: arrivée à ${checkIn.toTimeString().substring(0,5)} (+${lateMin} min)`;
          totalLate++;
        }

        if (status === 'PARTIAL') totalPartial++;

        await c.query(sql, [
          uuid(), user.id, dateStr, 'MORNING',
          checkIn, checkOut, duration, status,
          anomalyDetected ? 1 : 0, anomalyReason
        ]);
        totalInserted++;
      }

      // AFTERNOON SESSION
      if (!missAfternoon) {
        const checkIn = generateCheckInTime(current, 'AFTERNOON', profile);
        const checkOut = generateCheckOutTime(checkIn, 'AFTERNOON', profile);
        const duration = computeDuration(checkIn, checkOut);
        const status = computeStatus(duration);
        
        // Detect lateness: if check-in after 13:10
        let anomalyDetected = false;
        let anomalyReason = null;
        const checkInHour = checkIn.getHours();
        const checkInMin = checkIn.getMinutes();
        if (checkInHour > 13 || (checkInHour === 13 && checkInMin > 10)) {
          anomalyDetected = true;
          const lateMin = (checkInHour - 13) * 60 + checkInMin;
          anomalyReason = `Retard après-midi: arrivée à ${checkIn.toTimeString().substring(0,5)} (+${lateMin} min)`;
          totalLate++;
        }

        if (status === 'PARTIAL') totalPartial++;

        await c.query(sql, [
          uuid(), user.id, dateStr, 'AFTERNOON',
          checkIn, checkOut, duration, status,
          anomalyDetected ? 1 : 0, anomalyReason
        ]);
        totalInserted++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  console.log(`\n========== SEED RESULTS ==========`);
  console.log(`Total sessions inserted: ${totalInserted}`);
  console.log(`Total late arrivals: ${totalLate}`);
  console.log(`Total full-day absences: ${totalAbsent}`);
  console.log(`Total partial sessions: ${totalPartial}`);
  console.log(`Date range: ${dateToStr(startDate)} → ${dateToStr(endDate)}`);
  console.log(`==================================`);

  // Show some sample data
  const [samples] = await c.query(
    `SELECT a.date, a.session_type, a.check_in_time, a.check_out_time, a.duration_minutes, a.status, a.anomaly_reason, u.name 
     FROM attendance_sessions a JOIN User u ON a.user_id = u.id 
     WHERE a.date >= '2026-01-01' 
     ORDER BY a.date, u.name, a.session_type 
     LIMIT 20`
  );

  console.log('\nSample records:');
  samples.forEach(s => {
    const ci = s.check_in_time ? new Date(s.check_in_time).toTimeString().substring(0, 5) : 'N/A';
    const co = s.check_out_time ? new Date(s.check_out_time).toTimeString().substring(0, 5) : 'N/A';
    const flag = s.anomaly_reason ? ' ⚠️ ' + s.anomaly_reason : '';
    console.log(`  ${s.date.toISOString().split('T')[0]} | ${s.name.padEnd(12)} | ${s.session_type.padEnd(9)} | ${ci}-${co} | ${s.duration_minutes}min | ${s.status}${flag}`);
  });

  // Show per-employee summary
  const [summary] = await c.query(
    `SELECT u.name, u.last_name,
       COUNT(*) as total_sessions,
       SUM(CASE WHEN a.anomaly_detected = 1 THEN 1 ELSE 0 END) as late_count,
       ROUND(AVG(a.duration_minutes), 0) as avg_duration,
       SUM(a.duration_minutes) as total_minutes
     FROM attendance_sessions a JOIN User u ON a.user_id = u.id
     WHERE a.date >= '2026-01-01' AND a.date <= '2026-02-16'
     GROUP BY u.id, u.name, u.last_name
     ORDER BY u.name`
  );

  console.log('\nPer-employee summary:');
  summary.forEach(s => {
    const totalHours = Math.floor(s.total_minutes / 60);
    const totalMins = s.total_minutes % 60;
    console.log(`  ${(s.name + ' ' + (s.last_name || '')).padEnd(25)} | ${s.total_sessions} sessions | ${s.late_count} retards | avg ${s.avg_duration}min/session | total ${totalHours}h${String(totalMins).padStart(2,'0')}`);
  });

  await c.end();
  console.log('\nDone!');
})().catch(console.error);
