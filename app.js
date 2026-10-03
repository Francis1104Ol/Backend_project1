const express = require('express');
const path = require('path');
const CustomError = require('./Utils/CustomError');
const globalErrorHandler = require('./Controllers/errorController');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const moviesRouter = require('./Routes/moviesRoutes');
const authRouter = require('./Routes/authRouter');
const userRoute = require('./Routes/userRoutes');
const helmet = require('helmet');
const hpp = require('hpp');

const app = express();
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) app.set('trust proxy', trustProxyHops);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
  })
);

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP. Please try again in one hour.',
  },
});

app.use('/api', limiter);
app.use(express.json({ limit: '10kb' }));
app.set('query parser', 'extended');
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(
  hpp({
    whitelist: [
      'duration',
      'ratings',
      'releaseYear',
      'releaseDate',
      'genres',
      'actors',
      'price',
    ],
  })
);

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  req.requestedAt = new Date().toISOString();
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'CineIndex API is running',
    requestedAt: req.requestedAt,
  });
});

app.get('/api/v1', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'CineIndex API',
    endpoints: {
      movies: '/api/v1/movies',
      highestRated: '/api/v1/movies/highest-rated',
      stats: '/api/v1/movies/movies-stats',
      auth: '/api/v1/auth/login',
    },
  });
});

app.use('/api/v1/movies', moviesRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRoute);

app.use((req, res, next) => {
  next(new CustomError(`Can't find ${req.originalUrl} on the server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
