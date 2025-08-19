const mongoose =require('mongoose')
require('dotenv').config(); // load env vars

const connectDB=async ()=>{
    mongoose.connect(process.env.MONGO_URI)
}

module.exports=connectDB


