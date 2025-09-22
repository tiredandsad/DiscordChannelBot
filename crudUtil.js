import cron from 'node-cron';
import postgres from 'postgres';
import 'dotenv/config';


let { PGHOST, PGDATABASE, PGUSER, PGPASSWORD, ENDPOINT_ID } = process.env;

const sql = postgres({
    host: PGHOST,
    database: PGDATABASE,
    username: PGUSER,
    password: PGPASSWORD,
    port: 5432,
    ssl: 'require'
});

cron.schedule('0 0,12 * * *', () => {
    updateNeonData()
})

export var lizardData = []
const lizardUpdate = (userID) => {
    localLizard(userID)
}

const updateNeonData = async () => {
    if (lizardData.length === 0) return; // nothing to push

    try {
        // Push delta to Weekly
        for (const user of lizardData) {
            await sql`INSERT INTO Weekly(userID, score)
                      VALUES (${user.id}, ${user.score})
                      ON CONFLICT (userID) DO UPDATE
                      SET score = Weekly.score + EXCLUDED.score`;

            // Push same delta to AllTime
            await sql`INSERT INTO AllTime(userID, score)
                      VALUES (${user.id}, ${user.score})
                      ON CONFLICT (userID) DO UPDATE
                      SET score = AllTime.score + EXCLUDED.score`;
        }

        console.log('Neon data updated successfully!');

        // Reset local array
        lizardData = [];
    } catch (err) {
        console.error('Failed to update Neon data:', err);
    }
}

const resetWeek = async () => {
    await updateNeonData()
    try {
        await sql`TRUNCATE TABLE Weekly`;
        console.log('Weekly table reset.');
    } catch (err) {
        console.error('Failed to reset Weekly table:', err);
    }
}

const pullLizardWeekly = async () => {
    return await sql`SELECT * FROM Weekly ORDER BY score DESC`;
}

const pullLizardAllTime = async () => {
    return await sql`SELECT * FROM AllTime ORDER BY score DESC`;
}

const localLizard = (userID) => {
    const user = lizardData.find(u => u.id === userID);
    if (user) {
        user.score += 1;
    } else {
        lizardData.push({ id: userID, score: 1 });
    }
}
export { resetWeek, pullLizardAllTime, pullLizardWeekly, lizardUpdate, updateNeonData };
