const { Client } = require('pg');
const connection = new Client({
    user:process.env.PG_USER,
    host:process.env.PG_HOST,
    database:process.env.PG_DATABASE,
    password:process.env.PG_PASSWORD,
    port:5432
  });
connection.connect();

const TIMES_OF_MENU = [900000,1200000,1800000];

class Create {
    constructor({line_uid,name,year,date_m,date_d,starttime_h,starttime_m,menu}){
        this.line_uid = line_uid;
        this.name = name;
        this.year = year;
        this.date_m = date_m;
        this.date_d = date_d;
        this.starttime_h = starttime_h;
        this.starttime_m = starttime_m;
        this.menu = menu;
    }

    queryArray(){
        console.log('queryArray実行');
        const scheduledate = `${this.year}/${this.date_m}/${this.date_d}`;
        const starttime = new Date(`${scheduledate} ${this.starttime_h}:${this.starttime_m}`).getTime();
        let menuTime = 0;
        switch(this.menu){
            case 'cut':
                menuTime = TIMES_OF_MENU[0];
                break;
            case 'cut&shampoo':
                menuTime = TIMES_OF_MENU[1];
                break;
            case 'color':
                menuTime = TIMES_OF_MENU[2];
                break;
            default:
                menuTime = 0;
        }
        const endtime = starttime + menuTime;
        console.log('queryArray:',[this.line_uid,this.name,scheduledate,starttime,endtime,menuTime]);
        return [this.line_uid,this.name,scheduledate,starttime,endtime,this.menu];
    }
}

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
    },

    create:({line_uid,name,year,date_m,date_d,starttime_h,starttime_m,menu})=>{
        return new Promise((resolve,reject)=>{
            // if(!menu || !date || !starttime_h || !starttime_m){
            //     throw new Error('必須項目が未入力です。');
            // }
    
            const createReservation = new Create({
                line_uid:line_uid,
                name:name,
                year:year,
                date_m:date_m,
                date_d:date_d,
                starttime_h:starttime_h,
                starttime_m:starttime_m,
                menu:menu
            }).queryArray();

            console.log('createReservation:',createReservation);
            const insert_query = {
                text:'INSERT INTO schedules (line_uid, name, scheduledate, starttime, endtime, menu) VALUES($1,$2,$3,$4,$5,$6)',
                values:createReservation
              };
            connection.query(insert_query)
              .then(res=>{
                  console.log('res.rows:',res.rows);
                  resolve("insert成功！");
              })
              .catch(e=>console.log(e.stack));
            
        })
    },

    update:({parsedId,line_uid,name,year,date_m,date_d,starttime_h,starttime_m,menu})=>{
        return new Promise((resolve,reject)=>{
            console.log('parsedId:',parsedId);
            const createReservation = new Create({
                line_uid:line_uid,
                name:name,
                year:year,
                date_m:date_m,
                date_d:date_d,
                starttime_h:starttime_h,
                starttime_m:starttime_m,
                menu:menu
            }).queryArray();
            console.log('createReservation:',createReservation);

            const update_query = {
                text:`UPDATE schedules SET name=${createReservation[1]} WHERE id=${parsedId};`
                // text:`UPDATE schedules SET (line_uid, name, scheduledate, starttime, endtime, menu) = (${createReservation.line_uid}, ${createReservation.name}, ${createReservation.scheduledate}, ${createReservation.starttime}, ${createReservation.endtime}, ${createReservation.menu}) WHERE id=${id};`
            }

            console.log('query_text:',update_query);
            // const update_query = {
            //     text:`UPDATE schedules SET (line_uid, name, scheduledate, starttime, endtime, menu) = VALUES($1,$2,$3,$4,$5,$6) WHERE id = ${id};`,
            //     values:createReservation
            // };

            connection.query(update_query)
                .then(res=>{
                    console.log('更新成功');
                    resolve('更新成功！！！');
                })
                .catch(e=>console.log(e.stack));
            // const select_query = {
            //     text:'SELECT * FROM schedules WHERE id = $1;',
            //     values:[`${id}`]
            // };
            // connection.query(select_query)
            //     .then(res=>{
            //         const targetReservation = res.rows[0];
            //         console.log('targetReservation:',targetReservation);
            //         targetReservation.name = name;
            //         targetReservation.scheduledate = new Date()
            //     })
        });
    }
};