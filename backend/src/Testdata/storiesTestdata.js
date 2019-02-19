module.exports.testdata = [
  {
    // Logout scenario
    story_id: 386695799, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Logout',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'User',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: [],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.somehomepage.com/myhome']
            },
            {
              id: 2,
              label: 'Logout',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'So I will be navigated to:',
              mid: '',
              values: ['www.somehomepage.com']
            },
            {
              id: 2,
              label: 'Validation',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Successfully logged out']
            }
          ]
        }

      },
    ]
  },
  {
    // Run test functionality
    story_id: 386697647, scenarios: [
      {
        scenario_id: 1,
        name: 'Run Test',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'Guest',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: [],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1, label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.testing.com/myTestPage']
            },
            {
              id: 2,
              label: 'Run',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            }
          ],
          then: [
            {
              id: 1,
              label: 'Validation',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Start running test cases.']
            }
          ]

        }

      },
    ]
  },
  {
    // Sign-Up scenario
    story_id: 386696256, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Sign Up',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'User',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Superman', 'kryptonite'],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.superheroes.com']
            },
            {
              id: 2,
              label: 'Sign Up',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
            {
              id: 3,
              label: 'Username',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['Superman']
            },
            {
              id: 4,
              label: 'Password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['kryptonite']
            },
            {
              id: 5,
              label: 'Finish',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'So I will be navigated to:',
              mid: '',
              values: ['www.superheroes.com/newProfile']
            },
            {
              id: 2,
              label: 'Validation',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Successfully Signed Up']
            }
          ]
        }

      },
      {
        scenario_id: 2,
        name: 'failed Sign Up',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'User',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Superman', 'kryptonite'],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visite this site:',
              mid: '',
              values: ['www.superheroes.com']
            },
            {
              id: 2,
              label: 'Sign Up',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
            {
              id: 3,
              label: 'Username',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['Superman']
            },
            {
              id: 4,
              label: 'Password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['kryptonite']
            },
            {
              id: 5,
              label: 'Finish',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'So I will be navigated to:',
              mid: '',
              values: ['www.superheroes.com/newProfile']
            },
            {
              id: 2,
              label: 'Validation',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Error code 4711']
            }
          ]
        }

      }
    ]
  },
  {
    // Access scenario
    story_id: 386696070, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Authentication',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'User',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Spiderman', 'MaryJane'],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.mjdiaries.com']
            },
            {
              id: 2,
              label: 'Forum',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
            {
              id: 3,
              label: 'Username',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['Spiderman']
            },
            {
              id: 4,
              label: 'Password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['MaryJane']
            },
            {
              id: 5,
              label: 'Enter',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'So I will be navigated to:',
              mid: '',
              values: ['www.mjdiaries.com/forum']
            },
          ]
        }

      },
      {
        scenario_id: 2,
        name: 'failed Authentication',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'User',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Spiderman', 'MaryJane'],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.mjdiaries.com']
            },
            {
              id: 2,
              label: 'Forum',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
            {
              id: 3,
              label: 'Username',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['Spiderman']
            },
            {
              id: 4,
              label: 'Password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['MaryJane']
            },
            {
              id: 5,
              label: 'Enter',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'So I will be navigated to:',
              mid: '',
              values: ['www.mjdiaries.com/nope']
            },
            {
              id: 2,
              label: 'User not allowed',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['You dont have ther permission to enter the forum!']
            }
          ]
        }

      }
    ]
  },
  {
    // Delete scenarios
    story_id: 386693823, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Deletion',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'User',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Punisher', 'Bullseye'],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com']
            },
            {
              id: 2,
              label: 'Username',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['Punisher']
            },
            {
              id: 3,
              label: 'Password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['Bullseye']
            },
            {
              id: 4,
              label: 'Delete Scenario',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Scenario Deleted',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Scenario successfully deleted']
            }
          ]
        }

      },
      {
        scenario_id: 2,
        name: 'No Scenario to delete',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'User',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Punisher', 'Bullseye'],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com']
            },
            {
              id: 2,
              label: 'Username',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['Punisher']
            },
            {
              id: 3,
              label: 'Password',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['Bullseye']
            },
            {
              id: 4,
              label: 'Delete Scenario',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Scenario not found',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Scenario_Id does not exist']
            }
          ]
        }

      }
    ]
  },
  {
    // Story creation
    story_id: 386693457, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Story creation',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'Guest',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: [],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com']
            },
            {
              id: 2,
              label: 'Create Story',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 2,
              label: 'Success',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['New Story created']
            }
          ]
        }

      },
      {
        scenario_id: 2,
        name: 'failed Story creation',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'Guest',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: [],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com']
            },
            {
              id: 2,
              label: 'Create Story',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 2,
              label: 'Error',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Could not create Story']
            }
          ]
        }

      }
    ]
  },
  {
    // Scenario creation
    story_id: 382626033, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Scenario creation',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'Guest',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: [],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com']
            },
            {
              id: 2,
              label: 'Create Scenario',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Success',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['New Scenario created']
            }
          ]
        }

      },
      {
        scenario_id: 2,
        name: 'failed Scenario creation',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'Guest',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: [],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com']
            },
            {
              id: 2,
              label: 'Create Scenario',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Error',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Could not create Scenario']
            }
          ]
        }

      }
    ]
  },
  {
    // Visual test response
    story_id: 386692544, scenarios: [
      {
        scenario_id: 1,
        name: 'Visual Test Response',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'User',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['Superman', 'kryptonite'],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.cucumber.com']
            },
            {
              id: 2,
              label: 'Test it',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'So I will be navigated to:',
              mid: '',
              values: ['www.cucumber.com/results']
            },
            {
              id: 2,
              label: 'Result',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['ThenStep 1 Success']
            },
            {
              id: 3,
              label: 'Result',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['ThenStep 2 Failed']
            }
          ]
        }

      }
    ]
  },
  {
    // Login scenario
    story_id: 386694507, scenarios: [
      {
        scenario_id: 1,
        name: 'successful Login',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'Guest',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: [],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.addeso.de']
            },
            {
              id: 2,
              label: 'Login',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
            {
              id: 3,
              label: 'Pets',
              type: 'Checkbox',
              pre: 'I want to select from the',
              mid: 'multiple selection, the values',
              values: ['Cat', 'Dog', 'Spider']
            }
          ],
          then: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'So I will be navigated to:',
              mid: '',
              values: ['www.adesso.de/myProfile']
            },
            {
              id: 2,
              label: 'Validation',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Successfully logged in']
            }
          ]
        }

      },
      {
        scenario_id: 2,
        name: 'failed Login',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'User',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: ['SomeUsername', 'Secret666'],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visite this site:',
              mid: '',
              values: ['www.gamestar.de']
            },
            {
              id: 2,
              label: 'Login',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
            {
              id: 3,
              label: 'Games',
              type: 'Radio',
              pre: 'I want to select from the',
              mid: 'selection, the value',
              values: ['Rpg']
            }
          ],
          then: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'So I will be navigated to:',
              mid: '',
              values: ['www.gamestar.de/login']
            },
            {
              id: 2,
              label: 'Validation',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Password or User incorrect']
            }
          ]
        }

      }
    ]
  },
  {
    // Rename scenarios
    story_id: 386692174, scenarios: [
      {
        scenario_id: 1,
        name: 'Renamed Scenario',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'User',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: [],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.mywebsite.com']
            },
            {
              id: 2,
              label: 'Edit',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
            {
              id: 3,
              label: 'Scenario Name',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['Renamed Scenario']
            },
            {
              id: 4,
              label: 'Save',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Validation',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Updated scenario name.']
            }
          ]
        }

      },
      {
        scenario_id: 1,
        name: 'Faild Updating',
        stepDefinitions:
        {
          given: [
            {
              id: 1,
              label: 'Guest',
              type: 'Role',
              pre: 'As a',
              mid: '',
              values: [],
              selection: ['Guest', 'User']
            }
          ],
          when: [
            {
              id: 1,
              label: 'Website',
              type: 'Website',
              pre: 'I want to visit this site:',
              mid: '',
              values: ['www.mywebsite.com']
            },
            {
              id: 2,
              label: 'Edit',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
            {
              id: 3,
              label: 'Scenario Name',
              type: 'Field',
              pre: 'I want to insert into the',
              mid: 'field, the value/text',
              values: ['Renamed Scenario']
            },
            {
              id: 4,
              label: 'Save',
              type: 'Button',
              pre: 'I want to click the Button:',
              mid: '',
              values: []
            },
          ],
          then: [
            {
              id: 1,
              label: 'Validation',
              type: 'Text',
              pre: 'So i can see in  the',
              mid: 'textbox, the text',
              values: ['Could not update scenario name!']
            }
          ]
        }

      },
    ]
  },
]
