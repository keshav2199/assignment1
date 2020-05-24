const app = require('express')();
const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fs = require('fs');
app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use('/uploads', express.static('uploads'));
app.set('view engine', 'ejs');
app.set('socketio', io);
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname)
  }
})

var upload = multer({
  storage: storage
})


app.get('/', (req, res) => {
  res.render('mainPage');
});

app.get('/signup', (req, res, next) => {
  res.render('signup');
})

app.post('/save-signup-data', upload.single('userImage'),(req, res, next) => {

  let users = fs.readFileSync('user.json', 'UTF-8')
  
  users = JSON.parse(users);
  
  let user1 =  users.filter((element) => {
    if (element.email === req.body.email)
      return element
  })
  
  console.log(user1);
  
  if (user1.length > 0) {
    if(req.file){
      fs.unlinkSync('uploads/'+req.file.filename)
     
    }
    
    res.render('error',{
      message: "User is already signed up, Please login"
    })

  } else {
    let user = req.body;
    if (req.file) {
      user.image = 'http://localhost:80/' + 'uploads/' + req.file.filename;
    }

    let users = fs.readFileSync('user.json', 'UTF-8');
    users = JSON.parse(users);

    users.push(user);
    fs.writeFileSync('user.json', JSON.stringify(users));
    res.render('index',{
      user:user
    });
  }

})

app.get('/login', (req, res) => {
  res.render('login');
})

app.post('/login-data', (req, res, next) => {

  let users = fs.readFileSync('user.json')
  users = JSON.parse(users)
  let user = users.filter((element) => {
    if (element.email === req.body.email)
      return element
  })
  if (user.length > 0) {
    if (user[0].password === req.body.password) {
      res.render('index', {
        user:user[0]
      });
    } else {
      res.render("error",{
        message: "The provided password  is wrong"
      })
      
    }
  } else {
    res.render("error",{
      message: "User is not signed up, signup the user"
    })
  }

})
let user_session=[];
io.on('connection', (socket) => {
  console.log("new user connected...");
  socket.join('page');
  socket.on('online-user',(data)=>{
    data.socket_id=socket.id;
    user_session.push(data);
    io.in('page').emit('user-list', user_session);
  })
  socket.on('disconnect', () => {
    let user = user_session.filter((element)=>{
      if(element.socket_id===socket.id)
      return element;
    })
    user_session.splice( user_session.indexOf(user[0]), 1);
    io.in('page').emit('user-list', user_session);
    console.log('a user disconnected...');
  })
});

server.listen(80, () => {
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads')
  }
  if (!fs.existsSync('user.json')) {
    let users = []
    fs.writeFileSync('user.json', JSON.stringify(users));
  }
  console.log('Server is running on port http://localhost:80')
});