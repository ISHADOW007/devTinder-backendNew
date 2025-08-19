const jwt = require('jsonwebtoken');
const User = require('../models/user');


const userAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token,  process.env.JWT_SECRET);

    // Consistency fix: your payload is `{ _id: user._id }`, so use _id
    const user = await User.findById(decoded._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    console.log(user)

    req.user = user; // Attach user to request
    next(); // Continue
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = {
  userAuth
};
