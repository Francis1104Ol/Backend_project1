 const mongoose = require('mongoose');
 const dotenv = require('dotenv');
 const fs = require('fs');
 const Movie = require('./../Models/movieModel');

 dotenv.config({path:'./config.env'})

 if (!process.env.CONN_STR) {
  console.error('Missing CONN_STR. Copy config.example.env to config.env and add your MongoDB connection string.');
  process.exit(1);
 }

 mongoose.connect(process.env.CONN_STR)
  .then(() => {
    console.log('DB connection successful');
  })
  .catch((err) => {
    console.error('DB connection error:', err.message);
    process.exit(1);
  });

 //read the movie.json file

 const movies = JSON.parse(fs.readFileSync('./data/movies.json', 'utf-8'));// pass the path relative to root directory
 //DELETING EXISTING MOVIE DOCUMENTS FROM THE COLLECTION
 const deleteMovies =async ()=>{
  try{
    await Movie.deleteMany();
    console.log('Data Successfully deleted!')
  }catch(err){
    console.error(err.message)
  }
  process.exit();
}

//IMPORTING MOVIE DATA TO THE MONGODB COLLECTION
 const importMovies =async ()=>{
  try{
    await Movie.create(movies);
    console.log('Data Successfully Imported!')
  }catch(err){
    console.error(err.message)
  }
  process.exit();
}

if(process.argv[2]=== '--import'){
  importMovies();
} else if(process.argv[2]=== '--delete'){
  deleteMovies();
} else {
  console.log('Please specify --import or --delete');
  process.exit();
}

