const Todo = require('../models/Todo');

module.exports = {
    getTodos: (req,res) => {
        Todo.findAll()
            .then(reservations=>{
                res.status(200).json(reservations);
            })
            .catch(e=>console.log(e.stack));
        // const storedTodos = Todo.findAll();
        // res.status(200).json(storedTodos);
    }
}