const jwt = require('jsonwebtoken');

module.exports = (user, statusCode, res) => {
  if (!process.env.SECRET_STR) {
    throw new Error('SECRET_STR is required to sign JWT tokens.');
  }

  const token = jwt.sign({ id: user._id }, process.env.SECRET_STR, {
    expiresIn: process.env.LOGIN_EXPIRES || '90d',
  });
const options ={
    maxAge :(Number(process.env.COOKIES_EXPIRES) || 90) * 24 * 60 * 60 * 1000,
    httpOnly:true
  }
  if(process.env.NODE_ENV ==='production')
    options.secure =true;
  user.password =undefined
  res.cookie('jwt', token, options)
  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};
