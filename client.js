var http=require('http');

http.createServer(function(req,res){
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end('[{"article1":1,"article2":2,"weight":0.5},{"article1":2,"article2":3,"weight":0.7}]');
}).listen(1993);
