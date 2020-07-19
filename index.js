const express = require('express')
const app = express();
const path = require('path')
const line = require('@line/bot-sdk');
const PORT = process.env.PORT || 5000
const { Client } = require('pg');
// const router = require('./router/index');

const config = {
  channelAccessToken: process.env.ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};
const client = new line.Client(config);

const connection = new Client({
  user:process.env.PG_USER,
  host:process.env.PG_HOST,
  database:process.env.PG_DATABASE,
  password:process.env.PG_PASSWORD,
  port:5432
});
connection.connect();

const create_utable = {
  text:'CREATE TABLE IF NOT EXISTS users (id SERIAL NOT NULL, line_uid VARCHAR(255) NOT NULL, display_name VARCHAR(255) NOT NULL, timestamp VARCHAR(255) NOT NULL);'
};
connection.query(create_utable)
  .then(()=>{
    console.log('table users created successfully!!');
  })
  .catch(e=>console.error(e.stack));

const create_stable = {
  text:'CREATE TABLE IF NOT EXISTS schedules (id SERIAL NOT NULL, line_uid VARCHAR(255), name VARCHAR(100), scheduledate DATE, starttime BIGINT, endtime BIGINT, menu VARCHAR(50));'
}
connection.query(create_stable)
  .then(()=>{
    console.log('table schedules created successfully!!');
  })
  .catch(e=>console.error(e.stack));

const reservation_order = {
  menu:null,
  date:null,
  reservable:null,
  reserved:null
};

const adminData = {
  users:null,
  reservations:null
};

const MENU = ['cut','cut&shampoo','color'];
const TIMES_OF_MENU = [900,1200,1800];

app
  .use(express.static(path.join(__dirname, 'public')))
  // .use('/',router)
  .get('/',(req,res)=>{
    res.render('pages/index');
  })
  .get('/users',(req,res)=>{
    res.render('pages/users',{
      usersData:adminData.users
    });
  })
  .get('/reservations',(req,res)=>{
    res.render('pages/reservations',{
      reservationsData:adminData.reservations
    });
  })
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .post('/hook',line.middleware(config),(req,res)=> lineBot(req,res))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

const lineBot = (req,res) => {
  res.status(200).end();
  const events = req.body.events;
  const promises = [];
  for(let i=0;i<events.length;i++){
    const ev = events[i];

    switch(ev.type){
      case 'follow':
        promises.push(greeting_follow(ev));
        break;
      case 'message':
        promises.push(handleMessageEvent(ev));
        break;
      case 'postback':
        promises.push(handlePostbackEvent(ev));
        break;
    }
  }

  Promise
    .all(promises)
    .then(console.log('all promises passed @@@'))
    .catch(e=>console.error(e.stack));
}

const greeting_follow = async (ev) => {
  const pro = await client.getProfile(ev.source.userId);
  console.log('profile:',pro);
  const timeStamp = get_Date(ev.timestamp+32400000,0);

  const userCheck = checkUserExistence(ev);

  if(userCheck){
    console.log('すでに存在するユーザーです。');
    return;
  }else{
    const table_insert = {
      text:'INSERT INTO users (line_uid,display_name,timestamp) VALUES($1,$2,$3)',
      values:[ev.source.userId,pro.displayName,timeStamp]
    };
    connection.query(table_insert)
      .then(()=>{
        console.log('insert successfully!!@@')
      })
      .catch(e=>console.error(e.stack));
  
    return client.replyMessage(ev.replyToken,{
      "type":"text",
      "text":`${pro.displayName}さん、フォローありがとうございます！`
    });
  }
}

const get_Date = (timestamp,mode) => {
  const date = new Date(timestamp);
  console.log('date:',date);
  const y = date.getFullYear();
  const m = ("0" + (date.getMonth()+1)).slice(-2);
  const d = ("0" + date.getDate()).slice(-2);
  const h = ("0" + date.getHours()).slice(-2);
  const i = ("0" + date.getMinutes()).slice(-2);
  const s = ("0" + date.getSeconds()).slice(-2);
  console.log(`タイムスタンプ変換${timestamp}　→　${y}/${m}/${d} ${h}:${i}:${s}`);
  if(mode === 0){
    return `${y}/${m}/${d} ${h}:${i}:${s}`;
  }else if(mode === 1){
    return `${h}:${i}`;
  }else if(mode === 2){
    return `${m}/${d} ${h}:${i}`;
  }
  
}

const handleMessageEvent = async (ev) => {
  console.log('handleMessageEvent!!',ev);
  const id = ev.source.userId;
  const text = (ev.message.type === 'text') ? ev.message.text : '';

  if(text === '管理画面'){
    pickupAllReservation()
      .then(message=>{
        console.log('message:',message);
        console.log('adminData.users:',adminData.users);
        console.log('adminData.reservations:',adminData.reservations);
      })
      .catch(e=>console.log(e.stack));
  }

  // 「予約削除」のメッセージが送られて来た場合に、現在予約している日時をリプライし、
  // 予約削除の確認メッセージを出し、「はい」が選ばれた際に削除する。
  if(text === '予約キャンセル'){
    checkUserExistence(ev)
      .then(existence=>{
        if(existence){
          pickupReservedOrder(ev)
            .then(reservedArray=>{
              if(reservedArray.length){
                let reservedDate='';
                reservedArray.forEach(object=>{
                  reservation_order.reserved = object;
                  reservedDate += `${get_Date(parseInt(object.starttime),2)}`;
                });
                client.pushMessage(id,{
                  "type":"text",
                  "text":`次回予約日は${reservedDate}です。`
                });
                setTimeout(()=>{
                  client.pushMessage(id,{
                    "type": "template",
                    "altText": "予約キャンセル",
                    "template": {
                        "type": "confirm",
                        "text": "この予約をキャンセルしますか？",
                        "actions": [
                            {
                                "type": "postback",
                                "label": "はい",
                                "data": "delete-yes"
                            },
                            {
                                "type": "postback",
                                "label": "いいえ",
                                "data": "delete-no"
                            }
                        ]
                    }
                  });
                },1500);
              }else{
                client.pushMessage(id,{
                  "type":"text",
                  "text":`次回の予約は入っておりません。`
                });
              }
            })
            .catch(e=>console.log(e.stack));
        }else{
          client.pushMessage(id,{
            "type":"text",
            "text":"ユーザー登録のない方は予約操作できません。"
          });
        }
      })
      .catch(e=>console.log(e.stack));
  }


  //「予約確認」のメッセージが送られて来た場合に、現在予約している日時をリプライする
  // ただしそのユーザが登録されていることをチェックした上でとする
  if(text === '予約確認'){
    checkUserExistence(ev)
      .then(existence=>{
        console.log('existence:',existence);
        if(existence){
          pickupReservedOrder(ev)
            .then(reservedArray=>{
              if(reservedArray.length){
                let reservedDate='';
                reservedArray.forEach(object=>{
                  reservedDate += `${get_Date(parseInt(object.starttime),2)}`;
                });
                client.pushMessage(id,{
                  "type":"text",
                  "text":`次回予約日は${reservedDate}です。`
                });
              }else{
                client.pushMessage(id,{
                  "type":"text",
                  "text":`次回の予約は入っておりません。`
                });
              }
            })
            .catch(e=>console.log(e.stack));
        }else{
          client.pushMessage(id,{
            "type":"text",
            "text":"ユーザー登録のない方は予約できません。"
          });
        }
      })
      .catch(e=>console.log(e.stack));
    }

  if(text === '予約'){
    // 現時点より先に予約が入っていたら予約できないようにする。
    checkUserExistence(ev)
      .then(existence=>{
        console.log('existence:',existence);
        if(existence){
          pickupReservedOrder(ev)
            .then(reservedArray=>{
              if(reservedArray.length){
                client.pushMessage(id,{
                  "type":"text",
                  "text":"予約は２つ以上入れることはできません。"
                });
              }else{
                resetReservationOrder(id,0);
                client.pushMessage(id,{
                  "type":"flex",
                  "altText":"FlexMessage",
                  "contents":
                    {
                      "type": "bubble",
                      "header": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                          {
                            "type": "text",
                            "text": "メニューを選択してください。",
                            "contents": [],
                            "position": "relative",
                            "wrap": false,
                            "gravity": "center",
                            "decoration": "none",
                            "style": "normal",
                            "weight": "regular",
                            "size": "md"
                          }
                        ]
                      },
                      "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                          {
                            "type": "button",
                            "action": {
                              "type": "postback",
                              "label": "MENU A  ¥1500",
                              "data": "cut"
                            },
                            "style": "primary",
                            "position": "relative"
                          },
                          {
                            "type": "button",
                            "action": {
                              "type": "postback",
                              "label": "MENU B  ¥2000",
                              "data": "cutandshampoo"
                            },
                            "style": "primary",
                            "margin": "md",
                            "position": "relative"
                          },
                          {
                            "type": "button",
                            "action": {
                              "type": "postback",
                              "label": "MENU C  ¥4000",
                              "data": "color"
                            },
                            "position": "relative",
                            "margin": "md",
                            "style": "primary"
                          }
                        ]
                      },
                      "styles": {
                        "header": {
                          "separator": true,
                          "separatorColor": "#000000"
                        },
                        "footer": {
                          "separator": true
                        }
                      }
                    }
                  })
              }
            })
            .catch(e=>console.log(e.stack));

          
        }else{
          client.pushMessage(id,{
            "type":"text",
            "text":"ユーザー登録のない方は予約できません。"
          });
        }
      })
      .catch(e=>console.log(e.stack));
  }
}

const checkUserExistence = (ev) => {
  return new Promise((resolve,reject)=>{
    const id = ev.source.userId;
    let check = false;
    const user_check = {
      text:`SELECT * FROM users WHERE line_uid = $1;`,
      values:[`${id}`]
    }
    connection.query(user_check)
      .then(res=>{
        console.log('res:',res.rows);
        if(res.rows.length){
          console.log('存在するユーザーです。');
          check = true;
        }
        resolve(check);
      })
      .catch(e=>console.log(e.stack));
  });
}

const pickupAllReservation = () => {
  return new Promise((resolve,reject)=>{
    const pickup_users = {
      text:'SELECT * FROM users ORDER BY id ASC;'
    };
    const pickup_reservations = {
      text:'SELECT * FROM schedules ORDER BY starttime ASC;'
    };
    connection.query(pickup_users)
      .then(res=>{
        console.log('users:',res.rows);
        adminData.users = res.rows;
        connection.query(pickup_reservations)
          .then(res=>{
            console.log('reservations:',res.rows);
            adminData.reservations = res.rows;
            resolve('selectクエリー成功！！');
          })
          .catch(e=>console.log(e.stack));
      })
      .catch(e=>console.log(e.stack));
  });
}

const pickupReservedOrder = (ev) => {
  return new Promise((resolve,reject)=>{
    const id = ev.source.userId;
    const now = ev.timestamp+32400000;
    const pickup_query = {
      text:'SELECT * FROM schedules WHERE line_uid = $1 ORDER BY starttime ASC;',
      values:[`${id}`]
    };
    connection.query(pickup_query)
      .then(res=>{
        const reservedArray = res.rows.filter(object=>{
          return parseInt(object.starttime) >= now;
        });
        resolve(reservedArray);
      })
      .catch(e=>console.log(e.stack));
  });
}


const handlePostbackEvent = async (ev) => {
  const pro = await client.getProfile(ev.source.userId);
  const id = ev.source.userId;
  console.log('postback event:',ev);
  
  if(ev.postback.data === 'cut'){
    reservation_order.menu = 0;
      client.replyMessage(ev.replyToken,{
        "type":"text",
        "text":"ユーザーさん、次のご予約はMENU Aですね。ご希望の日にちを選択してください。"
        // "text":`${pro.displayName}さん、次のご予約はカットですね。ご希望の日にちを選択してください。`
      });
      setTimeout(()=>{
        pushDateSelector(id);
      },1000);
  }else if(ev.postback.data === 'cutandshampoo'){
    reservation_order.menu = 1;
      client.replyMessage(ev.replyToken,{
        "type":"text",
        "text":"ユーザーさん、次のご予約はMENU Bですね。ご希望の日にちを選択してください。"
        // "text":`${pro.displayName}さん、次のご予約はカット＆シャンプーですね。ご希望の日にちを選択してください。`
      });
      setTimeout(()=>{
        pushDateSelector(id);
      },1000);
  }else if(ev.postback.data === 'color'){
    reservation_order.menu = 2;
      client.replyMessage(ev.replyToken,{
        "type":"text",
        "text":"ユーザーさん、次のご予約はMENU Cですね。ご希望の日にちを選択してください。"
        // "text":`${pro.displayName}さん、次のご予約はカラーリングですね。ご希望の日にちを選択してください。`
      });
      setTimeout(()=>{
        pushDateSelector(id);
      },1000);
  }else if(ev.postback.data === 'cancel'){
    resetReservationOrder(id,1);
  }else if(ev.postback.data === 'date_select'){
    reservation_order.date = ev.postback.params.date;
    const now = new Date().getTime();
    const targetDate = new Date(reservation_order.date).getTime();
    console.log('now:',now);
    console.log('targetDate:',targetDate);
    if(targetDate>now){
      checkReservableTimes(id,TIMES_OF_MENU[reservation_order.menu]*1000);
    }else{
      client.pushMessage(id,{
        "type":"text",
        "text":"過去の日にちは指定できません。"
      });
    }
  }else if(ev.postback.data.slice(0,4) === 'time'){
    time = parseInt(ev.postback.data.slice(4));
    console.log('postback time proceeding! time:',time);
    confirmReservation(id,time,0);

  }else if(ev.postback.data.slice(0,6) === 'answer'){
    const result = ev.postback.data.split('-');
    console.log('result:',result);
    if(result[1] === 'yes'){
      const s_time = reservation_order.reservable[parseInt(result[2])][parseInt(result[3])];
      const e_time = s_time + TIMES_OF_MENU[reservation_order.menu]*1000;
      console.log('s_time:',get_Date(s_time,1));
      console.log('e_time:',get_Date(e_time,1));
      const insert_query = {
          text:'INSERT INTO schedules (line_uid, name, scheduledate, starttime, endtime, menu) VALUES($1,$2,$3,$4,$5,$6)',
          values:[id,pro.displayName,reservation_order.date,s_time,e_time,MENU[reservation_order.menu]]
        };
        connection.query(insert_query)
          .then(res=>{
            const reservedTime = get_Date(s_time,1);
            client.pushMessage(id,{
              "type":"text",
              "text":`${reservation_order.date}  ${reservedTime}に予約しました。`
            });
            resetReservationOrder(id,0);
            setTimeout(()=>{
              client.pushMessage(id,{
                "type":"text",
                "text":"ご予約ありがとうございます。ご来店を心よりお待ちしております。"
              });
            },500);
            setTimeout(()=>{
              client.pushMessage(id,{
                "type":"sticker",
                "packageId":"11539",
                "stickerId":"52114115"
              });
            },750);
          })
          .catch(e=>console.error(e.stack));
    }else{
      confirmReservation(id,parseInt(result[2]),parseInt(result[3])+1);
    }
  }else if(ev.postback.data.slice(0,6) === 'delete'){
    console.log('reservation_order.reserved:',reservation_order.reserved);
    const result = ev.postback.data.split('-');
    if(result[1] === 'yes'){
      const target = reservation_order.reserved.starttime;
      const delete_query = {
        text:'DELETE FROM schedules WHERE starttime = $1;',
        values:[`${target}`]
      };
      connection.query(delete_query)
        .then(res=>{
          console.log('delete res.rows:',res.rows);
          client.pushMessage(id,{
            "type":"text",
            "text":"予約キャンセルを受け付けました。"
          });
          setTimeout(()=>{
            client.pushMessage(id,{
              "type":"sticker",
              "packageId":"11538",
              "stickerId":"51626522"
            });
          },750);
        })
        .catch(e=>console.log(e.stack));
    }else{
      client.pushMessage(id,{
        "type":"text",
        "text":"キャンセルを取りやめした。"
      });
      resetReservationOrder(id,0);
    }
  }
}

const resetReservationOrder = (id,num) => {
  reservation_order.menu = null;
  reservation_order.date = null;
  reservation_order.reservable = null;
  reservation_order.reserved = null;
  if(num === 1){
    client.pushMessage(id,{
      "type":"text",
      "text":"キャンセルしました"
    });
  }
  console.log('reservation_order:',reservation_order);
}

const pushDateSelector = (id) => {
  client.pushMessage(id,{
    "type":"flex",
    "altText":"date_selector",
    "contents":
      {
        "type": "bubble",
        "header": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "来店希望日を選択してください。"
            }
          ]
        },
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "separator",
              "margin": "xs"
            },
            {
              "type": "button",
              "action": {
                "type": "datetimepicker",
                "label": "日にちの選択",
                "data": "date_select",
                "mode": "date"
              },
              "position": "relative",
              "style": "primary",
              "margin": "lg"
            },
            {
              "type": "button",
              "action": {
                "type": "postback",
                "label": "キャンセル",
                "data": "cancel"
              },
              "position": "relative",
              "margin": "lg",
              "style": "secondary"
            }
          ]
        }
      }
    }
  );
}

const checkReservableTimes = (id,treatTime) => {
  const oneHour = 3600000;
  const timeStamps = [];
  const arrangedArray = [];
  const reservableArray = [];
  for(let i=0;i<12;i++){
    let baseTime = new Date(`${reservation_order.date} ${9+i}:00`);
    timeStamps.push(baseTime.getTime());
  }
  console.log('timeStamps:',timeStamps);

  const select_query = {
    text:'SELECT * FROM schedules WHERE scheduledate = $1 ORDER BY starttime ASC;',
    values:[`${reservation_order.date}`]
  };
  connection.query(select_query)
    .then(res=>{
      if(res.rows.length){
        const reservedArray = res.rows.map(object=>{
          return [parseInt(object.starttime),parseInt(object.endtime)];
        });
        reservedArray.forEach(array=>{
          console.log('予約日時：',`${new Date(array[0])} - ${new Date(array[1])}`);
        });
        for(let i=0;i<11;i++){
          const filteredArray = reservedArray.filter(array=>{
            if((array[0]-timeStamps[i]-treatTime>=0 && array[0]-timeStamps[i]-treatTime<=oneHour) || 
                array[1]-timeStamps[i]>0 && array[1]-timeStamps[i]<oneHour){
              return true;
            }else{
              return false;
            }
          });
          arrangedArray.push(filteredArray);
        }
        console.log('arrangedArray:',arrangedArray);

        const offsetArray = arrangedArray.map((array,i)=>{
          return array.map(element=>{
            return element.map(value=>{
              console.log('value sub:',value - new Date(`${reservation_order.date} ${9+i}:00`).getTime());
              return value - new Date(`${reservation_order.date} ${9+i}:00`).getTime()
            });
          });
        });
        console.log('offsetArray:',offsetArray);

        for(let i=0;i<offsetArray.length;i++){
          reservableArray[i] = [];
          if(offsetArray[i].length){
            for(let j=0;j<offsetArray[i].length;j++){
              if(j===0 && offsetArray[i][j][0]>=treatTime){
                let x = offsetArray[i][j][0];
                let k = 0;
                while(x>=treatTime){
                  reservableArray[i].push(new Date(`${reservation_order.date} ${9+i}:00`).getTime()+k*treatTime);
                  x -= treatTime;
                  k++;
                }
              }else if(j===offsetArray[i].length-1){
                if(offsetArray[i][j][1]<oneHour){
                  let a = oneHour - offsetArray[i][j][1];
                  let b = 0;
                  while(a>=treatTime){
                    reservableArray[i].push(new Date(`${reservation_order.date} ${9+i}:00`).getTime()+offsetArray[i][j][1]+b*treatTime);
                    a -= treatTime;
                    b++;
                  }
                }
              }else{
                let y = offsetArray[i][j+1][0] - offsetArray[i][j][1];
                let l = 0;
                while(y>=treatTime){
                  reservableArray[i].push(new Date(`${reservation_order.date} ${9+i}:00`).getTime() + offsetArray[i][j][1] + l*treatTime);
                  y -= treatTime;
                  l++;
                }
              }
            }
          }else{
            let z = oneHour;
            let m = 0;
            while(z>=treatTime){
              reservableArray[i].push(new Date(`${reservation_order.date} ${9+i}:00`).getTime() + m*treatTime);
              z -= treatTime;
              m++;
            }
          }  
        }
      }else{
        for(let i=0;i<11;i++){
          reservableArray[i] = [];
          let c = 0;
          while(c<oneHour){
            reservableArray[i].push(new Date(`${reservation_order.date} ${9+i}:00`).getTime() + c);
            c+=treatTime;
          }
        }
      }
      reservation_order.reservable = reservableArray;
      console.log('reservation_order.reservable:',reservation_order.reservable);
      pushTimeSelector(id);
    })
    .catch(e=>console.error(e.stack));
}

const pushTimeSelector = (id) => {
  console.log('reservation_order.reservable:',reservation_order.reservable);
  const color = [];
  for(let i=0;i<reservation_order.reservable.length;i++){
    if(reservation_order.reservable[i].length){
      color.push('#00AA00');
    }else{
      color.push('#FF0000');
    }
  }
  console.log('colorArray:',color);

  client.pushMessage(id,{
    "type":"flex",
    "altText":"time_selector",
    "contents":
    {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": `${reservation_order.date}`,
            "weight": "bold",
            "size": "lg",
            "align": "center"
          }
        ]
      },
      "hero": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "ご希望の時間帯を選択してください。",
            "align": "center"
          }
        ]
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "9時〜",
                  "data": "time0"
                },
                "style": "primary",
                "color": `${color[0]}`,
                "margin": "md"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "10時〜",
                  "data": "time1"
                },
                "style": "primary",
                "color": `${color[1]}`,
                "margin": "md"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "11時〜",
                  "data": "time2"
                },
                "margin": "md",
                "style": "primary",
                "color": `${color[2]}`
              }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "12時〜",
                  "data": "time3"
                },
                "margin": "md",
                "style": "primary",
                "color": `${color[3]}`
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "13時〜",
                  "data": "time4"
                },
                "margin": "md",
                "style": "primary",
                "color": `${color[4]}`
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "14時〜",
                  "data": "time5"
                },
                "margin": "md",
                "style": "primary",
                "color": `${color[5]}`
              }
            ],
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "15時〜",
                  "data": "time6"
                },
                "margin": "md",
                "style": "primary",
                "color": `${color[6]}`
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "16時〜",
                  "data": "time7"
                },
                "margin": "md",
                "style": "primary",
                "color": `${color[7]}`
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "17時〜",
                  "data": "time8"
                },
                "margin": "md",
                "style": "primary",
                "color": `${color[8]}`
              }
            ],
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "18時〜",
                  "data": "time9"
                },
                "margin": "md",
                "style": "primary",
                "color": `${color[9]}`
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "19時〜",
                  "data": "time10"
                },
                "margin": "md",
                "style": "primary",
                "color": `${color[10]}`
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "終了",
                  "data": "cancel"
                },
                "margin": "md",
                "style": "secondary"
              }
            ],
            "margin": "md"
          }
        ]
      }
    }
  }
  );
}

const confirmReservation = (id,time,i) => {
  const reservableTimes = reservation_order.reservable[time];
  if(reservableTimes[i]){
    console.log('reservableTimes[i]:',reservableTimes[i]);
    const proposalTime = get_Date(reservableTimes[i],1);
    console.log('proposalTime:',proposalTime);

    client.pushMessage(id,{
      "type": "template",
      "altText":"予約確認",
      "template": {
          "type": "confirm",
          "text": `次回ご予約は ${proposalTime}〜 でいかがでしょうか。`,
          "actions": [
              {
                  "type": "postback",
                  "label": "はい",
                  "data": `answer-yes-${time}-${i}`
              },
              {
                  "type": "postback",
                  "label": "いいえ",
                  "data": `answer-no-${time}-${i}`
              }
          ]
      }
    });
  }else{
    client.pushMessage(id,{
      "type":"text",
      "text":"この時間帯には予約可能な時間はありません。別の時間帯を選択してください。"
    });
  }
}
