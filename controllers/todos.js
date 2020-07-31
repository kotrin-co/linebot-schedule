const Todo = require('../models/Todo');

module.exports = {
    getTodos: (req,res) => {
        Todo.findAll()
            .then(reservations=>{
                res.status(200).json(reservations);
            })
            .catch(e=>console.log(e.stack));
    },

    postTodo: (req,res) => {
        try{
            const {line_uid,name,date_m,date_d,starttime_h,starttime_m,menu} = req.body;
            const createdReservation = Todo.create({line_uid,name,date_m,date_d,starttime_h,starttime_m,menu});
            res.status(200).json(createdReservation);
         }catch(error){
             res.status(400).json({message:error.message});
         }
    }
}