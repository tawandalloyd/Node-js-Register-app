const express = require('express');
const  app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require("mongoose");
const PORT = 3000;
const router = express.Router();
const Bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const helmet = require('helmet');
const compression = require('compression');

require("dotenv").config();

let Register = require('./models/registerModel')
let Products =require('./models/products')
let Token = require ('./AuthToken/token')


app.use(cors());
app.use(bodyParser.json());
app.use(helmet());
app.use(compression());

const uri = "mongodb+srv://tawandalloyd:6209lolo@cluster0.22bln.mongodb.net/users?retryWrites=true"

app.listen(PORT, function() {
    console.log("Server is running on Port: " + PORT);
});

mongoose.connect(uri, { useNewUrlParser: true });
const connection = mongoose.connection;

connection.once('open', function() {
    console.log("MongoDB database connection established successfully");
})

router.route('/products').post(function(req,res){
let products = new Products(req.body);
products.save()
        .then(products =>{
            res.status(200).json({'user':'products added successfully'});
        })
        .catch (err =>{
           res.status(400).send("failed to add products"); 
        });
});

router.route('/register').post(function(req, res){
   Register.findOne({email: req.body.email }, function(err,user){
     if(err){
         return res.status(500).status({msg : err.message});
     } 
     // check if email exists in database
     else if (user){
         return res.status(400).send({msg: 'this email already exists'});
     } 
     else{
         req.body.password = Bcrypt.hashSync(req.body.password, 10);
         let user = new Register(req.body);
         user.save(function(err){
             if(err){
                 return res.status(500).send({msg:err.message});
             }
             var token = new Token({_userId: user._id, token : crypto.randomBytes(16).toString('hex')});
             token.save(function(err){
                 if(err){
                     return res.status(500).send({msg: err.message});
                 }
                 const transporter = nodemailer.createTransport(
                     sendgridTransport({
                         auth:{
                             api_key:process.env.SENDGRID_APIKEY,
                         }
                     })
                 )
                 var mailOptions = { from: 'tawandalloydcharuka@gmail.com',
                 to: user.email,
                 subject: 'Account Verification Link',
                 text: 'Hello '+ req.body.name +',\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + user.email + '\/' + token.token + '\n\nThank You!\n' };
                 transporter.sendMail(mailOptions, function (err) {
                if (err) { 
                    return res.status(500).send({msg:'Technical Issue!, Please click on resend for verify your Email.'});
                 }
                return res.status(200).send('A verification email has been sent to ' + user.email + '. It will be expire after one day. If you not get verification Email click on resend token.');
               });
             });
         });
     }
   });
});


router.route('/confirmation/:email/:token').get(function(req,res){
    Token.findOne({ token: req.params.token }, function (err, token) {
        // token is not found into database i.e. token may have expired 
        if (!token){
            return res.status(400).send({msg:'Your verification link may have expired. Please click on resend for verify your Email.'});
        }
        // if token is found then check valid user 
        else{
            Register.findOne({ _id: token._userId, email: req.params.email }, function (err, user) {
                // not valid user
                if (!user){
                    return res.status(401).send({msg:'We were unable to find a user for this verification. Please SignUp!'});
                } 
                // user is already verified
                else if (user.isVerified){
                    return res.status(200).send('User has been already verified. Please Login');
                }
                // verify user
                else{
                    // change isVerified to true
                    user.isVerified = true;
                    user.save(function (err) {
                        // error occur
                        if(err){
                            return res.status(500).send({msg: err.message});
                        }
                        // account successfully verified
                        else{
                          return res.status(200).send('Your account has been successfully verified');
                        }
                    });
                }
            });
        }
        
    });
});
// resend token
router.route('/resendToken').post(function(req,res){
    Register.findOne({ email: req.body.email }, function (err, user) {
        // user is not found into database
        if (!user){
            return res.status(400).send({msg:'We were unable to find a user with that email. Make sure your Email is correct!'});
        }
        // user has been already verified
        else if (user.isVerified){
            return res.status(200).send('This account has been already verified. Please log in.');
    
        } 
        // send verification link
        else{
            // generate token and save
            var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
            token.save(function (err) {
                if (err) {
                  return res.status(500).send({msg:err.message});
                }
    
                // Send email (use verified sender's email address & generated API_KEY on SendGrid)
                    const transporter = nodemailer.createTransport(
                        sendgridTransport({
                            auth:{
                                api_key:process.env.SENDGRID_APIKEY,
                            }
                        })
                    )
                    var mailOptions = { from: 'tawandalloydcharuka@gmail.com', to: user.email, subject: 'Account Verification Link', text: 'Hello '+ user.name +',\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + user.email + '\/' + token.token + '\n\nThank You!\n' };
                    transporter.sendMail(mailOptions, function (err) {
                       if (err) { 
                        return res.status(500).send({msg:'Technical Issue!, Please click on resend for verify your Email.'});
                     }
                    return res.status(200).send('A verification email has been sent to ' + user.email + '. It will be expire after one day. If you not get verification Email click on resend token.');
                });
            });
        }
    });
});
 



router.route('/login').post(function(req,res){
    Register.findOne({ email: req.body.email }, function(err, user) {
        // error occur
        if(err){
            return res.status(500).send({msg: err.message});
        }
        // user is not found in database i.e. user is not registered yet.
        else if (!user){
            return res.status(401).send({ msg:'The email address ' + req.body.email + ' is not associated with any account. please check and try again!'});
        }
        // comapre user's password if user is find in above step
        else if(!Bcrypt.compareSync(req.body.password, user.password)){
            return res.status(401).send({msg:'Wrong Password!'});
        }
        // check user is verified or not
        else if (!user.isVerified){
            return res.status(401).send({msg:'Your Email has not been verified. Please click on resend'});
        } 
        // user successfully logged in
        else{
            var otp = Math.random();
            otp = otp * 1000000;
            otp = parseInt(otp);
            console.log(otp);
           
        const transporter = nodemailer.createTransport({

                host: "smtp.gmail.com",
                         port: 465,
                        secure: true,
                        service : 'Gmail',

                        auth: {
                           user: 'tawandalloydcharuka@gmail.com',
                           pass:'6209lolo',
                        }               
             })
            var mailOptions = {
            //  from: 'tawandalloydcharuka@gmail.com',
             to: user.email,
              subject: 'Account OTP',
               text: 'Hello '+ user.name +',\n\n' + 'One Time Pin for login verification is:\n' + otp +'\n'+'thank you' };
            transporter.sendMail(mailOptions, function (err) {
               if (err) { 
                return res.status(500).send({msg:'Technical Issue!, Please click on resend for verify your Email.'});
             }
            return res.status(200).send('OTP email has been sent to ' + user.email + '. It will be expire after one day. If OTP Email is not in mailbox  click on resend token.');
        });
        }
    });

});

            // var  otp = Math.random();
            // otp = otp * 1000000; 
            // otp = parseInt(otp);
            // console.log(otp);

router.route('/resendOTP').post(function(req,res){
    Register.findOne({ email: req.body.email }, function(err, user) {
        // error occur
        if(err){
            return res.status(500).send({msg: err.message});
        }
        // user successfully logged in
        else{
          

           
        const transporter = nodemailer.createTransport({

                host: "smtp.gmail.com",
                         port: 465,
                        secure: true,
                        service : 'Gmail',

                        auth: {
                           user: 'tawandalloydcharuka@gmail.com',
                           pass:'6209lolo',
                        }
             })
            var mailOptions = {
            //  from: 'tawandalloydcharuka@gmail.com',
             to: user.email,
              subject: 'Account OTP',
               text: 'Hello '+ user.name +',\n\n' + 'One Time Pin for login verification is:\n' + otp +'\n'+'thank you' };
            transporter.sendMail(mailOptions, function (err) {
               if (err) { 
                return res.status(500).send({msg:'Technical Issue!, Please click on resend for verify your Email.'});
             }
            return res.status(200).send('OTP email has been sent to ' + user.email + '. It will be expire after one day. If OTP Email is not in mailbox  click on resend token.');
        });
        }
    });

});

//verify OTP
router.route('/verifyOTP').get(function(req,res){
 if(req.body.otp == otp){
     res.send("login successful")
 }
 else{
     res.send("wrong otp")
 }

});


router.route('/users').get(function(req, res){
    Register.find(function(err, users){
        if(err) {
            console.log(err);
        }
        else{
            res.json(users);
        }
    });
});

router.route('/update/:id').post(function(req, res) {
    Register.findById(req.params.id, function(err, users) {
        if (!users)
            res.status(404).send("data is not found");
        else
            users.name = req.body.name;
            users.surname = req.body.surname;
            users.email = req.body.email;
            users.password = req.body.password;

            todo.save().then(users => {
                res.json('users updated!');
            })
            .catch(err => {
                res.status(400).send("Update not possible");
            });
    });
});


app.use('/', router);









