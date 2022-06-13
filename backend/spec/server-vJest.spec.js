const fetch = require('node-fetch');

const base_url = 'http://localhost:8080/api';

describe('Server', () => {
  describe('GET /api', () => {
    it('returns status code 200', (done) => {
      fetch(base_url)
      .then((response) => {
        expect(response.status).toBe(200);
        done();
      });
    });
  });
  describe('GET /api/mongo/stepTypes', () => {
    it('returns status code 200', (done) => {
      const result = [
        {  "_id": "5dce728851e70f2894a170b1" ,  "id": 1,  "stepType": "when",  "type": "Textfield",  "pre": "I insert",  "mid": "into the field ",  "values": [    "",    ""  ]}, 
        {  "_id": "5dce728851e70f2894a170ac" ,  "id": 0,  "stepType": "DISABLED_FOR_NOW",  "type": "Role",  "pre": "As a",  "mid": "",  "values": [    ""  ],  "selection": [    "Guest",    "User"  ]}, 
        {  "_id": "5dce728851e70f2894a170af" ,  "id": 0,  "stepType": "when",  "type": "Go To Website / URL",  "pre": "I go to the website:",  "mid": "",  "values": [    ""  ]}, 
        {  "_id": "5dce728851e70f2894a170b0" ,  "id": 10,  "stepType": "when",  "type": "Button",  "pre": "I click the button:",  "mid": "",  "values": [    ""  ]}, 
        {  "_id": "5df38b4d1c9d440000dd807a" ,  "id": 500,  "stepType": "given",  "type": "New Step",  "pre": "Recommended Title:",  "mid": "",  "values": [    ""  ]}, 
        {  "_id": "5df38bbc1c9d440000dd807b" ,  "id": 500,  "stepType": "when",  "type": "New Step",  "pre": "Recommended Title:",  "mid": "",  "values": [    ""  ]}, 
        {  "_id": "5df38bd61c9d440000dd807c" ,  "id": 500,  "stepType": "then",  "type": "New Step",  "pre": "Recommended Title:",  "mid": "",  "values": [    ""  ]}, 
        {  "_id": "5ef31e3094180545b0a51d1e" ,  "id": 498,  "stepType": "when",  "type": "Wait",  "pre": "The site should wait for",  "mid": "milliseconds",  "values": [    ""  ]}, 
        {  "_id": "5ef3235337a8b767ac5f87ad" ,  "id": 20,  "stepType": "when",  "type": "Checkbox",  "pre": "I check the box",  "mid": "",  "values": [    ""  ]}, 
        {  "_id": "5ef9bf4e0fbf442e64632c90" ,  "id": 0,  "stepType": "given",  "type": "Website / URL",  "pre": "I am on the website:",  "mid": "",  "values": [    ""  ]}, 
        {  "_id": "5ef9bf4e0fbf442e64632c95" ,  "id": 50,  "stepType": "when",  "type": "Radio-Selection",  "pre": "I select",  "mid": "from the selection ",  "values": [    "",    ""  ]}, 
        {  "_id": "5ef9bf4e0fbf442e64632c9c" ,  "id": 3,  "stepType": "then",  "type": "Text in Textbox",  "pre": "So I can see the text",  "mid": "in the textbox: ",  "values": [    "",    ""  ]}, 
        {  "_id": "5ef9bf4e0fbf442e64632c9e" ,  "id": 2,  "stepType": "then",  "type": "Text Not on Page",  "pre": "So I can't see the text:",  "mid": "",  "values": [    ""  ]}, 
        {  "_id": "5ef9bf4e0fbf442e64632c96" ,  "id": 30,  "stepType": "when",  "type": "Dropdown Menu",  "pre": "I select the option",  "mid": "from the drop-down-menue ",  "values": [    "",    ""  ]}, 
        {  "_id": "5ef9bf4e0fbf442e64632c97" ,  "id": 40,  "stepType": "when",  "type": "Hover Over & Select",  "pre": "I hover over the element",  "mid": "and select the option ",  "values": [    "",    ""  ]}, 
        {  "_id": "5ef9bf4e0fbf442e64632c98" ,  "id": 0,  "stepType": "DISABLED_FOR_NOW",  "type": "ListSelection",  "pre": "I select from the",  "mid": "multiple selection, the values ",  "values": [    "",    ""  ]},
        {  "_id": "5ef9bf4e0fbf442e64632c9b" ,  "id": 0,  "stepType": "then",  "type": "Correct Website / URL",  "pre": "So I will be navigated to the website:",  "mid": "",  "values": [    ""  ]},
        {  "_id": "5ef9bf4e0fbf442e64632c9d" ,  "id": 1,  "stepType": "then",  "type": "Check Text on Page",  "pre": "So I can see the text:",  "mid": "",  "values": [    ""  ]},
        {  "_id": "5ef9bf4e0fbf442e64632c91" ,  "id": 0,  "stepType": "example",  "type": "Add Variable",  "pre": "",  "mid": "",  "values": [    ""  ]},
        {  "_id": "5f074774db3141c39ccbd086" ,  "id": 399,  "stepType": "when",  "type": "Switch Tab",  "pre": "I switch to the next tab",  "mid": "",  "values": ""}
      ];
      
      const ab = fetch(`${base_url}/mongo/stepTypes`)
      .then((response) => {
        console.log("status ",response.status);
        expect(response.status).toBe(200);
        return response.json()
      })
      .then((body)=>{// when test timeout something doesn't match
        for(const step of result){
          expect(body).toContainEqual(step);
        }
        done();
      }).catch((err)=>console.error(err))
    });
  });
});
