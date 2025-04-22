const mongoose = require('mongoose');

module.exports.dbConnect = async()=>{
    try {
         if(process.env.mode==='pro'){
            await mongoose.connect(process.env.DB_URL,{useNewURLParser: true})
            console.log("Production database connected..")
        }else{
            await mongose.connect(process.env.DB_LOCAL_URL,{useNewURLParser: true})
            console.log("Local database connected..")
        }
        
    } catch (error) {
        console.log(error.message)
    }
}