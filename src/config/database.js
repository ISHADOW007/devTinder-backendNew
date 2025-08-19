const mongoose =require('mongoose')

const connectDB=async ()=>{
    mongoose.connect(
    "mongodb+srv://satyam:satyam@cluster0.fw3mlss.mongodb.net/devtinder-backend"
)
}

module.exports=connectDB


