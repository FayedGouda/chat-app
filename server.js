var express    = require('express');
var bodyParser = require('body-parser');
var mongoose   = require('mongoose');
var Chat       = require('./app/models/chat');
var mongoURI   = require('./app/config/key').mongoURI;
var path       = require('path');
var router     = express.Router();
var app        = express();
var io         = require('socket.io');
var http       = require('http');
const server   = http.createServer(app);
const socket   = io(server);
//const PORT     = process.env.PORT || 8080;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname+'/public'));
//App routes
app.use('/api', require('./app/routes/api'));
app.use('/users', require('./app/routes/users'));
// Connecting to Database 
// mongoose.connect(mongoURI, function(err){
//     if(err)throw err;
//     console.log("Connected to MongoDB Successfully");
// });

app.get('/login', (req, res)=>{
    res.sendFile(__dirname+'/public/views/pages/login.html');
});


app.get('/chat', (req, res)=>{ 
    res.sendFile(path.join(__dirname+'/index.html'));
});

//To listen to messages
socket.on('connection', (client)=>{
    var FinalResult;
    var chatRoomName, chatRoomID, a;;
    client.on('join', (data)=>{
        Chat.Room.find({
            "$or":[
                {"name":data.me+'-'+data.you},
                {"name":data.you+'-'+data.me}
            ]
        }, (err, result)=>{
            if(result != 0){
                chatRoomName = result[0].name;
                client.join(chatRoomName);
                chatRoomID=result[0]._id;
            }else{
                const newRoom = new Chat.Room({
                    name:data.me+'-'+data.you,
                    neckName:data.me+'-'+data.you
                });
                newRoom.save((err)=>{
                    if(err){
                        console.log("Saving error : " + err);
                    }else{
                        console.log(" Room Saved successfully");
                    }
                });
            }
        });
    client.on('startTyping', (data)=>{  
        client.in(chatRoomName).emit('startTyping', {is_typing:true, from:'server'});
    });
    client.on('stopTyping', (data)=>{  
        client.in(chatRoomName).emit('stopTyping', {is_typing:false, from:'server'});
    });
    on_deliver = function(isDelivered){
        FinalResult = isDelivered.yes;
    }
     client.on('messageDelivered', on_deliver);
    });
    client.on('sendMessage', (data)=>{
        client.in(chatRoomName).emit('connectToRoom', data);
        const newMessage = new Chat.Message({
            _id:new mongoose.Types.ObjectId(),
            to:data.to,
            from:data.from,
            message_content:data.message_content,
            sent:true
        });
    });
});
server.listen(8080);