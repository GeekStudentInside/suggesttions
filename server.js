var http=require('http');
var express=require('express');

var INFINITY=21000;
var app = express(); 
var node=function(id){
    this.id=id;
    this.links={};
};

var nodes = {};

var updateOptions=function(header){
    return {
        hostname:'http://geekstudentinside.herokuapp.com',
        port:80,
        path:'/getProducts',
        method:'GET'/*,
        headers:{
            'Content-Type':'application/x-www-form-encoded',
            'Content-Length':header.length
        }*/
    };
};

var getOptions={
    hostname:'http://geekstudentinside.herokuapp.com',
    port:80,
    path:'/getProducts',
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
    return {'id1':id1,'id2':id2,'val':weight};
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


var getData=http.request(getOptions,function(res){
    
    res.on('data',function(graph){
        
        //for now test value
        graph=JSON.stringify([{"article1":1,"article2":2,"weight":0.5},
                      {"article1":2,"article2":3,"weight":0.7}]);

        console.log('got graph');
        console.log('graph:'+graph);
        var list=JSON.parse(graph);
        list.forEach(function(elt){
            addLink(elt.article1,elt.article2,elt.weight);
        });
        /**
           dans le body:
           search: {accepted:[liste d'ids],rejectede:[list d'ids]}
        **/
        app.use(express.bodyParser());
        app.post('/search',function(req,res){
            console.log('recieved request');
            console.log(req.body);
            //for now test value
            req.body=[{"article1":1,"article2":2,"weight":0.5},
                      {"article1":2,"article2":3,"weight":0.7}];

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
            var upvalString=JSON.stringify(results);
            var update=http.request(updateOptions(upvalString),function(res){
                
            });
            update.write("upvalString");
            update.end();
            

            res.writeHead(200,{'Content-Type':'application/json'});
            res.write(upvalString);
            res.end();
            console.log(nodes);
        });
       
    });
    app.get(function(req,res){
        res.writeHead(200);
        res.write("suggestions server running");
        res.end();
    });
    app.listen(80);
});
getData.end();
