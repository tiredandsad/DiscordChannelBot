const cron = require('node-cron');
cron.schedule('0 0,12 * * *', () => {
    updateNeonData()
})

//connect to a neon instance.
//keep records locally for lizard counts. Update the neon instance every 12 hours with new lizard numbers.
//Announce the leaderboard every sunday at 9?

var lizardData = []
export default function LizardUpdate() {

}

const updateNeonData = () => {
    //Push lizard data to weekly table
    //Push lizard data to All-time table
}

const resetWeek = () => {
    lizardData = []
    //drop and re-add weekly table
}

const pullLizardWeekly = () => {

}

const pullLizardAllTime = () => {

}

const localLizard = (userID) => {
    const user = lizardData.find( u => u.id === userId);
    if (user) {
        user.score += 1;
    } else {
        lizardData.push({id: userID, score: 1});
    }
}