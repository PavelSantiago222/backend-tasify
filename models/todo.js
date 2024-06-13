const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:["pendiente","completado"],
        default:"pendiente"
    },
    category:{
        type:String,
        required:true,
    },
    dueDate:{
        type:String,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});


const Todo = mongoose.model("Todo",todoSchema);

module.exports = Todo