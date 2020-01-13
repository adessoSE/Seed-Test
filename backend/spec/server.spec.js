var request = require("request");
var base_url = "http://localhost:8080/api"
var mongo = require('../src/database/mongodatabase')
var helper = require('../src/serverHelper')

describe("Server", function() {
    describe("GET /api", function() {
      it("returns status code 200", function(done) {
        request.get(base_url, function(error, response, body) {
          expect(response.statusCode).toBe(200);
          done();
      });
    });
  })

  //describe("GET /api/stepTypes", function() {
  //  it("returns status code 200", function(done) {
  //    let result = [{"_id":"5dce728851e70f2894a170b4","id":"","stepType":"when","type":"HoverOverAndSelect","pre":"I hover over the element","mid":"and select the option","values":["",""]},{"_id":"5dce728851e70f2894a170b1","id":"","stepType":"when","type":"Textfield","pre":"I insert","mid":"into the field","values":["",""]},{"_id":"5dce728851e70f2894a170b3","id":"","stepType":"when","type":"Dropdown","pre":"I select the option","mid":"from the drop-down-menue","values":["",""]},{"_id":"5dce728851e70f2894a170b6","id":"","stepType":"then","type":"Website","pre":"So I will be navigated to the website:","mid":"","values":[""]},{"_id":"5dce728851e70f2894a170ac","id":"","stepType":"given","type":"Role","pre":"As a","mid":"","values":[""],"selection":["Guest","User"]},{"_id":"5dce728851e70f2894a170ad","id":"","stepType":"given","type":"Website","pre":"I am on the website:","mid":"","values":[""]},{"_id":"5dce728851e70f2894a170b2","id":"","stepType":"when","type":"Radio","pre":"I select ","mid":"from the selection","values":["",""]},{"_id":"5dce728851e70f2894a170b5","id":"","stepType":"when","type":"Checkbox","pre":"I select from the","mid":"multiple selection, the values","values":["",""]},{"_id":"5dce728851e70f2894a170ae","id":"","stepType":"example","type":"Add Variable","pre":"","mid":"","values":[""]},{"_id":"5dce728851e70f2894a170af","id":"","stepType":"when","type":"Website","pre":"I go to the website:","mid":"","values":[""]},{"_id":"5dce728851e70f2894a170b7","id":"","stepType":"then","type":"Text","pre":"So I can see the text","mid":"in the textbox:","values":["",""]},{"_id":"5dce728851e70f2894a170b0","id":"","stepType":"when","type":"Button","pre":"I click the button:","mid":"","values":[""]},{"_id":"5dceba181c9d440000a08bac","id":"","stepType":"then","type":"Not This Text","pre":"So I can't see the text:","mid":"","values":[""]},{"_id":"5df38b4d1c9d440000dd807a","id":"","stepType":"given","type":"Undefined Step","pre":"Recommended Title:","mid":"","values":[""]},{"_id":"5df38bbc1c9d440000dd807b","id":"","stepType":"when","type":"Undefined Step","pre":"Recommended Title:","mid":"","values":[""]},{"_id":"5df38bd61c9d440000dd807c","id":"","stepType":"then","type":"Undefined Step","pre":"Recommended Title:","mid":"","values":[""]}]
  //    spyOn(mongo, 'showSteptypes').and.returnValue(745);
//
  //    request.get(base_url + '/stepTypes', function(error, response, body) {
  //      expect(response.statusCode).toBe(200);
  //      expect(body).toBe(result);
  //      expect(mongo.showSteptypes).toHaveBeenCalled();
  //      done();
  //    });
  //  });
  //});
  //describe("GET /api/stories/:user/:repository/:token?", function() {
  //    it("returns status code 200", function(done) {
  //      let githubName = req.params.user;
  //      let githubRepo = req.params.repository;
  //      let token = req.params.token;
  //      
  //      request.get(base_url, function(error, response, body) {
  //        expect(response.statusCode).toBe(200);
  //        done();
  //    });
  //  });
  //})
  describe("GET /api/runFeature/:issueID", function() {
    it("returns status code 200", function(done) {
     spyOn(helper, 'runReport')
      let issueID = 1;

      request.get(base_url + '/runFeature/' + issueID, function(error, response, body) {
        expect(response.statusCode).toBe(200);
        expect(helper.runReport).toHaveBeenCalled();
        done();
      });
    });
  })

  
});