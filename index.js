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
  text:'CREATE TABLE IF NOT EXISTS schedules (id SERIAL NOT NULL, line_uid VARCHAR(255), name VARCHAR(100), scheduledate DATE, starttime BIGINT, endtime BIGINT, menu VARCHAR(50));'
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
  const timeStamp = get_Date(ev.timestamp+32400000,0);

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
  // return [y,m,d,h,i,s];
  if(mode === 0){
    return `${y}/${m}/${d} ${h}:${i}:${s}`;
  }else if(mode === 1){
    return `${h}:${i}`;
  }
  
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
        "text":`${pro.displayName}さん、次のご予約はカットですね。ご希望の日にちを選択してください。`
      });
      setTimeout(()=>{
        pushDateSelector(id);
      },1000);
  }else if(ev.postback.data === 'cutandshampoo'){
    reservation_order.menu = 1;
      client.replyMessage(ev.replyToken,{
        "type":"text",
        "text":`${pro.displayName}さん、次のご予約はカット＆シャンプーですね。ご希望の日にちを選択してください。`
      });
      setTimeout(()=>{
        pushDateSelector(id);
      },1000);
  }else if(ev.postback.data === 'color'){
    reservation_order.menu = 2;
      client.replyMessage(ev.replyToken,{
        "type":"text",
        "text":`${pro.displayName}さん、次のご予約はカラーリングですね。ご希望の日にちを選択してください。`
      });
      setTimeout(()=>{
        pushDateSelector(id);
      },1000);
  }else if(ev.postback.data === 'cancel'){
    resetReservationOrder(id,1);
  }else if(ev.postback.data === 'date_select'){
    reservation_order.date = ev.postback.params.date;
    console.log('reservation_order:',reservation_order);
    checkReservableTimes(TIMES_OF_MENU[reservation_order.menu]*1000);
    pushTimeSelector(id);
  }else if(ev.postback.data.slice(0,4) === 'time'){
    time = ev.postback.data.slice(4,6);
    console.log('postback time proceeding! time:',time);
    judgeReservation(id,pro,time);
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

const checkReservableTimes = (treatTime) => {
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
        for(let i=0;i<12;i++){
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

        // const reservableArray = [];

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
        console.log('reservableArray:',reservableArray);
        reservableArray.forEach(array=>{
          array.forEach(value=>{
            console.log('予約可能日時：',new Date(value));
          });
        });
      }else{
        for(let i=0;i<11;i++){
          reservableArray[i] = [];
          let c = 0;
          while(c<oneHour){
            reservableArray[i].push(new Date(`${reservation_order.date} ${9+i}:00`).getTime() + c);
            c+=treatTime;
          }
        }
        reservableArray.forEach(array=>{
          array.forEach(value=>{
            console.log('予約可能日時：',new Date(value));
          });
        });
      }
    })
    .catch(e=>console.error(e.stack));
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
                  "data": "time09"
                },
                "style": "primary",
                "margin": "md"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "10時〜",
                  "data": "time10"
                },
                "style": "primary",
                "margin": "md"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "11時〜",
                  "data": "time11"
                },
                "margin": "md",
                "style": "primary"
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
                  "data": "time12"
                },
                "margin": "md",
                "style": "primary"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "13時〜",
                  "data": "time13"
                },
                "margin": "md",
                "style": "primary"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "14時〜",
                  "data": "time14"
                },
                "margin": "md",
                "style": "primary"
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
                  "data": "time15"
                },
                "margin": "md",
                "style": "primary"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "16時〜",
                  "data": "time16"
                },
                "margin": "md",
                "style": "primary"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "17時〜",
                  "data": "time17"
                },
                "margin": "md",
                "style": "primary"
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
                  "data": "time18"
                },
                "margin": "md",
                "style": "primary"
              },
              {
                "type": "button",
                "action": {
                  "type": "postback",
                  "label": "19時〜",
                  "data": "time19"
                },
                "margin": "md",
                "style": "primary"
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

const judgeReservation = (id,pro,time) => {
  const iTime = parseInt(time);
  const startTime = new Date(`${reservation_order.date} ${iTime}:00`);
  const startPoint = startTime.getTime();
  const endTime = new Date(`${reservation_order.date} ${iTime+1}:00`);
  const endPoint = endTime.getTime();
  const nextTime = new Date(`${reservation_order.date} ${iTime+1}:00`);
  const nextPoint = nextTime.getTime();
  const nearestPoint = 0;
  const treatmentTime = TIMES_OF_MENU[reservation_order.menu]*1000;
  console.log('startPoint:',startPoint);
  console.log('endPoint:',endPoint);
  
  // iTimeより１つ次の時間帯の最初のstarttimeを抜き出す処理
  const select_query1 = {
    text:'SELECT starttime from schedules WHERE scheduledate = $1 ORDER BY starttime ASC;',
    values:[`${reservation_order.date}`]
  };
  connection.query(select_query1)
  　.then(res=>{
      if(res.rows.length){
        console.log('res.rows starttime:',res.rows);
        const sTimeArray = res.rows.map(param=>parseInt(param.starttime));
        console.log('sTimeArray:',sTimeArray);
        const dFromNextPoint = sTimeArray.filter(param=>(param-nextPoint)>0);
        console.log('dFromNextPoint:',dFromNextPoint);
        nearestPoint = dFromNextPoint[0];
        console.log('nearestPoint:',nearestPoint);
      }
    })
    .catch(e=>console.log(e.stack));

  const select_query2 = {
    text:'SELECT * FROM schedules WHERE scheduledate = $1 ORDER BY starttime ASC;',
    values:[`${reservation_order.date}`]
  };
  connection.query(select_query2)
    .then(res=>{
      if(res.rows.length){
        console.log('res.rows:',res.rows);
        const reserved_sTimes = [];
        const reserved_eTimes = [];
        const proposalTimes = [];
        res.rows.forEach(param=>{
          const sTime = parseInt(param.starttime);
          const eTime = parseInt(param.endtime);
          if(sTime<startPoint && eTime>startPoint){
            reserved_sTimes.push(0);
            reserved_eTimes.push(eTime);
          }else if(sTime>=startPoint && sTime<=endPoint){
            reserved_sTimes.push(sTime);
            if(eTime>=startPoint && eTime<=endPoint){
              reserved_eTimes.push(eTime);
            }else{
              reserved_eTimes.push(0);
            }
          }
        });
        console.log('reservedTimes',reserved_sTimes,reserved_eTimes);

        if(reserved_sTimes.length && reserved_eTimes.length){
          if(reserved_sTimes[0] === 0 && reserved_eTimes[reserved_eTimes.length-1] === 0){
            for(let i=0;i<reserved_sTimes.length-1;i++){
              if(reserved_sTimes[i+1]-reserved_eTimes[i]>=treatmentTime){
                proposalTimes.push(reserved_eTimes[i]);
              }
            }
          }else if(reserved_sTimes[0] === 0 && reserved_eTimes[reserved_eTimes.length-1] !== 0){
            for(let i=0;i<reserved_sTimes.length-1;i++){  
              if(reserved_sTimes[i+1]-reserved_eTimes[i]>=treatmentTime){
                proposalTimes.push(reserved_eTimes[i]);
              }
            }
            if(nearestPoint !== 0){
              if(nearestPoint - reserved_eTimes[reserved_eTimes.length-1]>=treatmentTime){
                proposalTimes.push(reserved_eTimes[reserved_eTimes.length-1]);
              }
            }else{
              proposalTimes.push(reserved_eTimes[reserved_eTimes.length-1]);
            }
          }else if(reserved_sTimes[0] !== 0 && reserved_eTimes[reserved_eTimes.length-1] === 0){
            if(reserved_sTimes[0] - startPoint>=treatmentTime){
              proposalTimes.push(startPoint);
            }
            for(let i=1;i<reserved_sTimes.length;i++){
              if(reserved_sTimes[i] - reserved_eTimes[i-1]>=treatmentTime){
                proposalTimes.push(reserved_eTimes[i-1]);
              }
            }
          }else{
            console.log('ここが実行');
            console.log('endpoint:',endPoint);
            console.log('treatmentTime:',treatmentTime);
            console.log('eTimes:',reserved_eTimes);
            console.log('sub:',endPoint - reserved_eTimes[reserved_eTimes.length-1]);
            if(reserved_sTimes[0] - startPoint>=treatmentTime){
              proposalTimes.push(startPoint);
            }
            for(let i=1;i<reserved_sTimes.length;i++){
              if(reserved_sTimes[i] - reserved_eTimes[i-1]>=treatmentTime){
                console.log(reserved_sTimes[i] - reserved_eTimes[i-1]>=treatmentTime)
                proposalTimes.push(reserved_eTimes[i-1]);
              }
            }
            if(nearestPoint !==0){
              if(nearestPoint - reserved_eTimes[reserved_eTimes.length-1]>=treatmentTime){
                proposalTimes.push(reserved_eTimes[reserved_eTimes.length-1]);
              }
            }else{
              proposalTimes.push(reserved_eTimes[reserved_eTimes.length-1]);
            }  
          }
        }else{
          let i = 0;
          while(startPoint+treatmentTime*i<endPoint){
            proposalTimes.push(startPoint+treatmentTime*i);
            i++;
          }
        }

        console.log('proposal time:',proposalTimes);

        // proposalTimesからの時間選択パート
        if(proposalTimes.length){
          const insert_query = {
            text:'INSERT INTO schedules (line_uid, name, scheduledate, starttime, endtime, menu) VALUES($1,$2,$3,$4,$5,$6)',
            values:[id,pro.displayName,reservation_order.date,proposalTimes[0],proposalTimes[0]+treatmentTime,MENU[reservation_order.menu]]
          };
          connection.query(insert_query)
            .then(res=>{
              const reservedTime = get_Date(proposalTimes[0],1);
              client.pushMessage(id,{
                "type":"text",
                "text":`${reservedTime}に予約しました。ご予約ありがとうございます。`
              });
            })
            .catch(e=>console.error(e.stack));
        }else{
          client.pushMessage(id,{
            "type":"text",
            "text":"この時間帯には空いている時間がありませんでした。別の時間帯を選択してください。"
          });
        }
      }else{
        console.log('res.rows.length判定がfalse');
        const reservedTime = get_Date(startPoint,1);
        const insert_query = {
          text:'INSERT INTO schedules (line_uid, name, scheduledate, starttime, endtime, menu) VALUES($1,$2,$3,$4,$5,$6)',
          values:[id,pro.displayName,reservation_order.date,startPoint,startPoint+treatmentTime,MENU[reservation_order.menu]]
        };
        connection.query(insert_query)
          .then(res=>{
            client.pushMessage(id,{
              "type":"text",
              "text":`${reservedTime}に予約しました。ご予約ありがとうございます。`
            });
          })
          .catch(e=>console.error(e.stack));
      }
    })
    .catch(e=>console.log(e.stack));
}