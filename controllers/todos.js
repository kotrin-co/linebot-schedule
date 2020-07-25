const Todo = require('../models/Todo');
console.log('その3　todo.js(controllers)');

module.exports = {
    getTodos: (req,res) => {
        console.log('その4　todo.js(controllers) getTodos');
        Todo.findAll()
            .then(reservations=>{
                res.status(200).json(reservations);
            })
            .catch(e=>console.log(e.stack));
        // const storedTodos = Todo.findAll();
        // res.status(200).json(storedTodos);
    }
}