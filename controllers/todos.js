console.log('controllersのtodo.js実行');
const Todo = require('../models/Todo');

module.exports = {
    getTodos: (req,res) => {
        console.log('controllersのgetTodos実行');
        const storedTodos = Todo.findAll();

        res.status(200).json(storedTodos);
    }
}