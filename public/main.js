class Card{
    constructor(id, x, y, z, flipcb, peekcb, snapcb){
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
        this.drawBtn = document.createElement('button');
        this.drawBtn.textContent = "Draw";
        this.peekBtn.addEventListener('click',()=>{
            peekcb(this.id);
        });
        this.flipBtn.addEventListener('click',()=>{
            flipcb(this.id);
        });
        this.drawBtn.addEventListener('click',()=>{
            snapcb(this.id);
        });
        this.domElem.appendChild(this.cardVal);
        this.domElem.classList.add('playingcard');
        this.domElem.classList.add('back');
        this.domElem.id = 'card-'+this.id;
        this.domElem.cardnum = this.id;
        this.controls.appendChild(this.peekBtn);
        this.controls.appendChild(this.flipBtn);
        this.controls.appendChild(this.drawBtn);
        this.domElem.appendChild(this.controls);
        this.domElem.appendChild(this.peekingplayerelem);
        this.pos = {x:0,y:0,z:0};
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
class PlayerToken{
    constructor(x,y,id){
        this.domElem = document.createElement('div');
        this.domElem.id = 'playerpos-'+id;
        this.domElem.classList.add('playertoken');
        this.pos = {x:0,y:0};
        this.x = x;
        this.y = y;
    }
    setPos(pos){
        this.x = pos.x;
        this.y = pos.y;
    }
    move(dx,dy){
        this.x = this.pos.x + dx;
        this.y = this.pos.y + dy;
    }
    get id(){
        return this.domElem.id;
    }
    set x(x){
        this.pos.x = x;
        this.domElem.style.left = x +'px';
    }
    set y(y){
        this.pos.y = y
        this.domElem.style.top = y +'px';
    }
}
let CardMap = undefined;
let playerToken = new PlayerToken(0,0,'player');
playerToken.domElem.classList.add('blue');
playerToken.domElem.classList.add('player');
document.body.appendChild(playerToken.domElem);

const ws = new WebSocket('ws://compy:1335');
function send(cmd,parameters){
    ws.send(JSON.stringify({cmd:cmd,parameters:parameters}))
}

let PlayerPositions = {};
let DECK = [];
function reset(){
    if(CardMap !== undefined){
        Object.keys(CardMap).forEach((c)=>{
            playingcards.removeChild(CardMap[c].domElem);
        });
    }
    CardMap = {};
}

const playingcards = document.getElementById('playingcards');
document.getElementById('reset').addEventListener('click',()=>{
    send('reset',{});
});


function flipCard(id){
    send('flip',{id:id});
}
function peekCard(id){
    send('peek',{id:id})
}
function drawCard(id){
    CardMap[id].setPos(playerToken.pos);
    moveCard(id,CardMap[id].pos);
}
function moveCard(id,pos){
    send('move',{id:id, pos:pos});
}
function movePlayer(pos){
    send("moveplayer",{pos:pos});
}
ws.addEventListener('message',(m)=>{
    let msg = JSON.parse(m.data);
    let cmd = msg.cmd;
    let params = msg.parameters;
    switch(cmd){
        case 'addplayer':
            PlayerPositions[params.id] = new PlayerToken(params.pos.x, params.pos.y,params.id);
            document.body.appendChild(PlayerPositions[params.id].domElem);
            break;
        case 'playermove':
            PlayerPositions[params.id].setPos(params.pos);
            break;
        case 'move':
            CardMap[params.id].setPos(params.pos);
            break;
        case 'flip':
            CardMap[params.id].face = params.face;
            CardMap[params.id].flipped = params.faceup;
            break;
        case 'peek':
            CardMap[params.id].face = params.face;
            CardMap[params.id].peeking = params.peeking;
            break;
        case 'playerpos':
            playerToken.setPos(params.pos);
            params.playerpositions.forEach((pp)=>{
                PlayerPositions[pp.id] = new PlayerToken(pp.pos.x, pp.pos.y,pp.id);
                document.body.appendChild(PlayerPositions[pp.id].domElem);
            })
            break;
        case 'cardpositions':{
            reset();
            if(CardMap === undefined){
                CardMap = {};
            }
            params.positions.forEach((pos)=>{
                if(CardMap[pos.id]===undefined){
                    CardMap[pos.id] = new Card(pos.id,pos.x,pos.y,pos.z,flipCard,peekCard,drawCard);
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
            if(params.peeking){
                CardMap[params.id].peekingplayer = params.playerid;
            }else{
                CardMap[params.id].peekingplayer = "";
            }
            
        }
    }
});

var cardTargetID = undefined;
var draggingplayer = false;
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
    if(e.target.id === playerToken.id){
        draggingplayer = true;
        delta.lastX = e.clientX;
        delta.lastY = e.clientY;
    }
    else if(CardMap[e.target.cardnum] !== undefined){
        cardTargetID = e.target.cardnum;
        delta.lastX = e.clientX;
        delta.lastY = e.clientY;
        CardMap[cardTargetID].z = (zidx++);
    }
});
window.addEventListener('mouseup',(e)=>{;
        cardTargetID = undefined;
        draggingplayer = false;
});
window.addEventListener('mousemove',(e)=>{
    if(draggingplayer){
        delta.newX = e.clientX;
        delta.newY = e.clientY;
        playerToken.move(delta.deltaX, delta.deltaY);
        movePlayer(playerToken.pos);
    }
    else if(cardTargetID!==undefined){
        //console.log(e);
        delta.newX = e.clientX;
        delta.newY = e.clientY;
        CardMap[cardTargetID].move(delta.deltaX, delta.deltaY);
        moveCard(cardTargetID,CardMap[cardTargetID].pos);
    }
});