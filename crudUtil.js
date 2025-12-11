// ===============================
// crudUtil.js (FULL UPDATED FILE)
// ===============================

import cron from 'node-cron';
import postgres from 'postgres';
import 'dotenv/config';

let {
    PGHOST,
    PGDATABASE,
    PGUSER,
    PGPASSWORD,
} = process.env;

const sql = postgres({
    host: PGHOST,
    database: PGDATABASE,
    username: PGUSER,
    password: PGPASSWORD,
    port: 5432,
    ssl: 'require'
});

// ---------------------------
// LOCAL LIZARD DATA (RAM)
// ---------------------------
export let lizardData = [];

// local increment
export const lizardUpdate = (userID) => {
    const existing = lizardData.find(u => u.id === userID);
    if (existing) existing.score++;
    else lizardData.push({ id: userID, score: 1 });
};

// ---------------------------
// PUSH LOCAL DATA → Weekly
// ---------------------------
export const updateNeonData = async () => {
    if (lizardData.length === 0) return;

    try {
        for (const user of lizardData) {
            await sql`
                INSERT INTO Weekly (userID, score)
                VALUES (${user.id}, ${user.score})
                ON CONFLICT (userID)
                DO UPDATE SET score = Weekly.score + EXCLUDED.score
            `;
        }

        console.log("Daily Neon Weekly update successful!");
        lizardData = []; // clear local memory
    } catch (err) {
        console.error("Daily Neon update FAILED:", err);
    }
};

// ---------------------------
// WEEKLY → ALLTIME
// ---------------------------
export const weeklyIntoAllTime = async () => {
    try {
        const rows = await sql`SELECT * FROM Weekly`;

        for (const user of rows) {
            await sql`
                INSERT INTO AllTime (userID, score)
                VALUES (${user.userid}, ${user.score})
                ON CONFLICT (userID)
                DO UPDATE SET score = AllTime.score + EXCLUDED.score
            `;
        }

        console.log("Weekly → AllTime sync complete.");
    } catch (err) {
        console.error("Weekly→AllTime failed:", err);
    }
};

// ---------------------------
// RESET WEEKLY TABLE
// ---------------------------
export const resetWeek = async () => {
    try {
        await sql`TRUNCATE TABLE Weekly`;
        console.log("Weekly table reset.");
    } catch (err) {
        console.error("Failed to reset Weekly:", err);
    }
};

// ---------------------------
// DB PULL FUNCTIONS
// ---------------------------
export const pullLizardWeekly = async () => {
    let rows = await sql`SELECT * FROM Weekly ORDER BY score DESC`;
    return rows.map(r => ({ userid: r.userid, score: r.score }));
};

export const pullLizardAllTime = async () => {
    let rows = await sql`SELECT * FROM AllTime ORDER BY score DESC`;
    return rows.map(r => ({ userid: r.userid, score: r.score }));
};

// ---------------------------
// MERGED WEEKLY = Neon + Local
// ---------------------------
export const pullMergedWeekly = async () => {
    const neon = await pullLizardWeekly();
    const combined = new Map();

    neon.forEach(u => combined.set(u.userid, u.score));

    for (const u of lizardData) {
        const curr = combined.get(u.id) ?? 0;
        combined.set(u.id, curr + u.score);
    }

    return [...combined.entries()]
        .map(([userid, score]) => ({ userid, score }))
        .sort((a, b) => b.score - a.score);
};

// ---------------------------
// CRON JOBS
// ---------------------------

// DAILY 9 AM: push local → Weekly
cron.schedule(
    '0 9 * * *',
    () => updateNeonData(),
    { timezone: "America/Denver" }
);

// SUNDAY 9 AM: full weekly cycle
cron.schedule(
    '0 9 * * 0',
    async () => {
        console.log("=== SUNDAY WEEKLY LIZARD PROCESSING ===");

        await updateNeonData();     // push remaining local → Weekly
        await weeklyIntoAllTime();  // Weekly → AllTime
        await resetWeek();          // Reset Weekly
    },
    { timezone: "America/Denver" }
);
