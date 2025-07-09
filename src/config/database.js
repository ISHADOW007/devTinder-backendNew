const mongoose =require('mongoose')

const connectDB=async ()=>{
    mongoose.connect(
    "mongodb+srv://satyamgovindRao:12345@cluster0.fw3mlss.mongodb.net/devTinder-backend"
)
}

module.exports=connectDB


