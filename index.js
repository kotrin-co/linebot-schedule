const express = require('express')
const app = express();
const path = require('path')
const line = require('@line/bot-sdk');
const PORT = process.env.PORT || 5000
const { Client } = require('pg');
const router = require('./routers/index');

const todosRouter = require('./routers/todos');


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
  text:'CREATE TABLE IF NOT EXISTS users (id SERIAL NOT NULL, line_uid VARCHAR(255), display_name VARCHAR(255), timestamp VARCHAR(255), cuttime SMALLINT, colortime SMALLINT);'
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

// このグローバル変数は廃止
const reservation_order = {
  menu:null,
  date:null,
  reservable:null,
  reserved:null,
  treatTime:null
};


const MENU = ['cut','cut&shampoo','color'];
// const TIMES_OF_MENU = [900,1200,1800];

app
  .use(express.static(path.join(__dirname, 'public')))
  .use('/',router)
  .post('/hook',line.middleware(config),(req,res)=> lineBot(req,res))
  .use(express.json())
  .use(express.urlencoded({extended:true}))
  .use('/api/todos',todosRouter)
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
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

  checkUserExistence(ev)
    .then(ex=>{
      if(ex){
        console.log('すでに存在するユーザーです。');
        return;
      }else{
        const table_insert = {
          text:'INSERT INTO users (line_uid,display_name,timestamp,cuttime,colortime) VALUES($1,$2,$3,$4,$5);',
          values:[ev.source.userId,pro.displayName,timeStamp,15,30]
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
    })
    .catch(e=>console.log(e.stack)); 
}

const get_Date = (timestamp,mode) => {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = ("0" + (date.getMonth()+1)).slice(-2);
  const d = ("0" + date.getDate()).slice(-2);
  const h = ("0" + date.getHours()).slice(-2);
  const i = ("0" + date.getMinutes()).slice(-2);
  const s = ("0" + date.getSeconds()).slice(-2);
  if(mode === 0){
    return `${y}/${m}/${d} ${h}:${i}:${s}`;
  }else if(mode === 1){
    return `${h}:${i}`;
  }else if(mode === 2){
    return `${m}/${d} ${h}:${i}`;
  }
}

const handleMessageEvent = (ev) => {
  console.log('handleMessageEvent!!',ev);
  const id = ev.source.userId;
  const rp = ev.replyToken;
  const text = (ev.message.type === 'text') ? ev.message.text : '';

  // 管理画面へは、決められたユーザーしか入れないようにする
  if(text === '管理画面'){
    client.replyMessage(rp,{
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
                "text": "管理者画面へ移動しますか?",
                "color": "#ffffff"
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
                  "type": "uri",
                  "label": "管理者画面へ",
                  "uri": "https://linebot-schedule.herokuapp.com/"
                },
                "style": "link"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "終了",
                  "data": "cancel"
                },
                "margin": "lg"
              }
            ]
          },
          "styles": {
            "header": {
              "backgroundColor": "#0000ff",
              "separator": true,
              "separatorColor": "#ffffff"
            }
          }
        }
    });
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
                client.replyMessage(rp,{
                  "type":"flex",
                  "altText":"FlexMessage",
                  "contents":
                  {
                    "type": "bubble",
                    "body": {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        {
                          "type": "text",
                          "text": `次回予約日は${reservedDate}です。この予約をキャンセルしますか？`,
                          "wrap": true
                        }
                      ]
                    },
                    "footer": {
                      "type": "box",
                      "layout": "horizontal",
                      "contents": [
                        {
                          "type": "button",
                          "action": {
                            "type": "postback",
                            "label": "はい",
                            "data": "delete-yes"
                          }
                        },
                        {
                          "type": "button",
                          "action": {
                            "type": "postback",
                            "label": "いいえ",
                            "data": "delete-no"
                          }
                        }
                      ]
                    }
                  }
                });
              }else{
                client.replyMessage(rp,{
                  "type":"text",
                  "text":`次回の予約は入っておりません。`
                });
              }
            })
            .catch(e=>console.log(e.stack));
        }else{
          client.replyMessage(rp,{
            "type":"text",
            "text":"ユーザー登録のない方は予約操作できません。",
            "wrap": true
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
                client.replyMessage(rp,{
                  "type":"text",
                  "text":`次回予約日は${reservedDate}です。`
                });
              }else{
                client.replyMessage(rp,{
                  "type":"text",
                  "text":`次回の予約は入っておりません。`
                });
              }
            })
            .catch(e=>console.log(e.stack));
        }else{
          client.replyMessage(rp,{
            "type":"text",
            "text":"ユーザー登録のない方は予約できません。",
            "wrap": true
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
                client.replyMessage(rp,{
                  "type":"text",
                  "text":"予約は２つ以上入れることはできません。",
                  "wrap": true
                });
              }else{
                resetReservationOrder(rp,0);
                client.replyMessage(rp,{
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
                              "label": "カット",
                              "data": "cut"
                            },
                            "style": "primary",
                            "position": "relative"
                          },
                          {
                            "type": "button",
                            "action": {
                              "type": "postback",
                              "label": "カット＆シャンプー",
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
                              "label": "カラーリング",
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
          client.replyMessage(rp,{
            "type":"text",
            "text":"ユーザー登録のない方は予約できません。",
            "wrap": true
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
        // console.log('res:',res.rows);
        if(res.rows.length){
          console.log('res.rows:',res.rows);
          console.log('存在するユーザーです。');
          check = true;
        }
        resolve(check);
      })
      .catch(e=>console.log(e.stack));
  });
}

const pickupReservedOrder = (ev) => {
  return new Promise((resolve,reject)=>{
    const id = ev.source.userId;

    // +32400000いらないかも starttimeから-32400000だから一緒か
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
  const rp = ev.replyToken;
  console.log('postback event:',ev);
  
  if(ev.postback.data === 'cut'){
    reservation_order.menu = 0;
      client.replyMessage(rp,{
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
                  // "text": "ユーザーさん、次のご予約はMENU Aですね。ご希望の日にちを選択してください。",
                  "wrap": true,
                  "text":`${pro.displayName}さん、次のご予約はカットですね。ご希望の日にちを選択してください。`
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
        });
  }else if(ev.postback.data === 'cutandshampoo'){
    reservation_order.menu = 1;
      client.replyMessage(rp,{
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
                  // "text": "ユーザーさん、次のご予約はMENU Bですね。ご希望の日にちを選択してください。",
                  "wrap": true,
                  "text":`${pro.displayName}さん、次のご予約はカット&シャンプーですね。ご希望の日にちを選択してください。`
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
        });
  }else if(ev.postback.data === 'color'){
    reservation_order.menu = 2;
      client.replyMessage(rp,{
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
                  // "text": "ユーザーさん、次のご予約はMENU Cですね。ご希望の日にちを選択してください。",
                  "wrap": true,
                  "text":`${pro.displayName}さん、次のご予約はカラーリングですね。ご希望の日にちを選択してください。`
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
        });
  }else if(ev.postback.data === 'cancel'){
    resetReservationOrder(rp,1);
  }else if(ev.postback.data === 'date_select'){
    reservation_order.date = ev.postback.params.date;
    // 施術時間を計算する
    calcTreatmentTime(id)
      .then(message=>{
        console.log('message:',message);
        console.log('reservation_order.date:',reservation_order.date);
        const now = new Date().getTime();
        const targetDate = new Date(reservation_order.date).getTime();
        console.log('now:',now);
        console.log('targetDate:',targetDate);
        // ここはもうちょっと厳密に比較する必要があり
        if(targetDate>now || (targetDate<now && (targetDate+9*60*60*1000)>now)){
          checkReservableTimes(ev)
            .then(message=>{
              console.log('message:',message);
            })
            .catch(e=>console.log(e.stack));
        }else{
          client.replyMessage(rp,{
            "type":"text",
            "text":"過去の日にちは指定できません。"
          });
        }
      })
      .catch(e=>console.log(e.stack));
    
  }else if(ev.postback.data.slice(0,4) === 'time'){
    time = parseInt(ev.postback.data.slice(4));
    console.log('postback time proceeding! time:',time);
    confirmReservation(ev,time,0);

  }else if(ev.postback.data.slice(0,6) === 'answer'){
    const result = ev.postback.data.split('-');
    console.log('result:',result);
    if(result[1] === 'yes'){
      const s_time = reservation_order.reservable[parseInt(result[2])][parseInt(result[3])];
      const e_time = s_time + reservation_order.treatTime[reservation_order.menu];
      console.log('s_time:',get_Date(s_time,1));
      console.log('e_time:',get_Date(e_time,1));
      const insert_query = {
          text:'INSERT INTO schedules (line_uid, name, scheduledate, starttime, endtime, menu) VALUES($1,$2,$3,$4,$5,$6)',
          values:[id,pro.displayName,reservation_order.date,s_time,e_time,MENU[reservation_order.menu]]
        };
        connection.query(insert_query)
          .then(res=>{
            const reservedTime = get_Date(s_time,1);
            client.replyMessage(rp,[{
              "type":"text",
              "text":`${reservation_order.date}  ${reservedTime}に予約しました。ご来店を心よりお待ちしております。`,
              "wrap": true
            },
            {
              "type":"sticker",
              "packageId":"11539",
              "stickerId":"52114115"
            }]);
            resetReservationOrder(rp,0);
          })
          .catch(e=>console.error(e.stack));
    }else{
      confirmReservation(ev,parseInt(result[2]),parseInt(result[3])+1);
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
          client.replyMessage(rp,{
            "type":"text",
            "text":"予約キャンセルを受け付けました。またのご予約をお待ちしております。",
            "wrap": true
          });
        })
        .catch(e=>console.log(e.stack));
    }else{
      client.replyMessage(rp,{
        "type":"text",
        "text":"キャンセルを取りやめした。"
      });
      resetReservationOrder(rp,0);
    }
  }
}

const calcTreatmentTime = (id) => {
  return new Promise((resolve,reject)=>{
    const select_query = {
      text:'SELECT * FROM users WHERE line_uid = $1;',
      values:[`${id}`]
    };
    connection.query(select_query)
      .then(res=>{
        if(res.rows.length){
          const cuttime = res.rows[0].cuttime*60*1000;
          const cstime = cuttime+10*60*1000;
          const colortime = res.rows[0].colortime*60*1000;
          console.log('treattime:',cuttime,colortime);
          reservation_order.treatTime = [cuttime,cstime,colortime];
        }else{
          console.log('一致するLINE IDを持つユーザーが見つかりません。');
          return;
        }
        resolve('calcTreatmentTime successfully completed!');
      })
      .catch(e=>console.log(e.stack));
  });
}

const resetReservationOrder = (rp,num) => {
  reservation_order.menu = null;
  reservation_order.date = null;
  reservation_order.reservable = null;
  reservation_order.reserved = null;
  reservation_order.treatTime = null;
  if(num === 1){
    client.replyMessage(rp,{
      "type":"text",
      "text":"終了します。"
    });
  }
}

const checkReservableTimes = (ev) => {
  return new Promise((resolve,reject)=>{
    const oneHour = 3600000;
    const timeStamps = [];
    const arrangedArray = [];
    const reservableArray = [];
    console.log('@@@',reservation_order.treatTime);
    const treatTime = reservation_order.treatTime[reservation_order.menu];
    console.log('treatTime:',treatTime);
    for(let i=0;i<12;i++){
      let baseTime = new Date(`${reservation_order.date} ${9+i}:00`);
      timeStamps.push(baseTime.getTime());
    }
    
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

          console.log('reservedArray:',reservedArray);

          for(let i=0;i<11;i++){
            const filteredArray = reservedArray.filter(array=>{
              // array[0]-timeStamps[i]-treatTimeとなっていたが、-treatTimeは削除（treatでかいと逃してしまう）
              if((array[0]-timeStamps[i]>=0 && array[0]-timeStamps[i]-treatTime<oneHour) || 
                  array[1]-timeStamps[i]>0 && array[1]-timeStamps[i]<oneHour){
                return true;
              }else{
                return false;
              }
            });
            console.log('filteredArray:',i,filteredArray);
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
                    let a = 0;
                    if(offsetArray[i+1].length){
                      a = oneHour - offsetArray[i][j][1];
                    }else{
                      a = oneHour + treatTime - offsetArray[i][j][1];
                    }
                    let b = 0;
                    while(a>=treatTime){
                      console.log('i a b',i,a,b);
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
        pushTimeSelector(ev);
        resolve('checkReservableTimes終了');
    })
    .catch(e=>console.error(e.stack));
  });  
}

// const checkReservableTimes = (ev) => {
//   const oneHour = 3600000;
//   const timeStamps = [];
//   const arrangedArray = [];
//   const reservableArray = [];
//   console.log('@@@',reservation_order.treatTime);
//   const treatTime = reservation_order.treatTime[reservation_order.menu];
//   console.log('treatTime:',treatTime);
//   for(let i=0;i<12;i++){
//     let baseTime = new Date(`${reservation_order.date} ${9+i}:00`);
//     timeStamps.push(baseTime.getTime());
//   }
//   const select_query = {
//     text:'SELECT * FROM schedules WHERE scheduledate = $1 ORDER BY starttime ASC;',
//     values:[`${reservation_order.date}`]
//   };
//   connection.query(select_query)
//     .then(res=>{
//       if(res.rows.length){
//         const reservedArray = res.rows.map(object=>{
//           return [parseInt(object.starttime),parseInt(object.endtime)];
//         });

//         for(let i=0;i<11;i++){
//           const filteredArray = reservedArray.filter(array=>{
//             if((array[0]-timeStamps[i]-treatTime>=0 && array[0]-timeStamps[i]-treatTime<oneHour) || 
//                 array[1]-timeStamps[i]>0 && array[1]-timeStamps[i]<oneHour){
//               return true;
//             }else{
//               return false;
//             }
//           });
//           arrangedArray.push(filteredArray);
//         }

//         const offsetArray = arrangedArray.map((array,i)=>{
//           return array.map(element=>{
//             return element.map(value=>{
//               // console.log('value sub:',value - new Date(`${reservation_order.date} ${9+i}:00`).getTime());
//               return value - new Date(`${reservation_order.date} ${9+i}:00`).getTime()
//             });
//           });
//         });
//         console.log('offsetArray:',offsetArray);

//         for(let i=0;i<offsetArray.length;i++){
//           reservableArray[i] = [];
//           if(offsetArray[i].length){
//             for(let j=0;j<offsetArray[i].length;j++){
//               if(j===0 && offsetArray[i][j][0]>=treatTime){
//                 let x = offsetArray[i][j][0];
//                 let k = 0;
//                 while(x>=treatTime){
//                   reservableArray[i].push(new Date(`${reservation_order.date} ${9+i}:00`).getTime()+k*treatTime);
//                   x -= treatTime;
//                   k++;
//                 }
//               }else if(j===offsetArray[i].length-1){
//                 if(offsetArray[i][j][1]<oneHour){
//                   let a = oneHour - offsetArray[i][j][1];
//                   let b = 0;
//                   while(a>=treatTime){
//                     reservableArray[i].push(new Date(`${reservation_order.date} ${9+i}:00`).getTime()+offsetArray[i][j][1]+b*treatTime);
//                     a -= treatTime;
//                     b++;
//                   }
//                 }
//               }else{
//                 let y = offsetArray[i][j+1][0] - offsetArray[i][j][1];
//                 let l = 0;
//                 while(y>=treatTime){
//                   reservableArray[i].push(new Date(`${reservation_order.date} ${9+i}:00`).getTime() + offsetArray[i][j][1] + l*treatTime);
//                   y -= treatTime;
//                   l++;
//                 }
//               }
//             }
//           }else{
//             let z = oneHour;
//             let m = 0;
//             while(z>=treatTime){
//               reservableArray[i].push(new Date(`${reservation_order.date} ${9+i}:00`).getTime() + m*treatTime);
//               z -= treatTime;
//               m++;
//             }
//           }  
//         }
//       }else{
//         for(let i=0;i<11;i++){
//           reservableArray[i] = [];
//           let c = 0;
//           while(c<oneHour){
//             reservableArray[i].push(new Date(`${reservation_order.date} ${9+i}:00`).getTime() + c);
//             c+=treatTime;
//           }
//         }
//       }
//       reservation_order.reservable = reservableArray;
//       console.log('reservation_order.reservable:',reservation_order.reservable);
//       pushTimeSelector(ev);
//     })
//     .catch(e=>console.error(e.stack));
// }

const pushTimeSelector = (ev) => {
  const rp = ev.replyToken;
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

  client.replyMessage(rp,{
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
                  "label": "9時-",
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
                  "label": "10時-",
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
                  "label": "11時-",
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
                  "label": "12時-",
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
                  "label": "13時-",
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
                  "label": "14時-",
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
                  "label": "15時-",
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
                  "label": "16時-",
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
                  "label": "17時-",
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
                  "label": "18時-",
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
                  "label": "19時-",
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



const confirmReservation = (ev,time,i) => {
  const rp = ev.replyToken;
  const reservableTimes = reservation_order.reservable[time];
  if(reservableTimes[i]){
    console.log('reservableTimes[i]:',reservableTimes[i]);
    const proposalTime = get_Date(reservableTimes[i],1);
    console.log('proposalTime:',proposalTime);

    client.replyMessage(rp,
      {
        "type":"flex",
        "altText":"FlexMessage",
        "contents":
        {
          "type": "bubble",
          "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "text",
                "text": `次回ご予約は ${proposalTime}〜 でいかがでしょうか。`,
                "wrap": true
              }
            ]
          },
          "footer": {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "はい",
                  "data": `answer-yes-${time}-${i}`
                }
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "いいえ",
                  "data": `answer-no-${time}-${i}`
                }
              }
            ]
          }
        }
      }
    );
  }else{
    client.replyMessage(rp,{
      "type":"text",
      "text":"この時間帯には予約可能な時間はありません。別の時間帯を選択してください。",
      "wrap": true
    });
  }
}
