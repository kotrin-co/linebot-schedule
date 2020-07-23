const rButton = document.getElementById('rButton');
const pButton = document.getElementById('pButton');
const h2Element = document.getElementById('month');

const thisMonth = new Date().getMonth+1;
const today = new Date().getDate();

const displayCalendar = () =>{
    h2Element.textContent = `${thisMonth}`;
    for(let i=0;i<7;i++){
        const tdElement = document.getElementById(`d${i}`);
        tdElement.textContent = `${today+i}`;
    }
}

rButton.addEventListener('click',(event)=>{
    alert('Rボタンが押された！');
});

pButton.addEventListener('click',(event)=>{
    alert('Pボタンが押された！');
});

displayCalendar();
