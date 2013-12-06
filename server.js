var http=require('http');
var express=require('express');

var request = require('request');
var INFINITY=21000;
var app = express(); 
var node=function(id){
    this.id=id;
    this.links={};
};

var nodes = {};

var updateOptions= {
        hostname:'http://172.17.2.163',
        port:9000,
        path:'/setWeight',
        method:'POST',
        headers:{
            'Content-Type':'application/json'      
        }
};

var getOptions={
    hostname:'http://172.17.2.163',
    port:9000,
    path:'/getLinks',
    method:'GET'
};

var get=function(id){
    if(nodes[id]===undefined){
        nodes[id]=new node(id);
    }
    return nodes[id];
};

var addLink = function(id1,id2,weight){
    if(weight===undefined){
        weight=INFINITY;
    }
    get(id1).links[id2]=weight;
    get(id2).links[id1]=weight;
};
var linkExists = function(id1,id2){
    return get(id1).links[id2]!==undefined;
};

//returns {id1:id1,id2:id2,val:weight}
var modifyLink=function(id1,id2,f){
    if(!linkExists(id1,id2)){
        addLink(id1,id2);
    }
    get(id1).links[id2]=f(get(id1).links[id2]);
    var weight=(get(id2).links[id1]=get(id1).links[id2]);
    return {'article1':id1.toString(),'article2':id2.toString(),'weight':weight.toString()};
};

var incrementLink=function(id1,id2){
    return modifyLink(id1,id2,function(x){return x/2;});
};

var decrementLink=function(id1,id2){
    return modifyLink(id1,id2,function(x){return 2*x;});
};

var toList=function(dictionary){
    var rV=[];
    for(var i in dictionary){
        rV.push({'key':i,
                 'value':dictionary[i]
                });
    }
    return rV;
}

var getTwoClosest=function(id){
    if(id===undefined){
        return [];
    }
    var sortedLinks = toList(get(id).links).sort(function(a,b){return a.value-b.value;});
    return ([sortedLinks[0]?sortedLinks[0].key:undefined,
             sortedLinks[1]?sortedLinks[1].key:undefined]).filter(function(elt){
        return elt!==undefined;});
};

var getSuggestions=function(ids){
    var suggestions=ids.map(function(id){
        var closest=getTwoClosest(id);
        var nextClosest=getTwoClosest(closest[0]);
        var nextClosestest=getTwoClosest(closest[1]);
        return closest.concat(nextClosest).concat(nextClosestest);
    });

    return suggestions.reduce(function(prev,currentValue){
        return prev.concat(currentValue);
    },[]);
};


var getLink="http://geekstudentinside.herokuapp.com/getLinks";
var getData=http.get(getLink,function(res){
    console.log('yo');
    res.on('data',function(graph){
        console.log('got graph');
        console.log('graph:'+graph);
        var list=JSON.parse(graph);
        list.forEach(function(elt){
            addLink(elt.article1.id,elt.article2.id,elt.weight);
        });
        /**
           dans le body:
           search: {accepted:[liste d'ids],rejectede:[list d'ids]}
        **/
        app.use(express.bodyParser());
        app.post('/search',function(req,res){
            console.log('recieved request');
            console.log(req.body);
            var post = req.body.search;
            var acc=post.accepted;
            console.log('accepxted');
            console.log(acc);
            var rej=post.rejected;
            console.log('rejected');
            console.log(rej);
            var upVal=[];
            var i,j;
            for(i=0;i<acc.length;i++){
                for(j=i+1;j<acc.length;j++){
                    upVal.push(incrementLink(acc[i],acc[j]));
                }
            }
            for(i=0;i<acc.length;i++){
                for(j=0;j<rej.length;j++){
                    upVal.push(decrementLink(acc[i],rej[j]));
                }
            }
            
            var all=acc.concat(rej);
            var suggestions=getSuggestions(acc);
            suggestions=suggestions.filter(function(elt){
                console.log(all);
                return all.indexOf(elt)==-1;
            });
            
            var results = suggestions.slice(0,5);
            var resultString=JSON.stringify(results);
            var upvalString = JSON.stringify(upVal);
            console.log(upvalString);
            console.log('got here');
            
            request.post({url: 'http://geekstudentinside.herokuapp.com/setWeight',
                          body:upvalString,
                          headers:{'content-type':'application/json'}},
                         function(error,response,body){
                             console.log('the body');
                             console.log(body);
                         });
            
            

            res.writeHead(200,{'Content-Type':'application/json'});
            res.write(resultString);
            res.end();
            console.log(nodes);
        });
       
    });
});
var port = process.env.PORT || 5000;
/*
app.get('/',function(req,res){
    res.writeHead(200);
    res.write("suggestions server running");
    res.end();
});*/
app.listen(port);
console.log('yoyo');
getData.on('error',function(err){
    console.log(err);
});
