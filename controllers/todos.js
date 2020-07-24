const Todo = require('../models/Todo');

module.exports = {
    getTodos: (req,res) => {
        const storedTodos = Todo.findAll();

        res.status(200).json(storedTodos);
    }
}