const rButton = document.getElementById('rButton');
const pButton = document.getElementById('pButton');
const h2Element = document.getElementById('monthArea');
const wButton = document.getElementById('thisWeekButton');

const adminData = require('../../index.js');
console.log('adminData:',adminData);

const thisYear = new Date().getFullYear();
const thisMonth = new Date().getMonth()+1;
const today = new Date().getDate();
const dayOfTheWeek = new Date().getDay();
const nowTime = new Date(`${thisYear}-${thisMonth}-${today} 00:00`).getTime();
const oneWeek = 604800000;
const oneDay = 86400000;
let index = 0;

const getDateElements = (timestamp) => {
    const y = new Date(timestamp).getFullYear();
    const m = new Date(timestamp).getMonth()+1;
    const d = new Date(timestamp).getDate();
    const w = new Date(timestamp).getDay();
    return [y,m,d,w];
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
