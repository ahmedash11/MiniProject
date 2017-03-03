var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var router = require('./routes');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var expressValidator = require('express-validator');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var flash = require('connect-flash');
var mongo = require('mongodb');
var mongoose = require('mongoose');
// var MongoStore = require('connect-mongo')('express');
var fs = require('fs');

var User = require('./models/account');
var Project = require('./models/Project');
var projectController=require('./controller/projectController');
mongoose.connect('mongodb://localhost/meanapp');
var conn = mongoose.connection;
var gfs;
var Grid= require('gridfs-stream');
Grid.mongo = mongoose.mongo; 
// var routes = require('./routes/index');
// var users = require('./routes/users');
var multer = require('multer');
var app = express();
var mime = require('mime');
var crypto = require('crypto');
//var current;
var image;

var storage = multer.diskStorage({

	destination : function(req,file,cb){
		cb(null,'./public/uploads/')
	},
	filename: function(req,file,cb){
		crypto.pseudoRandomBytes(16,function(err,raw){
			cb(null,raw.toString('hex') + Date.now() +'.'+mime.extension(file.mimetype));
		})
	}


}) 
// var upload = multer({dest:'./public/uploads' , rename:function(fieldname ,filename){
// 	return filename.replace(/\w+/g,'-').toLowerCase() +Date.now()
// }});
var upload = multer({storage:storage});
// conn.once("open", function(){

// 	gfs= Grid(conn.db);
// 	app.get('/' , function(req,res){

// 		res.render('index');


	
// });
// })


function Authenticated(req,res,next){
	if(req.isAuthenticated()){
		req.current =req.user.username;

		return next();
	}
	else {
		res.redirect('/login')
	}
}


app.set('view engine','ejs');
app.set('views',path. join(__dirname , 'views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(expressValidator());
app.use(session({
  secret: 'max',
  resave: false,
  saveUninitialized: false,
 
}));
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true,
 
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname,'public'))) ;

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

app.use(flash());



  // Global Vars
app.use(function (req, res, next) {
	res.locals.req =req;
	res.locals.res =res;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  res.locals.current = req.current;
   res.locals.image = req.image;
  next();
});

app.get('/login', function(req,res){

	res.render('login');
});


app.get('/upload',Project.getProfile);
app.get('/user/:user',Project.getProfile);
app.get('/summary',Project.getAll);


app.get('/register', function(req,res){
	res.render('register');
});


app.get('/' ,Project.getAllProjects);


	



passport.use(new LocalStrategy(
  function(username, password, done) {
 User.getUserByUsername(username,function(err,user){
if(err){
	throw err;
}
if(!user){
	return done(null,false,{message:'Unkown User'});

}
User.comparePassword(password, user.password,function(err,isMatch){
	if(err)
		throw err;
       
	if(isMatch){
		return done(null,user);
	}else{
		return done(null , false ,{message:'Invalid password'})
	}
})
 });

} 
));
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

app.post('/login',
  passport.authenticate('local', {successRedirect:'/indexstud', failureRedirect:'/login',failureFlash: true}),
  function(req, res) {
  	req.login();
  	req.isAuthenticated = true ;
    res.redirect('/indexstud');
  });

app.post('/addUrl', projectController.addLink);
app.get('/portfolios', Project.getAllPortfolios);

app.post('/addScreenshot', upload.single('screenshot'), Project.addImage);
// app.post('/login',function(req,res){
// 	console.log("ahmed")
// 	 req.session.username = req.body.username;
// 	 console.log(req.session.username);
//  //  // passport.authenticate('local' ,{successRedirect:'/indexstud',failureRedirect:'/login' ,failureFlash:true}),
//  //  // function(req, res) {
//  //  //   // If this function gets called, authentication was successful.
//  //  //   // `req.user` contains the authenticated user.
//     res.redirect('/indexstud');
//   });

app.get('/indexstud',Authenticated, function(req,res){
	console.log(req.user.username);
	req.image = req.user.image
	if( req.user.image=== undefined)
res.render('indexstud', {'current': req.user.username, expressFlash: req.flash('success')});

else{
res.render('indexstud1' ,{'image':req.image , 'current':req.user.username});
	req.flash('success', 'Your name was updated');
	}
});


app.post('/createPort',function(req,res){
let newProject = new Project();

newProject.username = req.user.username;
newProject.portName = req.body.portName;
Project.createProj(newProject,function(err ,project){
 	if(err)
 		throw err ;

 });
console.log(req.user.username);
		res.redirect('/indexstud')
  });




app.post('/adduser', function(req, res) {
  
    var name= req.body.name ;
    var email=  req.body.email; 
    var username=  req.body.username; 
    var password=  req.body.regpassword ;
  
  let newUser = new User();
  	newUser.name = name ;
	newUser.email = email ;
	newUser.username = username ;
	newUser.password = password ;

 User.createUser(newUser ,function(err ,user){
 	if(err)
 		throw err ;

 });
		//console.log(req.user.username);
		res.redirect('/login');
  });



app.get('/test',function(req,res){
	console.log(req.user.username)
	res.render('untitled')
});
app.post('/profpicture',upload.single('image'),function(req,res){
	console.log(req.file.filename);
	console.log('a');
	var file = req.file.filename;
	var curr = req.user.username;
	image='/uploads/'+file;
	//console.log(current);
	User.update({username:req.user.username},{image:image},function(err,result){
		if(err){

			res.send(err.message);
		}
		if(result){

			result.image=image;
			console.log(result);
		}
	})

	res.render('indexstud1' ,{image , curr});
});

app.get('/logout' ,function(req,res){
	res.redirect('/');
	req.logout();
	current = null ;
})

app.listen(3000,function(){
	console.log('server on port 3000')
});