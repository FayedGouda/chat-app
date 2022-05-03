var User    = require('../models/user');
var Product = require('../models/products');
var Chat = require('../models/chat');
var jwt     = require('jsonwebtoken');
var xls     = require('node-xlsx');
var csv     = require('csvtojson');
var fs      = require('fs');
var multer  = require('multer');
const express = require('express');
const router = express.Router();
var fileName="";

var {Parser}= require('json2csv');
var nodemailer = require('nodemailer');
var secretKey = require('../config/key').secretKey;
var storage = multer.diskStorage({
    destination:(req, file, cb)=>{
        cb(null, 'uploads/')
    },
    filename:function(req, file, cb){
        fileName = file.fieldname+'-'+Date.now()+'.mp3';
        cb(null, fileName);
    }
}); 
var upload = multer({storage:storage}).single('audio'); 
    router.post('/audio', (req, res)=>{
        upload(req, res, (err)=>{
           if(err){
               res.json({success:false, message:"Uploading error : "+err});
           }else{
               res.json({success:true, message:"Uploaded successfully"});
           }
       });
    });
    
    //User registeration route
    router.post('/users', function(req, res){
        var user = new User();
        user.username = req.body.username;
        user.password = req.body.password;
        user.email = req.body.email;
        user.name=req.body.name;
        user.temporarytoken = jwt.sign({username:user.username, email:user.email}, secretKey, {expiresIn:'24h'});
        if(req.body.name == null || req.body.name === ''){
            res.json({success:false, message:"Missiing name"});
        }
        else if(req.body.email == null || req.body.email === ''){
            res.json({success:false, message:"Missiing email"});
        }
        else if(req.body.username == null || req.body.username === ''){
            res.json({success:false, message:"Missiing username"});
        }
        else if(req.body.password == null || req.body.password === ''){
            res.json({success:false, message:"Missiing password"});
        } 
        else{
            user.save(function(err){
               if(err){
                   if(err.errors != null){
                       if(err.errors.name){
                           res.json({success:false, message:err.errors.name.message});
                       }
                       else if(err.errors.email){
                        res.json({success:false, message:err.errors.email.message});
                        }
                        else if(err.errors.username){
                            res.json({success:false, message:err.errors.username.message});
                        }
                        else if(err.errors.password){
                            res.json({success:false, message:err.errors.password.message});
                        }
                        else{
                            res.json({success:false, message:err});
                        }
                   }
                   else if(err){
                        if(err.code == 11000){
                            if(err.errmsg[60] === 'u'){
                                res.json({success:false, message:"That username is already token"});
                            }
                            else if(err.errmsg[60] === 'e'){
                                res.json({success:false, message:"This email already exists"});
                            }
                        }
                            else{
                                res.json({success:false, message:err});
                            }
                    }
               }
                else{
                    var transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                          user: 'nodejsdevoloper@gmail.com',
                          pass: 'NODEJSDEVELOPER#&@@'
                        }
                      });

                      var mailOptions = {
                        from: 'nodejsdeveloper@gmail.com',
                        to: user.email,
                        subject: 'localhost activation',
                        html:'Hello <strong>'+user.name+'</strong>, <br><br>Thank you for rgestring'+
                        ', please click the link below to activate your account<br><a href="http://localhost:8080/activate/'+user.temporarytoken+'">http://localhost:8080/activate</a>'

                      };

                      transporter.sendMail(mailOptions, function(error, info){
                        if (error) {
                          console.log('Error : '+error);
                        } else {
                          console.log('Email sent: ' + info.response);
                        }
                      });
                    res.json({success:true, message:"Please check your e-mail to activate your account during incoming 24 hours"});
                }
            });
    }
    });

    //User authentication route (for log in)
    router.post('/authenticate', function(req, res){        
        User.findOne({username:req.body.username}).select('email username password activate _id').exec(function(err, user){
            if(err) throw err
            if(!user){
                //No username found
                res.json({success:false, message:"Username does not exist"});
            }else{
                //Now we've found that user
                //we need next to check for his password and see if it's correct
                if(!user.comparePassword(req.body.password)){
                    res.json({success:false, message:"Incorrect password"});
                }else if(!user.activate){
                    res.json({success:false, message:"Account hasn't been activated yet, please check your email to complete activation", expired:true});           
                }
                else{                  
                    // console.log(user._id) ;
                    var token = jwt.sign({username:user.username, email:user.email, user_id:user._id}, secretKey, {expiresIn:'24h'});
                    res.json({success:true, message:"Authenticated Successfully", token:token});
                }
            }
        });
    });
                
    //Checking username route
    router.post('/checkusername', function(req, res){
        User.findOne({username:req.body.username}).select('sername').exec(function(err, user){
            if(err) throw err
            if(user){
                res.json({success:false, message:'That username is already token'});
            }else{
                res.json({success:true, message:'Valid username'});
            }
        });
    });

    //Checking email route
    router.post('/checkemail', function(req, res){
        User.findOne({email:req.body.email}).select('email').exec(function(err, user){
            if(err) throw err
            if(user){
                res.json({success:false, message:'That email is already token'});
            }else{
                res.json({success:true, message:'Valid email'});
            }
        });
    });

    router.put('/activate/:token', function(req, res){
        User.findOne({temporarytoken:req.params.token}, function(err, user){
            if(err) throw err
            var token = req.params.token;
            jwt.verify(token, secretKey, function(err, decoded){
                if(err || !user){
                    res.json({success:false, message:'Activation link expired'});
                }
                else{
                    user.temporarytoken = false;
                    user.activate=true;
                    user.save(function(err){
                        if(err){
                            console.log("Error : " + err);
                        }else{                           
                            res.json({success:true, message:'Account is activated successfully'});

                            //We may here send another email to the user to tell him he has activated his account
                        }
                    });

                }
            });

        });
    });

    //This route to reset your password if you forget it.
    router.post('/forget-password', function(req, res){
        if(req.body.email === '' || req.body.email == null){
            res.json({success:false, message:"No mail provided"});
        }else{
            User.findOne({email:req.body.email}, function(err, data){
                if(err || !data){
                    res.json({success:false, message:"This mail doesn't exist"});
                }else{
                    var token = jwt.sign({email:data.email}, secertKey+"FORGET$", {expiresIn:'24h'});
                    var transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                          user: 'nodejsdevoloper@gmail.com',
                          pass: 'NODEJSDEVELOPER#&@@'
                        }
                      });
            
                      var mailOptions = {
                        from: 'nodejsdeveloper@gmail.com',
                        to: req.body.email,
                        subject: 'Forget Password',
                        html:'Please click the link below to reset your password<br><a href="http://localhost:8080/forget-password/'+token+'">http://localhost:8080/forget-password/</a>'
            
                      };
                      transporter.sendMail(mailOptions, function(error, info){
                        if (error) {
                          console.log('Error : '+error);
                        } else {
                          console.log('Email sent: ' + info.response);
                        }
                      });
            
                      res.json({success:true, message:"Please check your e-mail to reset your password during incoming 24 hours"});

                }
            });
        }
        
    });

    router.put('/reset-password/:token', function(req, res){
        var token = req.params.token;
        User.findOne({email:req.body})
        jwt.verify(token, secertKey+"FORGET$", function(err, info){
            if(err){
                res.json({success:false, message:'Reset  password link expired'});
            }
            else{
                User.findOne({email:info.email}, function(err, user){
                    if(err){
                        res.json({success:false, message:err});
                    }else{
                        user.password = req.body.password;
                        user.save(function(err){
                            if(err){
                                res.json({Error:err.message});
                            }else{
                                res.json({success:true, message:"Password reset successfully"});
                            }
                        });
                    }
                });
            }
        });
    });

      
    var mid = 0;
    // Create middle ware to check if the token is valid
    router.use(function(req, res, next){
        console.log("Accessed");
        // console.log("The middleware was executed : " + mid++);
        var token = req.headers['access-token'];
        if(token){
            // console.log(token);
            jwt.verify(token, secretKey, function(err, decoded){
                if(err){
                    res.json({success:false, message:'Invalid token(maybe expired on)'});
                }else{
                    req.decoded = decoded;
                    //next takes you to the next middleware(route)
                    //NOTE :NEXT ROUTE(/me) WOULD NOT BE ACCESSED IF THE TOKEN IS NOT AUTHENTICATED(VERIFIED)
                    next();
                }
            });
        }else{
            res.json({success:false, message:'No provided token'});
        }
    });

    router.get('/messages', (req, res)=>{
        var pageSize = 10;
        var pageNumber = req.headers['page-number'];
        var skip = pageSize * (pageNumber-1);
        var Me = req.headers['me'];
        var You = req.headers['you'];
        if(pageNumber < 0 || pageNumber ==  0){
            res.json({success:false, message:"Invalid page number"})
        }
        Chat.Room
        .find({
            "$or":[
                {"name":Me+'-'+You},
                {"name":You+'-'+Me}
            ]
        }).populate('messages_ids', ['message_content', 'to', 'from', 'date'])
          .select('name')
          .exec((err, result)=>{
            if(result != 0){
                res.json(result[0].messages_ids);
            }
    });
    
});
    router.get('/friends', (req, res)=>{
        User.findOne({username:req.decoded.username}, (err, result)=>{
           if(err){
               console.log("Error : " +err);
           }else{
            res.json(result.friends);
           }
        });
                    
    });


    //   This route to change password
      router.put('/changePassword', function(req, res){
        User.findOne({username:req.body.username}).select('username password').exec(function(err, user){
            if(err) throw err
            if(!user){
                res.json({success:false, message:"Username does not exist"});
            }else{
                //Now we've found that user
                //we need next to check for his password and see if it's correct
                if(!user.comparePassword(req.body.password)){
                    res.json({success:false, message:"Incorrect password"});
                }
                else{                   
                    //Here we made sure user is authenticated and can change his password      
                    if(req.body.newPassword === '' || req.body.newPassword == null){
                        res.json({success:false, message:"No new password provided"});
                    }else{
                        if(req.body.password === req.body.newPassword){
                            res.json({success:false, message:"Your new password should be different"});

                        }else{
                            user.password = req.body.newPassword;
                            // user.timepass = 'fayed';
                        user.save(function(err){
                            if(err){
                            res.json({success:false, message:err.message});
                             }else{
                               res.json({success:true, message:"Password changed successfully"});  
                             }
                        });
                        }
                    }                 
                }
            }
        });
    });
    
    //This route sends username and email of the logged in user
    //This route will be accessed only if the user is logged in
    //In other word, the user is having our valid token
    router.post('/me', function(req, res){
        res.send(req.decoded);
    });

    //Importing csv, xls, xlsx files into database(from client)
    router.post('/importData', (req, res)=>{
        var product = new Product();
        var rows=[];
        var writeStr ="";
        var obj = xls.parse(__dirname+'/products.xlsx');
        for(var i = 0; i < obj.length; i++){
        var sheet = obj[i];
        //loop through all rows in the sheet
        for(var j = 0; j < sheet['data'].length; j++){
                //add the row to the rows array
                rows.push(sheet['data'][j]);
            }
        }
        for(var i = 0; i < rows.length; i++){
            writeStr += rows[i].join(",") + "\n";
        }
        //if it's xls file
        csv().fromString(writeStr).then((jsonObject) =>{
            product.collection.insert(jsonObject, (err, docs)=>{
                if(err){
                    res.json({success:false, message:"Error : " +err});
                }else{
                    res.json({success:true, message:"Documents inserted successfully"});
                }
            });

        });
        
    });

    //Exporting data as csv, xls, xlsx files(from server to client)
    router.get('/exportData', (req, res)=>{
        var product = new Product();
        const fields = ['ProductID','ProductName','SupplierID',
                        'CategoryID','QuantityPerUnit','UnitPrice',
                        'UnitsInStock','UnitsOnOrder','ReorderLevel',
                        'Discontinued'];
        const json2csvParser = new Parser({fields});

        Product.find({}, (err, products)=>{
            if(err){
                res.json({success:false, message:err});
            }else{
                const csv = json2csvParser.parse(products);
                // console.log(csv);
                fs.writeFileSync(__dirname+'/results.csv', csv, (err)=>{
                    if(err) throw err;
                    // console.log("Written");
                });
                res.download(__dirname+'/results.csv');
            }
        });
    });
  module.exports = router;