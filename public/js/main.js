const rButton = document.getElementById('rButton');
const pButton = document.getElementById('pButton');
const h2Element = document.getElementById('monthArea');

const thisMonth = new Date().getMonth()+1;
const today = new Date().getDate();
const dayOfTheWeek = new Date().getDay();

const weeks = ['日','月','火','水','木','金','土'];

const displayCalendar = () =>{
    h2Element.textContent = `${thisMonth}月`;
    for(let i=0;i<7;i++){
        const dayElement = document.getElementById(`d${i}`);
        dayElement.textContent = `${today+i}`;
        const weekElement = document.getElementById(`w${i}`);
        if(dayOfTheWeek+i<7){
            weekElement.textContent = weeks[dayOfTheWeek+i];
            if(dayOfTheWeek+i === 0){
                dayElement.setAttribute('title','red');
                weekElement.setAttribute('title','red');
            }else if(dayOfTheWeek+i === 6){
                dayElement.setAttribute('title','blue');
                weekElement.setAttribute('title','blue');
            }
        }else{
            weekElement.textContent = weeks[dayOfTheWeek+i-7];
            if(dayOfTheWeek+i-7 === 0){
                dayElement.setAttribute('title','red');
                weekElement.setAttribute('title','red');
            }else if(dayOfTheWeek+i-7 === 6){
                dayElement.setAttribute('title','blue');
                weekElement.setAttribute('title','blue');
            }
        }
    }
}

rButton.addEventListener('click',(event)=>{
    alert('Rボタンが押された！');
});

pButton.addEventListener('click',(event)=>{
    alert('Pボタンが押された！');
});

displayCalendar();
