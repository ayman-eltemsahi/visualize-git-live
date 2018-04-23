# VisGitGraph

VisGitGraph allows you to display the internals of the git graph in a visual way in the browser.

It has a nodejs backend that runs on a git directory, analyze it and starts a server which shows the git graph on the browser. The server also updates the graph through websockets as you execute git commands.

The graph shows the following parts of git :
- blob
- tree
- commit
- branch
- head

The nodejs server also watches for file changes on the directory and updates the browser through web sockets. This means that you can start the server, and watch the added nodes and how they are connected while you execute git commands. This can help you understand some of the commands and their differences in git, like the difference between a true merge and a fast forward merge, and what rebase actually does.

### installation
```sh
$ clone https://github.com/Ayman-Mohamed/visgitgraph.git
$ npm install
```

### running
* create a new git directory
* open the file `config.js`, update `gitDirectory` to point to your git directory. 
* you can change the server port in the config file as well. 
* run 
     ```sh 
     $ npm start
  ```
* a server will start at ```http://localhost:[port]```.
* the browser will display the current git graph.
* keep the browser open, and open a terminal in the git directory.
* run some git commands and watch how git updates the graph.
* here are some basic commands : 
   ```sh
   $ git branch feature1-branch
   $ git checkout feature1-branch

   $ (add a file)
   $ git add .
   $ git commit "first commit"

   $ git checkout master
   $ (add a file)
   $ git add .
   $ git commit "master commit"

   $ git merge feature1-branch
   ```
   while executing these commands, you'll notice nodes being added and adjusted to match the new graph.
   
##### Notes on visualization
- It's best to work with a clean or small git directory, becuase normal git directories contain too many nodes and it will be very heavy to display them in a browser window. As a result, the max number of nodes allowed in the git directory is 2000 nodes. If you still want to experiment with more than 2000 nodes, you can change this number in the file ```config.js```.
- In the top of the browser window, you can choose the types of nodes that you want to be shown in the browser.
- The visualization is done using [vis.js](http://visjs.org/).