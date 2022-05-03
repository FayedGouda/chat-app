var mongoose = require('mongoose');

var messageSchema = mongoose.Schema({
    _id:mongoose.Schema.Types.ObjectId,
    from:{type:String},
    to:{type:String},
    message_content:{type:String},
    date:{type:Date, default:Date.now},
    sent:{type:Boolean, default:false},
    delivered:{type:Boolean, default:false},
    seen:{type:Boolean, default:false}
});
var Message = mongoose.model('Message', messageSchema, 'messages');
var chatRoomSchema = mongoose.Schema({
    name: { type: String, lowercase: true, unique: true, required:true },
    neckName:{type:String, default:this.name},
    roomImage:{type:String, default:null},
    created_at: {type:Date, default:Date.now},
    updated_at: { type: Date, default: Date.now },
    messages:[ Message ]
});
var Room = mongoose.model('ChatRooms', chatRoomSchema, 'chatrooms');
module.exports={
    Room:Room,
    Message:Message
}