const { Client } = require('pg');
const connection = new Client({
    user:process.env.PG_USER,
    host:process.env.PG_HOST,
    database:process.env.PG_DATABASE,
    password:process.env.PG_PASSWORD,
    port:5432
  });
connection.connect();

// const adminData = {
//     users:null,
//     reservations:null
// };

// const pickup_users = {
//     text:'SELECT * FROM users ORDER BY id ASC;'
// };
// const pickup_reservations = {
//     text:'SELECT * FROM schedules ORDER BY starttime ASC;'
// };
// connection.query(pickup_users)
//     .then(res=>{
//         // console.log('users:',res.rows);
//         adminData.users = res.rows;
//         connection.query(pickup_reservations)
//             .then(res=>{
//                 // console.log('reservations:',res.rows);
//                 adminData.reservations = res.rows;
//                 adminData.reservations.map(object=>{
//                     object.starttime = parseInt(object.starttime);
//                     object.endtime = parseInt(object.endtime);
//                 });
//                 console.log('Todo.jsの外側クエリ実行');
//             })
//             .catch(e=>console.log(e.stack));
//     })
//     .catch(e=>console.log(e.stack));

// pickupAllReservations()
//     .then(message=>{
//         console.log('message:',message);
//         console.log('adminData:',adminData.reservations;
//     })
//     .catch(e=>console.log(e.stack));

// const pickupAllReservations = () => {
//     return new Promise((resolve,reject)=>{
//         const pickup_users = {
//             text:'SELECT * FROM users ORDER BY id ASC;'
//         };
//         const pickup_reservations = {
//             text:'SELECT * FROM schedules ORDER BY starttime ASC;'
//         };
//         connection.query(pickup_users)
//             .then(res=>{
//                 console.log('users:',res.rows);
//                 adminData.users = res.rows;
//                 connection.query(pickup_reservations)
//                     .then(res=>{
//                         console.log('reservations:',res.rows);
//                         adminData.reservations = res.rows;
//                         resolve('select_query 成功！！');
//                     })
//                     .catch(e=>console.log(e.stack));
//             })
//             .catch(e=>console.log(e.stack));
//     });
// }

// const todos = [];

// let nextId = 1;

// class Todo {
//     constructor({title,body}){
//         this.id = nextId++;
//         this.title = title;
//         this.body = body;
//         this.createdAt = new Date();
//         this.updatedAt = new Date();
//     }
// }

// for(let i=0;i<5;i++){
//     const index = i+1;
//     const todo = new Todo({
//         title:'タイトル'+index,
//         body:'ボディ'+index
//     });
//     todos.push(todo);
// }

module.exports = {
    findAll:()=>{
        return new Promise((resolve,reject)=>{
            console.log('findallの中、頭');
            const adminData = {
                users:null,
                reservations:null
            };
            const pickup_users = {
                text:'SELECT * FROM users ORDER BY id ASC;'
            };
            const pickup_reservations = {
                text:'SELECT * FROM schedules ORDER BY starttime ASC;'
            };
            connection.query(pickup_users)
                .then(res=>{
                    // console.log('users:',res.rows);
                    adminData.users = res.rows;
                    connection.query(pickup_reservations)
                        .then(res=>{
                            // console.log('reservations:',res.rows);
                            adminData.reservations = res.rows;
                            adminData.reservations.map(object=>{
                                object.starttime = parseInt(object.starttime);
                                object.endtime = parseInt(object.endtime);
                            });
                            console.log('findallの中、クエリ実行終了');
                            resolve(adminData.reservations.slice());
                            console.log('findallの中、resolve後');   
                        })
                        .catch(e=>console.log(e.stack));
                })
                .catch(e=>console.log(e.stack));        
        });
        // return adminData.reservations.slice();
    }
};