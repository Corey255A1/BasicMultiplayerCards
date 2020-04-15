class Card{
    constructor(id, x, y, z, flipcb, peekcb){
        this.id = id;
        this.num = 0;
        this.suit = 'unknown';
        this.domElem = document.createElement('div');
        this.cardVal = document.createElement('div');
        this.controls = document.createElement('div');
        this.peekingplayerelem = document.createElement('div');
        this.peekingplayerelem.classList.add('whoispeeking');
        this.peekBtn = document.createElement('button');
        this.peekBtn.textContent = "Peek";
        this.flipBtn = document.createElement('button');
        this.flipBtn.textContent = "Flip";
        this.peekBtn.addEventListener('click',()=>{
            peekcb(this.id);
        });
        this.flipBtn.addEventListener('click',()=>{
            flipcb(this.id);
        });
        this.domElem.appendChild(this.cardVal);
        this.domElem.classList.add('playingcard');
        this.domElem.classList.add('back');
        this.domElem.id = 'card-'+this.id;
        this.domElem.cardnum = this.id;
        this.controls.appendChild(this.peekBtn);
        this.controls.appendChild(this.flipBtn);
        this.domElem.appendChild(this.controls);
        this.domElem.appendChild(this.peekingplayerelem);
        this.pos = {x:0,y:0,z:0}
        this.x = x;
        this.y = y;
        this.z = z;
        this._faceup = false;
        this._peeking = false;
        this._flipped = false;
        this._peelingplayer = '';
        this.val = '';
    }
    move(dx,dy){
        this.x = this.pos.x+dx;
        this.y = this.pos.y+dy;
    }
    set flipped(val){
        this._flipped = val;
        this.faceup = (this._flipped || this._peeking);
    }
    set peeking(val){
        this._peeking= val;
        this.faceup = (this._flipped || this._peeking);
    }
    set peekingplayer(val){
        this._peekingplayer = val;
        if(val!=="") this.peekingplayerelem.textContent = val +' is peeking';
        else this.peekingplayerelem.textContent = '';

    }
    get faceup(){
        return this._faceup;
    }
    set faceup(val){
        this._faceup = val;
        if(!this._faceup){
            this.domElem.classList.remove('front');
            this.domElem.classList.add('back');
            this.cardVal.textContent = '';
        }else{
            this.domElem.classList.remove('back');
            this.domElem.classList.add('front');
            this.cardVal.textContent = this.val.value + this.val.suit;
        }
    }
    setPos(pos){
        this.x = pos.x;
        this.y = pos.y;
        this.z = pos.z;
    }
    set x(x){
        this.pos.x = x;
        this.domElem.style.left = x +'px';
    }
    set y(y){
        this.pos.y = y
        this.domElem.style.top = y +'px';
    }
    set z(z){
        this.pos.z = z
        this.domElem.style.zIndex = z;
    }
    set face(val){
        this.val = val;
        if(this._faceup){
            this.cardVal.textContent = this.val.value + this.val.suit;
        }
        switch(this.val.suit){
         case '♥':
         case '♦':
            this.domElem.classList.remove('black');
            this.domElem.classList.add('red');
            break;
        case '♠':
        case '♣':
            this.domElem.classList.remove('red');
            this.domElem.classList.add('black');
            break;
        default:
            this.domElem.classList.remove('black');
            this.domElem.classList.remove('red');
            break;
        }
    }
}
let CardMap = undefined;
let DECK = [];
function reset(){
    if(CardMap !== undefined){
        Object.keys(CardMap).forEach((c)=>{
            playingcards.removeChild(CardMap[c].domElem);
        });
    }
    CardMap = {};

    for(let i = 0; i<DECK.length; i++){
        let tempCard = new Card(i, 50, 50, 1);
        tempCard.face = DECK[i];
        
        CardMap[tempCard.domElem.id] = tempCard;
        //tempCard.flip();
    }
}

const playingcards = document.getElementById('playingcards');
document.getElementById('reset').addEventListener('click',()=>{
    reset();
});

const ws = new WebSocket('ws://compy:1335');

function flipCard(id){
    ws.send(JSON.stringify({cmd:'flip',id:id}))
}
function peekCard(id){
    ws.send(JSON.stringify({cmd:'peek',id:id}))
}
function moveCard(id,pos){
    ws.send(JSON.stringify({cmd:'move',id:id, pos:pos}));
}
ws.addEventListener('message',(m)=>{
    let msg = JSON.parse(m.data);
    switch(msg.cmd){
        case 'move':
            CardMap[msg.id].setPos(msg.pos);
            break;
        case 'flip':
            CardMap[msg.id].face = msg.face;
            CardMap[msg.id].flipped = msg.faceup;
            break;
        case 'peek':
            CardMap[msg.id].face = msg.face;
            CardMap[msg.id].peeking = msg.peeking;
            break;
        case 'cardpositions':{
            if(CardMap === undefined){
                CardMap = {};
            }
            msg.positions.forEach((pos)=>{
                if(CardMap[pos.id]===undefined){
                    CardMap[pos.id] = new Card(pos.id,pos.x,pos.y,pos.z,flipCard,peekCard);
                    CardMap[pos.id].flipped = pos.faceup;
                    CardMap[pos.id].face = pos.face;
                    playingcards.appendChild(CardMap[pos.id].domElem);
                }else{
                    CardMap[pos.id].setPos(pos);
                }
            })
        }
        break;
        case 'playerpeeking':{
            if(msg.peeking){
                CardMap[msg.id].peekingplayer = msg.playerid;
            }else{
                CardMap[msg.id].peekingplayer = "";
            }
            
        }
    }
    console.log();
});


var cardTargetID = undefined;
let zidx = 1;
const delta = {
    lastX:0, 
    lastY:0, 
    newX:0, 
    newY:0, 
    get deltaX(){
        let d = this.newX - this.lastX;
        this.lastX = this.newX
        return d;
    },
    get deltaY(){
        let d = this.newY - this.lastY;
        this.lastY = this.newY
        return d;
    }
}
window.addEventListener('mousedown',(e)=>{
    if(CardMap[e.target.cardnum] !== undefined){
        cardTargetID = e.target.cardnum;
        delta.lastX = e.clientX;
        delta.lastY = e.clientY;
        CardMap[cardTargetID].z = (zidx++);
    }
});
window.addEventListener('mouseup',(e)=>{
    if(cardTargetID!==undefined){
        //console.log(e);
        cardTargetID = undefined;
        
    }
});
window.addEventListener('mousemove',(e)=>{
    if(cardTargetID!==undefined){
        //console.log(e);
        delta.newX = e.clientX;
        delta.newY = e.clientY;
        CardMap[cardTargetID].move(delta.deltaX, delta.deltaY);
        moveCard(cardTargetID,CardMap[cardTargetID].pos);
    }
});

// const canvas = document.getElementById("playingfield");
// const ctx = canvas.getContext("2d");

// var Width = window.innerWidth;
// var Height = window.innerHeight;
// function ResizeCanvas(){
//     canvas.width = Width;
//     canvas.height = Height;
//     canvas.style.width = Width;
//     canvas.style.height = Height;
// }
// ResizeCanvas();
// window.addEventListener('resize',()=>{
//     Width = window.innerWidth;
//     Height = window.innerHeight;
//     ResizeCanvas();
// });






// function animate(){
//     ctx.fillStyle = 'green';
//     ctx.fillRect(0,0,canvas.width,canvas.height);
// }

// animate();