heroku git:remote -a cucumberapp
git subtree push --prefix backend heroku master
heroku git:remote -a cucumber-app
git subtree push --prefix frontend heroku master
PAUSE
