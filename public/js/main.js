console.log('その１');
const rButton = document.getElementById('rButton');
const pButton = document.getElementById('pButton');
const h2Element = document.getElementById('monthArea');
const wButton = document.getElementById('thisWeekButton');
const dialog = document.getElementById('dialog');
const dialog_contents = document.getElementById('contents');
const btn_cancel = document.getElementById('button-cancel');
const btn_ok = document.getElementById('button-ok');
const registration = document.getElementById('registration');
const cancel_form = document.getElementById('cancel-form');
const registButton = document.getElementById('registrationButton');
const submitButton = document.getElementById('form-submit');

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
    console.log('その2');
    fetchData();
});

const fetchData = async () =>{
    try{
        console.log('その3');
        const response = await fetch(API_URL);
        console.log('その4');
        console.log('response.ok:',response.ok);
        const data = await response.json();
        console.log('その5');
        reservations = data;
        console.log('reservationsダオ',reservations);
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

const getReservationDisplay = (timestamp,name,menu,id) => {
    const h = ('0'+new Date(timestamp-oneHour*9).getHours()).slice(-2);
    const m = ('0'+new Date(timestamp-oneHour*9).getMinutes()).slice(-2);
    let mn = '';
    if(menu === 'cut&shampoo'){
        mn = 'C&S'
    }else{
        mn = menu;
    }
    return `<a href="#" onclick="js_confirm(${id})">■${h}：${m}<br>　 ${mn}<br></a>`;
}

const weeks = ['日','月','火','水','木','金','土'];

const js_confirm = (num) => {
    const target = reservations.find(({id})=> id === num);
    const month = new Date(target.starttime - oneHour*9).getMonth()+1;
    const date = new Date(target.starttime - oneHour*9).getDate();
    const s_h = ('0'+new Date(target.starttime-oneHour*9).getHours()).slice(-2);
    const s_m = ('0'+new Date(target.starttime-oneHour*9).getMinutes()).slice(-2);
    const e_h = ('0'+new Date(target.endtime-oneHour*9).getHours()).slice(-2);
    const e_m = ('0'+new Date(target.endtime-oneHour*9).getMinutes()).slice(-2);
    dialog_contents.innerHTML = `■予約id:${target.id}<br>■予約名:${target.name}<br>■予約日時:${month}月${date}日<br>　　　　 ${s_h}時${s_m}分〜${e_h}時${e_m}分<br>■メニュー:${target.menu}`
    // dialog_contents.innerHTML = `■予約id:${target.id}<br>■予約名:ダミーユーザー<br>■予約日時:${month}月${date}日<br>　　　　 ${s_h}時${s_m}分〜${e_h}時${e_m}分<br>■メニュー:${target.menu}`
    dialog.style.display = 'block';
}

btn_cancel.addEventListener('click',()=>{
    dialog.style.display = 'none';
});

btn_ok.addEventListener('click',()=>{
    dialog.style.display = 'none';
});

registButton.addEventListener('click',()=>{
    registration.style.display='block';
});

cancel_form.addEventListener('click',()=>{
    registration.style.display='none';
})




const displayCalendar = (data) =>{
    console.log('その6');
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
                    rsv += getReservationDisplay(obj.starttime,obj.name,obj.menu,parseInt(obj.id));
                });
                tdElement.innerHTML = rsv;
            }else{
                tdElement.innerHTML = '';
            }
        }
    }console.log('その7');
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

submitButton.addEventListener('click',()=>{
    const formData = document.getElementById('registration-form');
    const postData = new FormData(formData);

    const XHR = new XMLHttpRequest();

    XHR.open("POST","./api/todos",true);

    XHR.send(postData);

    XHR.onreadystatechange = () => {
        if(XHR.readyState === 4 && XHR.status === 200){
            console.log('送信成功');
        }
    }
},false);
