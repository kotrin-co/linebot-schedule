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
            const {line_uid,name,year,date_m,date_d,starttime_h,starttime_m,menu} = req.body;
            Todo.create({line_uid,name,year,date_m,date_d,starttime_h,starttime_m,menu})
                .then(message=>{
                    console.log('message:',message);
                    res.status(200).redirect('/reservations');
                })
                .catch(e=>console.log(e.stack));
            // const createdReservation = Todo.create({line_uid,name,year,date_m,date_d,starttime_h,starttime_m,menu});
            // console.log('createdReservation:',createdReservation);
            // res.status(200).json(createdReservation);
         }catch(error){
             res.status(400).json({message:error.message});
         }
    },

    putTodo: (req,res) => {
        const id = req.params.id;
        const {line_uid,name,year,date_m,date_d,starttime_h,starttime_m,menu} = req.body;
        const parsedId = parseInt(id,10);
        try{
            Todo.update({parsedId,line_uid,name,year,date_m,date_d,starttime_h,starttime_m,menu})
                .then(message=>{
                    console.log('message:',message);
                    res.status(200).redirect('/reservations');
                })
                .catch(e=>console.log(e.stack));
        }catch(error){
            res.status(400).json({message:error.message});
        }
    }
}