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

const API_URL = 'https://opentdb.com/api.php?amount=10&type=multiple';
const gameState = {
  quizzes:[],
  currentIndex:0,
  numberOfCorrects:0
};

const connection = new Client({
  user:'rlcrjkpobrvbdu',
  host:'ec2-52-202-146-43.compute-1.amazonaws.com',
  database:'d5vbt5iatapkp8',
  password:'71d3ef3b6059fd8608bb05d8d4ccea813dd0d77cbd7dc13de92991279cb106e7',
  port:5432
});
connection.connect();

app
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .post('/hook',line.middleware(config),(req,res)=>{
    res.sendStatus(200);
    Promise
      .all(req.body.events.map(handleEvent))
      .then((result)=>{
        console.log('event proceed');
      });
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

const handleEvent = (event) => {
  console.log('handleEvent @@@:',event);
  if((event.type !== 'message') && (event.type !== 'postback')){
    return Promise.resolve(null);
  }

  if(event.type === 'message'){
    if((event.message.type !== 'text') && (event.message.type !== 'follow')){
      return Promise.resolve(null);
    }
    const id = event.source.userId;
    let message = '';
    const text = (event.message.type === 'text') ? event.message.text : '';
    if(text === 'クイズ'){
      message = 'クイズしよう';
      client.pushMessage(event.replyToken,{
        type:'text',
        text:message
      });
      console.log('quizfetch @@@');
      quizFetcher(id);
    }else{
      message = text;
      client.pushMessage(event.replyToken,{
        type:'text',
        text:message
      });
    }
  }

  // ここからテスト
  if(event.type === 'postback'){
    const id = event.source.userId;
    const data = event.postback.data;
    judgeCorrectness(data,id);
    // console.log('postback start',event.postback.data);
    // const id = event.source.userId;
    // client.pushMessage(id,{
    //   type:'text',
    //   text:`${event.postback.data}`
    // });
  }
 
}

const quizFetcher = async (id) => {
  let message = 'Now loading...';
  client.pushMessage(id,{
    type:'text',
    text:message
  });
  try{
    const response = await fetch(API_URL);
    const data = await response.json();
    gameState.quizzes = data.results;
    gameState.currentIndex = 0;
    gameState.numberOfCorrects = 0;
    setNextQuiz(id);
  }catch(error){
    console.error(error.message);
  }
}

const setNextQuiz = (id) => {
  console.log('setNextQuiz');
  if(gameState.currentIndex<gameState.quizzes.length){
    const quiz = gameState.quizzes[gameState.currentIndex];
    makeQuiz(id,quiz);
    gameState.currentIndex++;
  }else{
    finishQuiz(id);
  }
}

const makeQuiz = (id,quiz) => {
  const answers = buildAnswers(quiz);
  const question = unEscape(quiz.question);
  const quizMessage = buildFlexMessage(question,answers);
  return client.pushMessage(id,quizMessage);
}

const buildAnswers = (quiz) => {
  const answers = {list:[quiz.correct_answer, ...quiz.incorrect_answers],
                   correctness:[1,0,0,0]};
  const shuffledAnswers = shuffle(answers);
  return shuffledAnswers;
}

const shuffle = (answers) => {
  const copiedAnswers = answers.list.slice();
  const copiedCorrectness = answers.correctness.slice()
  for(let i=copiedAnswers.length-1;i>=0;i--){
    const rand = Math.floor(Math.random()*(i+1));
    [copiedAnswers[i],copiedAnswers[rand]] = [copiedAnswers[rand],copiedAnswers[i]];
    [copiedCorrectness[i],copiedCorrectness[rand]] = [copiedCorrectness[rand],copiedCorrectness[i]];
  }
  const arrangedAnswers = {
    list:copiedAnswers,
    correctness:copiedCorrectness
  }
  return arrangedAnswers;
}

const judgeCorrectness = (data,id) => {
  if(data === '0'){
    const promise = new Promise((resolve,reject)=>{
      client.pushMessage(id,{
        type:'text',
        text:'間違ってるよーん'
      });
      resolve(id);
    });
    promise.then((id)=>{
      setTimeout(()=>{
        setNextQuiz(id);
      },1000);
    });
  }else{
    const promise = new Promise((resolve,reject)=>{
      client.pushMessage(id,{
        type:'text',
        text:'正解！！'
      });
      gameState.numberOfCorrects++;
      resolve(id);
    });
    promise.then((id)=>{
      setTimeout(()=>{
        setNextQuiz(id);
      },1000);
    });
  }
}

const buildFlexMessage = (question,answers) => {
  return {
      "type": "flex",
      "altText": "quizFlexMessage",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "spacing": "md",
          "contents": [
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": `Q${gameState.currentIndex+1}`,
                  "align": "center",
                  "size": "xxl",
                  "weight": "bold"
                },
                {
                  "type": "text",
                  "text": `${question}`,
                  "wrap": true,
                  "weight": "bold",
                  "margin": "lg"
                }
              ]
            },
            {
              "type": "separator"
            },
            {
              "type": "box",
              "layout": "vertical",
              "margin": "lg",
              "contents": [
                {
                  "type": "box",
                  "layout": "baseline",
                  "contents": [
                    {
                      "type": "text",
                      "text": "1.",
                      "flex": 1,
                      "size": "lg",
                      "weight": "bold",
                      "color": "#666666"
                    },
                    {
                      "type": "text",
                      "text": `${unEscape(answers.list[0])}`,
                      "wrap": true,
                      "flex": 9
                    }
                  ]
                },
                {
                  "type": "box",
                  "layout": "baseline",
                  "contents": [
                    {
                      "type": "text",
                      "text": "2.",
                      "flex": 1,
                      "size": "lg",
                      "weight": "bold",
                      "color": "#666666"
                    },
                    {
                      "type": "text",
                      "text": `${unEscape(answers.list[1])}`,
                      "wrap": true,
                      "flex": 9
                    }
                  ]
                },
                {
                  "type": "box",
                  "layout": "baseline",
                  "contents": [
                    {
                      "type": "text",
                      "text": "3.",
                      "flex": 1,
                      "size": "lg",
                      "weight": "bold",
                      "color": "#666666"
                    },
                    {
                      "type": "text",
                      "text": `${unEscape(answers.list[2])}`,
                      "wrap": true,
                      "flex": 9
                    }
                  ]
                },
                {
                  "type": "box",
                  "layout": "baseline",
                  "contents": [
                    {
                      "type": "text",
                      "text": "4.",
                      "flex": 1,
                      "size": "lg",
                      "weight": "bold",
                      "color": "#666666"
                    },
                    {
                      "type": "text",
                      "text": `${unEscape(answers.list[3])}`,
                      "wrap": true,
                      "flex": 9
                    }
                  ]
                }
              ]
            }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "horizontal",
          "spacing": "sm",
          "contents": [
            {
              "type": "button",
              "style": "primary",
              "height": "sm",
              "action": {
                "type": "postback",
                "label": "1",
                "data":`${answers.correctness[0]}`,
                "text": `${unEscape(answers.list[0])}`
              }
            },
            {
              "type": "button",
              "style": "primary",
              "height": "sm",
              "action": {
                "type": "postback",
                "label": "2",
                "data":`${answers.correctness[1]}`,
                "text": `${unEscape(answers.list[1])}`
              }
            },
            {
              "type": "button",
              "style": "primary",
              "height": "sm",
              "action": {
                "type": "postback",
                "label": "3",
                "data":`${answers.correctness[2]}`,
                "text": `${unEscape(answers.list[2])}`
              }
            },
            {
              "type": "button",
              "style": "primary",
              "height": "sm",
              "action": {
                "type": "postback",
                "label": "4",
                "data":`${answers.correctness[3]}`,
                "text": `${unEscape(answers.list[3])}`
              }
            }
          ]
        }
      }
    }
}

const finishQuiz = (id) =>{
  client.pushMessage(id,{
    type:'text',
    text:`クイズ終了です。正解数は${gameState.numberOfCorrects}/${gameState.quizzes.length}です。お疲れ様でした。`
  });
}

const unEscape = (str) => {
  return str
    .replace(/&quot;/g,'"')
    .replace(/&#039;/g,"'")
    .replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>');
}