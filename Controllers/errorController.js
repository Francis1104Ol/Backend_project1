const CustomError = require('../Utils/CustomError');

const devErrors = (res, error) => {
  res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
    stack: error.stack,
    error,
  });
};

const castErrorHandler = (err) => {
  const msg = `Invalid value for ${err.path}: ${err.value}`;
  return new CustomError(msg, 400);
};

const duplicateKeyErrorHandler = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : 'that value';
  return new CustomError(`A record with ${field} "${value}" already exists.`, 400);
};

const validationErrorHandler = (err) => {
  const errorMessages = Object.values(err.errors).map((val) => val.message).join(', ');
  return new CustomError(`Invalid input data: ${errorMessages}`, 400);
};

const handleExpiredJwt = () => new CustomError('JWT has expired. Please log in again.', 401);

const handledJwtError = () => new CustomError('Invalid token. Please log in again.', 401);

const prodErrors = (res, error) => {
  if (error.isOperational) {
    res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  } else {
    console.error(error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
};

module.exports = (error, req, res, next) => {
  let err = error;
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (err.name === 'CastError') err = castErrorHandler(err);
  if (err.code === 11000) err = duplicateKeyErrorHandler(err);
  if (err.name === 'ValidationError') err = validationErrorHandler(err);
  if (err.name === 'TokenExpiredError') err = handleExpiredJwt(err);
  if (err.name === 'JsonWebTokenError') err = handledJwtError(err);

  if (process.env.NODE_ENV === 'development') {
    devErrors(res, err);
    return;
  }

  prodErrors(res, err);
};
