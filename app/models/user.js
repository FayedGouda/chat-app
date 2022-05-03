var mongoose = require('mongoose');
// var bcrypt = require('bcrypt-nodejs');
var validate = require('mongoose-validator');
var titlize  = require('mongoose-title-case');
var Schema = mongoose.Schema;

//Name Validation Pattern
var nameValidator =[
    validate({
        validator:'matches',
        arguments:/^(([a-zA-Z]{3,10})+[ ]+([a-zA-Z]{3,10})+)+$/,
        message:'At least 3 characters and less that 10, must contain first name + space + last name, no special charecters.'
    }),
    validate({
        validator:'isLength',
        arguments:[3, 25],
        message:'Name should be between {ARGS[0]} and {ARGS[1]} characters'
    })
];

//Email Validation Pattern
var emailValidator =[
    validate({
        validator:'isEmail',
        message:'Invalid email'
    }),
    validate({
        validator:'isLength',
        arguments:[3, 25],
        message:'Email should be between {ARGS[0]} and {ARGS[1]} characters'
    })
];

//Username Validation Pattern
var usernameValidator =[
    validate({
        validator:'isLength',
        arguments:[3, 25],
        message:'username should be between {ARGS[0]} and {ARGS[1]} characters'
    }),
    validate({
        validator:'isAlphanumeric',
        message:'Username must contain letters and numbers only'
    }),
];

//Password Validation Pattern
var passwordValidator =[
    validate({
        validator:'matches',
        arguments:/^(?:(?=.*[a-z])(?:(?=.*[A-Z])(?=.*[\d\W])|(?=.*\W)(?=.*\d))|(?=.*\W)(?=.*[A-Z])(?=.*\d)).{8,}/,
        message:'Password must be complex'
    }),
    validate({
        validator:'isLength',
        arguments:[8, 25],
        message:'Password should be between {ARGS[0]} and {ARGS[1]} characters'
    })
];

//The user schema (It's a collection in the mongoDB database), which is equivalent to table in MYSQL
var userSchema = new Schema({
    name:{type:String, required:true, validate:nameValidator},
    username:{type:String, required:true, lowercase:true, unique:true, validate:usernameValidator},
    password:{type:String, required:true, validate:passwordValidator, select:false},
    email:{type:String, lowercase:true, required:true, unique:true, validate:emailValidator},
    activate:{type:Boolean, required:true, default:false},
    temporarytoken:{type:String, required:true},
    img:{
        dta:{type:Buffer},
        contentTyp:{type:String}
    },
    friends:[{
        friendName:{type:String},
        friendUserName:{type:String}
    }]
});

userSchema.plugin(titlize, {
    paths:['name']
});

//This function will compare the password that user enterd and database password
//Of cource in case of the username is correct
userSchema.methods.comparePassword = function(password){
    return(password === this.password);
}
module.exports=mongoose.model('User', userSchema);