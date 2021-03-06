const rButton = document.getElementById('rButton');
const pButton = document.getElementById('pButton');
const h2Element = document.getElementById('monthArea');
const wButton = document.getElementById('thisWeekButton');
const dialog = document.getElementById('dialog');
const registration_form = document.getElementById('registration-form');
const submit_form = document.getElementById('form-submit');
const cancel_form = document.getElementById('cancel-form');
const registButton = document.getElementById('registrationButton');
const editButton = document.getElementById('button-edit');
const titleElement = document.getElementById('title');
const revId = document.getElementById('rev-id');
const lineId = document.getElementById('line_uid');
const nameElement = document.getElementById('name');
const yearSelector = document.getElementById('year');
const monthSelector = document.getElementById('month');
const dateSelector = document.getElementById('day');
const menuSelector = document.getElementById('menu');
const shSelector = document.getElementById('starttime_h');
const ehSelector = document.getElementById('endtime_h');
const smSelector = document.getElementById('starttime_m');
const emSelector = document.getElementById('endtime_m');
const deleteButton = document.getElementById('button-delete');

let reservations = [];
let users = [];

const API_URL = 'https://linebot-schedule.herokuapp.com/api/todos';

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
        console.log('response.ok:',response.ok);
        const data = await response.json();
        console.log('data:',data);
        reservations = data.reservations;
        users = data.users;
        console.log('reservationsダオ',reservations);
        console.log('usersダオ',users);
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

const getReservationDisplay = (starttime,endtime,name,menu,id) => {
    const s_h = ('0'+new Date(starttime-oneHour*9).getHours()).slice(-2);
    const s_m = ('0'+new Date(starttime-oneHour*9).getMinutes()).slice(-2);
    const e_h = ('0'+new Date(endtime-oneHour*9).getHours()).slice(-2);
    const e_m = ('0'+new Date(endtime-oneHour*9).getMinutes()).slice(-2);

    return `<a href="#" onclick="js_confirm(${id})">◯${s_h}：${s_m} - ${e_h}：${e_m}<br></a>`;
}

const weeks = ['日','月','火','水','木','金','土'];

const js_confirm = (num) => {
    dialog.style.display = 'block';
    submit_form.style.display = 'none';
    editButton.style.display = 'block';
    deleteButton.style.display='block';
    const target = reservations.find(({id})=> id === num);
    const year = new Date(target.starttime - oneHour*9).getFullYear();
    const month = new Date(target.starttime - oneHour*9).getMonth()+1;
    const date = new Date(target.starttime - oneHour*9).getDate();
    const s_h = new Date(target.starttime-oneHour*9).getHours();
    const s_m = new Date(target.starttime-oneHour*9).getMinutes();
    const e_h = new Date(target.endtime-oneHour*9).getHours();
    const e_m = new Date(target.endtime-oneHour*9).getMinutes();

    titleElement.innerHTML = '予約確認';
    
    revId.innerHTML = target.id;
    
    lineId.value=target.line_uid;

    nameElement.value = target.name;
    nameElement.disabled = true;
    
    const yearOptions = yearSelector.options;
    yearOptions[year - new Date().getFullYear() +1].selected = true;
    yearSelector.disabled = true;
    
    monthSelector.options[month-1].selected = true;
    monthSelector.disabled = true;
    
    dateSelector.options[date-1].selected = true;
    dateSelector.disabled = true;
    
    const menuList = ['cut','cut&shampoo','color'];
    menuSelector.options[menuList.indexOf(target.menu)].selected = true;
    menuSelector.disabled = true;
    
    shSelector.options[s_h - 9].selected = true;
    shSelector.disabled = true;
    
    smSelector.options[s_m/5].selected = true;
    smSelector.disabled = true;
    
    ehSelector.options[e_h - 9].selected = true;
    ehSelector.disabled = true;
    
    emSelector.options[e_m/5].selected = true;
    emSelector.disabled = true;
}

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
                    rsv += getReservationDisplay(obj.starttime,obj.endtime,obj.name,obj.menu,parseInt(obj.id));
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

// btn_cancel.addEventListener('click',()=>{
//     dialog.style.display = 'none';
// });

// btn_ok.addEventListener('click',()=>{
//     dialog.style.display = 'none';
// });

registButton.addEventListener('click',()=>{
    titleElement.innerHTML = '新規予約作成';
    revId.innerHTML = '';
    lineId.value = '';
    nameElement.value = '';
    yearSelector.selectedIndex = 1;
    monthSelector.selectedIndex = parseInt(new Date().getMonth());
    dateSelector.selectedIndex = parseInt(new Date().getDate()-1);
    shSelector.selectedIndex = 0;
    smSelector.selectedIndex = 0;
    ehSelector.selectedIndex = 0;
    emSelector.selectedIndex = 0;
    dialog.style.display='block';
    editButton.style.display ='none';
    deleteButton.style.display='none';
    submit_form.style.display = 'block';
    nameElement.disabled = false;
    yearSelector.disabled = false;
    monthSelector.disabled = false;
    dateSelector.disabled = false;
    menuSelector.disabled = false;
    shSelector.disabled = false;
    smSelector.disabled = false;
    ehSelector.disabled = false;
    emSelector.disabled = false;
    registration_form.setAttribute("method","post");
    registration_form.setAttribute("action",`/api/todos`);
});

cancel_form.addEventListener('click',()=>{
    dialog.style.display='none';
});

editButton.addEventListener('click',()=>{
    titleElement.innerHTML = '予約編集';
    nameElement.disabled = false;
    yearSelector.disabled = false;
    monthSelector.disabled = false;
    dateSelector.disabled = false;
    menuSelector.disabled = false;
    shSelector.disabled = false;
    smSelector.disabled = false;
    ehSelector.disabled = false;
    emSelector.disabled = false;
    submit_form.style.display = 'block';
    submit_form.value = '編集を送信する'
    editButton.style.display = 'none';
    deleteButton.style.display='none';
    const id = parseInt(revId.textContent,10);
    console.log('id:',id);
    registration_form.setAttribute("action",`/api/todos/${id}`);
    console.log('この中にformのdisabledをfalseにする関数を入れる');
});

deleteButton.addEventListener('click',()=>{
    const id = parseInt(revId.textContent,10);
    console.log('id:',id);
    registration_form.setAttribute("action",`/api/todos/remove/${id}`);
    submit_form.value = '削除を送信する'
    submit_form.style.display = 'block';
    editButton.style.display = 'none';
    deleteButton.style.display='none';
})
