var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var data;
var request = new XMLHttpRequest();
request.open('GET', 'https://api.github.com/repos/dsorna/cucumber-test/issues');
request.send();

// testing, test2
request.onreadystatechange=function(){
  if (this.readyState===4 && this.status===200){
    data = JSON.parse(request.responseText);
    console.log(data[0]["title"] + " " + data[0]["id"])
    console.log(data[1]["title"] + " " + data[1]["id"])
  }
}

