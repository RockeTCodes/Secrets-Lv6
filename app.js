
//requiring the packages
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require("mongoose-findorcreate");




//initialisation and setiing view engine etc.
const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.use(session({
  secret:process.env.CLIENT_SECRETKEY,
  resave:false,
  saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());




//connection to DB
mongoose.connect(process.env.CLIENT_URL);




//creating userSchema
const userSchema = new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String,
  username:String
});



//adding plugin to the user Schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);





//creating mongoose model
const User = mongoose.model("User",userSchema);





// passport strategies initialisation
passport.use(User.createStrategy());

passport.serializeUser(function(user,done){
  done(null,user.id);
});
passport.deserializeUser(function(id,done){
  User.findById(id,function(err,user){
    done(err,user);
  });
});



//google Oauth
passport.use(new GoogleStrategy({
    clientID:    process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id , email:profile.email,username: profile.displayName }, function (err, user) {
      return done(err, user);
    });
  }
));







//handling requests
app.get("/",function(req,res){
  res.render("home");
});


app.get("/auth/google",
  passport.authenticate("google", { scope:
      [ "email", "profile" ] }
));


app.get( "/auth/google/secrets",
    passport.authenticate( "google", {
        successRedirect: "/secrets",
        failureRedirect: "/login"
}));


app.get("/register",function(req,res){
  res.render("register");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/secrets",function(req,res){
User.find({"secret":{$ne:null}},function(err,foundUsers){
  if(err){
    console.log(err);
  }

  else{
    if(foundUsers){

      if(req.isAuthenticated()){
        res.render("secrets",{usersSecrets:foundUsers,buttonText:"Log Out",btnPath:"/logout"});
      }
      else{
        res.render("secrets",{usersSecrets:foundUsers,buttonText:" Log In",btnPath:"/login"});
      }

    }
  }
});
});


app.get("/logout",function(req,res){
  req.logout(function(err){
    if(err){
      console.log(err);
    }
  });
  res.redirect("/");
});





app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
});







//handling POST of register page
app.post("/register",function(req,res){
  const userName = req.body.username;
  const passWord = req.body.password;

User.register({username:userName},passWord,function(err,user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }

  else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }
});

});






//handling POST of login page
app.post("/login",function(req,res){
  const userName = req.body.username;
  const passWord = req.body.password;

const user = new User({
  username:userName,
  password:passWord
});


req.login(user, function(err){
  if(err){
    console.log(err);
  }

  else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }
});



});






app.post("/submit",function(req,res){
   const newsecret = req.body.secret;
   User.findById(req.user.id,function(err,foundUser){
     if(err){
       console.log(err);
     }

     else{
       if(foundUser){
         foundUser.secret = newsecret;
         foundUser.save(function(){
           res.redirect("/secrets");
         });
       }
     }
   })

});












//setting up server
app.listen(process.env.PORT||3000,function(){
  console.log("Server started.......");
});
