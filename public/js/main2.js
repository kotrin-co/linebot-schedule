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
    nameElement.setAttribute('name','name');
    nameElement.value = targetUser.display_name;
    nameElement.disabled = true;
    pName.appendChild(nameElement);
    formElement.appendChild(pName);
    // div.appendChild(pName);

    const pCut = document.createElement('p');
    pCut.textContent = 'カット時間(分)：';
    const cutInput = document.createElement('input');
    cutInput.setAttribute('class','timeInput');
    cutInput.setAttribute('name','cuttime');
    cutInput.value = targetUser.cuttime;
    cutInput.disabled = true;
    pCut.appendChild(cutInput);
    formElement.appendChild(pCut);
    
    const pColor = document.createElement('p');
    pColor.textContent = 'カラーリング時間(分)：';
    const colorInput = document.createElement('input');
    colorInput.setAttribute('class','timeInput');
    colorInput.setAttribute('name','colortime');
    colorInput.value = targetUser.colortime;
    colorInput.disabled = true;
    pColor.appendChild(colorInput);
    formElement.appendChild(pColor);

    const divButton = document.createElement('div');

    const cancelButton = document.createElement('button');
    cancelButton.setAttribute('class','dialogButton');
    cancelButton.setAttribute('type','button');
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
        colorInput.disabled = false;
        const submitButton = document.createElement('input');
        submitButton.value = '送信';
        submitButton.type = 'submit';
        formElement.setAttribute('action',`/api/todos/users/${targetUser.id}`);
        editButton.setAttribute('class','dialogButton');
        editButton.style.display = 'none';
        deleteButton.style.display = 'none';
        divButton.appendChild(submitButton);
    });
    divButton.appendChild(editButton);

    const deleteButton = document.createElement('input');
    deleteButton.setAttribute('class','dialogButton');
    deleteButton.value = '削除';
    deleteButton.type = 'button';
    deleteButton.addEventListener('click',()=>{
        const submitButton = document.createElement('input');
        submitButton.value = '本当に削除しますよ';
        submitButton.type = 'submit';
        formElement.setAttribute('action',`/api/todos/users/remove/${targetUser.id}`);
        deleteButton.setAttribute('class','dialogButton');
        deleteButton.style.display = 'none';
        editButton.style.display = 'none';
        divButton.appendChild(submitButton);
    });
    divButton.appendChild(deleteButton);

    formElement.appendChild(divButton);

    div.appendChild(formElement);
    document.body.appendChild(div);
}