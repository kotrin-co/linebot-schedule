const { Client } = require('pg');
const connection = new Client({
    user:process.env.PG_USER,
    host:process.env.PG_HOST,
    database:process.env.PG_DATABASE,
    password:process.env.PG_PASSWORD,
    port:5432
  });
connection.connect();


module.exports = {
    findAll:()=>{
        return new Promise((resolve,reject)=>{
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
                    adminData.users = res.rows;
                    connection.query(pickup_reservations)
                        .then(res=>{
                            adminData.reservations = res.rows;
                            adminData.reservations.map(object=>{
                                object.starttime = parseInt(object.starttime);
                                object.endtime = parseInt(object.endtime);
                            });
                            resolve(adminData.reservations.slice()); 
                        })
                        .catch(e=>console.log(e.stack));
                })
                .catch(e=>console.log(e.stack));        
        });
    }
};