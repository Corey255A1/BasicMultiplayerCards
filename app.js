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
            pos:{x:20,y:20}
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

    set pos(val){
        this.pos.x = val.x;
        this.pos.y = val.y;
    }
    get pos(){
        return this.properties.pos;
    }

    processControl(msg) {
        switch (msg) {
            case 'none': break;
        }
    }
    update(cmd,parameters) {
        this.client.send(JSON.stringify({cmd:cmd,parameters:parameters}));
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
function SendToAllOtherPlayers(player, cmd, parameters){
    Object.keys(PlayerList).forEach((p)=>{
        if(PlayerList[p]!==player){
            PlayerList[p].update(cmd, parameters);
        }
    })
}
function SendToAllPlayers(cmd, parameters){
    Object.keys(PlayerList).forEach((p)=>{
        PlayerList[p].update(cmd, parameters);
    })
}
wsserver.on('connection', (client) => {
    let player = new Player(client, id);

    player.client.on('message',     
        (e) => {
            try {
                let msg = JSON.parse(e);
                let cmd = msg.cmd;
                let params = msg.parameters;
                console.log(msg);
                switch (cmd) {
                    case 'moveplayer': 
                        player.pos = params.pos;
                        SendToAllOtherPlayers(player,"playermove",{id:player.id,pos:player.pos});
                    break;
                    case 'move':
                        DECK[params.id].setPos(params.pos);
                        SendToAllOtherPlayers(player,"move",{id:params.id,pos:params.pos});
                    break;
                    case 'flip':
                        DECK[params.id].flip();                        
                        SendToAllPlayers("flip",{id:params.id,faceup:DECK[params.id].faceup,face:DECK[params.id].faceup?DECK[params.id].face:{suit:"",value:""}});
                        break;
                    case 'peek':
                        if(player.peeking[params.id]===true)
                        {
                            player.peeking[params.id] = false;
                        }else{
                            player.peeking[params.id] = true;
                        }
                        console.log(player.peeking[params.id])
                        player.update('peek',
                            {
                                id:params.id,
                                peeking:player.peeking[params.id],
                                face:player.peeking[params.id]?DECK[params.id].face:{suit:"",value:""}
                            });
                        SendToAllOtherPlayers(player,"playerpeeking",{playerid:player.id,id:params.id,peeking:player.peeking[params.id]});
                        break;
                    case 'reset':
                        reset();
                        SendToAllPlayers('cardpositions',{positions:CardList});
                    default:player.processControl(params.cmd);break;
                }            
            } catch(exp) {
                console.log('Not Json: ' + exp);
            }
        }
    );
    let templist=[];
    Object.keys(PlayerList).forEach((p)=>{
        templist.push({id:PlayerList[p].id, pos:PlayerList[p].pos})
    });
    player.update('cardpositions',{positions:CardList});
    player.update('playerpos',{pos:player.pos, playerpositions:templist});
    SendToAllOtherPlayers(player,'addplayer',{pos:player.pos, id:player.id});
    PlayerList[id++] = player;
});

