const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true,'Please Enter your name']
    },
    email:{
        type: String,
        required: [true,'Please Enter your email'],
        unique:true,
        lowercase:true,
        validate:[validator.isEmail, 'Please Enter a valid email']
    },
    photo:String,
    role:{
        type:String,
        enum:['user', 'admin',],
        default: 'user'
    },
    password:{
        type: String,
        required:[true, ' Please Enter a password'],
        minLength:8,
        select:false
    },
    confirmPassword:{
        type:String,
        required:[true, 'Please confirm your pass word'],
        //this validator will only work for save() and create()
        validate:{
            validator: function(val){
                return val ===this.password
            },
            message: 'Password & confirm Password does not match'
        }
    },
    active:{
        type: Boolean,
        default:true,
        select:false
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetTokenExpires:Date
})


userSchema.pre('save', async function(){
    //this check is the password has not been modified
    if(!this.isModified('password')) return;

    // if it has not been modified then we encrypt async we also have sync version of it
   this.password =  await bcrypt.hash(this.password, 12)

   this.confirmPassword = undefined

   if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }
})

userSchema.pre(/^find/,function(){
    this.find({active: {$ne:false}})
})


userSchema.methods.comparePasswordInDb = async function(pswd){
    return await bcrypt.compare(pswd, this.password)
}
userSchema.methods.isPasswordChanged = function(JWTTimestamp){
    if(this.passwordChangedAt){
        const pswdChangedTimestamp = parseInt(this.passwordChangedAt.getTime()/1000, 10);
        return   pswdChangedTimestamp > JWTTimestamp; //JWT time stamp
    
    }
    return false;
}
userSchema.methods.createResetPasswordToken= function (){
    const resetToken = crypto.randomBytes(32).toString('hex')
    this.passwordResetToken =crypto.createHash('sha256').update(resetToken).digest('hex')
    this.passwordResetTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

    return resetToken
}
const User = mongoose.model('User', userSchema);
module.exports = User
