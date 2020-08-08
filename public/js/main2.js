let reservations = [];
let users = [];
const header = ['ID','名前','登録日時','次回予約','Cut','Color','編集'];

const API_URL = 'https://linebot-schedule.herokuapp.com/api/todos';

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
        createTable();
    }catch(error){
        alert(`読み込み失敗やで...${error.message}`);
    }
};

const createTable = () => {
    const l = users.length+1;
    const table = document.getElementById('users_table');
    // const rowHeader = table.insertRow(-1);
    for(let i=0;i<l;i++){
        const tr = table.insertRow(-1);
        // const tr = document.createElement('tr');
        for(let j=0;j<7;j++){
            if(i===0){
                const th = document.createElement('th');
                th.setAttribute('class','fixed0');
                th.textContent = header[j];
                tr.appendChild(th);
            }else{
                const td = document.createElement('td');
                if(j===0){
                    td.textContent = users[i-1].id;
                }else if(j===1){
                    td.textContent = users[i-1].display_name;
                }else if(j===2){
                    td.textContent = users[i-1].timestamp.slice(0,10);
                }else if(j===3){
                    // const targetUser = users.find(({id})=> id===u_id);
                    const targetReservations = reservations.filter(({line_uid})=>{
                        return line_uid===users[i-1].line_uid;
                    });
                    console.log('targetReservations:',targetReservations);
                    const nextRev = findNextReservation(targetReservations);
                    console.log('nexRev:',nextRev);
                    const length = nextRev.length;
                    if(length){
                        td.textContent = getDate(nextRev[length-1].starttime - 9*3600000);
                    }else{
                        td.textContent = '予約なし';
                    }                    
                }else if(j===4){
                    td.textContent = users[i-1].cuttime;
                }else if(j===5){
                    td.textContent = users[i-1].colortime;
                }else{
                    const button = document.createElement('button');
                    button.textContent = '編集';
                    button.setAttribute('id',`edit-${users[i-1].id}`);
                    button.addEventListener('click',()=>{
                        console.log('クリックイベント追加');
                        displayDialog(users[i-1].id);
                    })
                    td.appendChild(button);
                }
                tr.appendChild(td);
            }
        }
    }
}

const getDate = (timestamp) => {
    const date = new Date(timestamp);
    const y = date.getFullYear();
    const m = ("0" + (date.getMonth()+1)).slice(-2);
    const d = ("0" + date.getDate()).slice(-2);
    const h = ("0" + date.getHours()).slice(-2);
    const i = ("0" + date.getMinutes()).slice(-2);
    return `${y}/${m}/${d} ${h}:${i}`;
}

const findNextReservation = (target) => {
    const nowTimestamp = new Date().getTime();
    const nextReservation = target.filter(object=>{
        return nowTimestamp < object.starttime - 9*3600000;
    });
    return nextReservation;
};

const displayDialog = (u_id) => {
    const targetUser = users.find(({id})=> id===u_id);
    const targetReservation = reservations.filter(({line_uid})=>{
        return line_uid===targetUser.line_uid;
    });

    const nextRev = findNextReservation(targetReservation);
    console.log('nextRev:',nextRev);

    const div = document.createElement('div');
    div.setAttribute('class','dialog_users');

    const titleElement = document.createElement('h2');
    titleElement.innerHTML = 'ユーザーデータ';
    div.appendChild(titleElement);

    const idElement = document.createElement('p');
    idElement.innerHTML = `ID:${targetUser.id}`;
    div.appendChild(idElement);

    const formElement = document.createElement('form');
    formElement.setAttribute('id','userForm');
    formElement.setAttribute('method','post');

    const pName = document.createElement('p');
    pName.textContent = '名前：';
    const nameElement = document.createElement('input');
    nameElement.value = targetUser.display_name;
    nameElement.disabled = true;
    pName.appendChild(nameElement);
    formElement.appendChild(pName);
    // div.appendChild(pName);

    const pCut = document.createElement('p');
    pCut.textContent = 'カット時間(分)：';
    const cutInput = document.createElement('input');
    cutInput.setAttribute('class','timeInput');
    cutInput.value = targetUser.cuttime;
    cutInput.disabled = true;
    pCut.appendChild(cutInput);
    formElement.appendChild(pCut);

    const pCutAndShampoo = document.createElement('p');
    pCutAndShampoo.textContent = 'カット＆シャンプー時間(分)：';
    const csInput = document.createElement('input');
    csInput.setAttribute('class','timeInput');
    csInput.value = targetUser.colortime;
    csInput.disabled = true;
    pCutAndShampoo.appendChild(csInput);
    formElement.appendChild(pCutAndShampoo);
    
    const pColor = document.createElement('p');
    pColor.textContent = 'カラーリング時間(分)：';
    const colorInput = document.createElement('input');
    colorInput.setAttribute('class','timeInput');
    colorInput.value = 30;
    colorInput.disabled = true;
    pColor.appendChild(colorInput);
    formElement.appendChild(pColor);

    div.appendChild(formElement);

    const divButton = document.createElement('div');

    const cancelButton = document.createElement('button');
    cancelButton.setAttribute('class','dialogButton');
    cancelButton.textContent = 'キャンセル';
    cancelButton.addEventListener('click',()=>{
        div.style.display = 'none';
    });
    divButton.appendChild(cancelButton);

    const editButton = document.createElement('input');
    editButton.setAttribute('class','dialogButton');
    editButton.value = '編集';
    editButton.type = 'button';
    editButton.addEventListener('click',()=>{
        nameElement.disabled = false;
        cutInput.disabled = false;
        csInput.disabled = false;
        colorInput.disabled = false;
        editButton.value = '送信';
        editButton.type = 'submit';
    });
    divButton.appendChild(editButton);

    div.appendChild(divButton);

    // const ul = document.createElement('ul');
    // for(let i=0;i<3;i++){
    //     console.log('users:',users[i].display_name);
    //     const li = document.createElement('li');
    //     li.textContent = users[i].display_name;
    //     ul.appendChild(li);
    // }
    // div.appendChild(ul);
    document.body.appendChild(div);
}

// const rButton = document.getElementById('rButton');
// const pButton = document.getElementById('pButton');
// const h2Element = document.getElementById('monthArea');
// const wButton = document.getElementById('thisWeekButton');
// const dialog = document.getElementById('dialog');
// const registration_form = document.getElementById('registration-form');
// const submit_form = document.getElementById('form-submit');
// const cancel_form = document.getElementById('cancel-form');
// const registButton = document.getElementById('registrationButton');
// const editButton = document.getElementById('button-edit');
// const titleElement = document.getElementById('title');
// const revId = document.getElementById('rev-id');
// const lineId = document.getElementById('line_uid');
// const nameElement = document.getElementById('name');
// const yearSelector = document.getElementById('year');
// const monthSelector = document.getElementById('month');
// const dateSelector = document.getElementById('day');
// const menuSelector = document.getElementById('menu');
// const shSelector = document.getElementById('starttime_h');
// const ehSelector = document.getElementById('endtime_h');
// const smSelector = document.getElementById('starttime_m');
// const emSelector = document.getElementById('endtime_m');
// const deleteButton = document.getElementById('button-delete');

// let reservations = [];
// let users = [];

// const API_URL = 'https://linebot-schedule.herokuapp.com/api/todos';

// const thisYear = new Date().getFullYear();
// const thisMonth = new Date().getMonth()+1;
// const today = new Date().getDate();
// const dayOfTheWeek = new Date().getDay();
// const nowTime = new Date(`${thisYear}-${thisMonth}-${today} 00:00`).getTime();
// const oneWeek = 604800000;
// const oneDay = 86400000;
// const oneHour = 3600000;
// const OPEN_TIME = 9;
// let index = 0;

// window.addEventListener('load',(event)=>{
//     fetchData();
// });

// const fetchData = async () =>{
//     try{
//         const response = await fetch(API_URL);
//         console.log('response.ok:',response.ok);
//         const data = await response.json();
//         console.log('data:',data);
//         reservations = data.reservations;
//         users = data.users;
//         console.log('reservationsダオ',reservations);
//         console.log('usersダオ',users);
//         displayCalendar(reservations);
//     }catch(error){
//         alert(`読み込み失敗やで...${error.message}`);
//     }
// };

// const getDateElements = (timestamp) => {
//     const y = new Date(timestamp).getFullYear();
//     const m = new Date(timestamp).getMonth()+1;
//     const d = new Date(timestamp).getDate();
//     const w = new Date(timestamp).getDay();
//     return [y,m,d,w];
// }

// const getReservationDisplay = (timestamp,name,menu,id) => {
//     const h = ('0'+new Date(timestamp-oneHour*9).getHours()).slice(-2);
//     const m = ('0'+new Date(timestamp-oneHour*9).getMinutes()).slice(-2);
//     let mn = '';
//     if(menu === 'cut&shampoo'){
//         mn = 'C&S'
//     }else{
//         mn = menu;
//     }
//     return `<a href="#" onclick="js_confirm(${id})">■${h}：${m}<br>　 ${mn}<br></a>`;
// }

// const weeks = ['日','月','火','水','木','金','土'];

// const js_confirm = (num) => {
//     dialog.style.display = 'block';
//     submit_form.style.display = 'none';
//     editButton.style.display = 'block';
//     deleteButton.style.display='block';
//     const target = reservations.find(({id})=> id === num);
//     const year = new Date(target.starttime - oneHour*9).getFullYear();
//     const month = new Date(target.starttime - oneHour*9).getMonth()+1;
//     const date = new Date(target.starttime - oneHour*9).getDate();
//     const s_h = new Date(target.starttime-oneHour*9).getHours();
//     const s_m = new Date(target.starttime-oneHour*9).getMinutes();
//     const e_h = new Date(target.endtime-oneHour*9).getHours();
//     const e_m = new Date(target.endtime-oneHour*9).getMinutes();

//     titleElement.innerHTML = '予約確認';
    
//     revId.innerHTML = target.id;
    
//     lineId.value=target.line_uid;

//     nameElement.value = target.name;
//     nameElement.disabled = true;
    
//     const yearOptions = yearSelector.options;
//     yearOptions[year - new Date().getFullYear() +1].selected = true;
//     yearSelector.disabled = true;
    
//     monthSelector.options[month-1].selected = true;
//     monthSelector.disabled = true;
    
//     dateSelector.options[date-1].selected = true;
//     dateSelector.disabled = true;
    
//     const menuList = ['cut','cut&shampoo','color'];
//     menuSelector.options[menuList.indexOf(target.menu)].selected = true;
//     menuSelector.disabled = true;
    
//     shSelector.options[s_h - 9].selected = true;
//     shSelector.disabled = true;
    
//     smSelector.options[s_m/5].selected = true;
//     smSelector.disabled = true;
    
//     ehSelector.options[e_h - 9].selected = true;
//     ehSelector.disabled = true;
    
//     emSelector.options[e_m/5].selected = true;
//     emSelector.disabled = true;
// }

// const displayCalendar = (data) =>{
//     console.log('その6');
//     const base_ts = nowTime + oneHour*OPEN_TIME + oneWeek*index;
//     console.log('base_ts:',base_ts);
//     const dateArray = getDateElements(base_ts);
//     console.log('dateArray:',dateArray);
//     h2Element.textContent = `${dateArray[0]}年${dateArray[1]}月`;
//     for(let i=0;i<7;i++){
//         const dayElement = document.getElementById(`d${i}`);
//         const date = new Date(base_ts+oneDay*i).getDate();
//         dayElement.textContent = `${date}`;
//         const weekElement = document.getElementById(`w${i}`);
//         if(dateArray[3]+i<7){
//             weekElement.textContent = weeks[dateArray[3]+i];
//             if(dateArray[3]+i === 0){
//                 dayElement.setAttribute('title','red');
//                 weekElement.setAttribute('title','red');
//             }else if(dateArray[3]+i === 6){
//                 dayElement.setAttribute('title','blue');
//                 weekElement.setAttribute('title','blue');
//             }
//         }else{
//             weekElement.textContent = weeks[dateArray[3]+i-7];
//             if(dateArray[3]+i-7 === 0){
//                 dayElement.setAttribute('title','red');
//                 weekElement.setAttribute('title','red');
//             }else if(dateArray[3]+i-7 === 6){
//                 dayElement.setAttribute('title','blue');
//                 weekElement.setAttribute('title','blue');
//             }
//         }
//         for(let j=0;j<11;j++){
//             const tdElement = document.getElementById(`d${i}-${9+j}`);
//             const filteredArray = data.filter(obj=>{
//                 return ((obj.starttime - oneHour*9 >= base_ts+oneDay*i+oneHour*j) && (obj.starttime - oneHour*9 < base_ts+oneDay*i+oneHour*j+oneHour));
//             });
//             if(filteredArray.length){
//                 let rsv = '';
//                 filteredArray.forEach(obj=>{
//                     rsv += getReservationDisplay(obj.starttime,obj.name,obj.menu,parseInt(obj.id));
//                 });
//                 tdElement.innerHTML = rsv;
//             }else{
//                 tdElement.innerHTML = '';
//             }
//         }
//     }console.log('その7');
// }

// rButton.addEventListener('click',(event)=>{
//     index--;
//     displayCalendar(reservations);
// });

// pButton.addEventListener('click',(event)=>{
//     index++;
//     displayCalendar(reservations);
// });

// wButton.addEventListener('click',(event)=>{
//     index = 0;
//     displayCalendar(reservations);
// })

// // btn_cancel.addEventListener('click',()=>{
// //     dialog.style.display = 'none';
// // });

// // btn_ok.addEventListener('click',()=>{
// //     dialog.style.display = 'none';
// // });

// registButton.addEventListener('click',()=>{
//     titleElement.innerHTML = '新規予約作成';
//     revId.innerHTML = '';
//     lineId.value = '';
//     nameElement.value = '';
//     yearSelector.selectedIndex = 1;
//     monthSelector.selectedIndex = parseInt(new Date().getMonth());
//     dateSelector.selectedIndex = parseInt(new Date().getDate()-1);
//     shSelector.selectedIndex = 0;
//     smSelector.selectedIndex = 0;
//     ehSelector.selectedIndex = 0;
//     emSelector.selectedIndex = 0;
//     dialog.style.display='block';
//     editButton.style.display ='none';
//     deleteButton.style.display='none';
//     submit_form.style.display = 'block';
//     nameElement.disabled = false;
//     yearSelector.disabled = false;
//     monthSelector.disabled = false;
//     dateSelector.disabled = false;
//     menuSelector.disabled = false;
//     shSelector.disabled = false;
//     smSelector.disabled = false;
//     ehSelector.disabled = false;
//     emSelector.disabled = false;
//     registration_form.setAttribute("method","post");
//     registration_form.setAttribute("action",`/api/todos`);
// });

// cancel_form.addEventListener('click',()=>{
//     dialog.style.display='none';
// });

// editButton.addEventListener('click',()=>{
//     titleElement.innerHTML = '予約編集';
//     nameElement.disabled = false;
//     yearSelector.disabled = false;
//     monthSelector.disabled = false;
//     dateSelector.disabled = false;
//     menuSelector.disabled = false;
//     shSelector.disabled = false;
//     smSelector.disabled = false;
//     ehSelector.disabled = false;
//     emSelector.disabled = false;
//     submit_form.style.display = 'block';
//     submit_form.value = '編集を送信する'
//     editButton.style.display = 'none';
//     deleteButton.style.display='none';
//     const id = parseInt(revId.textContent,10);
//     console.log('id:',id);
//     registration_form.setAttribute("action",`/api/todos/${id}`);
//     console.log('この中にformのdisabledをfalseにする関数を入れる');
// });

// deleteButton.addEventListener('click',()=>{
//     const id = parseInt(revId.textContent,10);
//     console.log('id:',id);
//     registration_form.setAttribute("action",`/api/todos/remove/${id}`);
//     submit_form.value = '削除を送信する'
//     submit_form.style.display = 'block';
//     editButton.style.display = 'none';
//     deleteButton.style.display='none';
// })
