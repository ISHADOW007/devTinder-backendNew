const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken'); // ❗ You forgot to import this
const bcrypt = require("bcrypt");

const JWT_SECRET = "your_jwt_secret_key"; // ✅ Consider moving to .env

// Schema Definition
const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  firstName: {
    type: String,
    required: true,
    minLength: 4,
  },
  lastName: {
    type: String,
  },
  emailId: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error("Invalid email address: " + value);
      }
    },
  },
  password: {
    type: String,
    required: true,
    validate(value) {
      if (!validator.isStrongPassword(value, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })) {
        throw new Error("Password must be strong. Use uppercase, lowercase, number, symbol.");
      }
    },
  },
  age: {
    type: Number,
    min: 18,
  },
  gender: {
    type: String,
    validate(value) {
      const allowed = ["male", "female", "others"];
      if (value && !allowed.includes(value)) {
        throw new Error("Gender must be one of: male, female, others");
      }
    },
  },
  photoUrl: {
    type: String,
    default: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
    validate(value) {
      if (!validator.isURL(value)) {
        throw new Error("Invalid photo URL: " + value);
      }
    },
  },
  about: {
    type: String,
    default: "This is a default about of the user!",
  },
  skills: {
    type: [String],
    default: [],
  },
}, { timestamps: true });


// 🪪 Custom method to generate JWT
userSchema.methods.getJWT = function () {
  const user = this;
  const token = jwt.sign({ _id: user._id }, JWT_SECRET, { expiresIn: "1d" });
  return token;
};


userSchema.methods.validatePassword=async function (passwordInputByUser){
      
    const user =this  ;
    const passwordHash=user.password; 
   const isPasswordValid =await bcrypt.compare(passwordInputByUser, user.password);
   return isPasswordValid
}

// Model export
const userModel = mongoose.model("User", userSchema);
module.exports = userModel;
