const { Client } = require('pg');
const connection = new Client({
    user:process.env.PG_USER,
    host:process.env.PG_HOST,
    database:process.env.PG_DATABASE,
    password:process.env.PG_PASSWORD,
    port:5432
  });
connection.connect();

class Create {
    constructor({line_uid,name,year,date_m,date_d,starttime_h,starttime_m,endtime_h,endtime_m,menu}){
        this.line_uid = line_uid;
        this.name = name;
        this.year = year;
        this.date_m = date_m;
        this.date_d = date_d;
        this.starttime_h = starttime_h;
        this.starttime_m = starttime_m;
        this.endtime_h = endtime_h;
        this.endtime_m = endtime_m;
        this.menu = menu;
    }

    queryArray(){
        console.log('queryArray実行');
        const scheduledate = `${this.year}/${this.date_m}/${this.date_d}`;
        const starttime = new Date(`${scheduledate} ${this.starttime_h}:${this.starttime_m}`).getTime();
        const endtime = new Date(`${scheduledate} ${this.endtime_h}:${this.endtime_m}`).getTime();
        return [this.line_uid,this.name,scheduledate,starttime,endtime,this.menu];
    }
}

class User {
    constructor({name,cuttime,colortime}){
        this.name = name;
        this.cuttime = cuttime;
        this.colortime = colortime;
    }

    queryArray(){
        console.log('queryArray実行');
        return [this.name,this.cuttime,this.colortime];
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
                            console.log('adminData:',adminData);
                            resolve(Object.assign({},adminData)); 
                        })
                        .catch(e=>console.log(e.stack));
                })
                .catch(e=>console.log(e.stack));        
        });
    },

    create:({line_uid,name,year,date_m,date_d,starttime_h,starttime_m,endtime_h,endtime_m,menu})=>{
        return new Promise((resolve,reject)=>{

            const createReservation = new Create({
                line_uid:line_uid,
                name:name,
                year:year,
                date_m:date_m,
                date_d:date_d,
                starttime_h:starttime_h,
                starttime_m:starttime_m,
                endtime_h:endtime_h,
                endtime_m:endtime_m,
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

    update:({parsedId,line_uid,name,year,date_m,date_d,starttime_h,starttime_m,endtime_h,endtime_m,menu})=>{
        return new Promise((resolve,reject)=>{
            console.log('line_uid:',line_uid);
            const createReservation = new Create({
                line_uid:line_uid,
                name:name,
                year:year,
                date_m:date_m,
                date_d:date_d,
                starttime_h:starttime_h,
                starttime_m:starttime_m,
                endtime_h:endtime_h,
                endtime_m:endtime_m,
                menu:menu
            }).queryArray();
            console.log('createReservation:',createReservation);

            const update_query = {
                // text:`UPDATE schedules SET name='${createReservation[1]}' WHERE id=${parsedId};`
                text:`UPDATE schedules SET (line_uid, name, scheduledate, starttime, endtime, menu) = ('${createReservation[0]}','${createReservation[1]}','${createReservation[2]}',${createReservation[3]},${createReservation[4]},'${createReservation[5]}') WHERE id=${parsedId};`
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
    },

    remove:({parsedId})=>{
        return new Promise((resolve,reject)=>{
            console.log('parsedId:',parsedId);

            const remove_query = {
                text:`DELETE FROM schedules WHERE id=${parsedId};`
            };

            connection.query(remove_query)
                .then(res=>{
                    console.log('削除成功');
                    resolve('削除成功！！！');
                })
                .catch(e=>console.log(e.stack));
        });
    },

    updateUser:({parsedId,name,cuttime,colortime})=>{
        return new Promise((resolve,reject)=>{
            const newUser = new User({
                name:name,
                cuttime,cuttime,
                colortime:colortime
            }).queryArray();
            console.log('newUser:',newUser);

            const update_query = {
                text:`UPDATE users SET (display_name,cuttime,colortime) = ('${name}',${cuttime},${colortime}) WHERE id=${parsedId};`
            }
            connection.query(update_query)
                .then(res=>{
                    console.log('ユーザーテーブル更新成功！');
                    resolve('ユーザーテーブル更新成功！!!');
                })
                .catch(e=>console.log(e.stack));
        });
    },

    removeUser:({parsedId})=>{
        return new Promise((resolve,reject)=>{
            const remove_query = {
                text:`DELETE FROM users WHERE id=${parsedId};`
            }
            connection.query(remove_query)
                .then(res=>{
                    console.log('ユーザー削除成功!');
                    resolve('ユーザー削除成功!!!');
                })
                .catch(e=>console.log(e.stack));
        });
    }
};