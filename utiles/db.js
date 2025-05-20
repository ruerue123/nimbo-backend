const mongoose = require('mongoose');

module.exports.dbConnect = async () => {
    try {
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            retryWrites: true,
            w: 'majority'
        };

        if (process.env.MODE === 'pro') {
            await mongoose.connect(process.env.DB_PRO_URL, options);
            console.log("Production database connected..");
        } else {
            await mongoose.connect(process.env.DB_LOCAL_URL, options);
            console.log("Local database connected..");
        }
        
    } catch (error) {
        console.error("Database connection error:", error.message);
        process.exit(1); // Exit process with failure
    }
};