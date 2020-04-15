'use strict';
const express = require('express');
const app = express();
var http = require('http');
const path = require('path');
var port = process.env.PORT || 1335;
var WebSocket = require('ws');
app.use(express.static(__dirname + '/public'));

app.get('/',function(res,req){
    res.sendFile(path.join(__dirname, "public/main.html"));
});


const webServer = http.createServer(app).listen(port, () => {
    console.log("LISTENING HTTP!");
});

class Player {
    constructor(client,id) {
        this.properties = {
            id: id,
        };
        this.connected = true;
        this.client = client;
        this.client.on('close', () => {
            this.connected = false;
        });
        this.peeking = {};
    }

    get id(){
        return this.properties.id;
    }

    processControl(msg) {
        switch (msg) {
            case 'none': break;
        }
    }
    update(objects) {
        this.client.send(objects);
    }
}

const CARDS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const SUITS = ['♠','♣','♥','♦'];
let DECK = undefined;
let CardList = undefined;
class Card{
    constructor(face, x,y,z){
        this.obj={
            id:-1,
            x:x,
            y:y,
            z:z,
            faceup:false,
            face:{suit:"", value:""}
        };
        this.face = face;

    }
    set id(val){
        this.obj.id = val;
    }
    get id(){
        return this.obj.id;
    }
    setPos(pos){
        this.obj.x = pos.x;
        this.obj.y = pos.y;
        this.obj.z = pos.z;
    }
    get faceup(){
        return this.obj.faceup;
    }
    flip(){
        this.obj.faceup = !this.obj.faceup;
        if(this.obj.faceup === true){
            this.obj.face.suit = this.face.suit;
            this.obj.face.value = this.face.value;
        }else{
            this.obj.face.suit = "";
            this.obj.face.value = "";
        }
    }

}

function reset(){
    DECK = [];
    CardList = [];
    SUITS.forEach((s)=>{
        CARDS.forEach((c)=>{
            let card = new Card({suit:s,value:c},0,0,0)
            DECK.push(card);            
        })
    });
    
    for(let i=0;i<10;i++){
        DECK.sort((a,b)=>{
            return (Math.random()*2 - 1);
        });
    }
    let cardid = 0;
    DECK.forEach((c)=>{
        c.id = cardid++;
        CardList.push(c.obj);
    });
}

reset();


const wsserver = new WebSocket.Server({ server: webServer });

let PlayerList = {};
let id=0;
function SendToAllOtherPlayers(player,msg){
    Object.keys(PlayerList).forEach((p)=>{
        if(PlayerList[p]!==player){
            PlayerList[p].update(msg);
        }
    })
}
function SendToAllPlayers(msg){
    Object.keys(PlayerList).forEach((p)=>{
        PlayerList[p].update(msg);
    })
}
wsserver.on('connection', (client) => {
    let player = new Player(client, id);

    player.client.on('message',     
        (e) => {
            try {
                let msg = JSON.parse(e);
                console.log(msg);
                switch (msg.cmd) {
                    case 'none': break;
                    case 'move':
                        DECK[msg.id].setPos(msg.pos);
                        SendToAllOtherPlayers(player,JSON.stringify({cmd:"move",id:msg.id,pos:msg.pos}));
                    break;
                    case 'flip':
                        DECK[msg.id].flip();                        
                        SendToAllPlayers(JSON.stringify({cmd:"flip",id:msg.id,faceup:DECK[msg.id].faceup,face:DECK[msg.id].faceup?DECK[msg.id].face:{suit:"",value:""}}));
                        break;
                    case 'peek':
                        if(player.peeking[msg.id]===true)
                        {
                            player.peeking[msg.id] = false;
                        }else{
                            player.peeking[msg.id] = true;
                        }
                        console.log(player.peeking[msg.id])
                        player.update(JSON.stringify(
                            {cmd:'peek',id:msg.id,
                            peeking:player.peeking[msg.id],
                            face:player.peeking[msg.id]?DECK[msg.id].face:{suit:"",value:""}}
                        ));
                        SendToAllOtherPlayers(player,JSON.stringify({cmd:"playerpeeking",playerid:player.id,id:msg.id,peeking:player.peeking[msg.id]}));
                        break;
                    default:player.processControl(msg.cmd);break;
                }            
            } catch(exp) {
                console.log('Not Json: ' + exp);
            }
        }
    );
    player.update(JSON.stringify({cmd:'cardpositions',positions:CardList}));
    PlayerList[id++] = player;
});

