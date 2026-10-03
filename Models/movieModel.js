const mongoose = require('mongoose');
const movieSchema = new mongoose.Schema({
    name :{
        type: String,
        required: [true, "Name is a required field"],
        unique: true,
        trim:true,
        maxLength:[100,"Movie name must not have more than 100 character"],
        minLength:[2, "Movie name must not be less than 2 characters"],
    },
    description: {
        type: String,
        required: [true, "Description is Required"],
        trim:true
    },
    duration:{
        type:Number,
        required: [true, "Duration is required"],
        min: [1, 'Duration must be at least 1 minute']
    },
    ratings:{
        type:Number,
        default: 1,
        validate:{
            validator:
            function(value){
           return value>=1 && value <=10;
           
        },
        message:"Ratings ({VALUE}) should be between 1 and 10"
    }
    },
    totalRating:{
        type:Number,
        default: 0,
        min: [0, 'Total rating count cannot be negative']
    },
    releaseYear:{
        type:Number,
        required: [true, "Release Year is required"],
        min: [1888, 'Release year must be 1888 or later']
    },
    releaseDate:{
        type:Date
    },
    createdAt:{
        type:Date,
        default:Date.now,
        select:false
    },
    genres:{
        type:[String],
        required:[true, 'Genres is required'], // A DATA VALIDATOR
        // enum: {// only on string types 
        //     values:["Action", "Comedy", "Drama", "Thriller", "Horror", "Sci-Fi", "Romance", "Adventure"], //also a validator to indicate accepted genre
        //     message:"This genre does not exit"
        // }
        },
    directors:{
        type:[String],
        required:[true, 'Directors is required']
    },
    coverImage:{
        type:String,
        required:[true, 'Cover Image is Required!']
    },
    actors:{
        type:[String],
        required:[true, 'actors is required']
    },
    price:{
        type: Number,
        required:[true,'Price is Required'],
        min: [0, 'Price cannot be negative']
    },
    createdBy:String
},{
    toJSON:{virtuals:true},
    toObject:{virtuals:true}//this output the duration in hour fields on the object also NOTE YOU CAN'T USE VIRTUAL PROPERTIES TO QUERY DATA BECAUSE IT IS NOT PRESENT IN THE DATABASE
});
//CREATING A VIRTUAL PROPERTIES
movieSchema.virtual('durationInHours').get(function(){
    return Number((this.duration / 60).toFixed(2));
})

movieSchema.pre('save', function() {
    this.createdBy= 'Francis'
})

movieSchema.pre('aggregate', function(){
    this.pipeline().unshift({$match:{releaseDate:{$lte:new Date()}}});
})

const Movie =mongoose.model('movie', movieSchema);
module.exports = Movie;
