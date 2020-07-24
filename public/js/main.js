const rButton = document.getElementById('rButton');
const pButton = document.getElementById('pButton');
const h2Element = document.getElementById('monthArea');
const wButton = document.getElementById('thisWeekButton');
// const reservations = [];

const tdElement = document.getElementById('d0-10');

const API_URL = 'https://linebot-schedule.herokuapp.com/api/todos';

// import { adminData } from ('../../index.js');
// console.log('adminData:',adminData);

const thisYear = new Date().getFullYear();
const thisMonth = new Date().getMonth()+1;
const today = new Date().getDate();
const dayOfTheWeek = new Date().getDay();
const nowTime = new Date(`${thisYear}-${thisMonth}-${today} 00:00`).getTime();
const oneWeek = 604800000;
const oneDay = 86400000;
let index = 0;

window.addEventListener('load',(event)=>{
    fetchData();
});

const fetchData = async () =>{
    try{
        const response = await fetch(API_URL);
        const reservations = await response.json();
        console.log('response.json:',reservations);
        tdElement.textContent = getReservationDisplay(reservations[0].starttime,reservations[0].name,reservations[0].menu);
    }catch(error){
        alert(`読み込み失敗...${error.message}`);
    }
};


const getDateElements = (timestamp) => {
    const y = new Date(timestamp).getFullYear();
    const m = new Date(timestamp).getMonth()+1;
    const d = new Date(timestamp).getDate();
    const w = new Date(timestamp).getDay();
    return [y,m,d,w];
}

const getReservationDisplay = (timestamp,name,menu) => {
    const h = ('0'+new Date(timestamp).getHours()).slice(-2);
    const m = ('0'+new Date(timestamp).getMinutes()).slice(-2);
    return `${m}〜 ${name}(${menu})`;
}

const weeks = ['日','月','火','水','木','金','土'];

const displayCalendar = () =>{
    const base_ts = nowTime + oneWeek*index;
    const dateArray = getDateElements(base_ts);
    h2Element.textContent = `${dateArray[0]}年${dateArray[1]}月`;
    for(let i=0;i<7;i++){
        const dayElement = document.getElementById(`d${i}`);
        const date = new Date(base_ts+oneDay*i).getDate();
        dayElement.textContent = `${date}`;
        const weekElement = document.getElementById(`w${i}`);
        if(dateArray[3]+i<7){
            weekElement.textContent = weeks[dateArray[3]+i];
            if(dateArray[3]+i === 0){
                dayElement.setAttribute('title','red');
                weekElement.setAttribute('title','red');
            }else if(dateArray[3]+i === 6){
                dayElement.setAttribute('title','blue');
                weekElement.setAttribute('title','blue');
            }
        }else{
            weekElement.textContent = weeks[dateArray[3]+i-7];
            if(dateArray[3]+i-7 === 0){
                dayElement.setAttribute('title','red');
                weekElement.setAttribute('title','red');
            }else if(dateArray[3]+i-7 === 6){
                dayElement.setAttribute('title','blue');
                weekElement.setAttribute('title','blue');
            }
        }
    }
}

rButton.addEventListener('click',(event)=>{
    index--;
    displayCalendar();
});

pButton.addEventListener('click',(event)=>{
    index++;
    displayCalendar();
});

wButton.addEventListener('click',(event)=>{
    index = 0;
    displayCalendar();
})

displayCalendar();
