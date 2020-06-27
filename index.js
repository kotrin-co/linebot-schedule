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
  text:'CREATE TABLE IF NOT EXISTS users (id SERIAL NOT NULL, line_uid VARCHAR(255) NOT NULL, display_name VARCHAR(255) NOT NULL, timestamp TIMESTAMP_DATA NOT NULL);'
};
connection.query(create_utable)
  .then(()=>{
    console.log('table users created successfully!!');
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
      case 'message':
        promises.push(handleMessageEvent(ev));
      case 'postback':
        promises.push(handlePostbackEvent(ev));
    }
  }

  Promise
    .all(promises)
    .then(console.log('all promises passed @@@'));
}

const greeting_follow = async (ev) => {
  const pro = await client.getProfile(ev.source.userId);
  console.log('profile:',pro);
  const timeStamp = getDate(ev.timestamp);

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

const getDate = (timestamp) => {
  const date = new Date(timestamp+32400000);
  const y = date.getFullYear();
  const m = ("0" + (date.getMonth()+1)).slice(-2);
  const d = ("0" + date.getDate()).slice(-2);
  const h = ("0" + date.getHours()).slice(-2);
  const i = ("0" + date.getMinutes()).slice(-2);
  const s = ("0" + date.getSeconds()).slice(-2);
  console.log(`タイムスタンプ変換${timestamp}　→　${y}/${m}/${d} ${h}:${i}:${s}`);
  return `${y}/${m}/${d} ${h}:${i}:${s}`;
}

const handleMessageEvent = async (ev) => {
  console.log('handleMessageEvent!!',ev);

  const text = (ev.message.type === 'text') ? ev.message.text : '';

  if(text === '予約'){
    client.replyMessage(ev.replyToken,{
      "type": "template",
      "altText": "This is a buttons template",
      "template": {
          "type": "buttons",
          "thumbnailImageUrl": "https://www.img03.ekiten.jp/image_charge2/52/6772952/list/s150_1000145_20141001102156.jpg",
          "imageAspectRatio": "rectangle",
          "imageSize": "cover",
          "imageBackgroundColor": "#FFFFFF",
          "title": "カットハウス　カテエネ",
          "text": "選択してください",
          "defaultAction": {
              "type": "uri",
              "label": "Google",
              "uri": "http://google.co.jp"
            },
          "actions": [
              {
                "type": "datetimepicker",
                "label": "予約する",
                "mode":"date",
                "data": "action=reserve"
              },
              {
                "type": "postback",
                "label": "キャンセル",
                "data": "action=cancel"
              },
              {
                "type": "uri",
                "label": "ホームページへ",
                "uri": "http://google.co.jp"
              }
            ]
          }
        });
      }else{
        return client.replyMessage(ev.replyToken,{
          "type":"text",
          "text":"来店予約の方は”予約”をメッセージとして送ってね"
        });
      }
  }

const handlePostbackEvent = async (ev) => {
  client.replyMessage(ev.replyToken,{
    "type":"text",
    "text":`${ev.postback.params.date}ですね・・・`
  });
  client.pushMessage(ev.source.userId,{
    "type": "template",
    "altText": "This is a buttons template",
    "template": {
        "type": "buttons",
        "thumbnailImageUrl": "https://www.img03.ekiten.jp/image_charge2/52/6772952/list/s150_1000145_20141001102156.jpg",
        "imageAspectRatio": "rectangle",
        "imageSize": "cover",
        "imageBackgroundColor": "#FFFFFF",
        "title": "カットハウス　カテエネ",
        "text": "選択してください",
        "defaultAction": {
            "type": "uri",
            "label": "Google",
            "uri": "http://google.co.jp"
        },
        "actions": [
            {
              "type": "datetimepicker",
              "label": "時間を選択する",
              "mode":"time",
              "max":"19:00",
              "min":"10:00",
              "data": "action=reserve"
            },
            {
              "type": "postback",
              "label": "キャンセル",
              "data": "action=cancel"
            },
            {
              "type": "uri",
              "label": "ホームページへ",
              "uri": "http://google.co.jp"
            }
          ]
        }
      });
}

// const handleEvent = (event) => {
//   console.log('handleEvent @@@:',event);
//   if((event.type !== 'message') && (event.type !== 'postback')){
//     return Promise.resolve(null);
//   }

//   if(event.type === 'message'){
//     if((event.message.type !== 'text') && (event.message.type !== 'follow')){
//       return Promise.resolve(null);
//     }
//     const id = event.source.userId;
//     let message = '';
//     const text = (event.message.type === 'text') ? event.message.text : '';
//     if(text === 'クイズ'){
//       message = 'クイズしよう';
//       client.pushMessage(event.replyToken,{
//         type:'text',
//         text:message
//       });
//       console.log('quizfetch @@@');
//       quizFetcher(id);
//     }else{
//       message = text;
//       client.pushMessage(event.replyToken,{
//         type:'text',
//         text:message
//       });
//     }
//   }

//   if(event.type === 'postback'){
//     const id = event.source.userId;
//     const data = event.postback.data;
//     judgeCorrectness(data,id);
//   }
 
// }

// const quizFetcher = async (id) => {
//   try{
//     const response = await fetch(API_URL);
//     const data = await response.json();
//     gameState.quizzes = data.results;
//     gameState.currentIndex = 0;
//     gameState.numberOfCorrects = 0;
//     setQuizTable(gameState.quizzes);
//     setNextQuiz(id);
//   }catch(error){
//     console.error(error.message);
//   }
// }

// const setQuizTable = (quizzes) => {
//   console.log('setQuizTable @@@',quizzes);
//   for(let i=0;i<quizzes.length;i++){
//     let table_insert = {
//       text:'INSERT INTO quizzes (question, correct_answer, incorrect_answer1, incorrect_answer2, incorrect_answer3) VALUES($1,$2,$3,$4,$5)',
//       values:[quizzes[i].question,quizzes[i].correct_answer,quizzes[i].incorrect_answers[0],quizzes[i].incorrect_answers[1],quizzes[i].incorrect_answers[2]]
//     };
//     connection.query(table_insert)
//       .then(()=>{
//         console.log('table inserted successfully!');
//       })
//       .catch(e=>console.error(e.stack));
//   }
// }

// const setNextQuiz = (id) => {
//   console.log('setNextQuiz');
//   if(gameState.currentIndex<gameState.quizzes.length){
//     const table_select = {
//       text:`SELECT * FROM quizzes WHERE id=${gameState.currentIndex+1};`
//     }
//     connection.query(table_select)
//       .then(res =>{
//         console.log('question:',res.rows[0]);
//         makeQuiz(id,res.rows[0]);
//         gameState.currentIndex++;
//       })
//       .catch(e=>console.error(e.stack));
//   }else{
//     finishQuiz(id);
//   }
// }

// const makeQuiz = (id,quiz) => {
//   const answers = buildAnswers(quiz);
//   const question = quiz.question;
//   const quizMessage = buildFlexMessage(question,answers);
//   return client.pushMessage(id,quizMessage);
// }

// const buildAnswers = (quiz) => {
//   const answers = {list:[quiz.correct_answer,quiz.incorrect_answer1,quiz.incorrect_answer2,quiz.incorrect_answer3],
//                    correctness:[1,0,0,0]};
//   const shuffledAnswers = shuffle(answers);
//   return shuffledAnswers;
// }

// const shuffle = (answers) => {
//   const copiedAnswers = answers.list.slice();
//   const copiedCorrectness = answers.correctness.slice()
//   for(let i=copiedAnswers.length-1;i>=0;i--){
//     const rand = Math.floor(Math.random()*(i+1));
//     [copiedAnswers[i],copiedAnswers[rand]] = [copiedAnswers[rand],copiedAnswers[i]];
//     [copiedCorrectness[i],copiedCorrectness[rand]] = [copiedCorrectness[rand],copiedCorrectness[i]];
//   }
//   const arrangedAnswers = {
//     list:copiedAnswers,
//     correctness:copiedCorrectness
//   }
//   return arrangedAnswers;
// }

// const judgeCorrectness = (data,id) => {
//   if(data === '0'){
//     const promise = new Promise((resolve,reject)=>{
//       client.pushMessage(id,{
//         type:'text',
//         text:'間違ってるよーん'
//       });
//       resolve(id);
//     });
//     promise.then((id)=>{
//       setTimeout(()=>{
//         setNextQuiz(id);
//       },1000);
//     });
//   }else{
//     const promise = new Promise((resolve,reject)=>{
//       client.pushMessage(id,{
//         type:'text',
//         text:'正解！！'
//       });
//       gameState.numberOfCorrects++;
//       resolve(id);
//     });
//     promise.then((id)=>{
//       setTimeout(()=>{
//         setNextQuiz(id);
//       },1000);
//     });
//   }
// }

// const buildFlexMessage = (question,answers) => {
//   return {
//       "type": "flex",
//       "altText": "quizFlexMessage",
//       "contents": {
//         "type": "bubble",
//         "body": {
//           "type": "box",
//           "layout": "vertical",
//           "spacing": "md",
//           "contents": [
//             {
//               "type": "box",
//               "layout": "vertical",
//               "contents": [
//                 {
//                   "type": "text",
//                   "text": `Q${gameState.currentIndex+1}`,
//                   "align": "center",
//                   "size": "xxl",
//                   "weight": "bold"
//                 },
//                 {
//                   "type": "text",
//                   "text": `${question}`,
//                   "wrap": true,
//                   "weight": "bold",
//                   "margin": "lg"
//                 }
//               ]
//             },
//             {
//               "type": "separator"
//             },
//             {
//               "type": "box",
//               "layout": "vertical",
//               "margin": "lg",
//               "contents": [
//                 {
//                   "type": "box",
//                   "layout": "baseline",
//                   "contents": [
//                     {
//                       "type": "text",
//                       "text": "1.",
//                       "flex": 1,
//                       "size": "lg",
//                       "weight": "bold",
//                       "color": "#666666"
//                     },
//                     {
//                       "type": "text",
//                       "text": `${(answers.list[0])}`,
//                       "wrap": true,
//                       "flex": 9
//                     }
//                   ]
//                 },
//                 {
//                   "type": "box",
//                   "layout": "baseline",
//                   "contents": [
//                     {
//                       "type": "text",
//                       "text": "2.",
//                       "flex": 1,
//                       "size": "lg",
//                       "weight": "bold",
//                       "color": "#666666"
//                     },
//                     {
//                       "type": "text",
//                       "text": `${(answers.list[1])}`,
//                       "wrap": true,
//                       "flex": 9
//                     }
//                   ]
//                 },
//                 {
//                   "type": "box",
//                   "layout": "baseline",
//                   "contents": [
//                     {
//                       "type": "text",
//                       "text": "3.",
//                       "flex": 1,
//                       "size": "lg",
//                       "weight": "bold",
//                       "color": "#666666"
//                     },
//                     {
//                       "type": "text",
//                       "text": `${(answers.list[2])}`,
//                       "wrap": true,
//                       "flex": 9
//                     }
//                   ]
//                 },
//                 {
//                   "type": "box",
//                   "layout": "baseline",
//                   "contents": [
//                     {
//                       "type": "text",
//                       "text": "4.",
//                       "flex": 1,
//                       "size": "lg",
//                       "weight": "bold",
//                       "color": "#666666"
//                     },
//                     {
//                       "type": "text",
//                       "text": `${(answers.list[3])}`,
//                       "wrap": true,
//                       "flex": 9
//                     }
//                   ]
//                 }
//               ]
//             }
//           ]
//         },
//         "footer": {
//           "type": "box",
//           "layout": "horizontal",
//           "spacing": "sm",
//           "contents": [
//             {
//               "type": "button",
//               "style": "primary",
//               "height": "sm",
//               "action": {
//                 "type": "postback",
//                 "label": "1",
//                 "data":`${answers.correctness[0]}`,
//                 "text": `${(answers.list[0])}`
//               }
//             },
//             {
//               "type": "button",
//               "style": "primary",
//               "height": "sm",
//               "action": {
//                 "type": "postback",
//                 "label": "2",
//                 "data":`${answers.correctness[1]}`,
//                 "text": `${(answers.list[1])}`
//               }
//             },
//             {
//               "type": "button",
//               "style": "primary",
//               "height": "sm",
//               "action": {
//                 "type": "postback",
//                 "label": "3",
//                 "data":`${answers.correctness[2]}`,
//                 "text": `${(answers.list[2])}`
//               }
//             },
//             {
//               "type": "button",
//               "style": "primary",
//               "height": "sm",
//               "action": {
//                 "type": "postback",
//                 "label": "4",
//                 "data":`${answers.correctness[3]}`,
//                 "text": `${(answers.list[3])}`
//               }
//             }
//           ]
//         }
//       }
//     }
// }

// const finishQuiz = (id) =>{
//   client.pushMessage(id,{
//     type:'text',
//     text:`クイズ終了です。正解数は${gameState.numberOfCorrects}/${gameState.quizzes.length}です。お疲れ様でした。`
//   });
// }

// const unEscape = (str) => {
//   return str
//     .replace(/&quot;/g,'"')
//     .replace(/&#039;/g,"'")
//     .replace(/&amp;/g,'&')
//     .replace(/&lt;/g,'<')
//     .replace(/&gt;/g,'>');
// }