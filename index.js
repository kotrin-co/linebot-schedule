const express = require('express')
const app = express();
const path = require('path')
const line = require('@line/bot-sdk');
const fetch = require('node-fetch');
const PORT = process.env.PORT || 5000
const { Client } = require('pg');

const config = {
  channelAccessToken: '3xoDGJ8KgOVxVsyS4/XJwYqXOemYOX2b3mDioaOgnMv2jc2vkZcuGBnSzrehcK+sYXWEXgwraDP4DDvm6uiez8PChvb77gEAAtndU93wGwLN+LnsqVlLnQQN8ybt6wIquvnU/xFiobFIY5IOFLjclQdB04t89/1O/w1cDnyilFU=',
  channelSecret: '8df5f91ca99d59fdf5be9877edb547a6'
};
const client = new line.Client(config);

const connection = new Client({
  user:'mbxilcnkpaokbm',
  host:'ec2-34-224-229-81.compute-1.amazonaws.com',
  database:'d813abm4ls6no1',
  password:'dca0256369b1d647f910687e6505daec3fe664173240370730eefe5ebad1a36d',
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
  text:'CREATE TABLE IF NOT EXISTS schedules (id SERIAL NOT NULL, line_uid VARCHAR(255), name VARCHAR(100), scheduledate DATE, starttime TIME, endtime TIME, menu VARCHAR(50));'
}
connection.query(create_stable)
  .then(()=>{
    console.log('table schedules created successfully!!');
  })
  .catch(e=>console.error(e.stack));
// const drop_table = {
//   text:'DROP TABLE IF EXISTS quizzes;'
// }
// connection.query(drop_table)
//   .then(()=>{
//     console.log('table dropped successfully!');
//   })
//   .catch(e=>console.error(e.stack));

// const create_table = {
//   text:'CREATE TABLE IF NOT EXISTS quizzes (id SERIAL NOT NULL, question VARCHAR(255) NOT NULL, correct_answer VARCHAR(100) NOT NULL, incorrect_answer1 VARCHAR(100), incorrect_answer2 VARCHAR(100), incorrect_answer3 VARCHAR(100));'
// }
// connection.query(create_table)
//   .then(()=>{
//     console.log('table created successfully!');
//   })
//   .catch(e=>console.error(e.stack));

const reservation_order = {
  menu:null,
  date:null,
  time:null
};

const MENU = ['cut','cut&shampoo','color'];
const TIMES_OF_MENU = [900,1200,1800];

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .post('/hook',line.middleware(config),(req,res)=> lineBot(req,res))
  // {
  //   res.sendStatus(200);
  //   Promise
  //     .all(req.body.events.map(handleEvent))
  //     .then((result)=>{
  //       console.log('event proceed');
  //     });
  // })
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
  const timeArray = getDate(ev.timestamp+32400000);
  const timeStamp = `${timeArray[0]}/${timeArray[1]}/${timeArray[2]} ${timeArray[3]}:${timeArray[4]}:${timeArray[5]}`;

  const user_check = {
    text:`SELECT * FROM users WHERE line_uid='${ev.source.userId}';`
  }
  connection.query(user_check)
    .then(res=>{
      console.log('res:',res.rows[0]);
      if(res.rows[0]){
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
    })
    .catch(e=>console.error(e.stack));
}

const getDate = (timestamp) => {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = ("0" + (date.getMonth()+1)).slice(-2);
  const d = ("0" + date.getDate()).slice(-2);
  const h = ("0" + date.getHours()).slice(-2);
  const i = ("0" + date.getMinutes()).slice(-2);
  const s = ("0" + date.getSeconds()).slice(-2);
  console.log(`タイムスタンプ変換${timestamp}　→　${y}/${m}/${d} ${h}:${i}:${s}`);
  return [y,m,d,h,i,s];
  // return `${y}/${m}/${d} ${h}:${i}:${s}`;
}

const handleMessageEvent = async (ev) => {
  console.log('handleMessageEvent!!',ev);

  const text = (ev.message.type === 'text') ? ev.message.text : '';

  if(text === '予約'){
    resetReservationOrder(ev.source.userId,0);
    client.replyMessage(ev.replyToken,{
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
                  "label": "カット ¥1,500",
                  "data": "cut"
                },
                "style": "primary",
                "position": "relative"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "カット＆シャンプー　¥2,000",
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
                  "label": "カラー　¥3,000",
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
      }else{
        return client.replyMessage(ev.replyToken,{
          "type":"text",
          "text":"来店予約の方は”予約”をメッセージとして送ってね"
        });
      }
  }

const handlePostbackEvent = async (ev) => {
  const pro = await client.getProfile(ev.source.userId);
  const id = ev.source.userId;
  console.log('postback event:',ev);
  
  if(ev.postback.data === 'cut'){
    reservation_order.menu = 0;
      client.replyMessage(ev.replyToken,{
        "type":"text",
        "text":`${pro.displayName}さん、次のご予約はカットですね。`
      });
      pushDateSelector(id);
  }else if(ev.postback.data === 'cutandshampoo'){
    reservation_order.menu = 1;
      client.replyMessage(ev.replyToken,{
        "type":"text",
        "text":`${pro.displayName}さん、次のご予約はカット＆シャンプーですね。`
      });
      pushDateSelector(id);
  }else if(ev.postback.data === 'color'){
    reservation_order.menu = 2;
      client.replyMessage(ev.replyToken,{
        "type":"text",
        "text":`${pro.displayName}さん、次のご予約はカラーリングですね。`
      });
      pushDateSelector(id);
  }else if(ev.postback.data === 'cancel'){
    resetReservationOrder(id,1);
  }else if(ev.postback.data === 'date_select'){
    reservation_order.date = ev.postback.params.date;
    console.log('reservation_order:',reservation_order);
    pushTimeSelector(id);
  }else if(ev.postback.data === 'time_select'){
    reservation_order.time = ev.postback.params.time;
    judgeReservation(id,pro);
  }
}

const resetReservationOrder = (id,num) => {
  reservation_order.menu = null;
  reservation_order.date = null;
  reservation_order.time = null;
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

const pushTimeSelector = (id) => {
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
            "text": "希望する時間帯を選択してください。",
            "size": "md"
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
              "label": "時間の選択",
              "data": "time_select",
              "mode": "time",
              "max": "20:00",
              "min": "09:00"
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

const judgeReservation = (id,pro) => {
  const startTime = reservation_order.time;
  const date = new Date(`${reservation_order.date} ${reservation_order.time}`);
  const timestamp = date.getTime();
  const endTimeArray = getDate(timestamp+TIMES_OF_MENU[reservation_order.menu]*1000);
  const endTime = `${endTimeArray[3]}:${endTimeArray[4]}`;
  console.log(`startTime:`,startTime);
  console.log('endTime:',endTime);

  const select_query = {
    text:'SELECT * FROM schedules WHERE scheduledate = $1',
    values:[`${reservation_order.date}`]
  };
  const insert_query = {
    text:'INSERT INTO schedules (line_uid, name, scheduledate, starttime, endtime, menu) VALUES($1,$2,$3,$4,$5,$6)',
    values:[id,pro.displayName,reservation_order.date,startTime,endTime,MENU[reservation_order.menu]]
  }
  connection.query(select_query)
    .then(res=>{
      console.log('res.rows[0]:',res.rows[0]);
      if(!res.rows[0]){
        connection.query(insert_query)
          .then(res=>{
            console.log('res.rows[0]:',res.rows[0]);
          })
          .catch(e=>console.error(e.stack));
      }
    })
    .catch(e=>console.error(e.stack));
}
