const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");

const JWT_SECRET = "your_jwt_secret_key"; // 🔐 Move this to .env in production

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true,
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
      if (
        !validator.isStrongPassword(value, {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
        })
      ) {
        throw new Error("Password must be strong. Include uppercase, lowercase, number, and symbol.");
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

  bio: {
    type: String,
    default: "",
  },

  skills: {
    type: [String],
    default: [],
  },

  lookingFor: {
    type: [String],
    default: [],
  },

  // ✅ Experience Level
  experienceLevel: {
    type: String,
    enum: [
      "Beginner (0–1 years)",
      "Intermediate (2–4 years)",
      "Advanced (5-7 years)",
      "Lead (8+ years)",
    ],
    default: "Beginner (0–1 years)",
  },

  // ✅ Interests
  interests: {
    type: [String],
    default: [],
  },

  // ✅ Professional Links
 professional: {
    company: { type: String },
    github: {
      type: String,
      validate: {
        validator: (v) =>
          !v || (validator.isURL(v) && v.includes("github.com")),
        message: "Invalid GitHub URL",
      },
    },
    linkedin: {
      type: String,
      validate: {
        validator: (v) =>
          !v || (validator.isURL(v) && v.includes("linkedin.com/in")),
        message: "Invalid LinkedIn URL",
      },
    },
    portfolio: {
      type: String,
      validate: {
        validator: (v) => !v || validator.isURL(v),
        message: "Invalid Portfolio URL",
      },
    },
  },

}, { timestamps: true });


// ✅ JWT Generation Method
userSchema.methods.getJWT = function () {
  return jwt.sign({ _id: this._id }, JWT_SECRET, { expiresIn: "1d" });
};

// ✅ Password Comparison Method
userSchema.methods.validatePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

// ✅ Model Export
const userModel = mongoose.model("User", userSchema);
module.exports = userModel;


