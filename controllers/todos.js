const Todo = require('../models/Todo');

module.exports = {
    getTodos: (req,res) => {
        console.log('getTodosの頭');
        Todo.findAll()
            .then(reservations=>{
                console.log('getTodos実行。findAllからのプロミス返りthenの中');
                res.status(200).json(reservations);
            })
            .catch(e=>console.log(e.stack));
        // const storedTodos = Todo.findAll();
        // res.status(200).json(storedTodos);
    }
}