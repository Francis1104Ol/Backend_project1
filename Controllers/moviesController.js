const Movie = require('../Models/movieModel');
const asyncErrorHandler = require('../Utils/asyncErrorHandler');
const ApiFeatures = require('../Utils/ApiFeatures');
const CustomError = require('../Utils/CustomError');

exports.getHighestRated = (req, res, next) => {
  req.movieQuery = { ...req.query, limit: '5', sort: '-ratings' };
  next();
};

exports.getAllMovies = asyncErrorHandler(async (req, res) => {
  const query = req.movieQuery || req.query;
  const countFeatures = new ApiFeatures(Movie.find(), query).filter();
  const total = await Movie.countDocuments(countFeatures.query.getFilter());

  const features = new ApiFeatures(Movie.find(), query).filter().sort().limitFields().paginate();
  const movies = await features.query;
  const { page, limit } = features.pagination;

  res.status(200).json({
    status: 'success',
    results: movies.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
    data: {
      movies,
    },
  });
});

exports.createMovie = asyncErrorHandler(async (req, res) => {
  const movie = await Movie.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      movie,
    },
  });
});

exports.getMovie = asyncErrorHandler(async (req, res, next) => {
  const movie = await Movie.findById(req.params.id);

  if (!movie) {
    return next(new CustomError('Movie with that ID was not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      movie,
    },
  });
});

exports.deleteMovie = asyncErrorHandler(async (req, res, next) => {
  const deletedMovie = await Movie.findByIdAndDelete(req.params.id);

  if (!deletedMovie) {
    return next(new CustomError('Movie with that ID was not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateMovie = asyncErrorHandler(async (req, res, next) => {
  const updatedMovie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedMovie) {
    return next(new CustomError('Movie with that ID was not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      movie: updatedMovie,
    },
  });
});

exports.getMovieStats = asyncErrorHandler(async(req, res) =>{
        const stats = await Movie.aggregate([
            //{$match:{releaseDate:{$lte:new Date()}}}, use aggregation middleware instead 
            {$match : {ratings:{$gte:4.5}}},
            {$group:{_id:'$releaseYear',
                avgRatings:{$avg:'$ratings'},
                avgPrice:{$avg: '$price'},
                minPrice:{$min: '$price'},
                maxPrice:{$max: '$price'},
                totalPrice:{$sum: '$price'},
                movieCount:{$sum:1}
            } },
            {$sort:{minPrice:1}},
            //{$match : {maxPrice:{$gte:14.99}}}
        ]);

          res.status(200).json({
            status:"success",
            count: stats.length,
            data:{
                 stats}
        })
    })
exports.getMovieByGenre=asyncErrorHandler(async(req, res, next)=>{

        const genre = req.params.genre;
        const movie = await Movie.aggregate([
            {$unwind:'$genres'},
            {$group:{
                _id:'$genres',
                movieCount:{$sum:1},
                movies:{$push:'$name'},
               
            }},

             {$addFields: {genres:'$_id'}},
             {$project:{_id:0}},
             {$sort:{movieCount:-1}},
            // {$limit:6}
            {$match:{genres:genre}}
        ])
         res.status(200).json({
            status:"success",
            count: movie.length,
            data:{
                 movie}
        })
    })
