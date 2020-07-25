const rButton = document.getElementById('rButton');
const pButton = document.getElementById('pButton');
const h2Element = document.getElementById('monthArea');
const wButton = document.getElementById('thisWeekButton');
let reservations = [];

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
const oneHour = 3600000;
const OPEN_TIME = 9;
let index = 0;

window.addEventListener('load',(event)=>{
    fetchData();
});

const fetchData = async () =>{
    try{
        const response = await fetch(API_URL);
        const data = await response.json();
        reservations = data;
        console.log('reservations:',reservations);
        displayCalendar(reservations);
    }catch(error){
        alert(`読み込み失敗やで...${error.message}`);
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

const displayCalendar = (data) =>{
    const base_ts = nowTime + oneHour*OPEN_TIME + oneWeek*index;
    console.log('base_ts:',base_ts);
    const dateArray = getDateElements(base_ts);
    console.log('dateArray:',dateArray);
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
        for(let j=0;j<11;j++){
            const tdElement = document.getElementById(`d${i}-${9+j}`);
            const filteredArray = data.filter(obj=>{
                return ((obj.starttime - oneHour*9 >= base_ts+oneDay*i+oneHour*j) && (obj.starttime - oneHour*9 < base_ts+oneDay*i+oneHour*j+oneHour));
            });
            if(filteredArray.length){
                let rsv = '';
                filteredArray.forEach(obj=>{
                    rsv += getReservationDisplay(obj.starttime,obj.name,obj.menu);
                });
                tdElement.textContent = rsv;
            }else{
                tdElement.textContent = '予約なし';
            }
        }
    }
}

rButton.addEventListener('click',(event)=>{
    index--;
    displayCalendar(reservations);
});

pButton.addEventListener('click',(event)=>{
    index++;
    displayCalendar(reservations);
});

wButton.addEventListener('click',(event)=>{
    index = 0;
    displayCalendar(reservations);
})
