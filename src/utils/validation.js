const validator = require('validator');

const validateSignUpData = (req) => {
  const { firstName, lastName, emailId, password } = req.body;

  if (!firstName || !lastName) {
    throw new Error("Name is required and must be valid!");
  }

  if (!validator.isEmail(emailId)) {
    throw new Error("Email is not valid!");
  }

  if (!validator.isStrongPassword(password)) {
    throw new Error("Please enter a strong password!");
  }
};




const validateEditProfileData=(req)=>{
   const allowedEditFields= ["firstName","lastName","emailId","photoUrl","gender","age","about","skills","lookingFor","bio","content","interests","professional","experienceLevel"]
   const isEditAllowed=Object.keys(req.body).every((field => allowedEditFields.includes(field)))
   console.log(Object.keys(req.body))
   return isEditAllowed
}



module.exports = {
  validateSignUpData,validateEditProfileData
};
